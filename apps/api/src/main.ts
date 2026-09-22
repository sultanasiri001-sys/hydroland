import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(RootModule, { rawBody: true });
  app.setGlobalPrefix('api/v1');

  const origins = (process.env.WEB_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });

  app.use((req: any, res: any, next: () => void) => {
    const incoming = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'].trim() : '';
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    const startedAt = process.hrtime.bigint();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.log(JSON.stringify({
        level: 'info',
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        timestamp: new Date().toISOString(),
      }));
    });
    next();
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001, '0.0.0.0');
}

void bootstrap();
