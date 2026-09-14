import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ThemesModule } from './themes/themes.module';

@Module({ imports: [AppModule, ThemesModule] })
class RootModule {}

async function bootstrap() {
  const app = await NestFactory.create(RootModule);
  app.setGlobalPrefix('api/v1');
  const origins=(process.env.WEB_ORIGIN||'http://localhost:3000').split(',').map(value=>value.trim()).filter(Boolean);
  app.enableCors({origin:origins});
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001, '0.0.0.0');
}

void bootstrap();
