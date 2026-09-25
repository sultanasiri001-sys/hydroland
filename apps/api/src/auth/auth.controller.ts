import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { AccessTokenGuard } from './access-token.guard';
import { AuditService } from '../audit/audit.service';
type Credentials={email:string;password:string}; type Refresh={refreshToken:string}; type MfaVerify={challengeToken:string;code:string}; type MfaCode={code:string}; type GoogleCredential={credential:string};
type RequestLike={ip?:string;headers?:Record<string,string|string[]|undefined>;auth?:{accountId:string;sessionId:string}};
type RateEntry={count:number;resetAt:number};

const loginFailures=new Map<string,RateEntry>();
const registrationAttempts=new Map<string,RateEntry>();
const mfaFailures=new Map<string,RateEntry>();
const googleFailures=new Map<string,RateEntry>();
const WINDOW_MS=15*60*1000;
const MFA_WINDOW_MS=5*60*1000;
const MAX_LOGIN_FAILURES=10;
const MAX_REGISTRATION_ATTEMPTS=5;
const MAX_MFA_FAILURES=5;
const MAX_GOOGLE_FAILURES=10;
const MAX_RATE_BUCKETS=5000;

@Controller('auth') export class AuthController {
 constructor(private readonly auth:AuthService,private readonly mfa:MfaService,private readonly audit:AuditService){}
 @Post('register') async register(@Body() b:Credentials,@Req() req:RequestLike){
   const ip=this.clientIp(req),email=this.safeEmail(b.email),key=`register:${ip}`;
   if(this.isLimited(registrationAttempts,key,MAX_REGISTRATION_ATTEMPTS)){
     await this.audit.record({action:'AUTH_REGISTER_RATE_LIMITED',resource:'AUTH',metadata:{email,ip}});
     throw new HttpException('Too many registration attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
   }
   this.increment(registrationAttempts,key,WINDOW_MS);
   try{const result=await this.auth.register(b);await this.audit.record({action:'AUTH_REGISTER_SUCCEEDED',resource:'AUTH',metadata:{email,ip}});return result}
   catch(error){await this.audit.record({action:'AUTH_REGISTER_FAILED',resource:'AUTH',metadata:{email,ip}});throw error}
 }
 @Post('login') @HttpCode(HttpStatus.OK) async login(@Body() b:Credentials,@Req() req:RequestLike){
   const ip=this.clientIp(req),email=this.safeEmail(b.email),key=`login:${ip}:${email}`;
   if(this.isLimited(loginFailures,key,MAX_LOGIN_FAILURES)){
     await this.audit.record({action:'AUTH_LOGIN_RATE_LIMITED',resource:'AUTH',metadata:{email,ip}});
     throw new HttpException('Too many login attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS);
   }
   try{
     const result=await this.auth.login(b);loginFailures.delete(key);
     if('mfaRequired' in result)await this.audit.record({action:'AUTH_LOGIN_MFA_REQUIRED',resource:'AUTH',metadata:{email,ip}});
     else await this.audit.record({action:'AUTH_LOGIN_SUCCEEDED',resource:'AUTH',metadata:{email,ip}});
     return result;
   }catch(error){this.increment(loginFailures,key,WINDOW_MS);await this.audit.record({action:'AUTH_LOGIN_FAILED',resource:'AUTH',metadata:{email,ip}});throw error}
 }
 @Get('google/config') googleConfig(){return this.auth.googleConfig()}
 @Post('google') @HttpCode(HttpStatus.OK) async googleLogin(@Body() b:GoogleCredential,@Req() req:RequestLike){
   const ip=this.clientIp(req),key=`google:${ip}`;
   if(this.isLimited(googleFailures,key,MAX_GOOGLE_FAILURES)){await this.audit.record({action:'AUTH_GOOGLE_RATE_LIMITED',resource:'AUTH',metadata:{ip}});throw new HttpException('Too many Google sign-in attempts. Try again later.',HttpStatus.TOO_MANY_REQUESTS)}
   try{
     const result=await this.auth.loginWithGoogle(b.credential);googleFailures.delete(key);
     if('mfaRequired' in result)await this.audit.record({action:'AUTH_GOOGLE_MFA_REQUIRED',resource:'AUTH',metadata:{ip}});
     else await this.audit.record({action:'AUTH_GOOGLE_SUCCEEDED',resource:'AUTH',metadata:{ip}});
     return result;
   }catch(error){this.increment(googleFailures,key,WINDOW_MS);await this.audit.record({action:'AUTH_GOOGLE_FAILED',resource:'AUTH',metadata:{ip}});throw error}
 }
 @Post('mfa/verify') @HttpCode(HttpStatus.OK) async verifyMfa(@Body() b:MfaVerify,@Req() req:RequestLike){
   const ip=this.clientIp(req),challenge=typeof b.challengeToken==='string'?b.challengeToken:'',key=`mfa:${ip}:${challenge.slice(-24)}`;
   if(this.isLimited(mfaFailures,key,MAX_MFA_FAILURES)){await this.mfa.invalidateChallenge(challenge);await this.audit.record({action:'AUTH_MFA_RATE_LIMITED',resource:'AUTH',metadata:{ip}});throw new HttpException('Too many MFA attempts. Sign in again.',HttpStatus.TOO_MANY_REQUESTS)}
   try{const result=await this.auth.verifyMfaChallenge(challenge,b.code);mfaFailures.delete(key);await this.audit.record({action:'AUTH_MFA_SUCCEEDED',resource:'AUTH',metadata:{ip}});return result}
   catch(error){this.increment(mfaFailures,key,MFA_WINDOW_MS);if(this.isLimited(mfaFailures,key,MAX_MFA_FAILURES))await this.mfa.invalidateChallenge(challenge);await this.audit.record({action:'AUTH_MFA_FAILED',resource:'AUTH',metadata:{ip}});throw error}
 }
 @Get('mfa/status') @UseGuards(AccessTokenGuard) mfaStatus(@Req() req:RequestLike){return this.mfa.status(req.auth!.accountId)}
 @Post('mfa/totp/setup') @UseGuards(AccessTokenGuard) beginMfaSetup(@Req() req:RequestLike){return this.mfa.beginSetup(req.auth!.accountId)}
 @Post('mfa/totp/confirm') @UseGuards(AccessTokenGuard) async confirmMfa(@Body() b:MfaCode,@Req() req:RequestLike){const result=await this.mfa.confirmSetup(req.auth!.accountId,b.code,req.auth!.sessionId);await this.audit.record({action:'AUTH_MFA_ENABLED',resource:'AUTH',metadata:{accountId:req.auth!.accountId}});return result}
 @Post('mfa/disable') @UseGuards(AccessTokenGuard) async disableMfa(@Body() b:MfaCode,@Req() req:RequestLike){const result=await this.mfa.disable(req.auth!.accountId,b.code,req.auth!.sessionId);await this.audit.record({action:'AUTH_MFA_DISABLED',resource:'AUTH',metadata:{accountId:req.auth!.accountId}});return result}
 @Post('refresh') @HttpCode(HttpStatus.OK) refresh(@Body() b:Refresh){return this.auth.refresh(b.refreshToken)}
 @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) async logout(@Body() b:Refresh){await this.auth.logout(b.refreshToken)}

 private isLimited(bucket:Map<string,RateEntry>,key:string,max:number){const entry=this.liveEntry(bucket,key);return Boolean(entry&&entry.count>=max)}
 private increment(bucket:Map<string,RateEntry>,key:string,windowMs:number){const now=Date.now(),entry=this.liveEntry(bucket,key);if(!entry){this.ensureCapacity(bucket,now);bucket.set(key,{count:1,resetAt:now+windowMs});return}bucket.set(key,{...entry,count:entry.count+1})}
 private liveEntry(bucket:Map<string,RateEntry>,key:string){const entry=bucket.get(key);if(!entry)return undefined;if(entry.resetAt<=Date.now()){bucket.delete(key);return undefined}return entry}
 private ensureCapacity(bucket:Map<string,RateEntry>,now:number){if(bucket.size<MAX_RATE_BUCKETS)return;for(const [key,entry] of bucket)if(entry.resetAt<=now)bucket.delete(key);while(bucket.size>=MAX_RATE_BUCKETS){const oldest=bucket.keys().next().value;if(typeof oldest!=='string')break;bucket.delete(oldest)}}
 private clientIp(req:RequestLike){const forwarded=req.headers?.['x-forwarded-for'];const forwardedValue=Array.isArray(forwarded)?forwarded[0]:forwarded;return (forwardedValue?.split(',')[0]?.trim()||req.ip||'unknown').slice(0,128)}
 private safeEmail(email:string){return typeof email==='string'?email.trim().toLowerCase().slice(0,254):'invalid'}
}
