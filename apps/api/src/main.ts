import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ThemesModule } from './themes/themes.module';

@Module({ imports: [AppModule, ThemesModule] })
class RootModule {}

async function bootstrap() {
  const app = await NestFactory.create(RootModule, { rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.use((_req:any,res:any,next:any)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    next();
  });
  const origins=(process.env.WEB_ORIGIN||'http://localhost:3000').split(',').map(value=>value.trim()).filter(Boolean);
  app.enableCors({origin:origins,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization','Idempotency-Key','X-Webhook-Signature','X-Webhook-Timestamp','X-Webhook-Event-Id','X-Webhook-Event-Type'],credentials:false,maxAge:600});
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001, '0.0.0.0');
}

void bootstrap();
