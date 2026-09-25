import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ThemesModule } from './themes/themes.module';

@Module({ imports: [AppModule, ThemesModule] })
class RootModule {}

function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  if (process.env.NODE_ENV === 'production' && !process.env.WEB_ORIGIN?.trim()) {
    throw new Error('WEB_ORIGIN is required in production.');
  }
}

function applySecurityHeaders(_req: any, res: any, next: () => void) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function requestObservability(req: any, res: any, next: () => void) {
  const incoming = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'].trim() : '';
  const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = String(req.path || req.originalUrl || req.url || '').split('?')[0];
    console.log(JSON.stringify({
      level: 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    }));
  });
  next();
}

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(RootModule, { rawBody: true });
  app.use(applySecurityHeaders);
  app.use(requestObservability);
  app.useBodyParser('json', { limit: '15mb' });
  app.setGlobalPrefix('api/v1');
  const origins = (process.env.WEB_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Request-Id',
      'X-Webhook-Signature',
      'X-Webhook-Timestamp',
      'X-Webhook-Event-Id',
      'X-Webhook-Event-Type',
    ],
    credentials: false,
    maxAge: 600,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001, '0.0.0.0');
}

void bootstrap();
