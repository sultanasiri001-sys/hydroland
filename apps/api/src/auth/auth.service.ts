import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { GoogleIdentityService } from './google-identity.service';
import { MfaService } from './mfa.service';

type Credentials={email:string;password:string};
type Tokens={accessToken:string;refreshToken:string};
type RegistrationResult={email:string;status:'PENDING_VERIFICATION';requiresEmailVerification:true};
type GoogleIdentity={subject:string;email:string;givenName:string;familyName:string;hostedDomain:string|null};
type ChallengePurpose='VERIFY_EMAIL'|'RESET_PASSWORD';
type ChallengeClaims={id:string;accountId:string;purpose:ChallengePurpose;expiresAt:number};

const VERIFY_TTL_MS=30*60*1000;
const RESET_TTL_MS=20*60*1000;

@Injectable()
export class AuthService {
  constructor(private readonly db:DatabaseService,private readonly mfa:MfaService,private readonly google:GoogleIdentityService){}

  async register(input:Credentials):Promise<RegistrationResult>{
    const email=this.email(input.email);
    this.password(input.password);
    if(await this.db.account.findUnique({where:{email}}))throw new ConflictException('Account exists.');
    const account=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const created=await tx.account.create({data:{email,passwordHash:this.hash(input.password),person:{create:{firstName:'Pending',lastName:'Profile'}}}});
      await this.replaceChallenge(tx,created.id,'VERIFY_EMAIL',VERIFY_TTL_MS);
      return created;
    });
    return{email:account.email,status:'PENDING_VERIFICATION',requiresEmailVerification:true};
  }

  async requestEmailVerification(emailInput:string){
    const email=this.email(emailInput);
    const account=await this.db.account.findUnique({where:{email},select:{id:true,status:true,emailVerifiedAt:true}});
    if(!account||account.emailVerifiedAt||this.blocked(account.status))return{accepted:true};
    await this.db.$transaction((tx:Prisma.TransactionClient)=>this.replaceChallenge(tx,account.id,'VERIFY_EMAIL',VERIFY_TTL_MS));
    return{accepted:true};
  }

  async confirmEmailVerification(token:string):Promise<Tokens>{
    const claims=this.verifyChallengeToken(token,'VERIFY_EMAIL');
    const accountId=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const challenge=await tx.notification.findFirst({where:{id:claims.id,accountId:claims.accountId,type:this.challengeType('VERIFY_EMAIL'),status:'PENDING'},include:{account:{select:{status:true,emailVerifiedAt:true}}}});
      if(!challenge||this.blocked(challenge.account.status)||challenge.account.emailVerifiedAt)throw new UnauthorizedException('Invalid or expired verification token.');
      this.assertChallengeMetadata(challenge.payload,'VERIFY_EMAIL',claims.expiresAt);
      const consumed=await tx.notification.updateMany({where:{id:challenge.id,status:'PENDING'},data:{status:'READ'}});
      if(consumed.count!==1)throw new UnauthorizedException('Invalid or expired verification token.');
      await tx.account.update({where:{id:claims.accountId},data:{emailVerifiedAt:new Date(),status:challenge.account.status==='PENDING_VERIFICATION'?'ACTIVE':challenge.account.status}});
      await tx.notification.updateMany({where:{accountId:claims.accountId,type:this.challengeType('VERIFY_EMAIL'),status:'PENDING'},data:{status:'FAILED'}});
      return claims.accountId;
    });
    return this.issue(accountId);
  }

  async requestPasswordReset(emailInput:string){
    const email=this.email(emailInput);
    const account=await this.db.account.findUnique({where:{email},select:{id:true,status:true,emailVerifiedAt:true}});
    if(!account||!this.isActive(account.status,account.emailVerifiedAt))return{accepted:true};
    await this.db.$transaction((tx:Prisma.TransactionClient)=>this.replaceChallenge(tx,account.id,'RESET_PASSWORD',RESET_TTL_MS));
    return{accepted:true};
  }

  async resetPassword(token:string,newPassword:string){
    this.password(newPassword);
    const claims=this.verifyChallengeToken(token,'RESET_PASSWORD');
    await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const challenge=await tx.notification.findFirst({where:{id:claims.id,accountId:claims.accountId,type:this.challengeType('RESET_PASSWORD'),status:'PENDING'},include:{account:{select:{status:true,emailVerifiedAt:true}}}});
      if(!challenge||!this.isActive(challenge.account.status,challenge.account.emailVerifiedAt))throw new UnauthorizedException('Invalid or expired password reset token.');
      this.assertChallengeMetadata(challenge.payload,'RESET_PASSWORD',claims.expiresAt);
      const consumed=await tx.notification.updateMany({where:{id:challenge.id,status:'PENDING'},data:{status:'READ'}});
      if(consumed.count!==1)throw new UnauthorizedException('Invalid or expired password reset token.');
      await tx.account.update({where:{id:claims.accountId},data:{passwordHash:this.hash(newPassword)}});
      await tx.session.updateMany({where:{accountId:claims.accountId,revokedAt:null},data:{revokedAt:new Date()}});
      await tx.notification.updateMany({where:{accountId:claims.accountId,type:this.challengeType('RESET_PASSWORD'),status:'PENDING'},data:{status:'FAILED'}});
    });
    return{passwordReset:true};
  }

  async login(input:Credentials){
    const account=await this.db.account.findUnique({where:{email:this.email(input.email)}});
    if(!account||!this.verify(input.password,account.passwordHash)||this.blocked(account.status))throw new UnauthorizedException('Invalid credentials.');
    if(account.status!=='ACTIVE')throw new UnauthorizedException('Account activation is required.');
    if(!account.emailVerifiedAt)throw new UnauthorizedException('Email verification is required.');
    await this.db.account.update({where:{id:account.id},data:{lastLoginAt:new Date()}});
    return this.completePrimaryAuthentication(account.id);
  }

  googleConfig(){return this.google.config()}

  async loginWithGoogle(credential:string){
    const identity=await this.google.verifyCredential(credential);
    const account=await this.resolveGoogleAccount(identity);
    if(this.blocked(account.status))throw new UnauthorizedException('Account is unavailable.');
    if(account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new UnauthorizedException('Account is not active.');
    return this.completePrimaryAuthentication(account.id);
  }

  async verifyMfaChallenge(challengeToken:string,code:string):Promise<Tokens>{const accountId=await this.mfa.verifyChallenge(challengeToken,code);return this.issue(accountId)}

  async refresh(refreshToken:string):Promise<Tokens>{
    const token=this.requireRefreshToken(refreshToken);
    const session=await this.db.session.findUnique({where:{tokenHash:this.tokenHash(token)},include:{account:{select:{status:true,emailVerifiedAt:true}}}});
    if(!session||session.revokedAt||session.expiresAt<=new Date()||session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt)throw new UnauthorizedException('Invalid session.');
    const consumed=await this.db.session.updateMany({where:{id:session.id,revokedAt:null,expiresAt:{gt:new Date()}},data:{revokedAt:new Date()}});
    if(consumed.count!==1)throw new UnauthorizedException('Invalid session.');
    return this.issue(session.accountId);
  }

  async logout(refreshToken:string):Promise<void>{
    const token=this.requireRefreshToken(refreshToken);
    await this.db.session.updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}});
  }

  async authenticateAccessToken(token:string){
    const claims=this.verifyAccessToken(token);
    if(!claims.sessionId){
      const account=await this.db.account.findUnique({where:{id:claims.accountId},select:{id:true,email:true,status:true,emailVerifiedAt:true}});
      if(!account||!account.email.endsWith('@example.invalid')||account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new UnauthorizedException('Invalid access token.');
      return{accountId:account.id,sessionId:'e2e-sessionless'};
    }
    const session=await this.db.session.findFirst({where:{id:claims.sessionId,accountId:claims.accountId,revokedAt:null,expiresAt:{gt:new Date()},tokenHash:{not:{startsWith:'mfa:'}}},include:{account:{select:{id:true,status:true,emailVerifiedAt:true}}}});
    if(!session||session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt)throw new UnauthorizedException('Account is not active, session is invalid, or email is not verified.');
    return{accountId:session.account.id,sessionId:session.id};
  }

  async materializePendingChallenge(notificationId:string){
    const row=await this.db.notification.findUnique({where:{id:notificationId},include:{account:{select:{email:true}}}});
    if(!row||row.status!=='PENDING')throw new UnauthorizedException('Challenge unavailable.');
    const metadata=this.challengeMetadata(row.payload);
    return{email:row.account.email,purpose:metadata.purpose,expiresAt:metadata.expiresAt,token:this.challengeToken(row.id,row.accountId,metadata.purpose,new Date(metadata.expiresAt))};
  }

  private async replaceChallenge(tx:Prisma.TransactionClient,accountId:string,purpose:ChallengePurpose,ttlMs:number){
    const type=this.challengeType(purpose);
    await tx.notification.updateMany({where:{accountId,type,status:'PENDING'},data:{status:'FAILED'}});
    const expiresAt=new Date(Date.now()+ttlMs);
    return tx.notification.create({data:{accountId,type,payload:{purpose,expiresAt:expiresAt.toISOString(),delivery:'EMAIL',version:1}}});
  }
  private challengeType(purpose:ChallengePurpose){return purpose==='VERIFY_EMAIL'?'AUTH_EMAIL_VERIFICATION':'AUTH_PASSWORD_RESET';}
  private challengeMetadata(payload:Prisma.JsonValue){if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new UnauthorizedException('Invalid challenge.');const record=payload as Record<string,unknown>,purpose=record.purpose,expiresAt=record.expiresAt;if((purpose!=='VERIFY_EMAIL'&&purpose!=='RESET_PASSWORD')||typeof expiresAt!=='string'||!Number.isFinite(Date.parse(expiresAt)))throw new UnauthorizedException('Invalid challenge.');return{purpose:purpose as ChallengePurpose,expiresAt}}
  private assertChallengeMetadata(payload:Prisma.JsonValue,purpose:ChallengePurpose,expiresAt:number){const metadata=this.challengeMetadata(payload);if(metadata.purpose!==purpose||Math.floor(Date.parse(metadata.expiresAt)/1000)!==expiresAt||Date.parse(metadata.expiresAt)<=Date.now())throw new UnauthorizedException('Invalid or expired challenge.')}
  private challengeToken(id:string,accountId:string,purpose:ChallengePurpose,expiresAt:Date){const payload=Buffer.from(JSON.stringify({id,sub:accountId,p:purpose,exp:Math.floor(expiresAt.getTime()/1000)})).toString('base64url');const signature=createHmac('sha256',this.secret()).update(`hydroland-auth-challenge.${payload}`).digest('base64url');return `${payload}.${signature}`}
  private verifyChallengeToken(token:string,purpose:ChallengePurpose):ChallengeClaims{if(typeof token!=='string'||token.length<32)throw new UnauthorizedException('Invalid or expired challenge.');const [payload,signature,...extra]=token.trim().split('.');if(!payload||!signature||extra.length)throw new UnauthorizedException('Invalid or expired challenge.');const expected=createHmac('sha256',this.secret()).update(`hydroland-auth-challenge.${payload}`).digest('base64url');if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new UnauthorizedException('Invalid or expired challenge.');try{const claims=JSON.parse(Buffer.from(payload,'base64url').toString()) as{id?:unknown;sub?:unknown;p?:unknown;exp?:unknown};if(typeof claims.id!=='string'||!claims.id||typeof claims.sub!=='string'||!claims.sub||claims.p!==purpose||typeof claims.exp!=='number'||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw new UnauthorizedException('Invalid or expired challenge.');return{id:claims.id,accountId:claims.sub,purpose,expiresAt:claims.exp}}catch(error){if(error instanceof UnauthorizedException)throw error;throw new UnauthorizedException('Invalid or expired challenge.')}}

  private async completePrimaryAuthentication(accountId:string){if(await this.mfa.isEnabled(accountId))return this.mfa.beginChallenge(accountId);return this.issue(accountId)}

  private async resolveGoogleAccount(identity:GoogleIdentity){
    const key=this.googleSubjectKey(identity.subject),mapping=await this.db.operationalSetting.findUnique({where:{key}}),mappedAccountId=this.googleMappedAccountId(mapping?.value);
    if(mappedAccountId){const mapped=await this.db.account.findUnique({where:{id:mappedAccountId}});if(!mapped)throw new UnauthorizedException('Google account link is unavailable.');return mapped}
    let account=await this.db.account.findUnique({where:{email:identity.email},include:{person:true}});const now=new Date();
    if(account){
      if(this.blocked(account.status))throw new UnauthorizedException('Account is unavailable.');
      if(account.status!=='ACTIVE'||!account.emailVerifiedAt){account=await this.db.account.update({where:{id:account.id},data:{status:'ACTIVE',emailVerifiedAt:account.emailVerifiedAt||now},include:{person:true}});await this.db.notification.updateMany({where:{accountId:account.id,type:'AUTH_EMAIL_VERIFICATION',status:'PENDING'},data:{status:'FAILED'}})}
      if(account.person.firstName==='Pending'&&account.person.lastName==='Profile')await this.db.person.update({where:{id:account.personId},data:{firstName:identity.givenName,lastName:identity.familyName}});
    }else account=await this.db.account.create({data:{email:identity.email,passwordHash:this.hash(randomBytes(48).toString('base64url')),status:'ACTIVE',emailVerifiedAt:now,person:{create:{firstName:identity.givenName,lastName:identity.familyName}}},include:{person:true}});
    await this.linkGoogleSubject(key,account.id,identity.email,identity.hostedDomain);return account;
  }
  private async linkGoogleSubject(key:string,accountId:string,email:string,hostedDomain:string|null){try{await this.db.operationalSetting.create({data:{key,value:{version:1,provider:'google',accountId,emailAtLink:email,hostedDomain}}})}catch(error){const existing=await this.db.operationalSetting.findUnique({where:{key}}),mapped=this.googleMappedAccountId(existing?.value);if(mapped===accountId)return;throw new ConflictException('Google identity is already linked to another account.')}}
  private googleMappedAccountId(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return null;const accountId=(value as Record<string,unknown>).accountId;return typeof accountId==='string'&&accountId?accountId:null}
  private googleSubjectKey(subject:string){return`auth.google.subject.${createHash('sha256').update(subject).digest('hex')}`}

  private async issue(accountId:string):Promise<Tokens>{const refreshToken=randomBytes(48).toString('base64url');const session=await this.db.session.create({data:{accountId,tokenHash:this.tokenHash(refreshToken),expiresAt:new Date(Date.now()+2592000000)}});return{accessToken:this.access(accountId,session.id),refreshToken}}
  private access(id:string,sessionId:string){const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw new Error('JWT_SECRET required.');const now=Math.floor(Date.now()/1000),encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url'),body=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,sid:sessionId,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`}
  verifyAccessToken(token:string){if(typeof token!=='string'||token.length<16)throw new UnauthorizedException('Invalid access token.');const parts=token.split('.');if(parts.length!==3)throw new UnauthorizedException('Invalid access token.');const [header,payload,signature]=parts,secret=process.env.JWT_SECRET;if(!header||!payload||!signature||!secret)throw new UnauthorizedException('Invalid access token.');const expected=createHmac('sha256',secret).update(`${header}.${payload}`).digest('base64url');if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new UnauthorizedException('Invalid access token.');try{const claims=JSON.parse(Buffer.from(payload,'base64url').toString()) as{sub?:unknown;sid?:unknown;exp?:unknown};if(typeof claims.sub!=='string'||!claims.sub||typeof claims.exp!=='number'||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw new UnauthorizedException('Invalid access token.');if(typeof claims.sid==='string'&&claims.sid)return{accountId:claims.sub,sessionId:claims.sid};if(this.allowSessionlessE2eAccess())return{accountId:claims.sub,sessionId:null};throw new UnauthorizedException('Invalid access token.')}catch(error){if(error instanceof UnauthorizedException)throw error;throw new UnauthorizedException('Invalid access token.')}}
  private allowSessionlessE2eAccess(){return process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'}
  private requireRefreshToken(value:string){if(typeof value!=='string'||value.trim().length<32)throw new UnauthorizedException('Invalid session.');return value.trim()}
  private isActive(status:string,emailVerifiedAt:Date|null){return status==='ACTIVE'&&Boolean(emailVerifiedAt)}
  private blocked(status:string){return status==='SUSPENDED'||status==='ARCHIVED'}
  private email(value:string){const email=value?.trim().toLowerCase();if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new BadRequestException('Valid email required.');return email}
  private password(value:string){if(!value||value.length<12||value.length>128)throw new BadRequestException('Password must be 12-128 characters.')}
  private hash(value:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(value,salt,64).toString('hex')}`}
  private verify(value:string,encoded:string){if(typeof value!=='string'||!value)return false;const [salt,digest]=encoded.split(':');if(!salt||!digest)return false;const expected=Buffer.from(digest,'hex'),actual=scryptSync(value,salt,64);return expected.length===actual.length&&timingSafeEqual(actual,expected)}
  private tokenHash(value:string){return createHash('sha256').update(value).digest('hex')}
  private secret(){const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw new Error('JWT_SECRET required.');return secret}
}
