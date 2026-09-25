import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
type Credentials={email:string;password:string};
type Refresh={refreshToken:string};
type EmailBody={email:string};
type TokenBody={token:string};
type ResetBody={token:string;password:string};
type RequestLike={ip?:string;headers?:Record<string,string|string[]|undefined>};

const attempts=new Map<string,{count:number;resetAt:number}>();
const publicActions=new Map<string,{count:number;resetAt:number}>();
const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=10;
const MAX_PUBLIC_ACTIONS=5;

@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService,private readonly audit:AuditService){}

 @Post('register') async register(@Body() b:Credentials,@Req() req:RequestLike){
   this.checkPublicAction('register',req,b.email);
   const result=await this.auth.register(b);
   await this.audit.record({action:'AUTH_REGISTERED',resource:'AUTH',metadata:{email:this.safeEmail(b.email),ip:this.clientIp(req),verificationRequired:true}});
   return result;
 }

 @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() b:Credentials,@Req() req:RequestLike){
   const key=this.rateKey(req,b.email);
   this.checkRateLimit(key);
   try{
     const result=await this.auth.login(b);
     attempts.delete(key);
     await this.audit.record({action:'AUTH_LOGIN_SUCCEEDED',resource:'AUTH',metadata:{email:this.safeEmail(b.email),ip:this.clientIp(req)}});
     return result;
   }catch(error){
     this.recordFailure(key);
     await this.audit.record({action:'AUTH_LOGIN_FAILED',resource:'AUTH',metadata:{email:this.safeEmail(b.email),ip:this.clientIp(req)}});
     throw error;
   }
 }

 @Post('refresh') @HttpCode(HttpStatus.OK) refresh(@Body() b:Refresh){return this.auth.refresh(b.refreshToken)}
 @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) async logout(@Body() b:Refresh){await this.auth.logout(b.refreshToken)}

 @Post('email-verification/request') @HttpCode(HttpStatus.ACCEPTED)
 async requestEmailVerification(@Body() b:EmailBody,@Req() req:RequestLike){
   this.checkPublicAction('verify',req,b.email);
   const result=await this.auth.requestEmailVerification(b.email);
   await this.audit.record({action:'AUTH_EMAIL_VERIFICATION_REQUESTED',resource:'AUTH',metadata:{email:this.safeEmail(b.email),ip:this.clientIp(req)}});
   return result;
 }

 @Post('email-verification/confirm') @HttpCode(HttpStatus.OK)
 async confirmEmailVerification(@Body() b:TokenBody,@Req() req:RequestLike){
   const result=await this.auth.confirmEmailVerification(b.token);
   await this.audit.record({action:'AUTH_EMAIL_VERIFIED',resource:'AUTH',metadata:{ip:this.clientIp(req)}});
   return result;
 }

 @Post('password-reset/request') @HttpCode(HttpStatus.ACCEPTED)
 async requestPasswordReset(@Body() b:EmailBody,@Req() req:RequestLike){
   this.checkPublicAction('reset',req,b.email);
   const result=await this.auth.requestPasswordReset(b.email);
   await this.audit.record({action:'AUTH_PASSWORD_RESET_REQUESTED',resource:'AUTH',metadata:{email:this.safeEmail(b.email),ip:this.clientIp(req)}});
   return result;
 }

 @Post('password-reset/confirm') @HttpCode(HttpStatus.OK)
 async confirmPasswordReset(@Body() b:ResetBody,@Req() req:RequestLike){
   const result=await this.auth.resetPassword(b.token,b.password);
   await this.audit.record({action:'AUTH_PASSWORD_RESET_COMPLETED',resource:'AUTH',metadata:{ip:this.clientIp(req),sessionsRevoked:true}});
   return result;
 }

 private checkRateLimit(key:string){
   const now=Date.now(),entry=attempts.get(key);
   if(!entry)return;
   if(entry.resetAt<=now){attempts.delete(key);return;}
   if(entry.count>=MAX_ATTEMPTS)throw new HttpException('Too many login attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
 }
 private recordFailure(key:string){
   const now=Date.now(),entry=attempts.get(key);
   if(!entry||entry.resetAt<=now)attempts.set(key,{count:1,resetAt:now+WINDOW_MS});
   else attempts.set(key,{...entry,count:entry.count+1});
   if(attempts.size>5000)for(const [candidate,value] of attempts)if(value.resetAt<=now)attempts.delete(candidate);
 }
 private checkPublicAction(action:string,req:RequestLike,email:string){
   const now=Date.now(),key=`${action}:${this.rateKey(req,email)}`,entry=publicActions.get(key);
   if(entry&&entry.resetAt>now&&entry.count>=MAX_PUBLIC_ACTIONS)throw new HttpException('Too many requests. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
   if(!entry||entry.resetAt<=now)publicActions.set(key,{count:1,resetAt:now+WINDOW_MS});
   else publicActions.set(key,{...entry,count:entry.count+1});
   if(publicActions.size>5000)for(const [candidate,value] of publicActions)if(value.resetAt<=now)publicActions.delete(candidate);
 }
 private clientIp(req:RequestLike){
   const forwarded=req.headers?.['x-forwarded-for'];
   const forwardedValue=Array.isArray(forwarded)?forwarded[0]:forwarded;
   return (forwardedValue?.split(',')[0]?.trim()||req.ip||'unknown').slice(0,128);
 }
 private safeEmail(email:string){return typeof email==='string'?email.trim().toLowerCase().slice(0,254):'invalid'}
 private rateKey(req:RequestLike,email:string){return `${this.clientIp(req)}:${this.safeEmail(email)}`}
}
