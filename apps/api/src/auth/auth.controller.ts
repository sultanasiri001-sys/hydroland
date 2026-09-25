import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
type Credentials={email:string;password:string}; type Refresh={refreshToken:string};
type RequestLike={ip?:string;headers?:Record<string,string|string[]|undefined>};
type RateEntry={count:number;resetAt:number};

const loginFailures=new Map<string,RateEntry>();
const registrationAttempts=new Map<string,RateEntry>();
const WINDOW_MS=15*60*1000;
const MAX_LOGIN_FAILURES=10;
const MAX_REGISTRATION_ATTEMPTS=5;
const MAX_RATE_BUCKETS=5000;

@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService,private readonly audit:AuditService){}
 @Post('register') async register(@Body() b:Credentials,@Req() req:RequestLike){
   const ip=this.clientIp(req),email=this.safeEmail(b.email),key=`register:${ip}`;
   if(this.isLimited(registrationAttempts,key,MAX_REGISTRATION_ATTEMPTS)){
     await this.audit.record({action:'AUTH_REGISTER_RATE_LIMITED',resource:'AUTH',metadata:{email,ip}});
     throw new HttpException('Too many registration attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
   }
   this.increment(registrationAttempts,key);
   try{
     const result=await this.auth.register(b);
     await this.audit.record({action:'AUTH_REGISTER_SUCCEEDED',resource:'AUTH',metadata:{email,ip}});
     return result;
   }catch(error){
     await this.audit.record({action:'AUTH_REGISTER_FAILED',resource:'AUTH',metadata:{email,ip}});
     throw error;
   }
 }
 @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() b:Credentials,@Req() req:RequestLike){
   const ip=this.clientIp(req),email=this.safeEmail(b.email),key=`login:${ip}:${email}`;
   if(this.isLimited(loginFailures,key,MAX_LOGIN_FAILURES)){
     await this.audit.record({action:'AUTH_LOGIN_RATE_LIMITED',resource:'AUTH',metadata:{email,ip}});
     throw new HttpException('Too many login attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
   }
   try{
     const result=await this.auth.login(b);
     loginFailures.delete(key);
     await this.audit.record({action:'AUTH_LOGIN_SUCCEEDED',resource:'AUTH',metadata:{email,ip}});
     return result;
   }catch(error){
     this.increment(loginFailures,key);
     await this.audit.record({action:'AUTH_LOGIN_FAILED',resource:'AUTH',metadata:{email,ip}});
     throw error;
   }
 }
 @Post('refresh') @HttpCode(HttpStatus.OK) refresh(@Body() b:Refresh){return this.auth.refresh(b.refreshToken)}
 @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) async logout(@Body() b:Refresh){await this.auth.logout(b.refreshToken)}

 private isLimited(bucket:Map<string,RateEntry>,key:string,max:number){
   const entry=this.liveEntry(bucket,key);
   return Boolean(entry&&entry.count>=max);
 }
 private increment(bucket:Map<string,RateEntry>,key:string){
   const now=Date.now(),entry=this.liveEntry(bucket,key);
   if(!entry){
     this.ensureCapacity(bucket,now);
     bucket.set(key,{count:1,resetAt:now+WINDOW_MS});
     return;
   }
   bucket.set(key,{...entry,count:entry.count+1});
 }
 private liveEntry(bucket:Map<string,RateEntry>,key:string){
   const entry=bucket.get(key);
   if(!entry)return undefined;
   if(entry.resetAt<=Date.now()){bucket.delete(key);return undefined;}
   return entry;
 }
 private ensureCapacity(bucket:Map<string,RateEntry>,now:number){
   if(bucket.size<MAX_RATE_BUCKETS)return;
   for(const [key,entry] of bucket)if(entry.resetAt<=now)bucket.delete(key);
   while(bucket.size>=MAX_RATE_BUCKETS){const oldest=bucket.keys().next().value;if(typeof oldest!=='string')break;bucket.delete(oldest);}
 }
 private clientIp(req:RequestLike){
   const forwarded=req.headers?.['x-forwarded-for'];
   const forwardedValue=Array.isArray(forwarded)?forwarded[0]:forwarded;
   return (forwardedValue?.split(',')[0]?.trim()||req.ip||'unknown').slice(0,128);
 }
 private safeEmail(email:string){return typeof email==='string'?email.trim().toLowerCase().slice(0,254):'invalid'}
}
