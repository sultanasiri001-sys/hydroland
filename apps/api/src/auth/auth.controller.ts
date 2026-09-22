import { Body, Controller, HttpCode, HttpStatus, Post, Req, TooManyRequestsException } from '@nestjs/common';
import { AuthService } from './auth.service';
type Credentials={email:string;password:string}; type Refresh={refreshToken:string};
type RequestLike={ip?:string;headers?:Record<string,string|string[]|undefined>};

const attempts=new Map<string,{count:number;resetAt:number}>();
const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=10;

@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService){}
 @Post('register') register(@Body() b:Credentials){return this.auth.register(b)}
 @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() b:Credentials,@Req() req:RequestLike){
   const key=this.rateKey(req,b.email);
   this.checkRateLimit(key);
   try{
     const result=await this.auth.login(b);
     attempts.delete(key);
     return result;
   }catch(error){
     this.recordFailure(key);
     throw error;
   }
 }
 @Post('refresh') @HttpCode(HttpStatus.OK) refresh(@Body() b:Refresh){return this.auth.refresh(b.refreshToken)}
 @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) async logout(@Body() b:Refresh){await this.auth.logout(b.refreshToken)}

 private checkRateLimit(key:string){
   const now=Date.now(),entry=attempts.get(key);
   if(!entry)return;
   if(entry.resetAt<=now){attempts.delete(key);return;}
   if(entry.count>=MAX_ATTEMPTS)throw new TooManyRequestsException('Too many login attempts. Try again later.');
 }
 private recordFailure(key:string){
   const now=Date.now(),entry=attempts.get(key);
   if(!entry||entry.resetAt<=now)attempts.set(key,{count:1,resetAt:now+WINDOW_MS});
   else attempts.set(key,{...entry,count:entry.count+1});
 }
 private rateKey(req:RequestLike,email:string){
   const forwarded=req.headers?.['x-forwarded-for'];
   const forwardedValue=Array.isArray(forwarded)?forwarded[0]:forwarded;
   const ip=(forwardedValue?.split(',')[0]?.trim()||req.ip||'unknown').slice(0,128);
   const normalized=typeof email==='string'?email.trim().toLowerCase().slice(0,254):'invalid';
   return `${ip}:${normalized}`;
 }
}
