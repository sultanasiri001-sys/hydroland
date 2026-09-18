import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.setGlobalPrefix('api/v1');
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 const hits=new Map<string,{count:number;reset:number}>();
 app.use((req:any,res:any,next:any)=>{const key=req.ip||'unknown',now=Date.now(),v=hits.get(key);if(!v||v.reset<now)hits.set(key,{count:1,reset:now+60000});else if(++v.count>120){res.status(429).send('Too Many Requests');return;}next();});
 app.use((_req:any,res:any,next:any)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");next();});
 app.enableShutdownHooks();
 await app.listen(process.env.PORT?Number(process.env.PORT):3001,'0.0.0.0');
}
void bootstrap();
