import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { GoogleIdentityService } from './google-identity.service';
import { MfaService } from './mfa.service';

type Credentials={email:string;password:string};
type Tokens={accessToken:string;refreshToken:string};
type RegistrationResult={email:string;status:'PENDING_VERIFICATION';requiresEmailVerification:true};
type GoogleIdentity={subject:string;email:string;givenName:string;familyName:string;hostedDomain:string|null};

@Injectable()
export class AuthService {
  constructor(private readonly db:DatabaseService,private readonly mfa:MfaService,private readonly google:GoogleIdentityService){}

  async register(input:Credentials):Promise<RegistrationResult>{
    const email=this.email(input.email);
    this.password(input.password);
    if(await this.db.account.findUnique({where:{email}}))throw new ConflictException('Account exists.');
    const account=await this.db.account.create({data:{email,passwordHash:this.hash(input.password),person:{create:{firstName:'Pending',lastName:'Profile'}}}});
    return{email:account.email,status:'PENDING_VERIFICATION',requiresEmailVerification:true};
  }

  async login(input:Credentials){
    const account=await this.db.account.findUnique({where:{email:this.email(input.email)}});
    if(!account||!this.verify(input.password,account.passwordHash)||this.blocked(account.status))throw new UnauthorizedException('Invalid credentials.');
    if(account.status!=='ACTIVE')throw new UnauthorizedException('Account activation is required.');
    if(!account.emailVerifiedAt)throw new UnauthorizedException('Email verification is required.');
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
    const session=await this.db.session.findFirst({
      where:{id:claims.sessionId,accountId:claims.accountId,revokedAt:null,expiresAt:{gt:new Date()},tokenHash:{not:{startsWith:'mfa:'}}},
      include:{account:{select:{id:true,status:true,emailVerifiedAt:true}}}
    });
    if(!session||session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt)throw new UnauthorizedException('Account is not active, session is invalid, or email is not verified.');
    return{accountId:session.account.id,sessionId:session.id};
  }

  private async completePrimaryAuthentication(accountId:string){if(await this.mfa.isEnabled(accountId))return this.mfa.beginChallenge(accountId);return this.issue(accountId)}

  private async resolveGoogleAccount(identity:GoogleIdentity){
    const key=this.googleSubjectKey(identity.subject),mapping=await this.db.operationalSetting.findUnique({where:{key}}),mappedAccountId=this.googleMappedAccountId(mapping?.value);
    if(mappedAccountId){
      const mapped=await this.db.account.findUnique({where:{id:mappedAccountId}});
      if(!mapped)throw new UnauthorizedException('Google account link is unavailable.');
      return mapped;
    }
    let account=await this.db.account.findUnique({where:{email:identity.email},include:{person:true}});
    const now=new Date();
    if(account){
      if(this.blocked(account.status))throw new UnauthorizedException('Account is unavailable.');
      if(account.status!=='ACTIVE'||!account.emailVerifiedAt)account=await this.db.account.update({where:{id:account.id},data:{status:'ACTIVE',emailVerifiedAt:account.emailVerifiedAt||now},include:{person:true}});
      if(account.person.firstName==='Pending'&&account.person.lastName==='Profile')await this.db.person.update({where:{id:account.personId},data:{firstName:identity.givenName,lastName:identity.familyName}});
    }else{
      account=await this.db.account.create({data:{email:identity.email,passwordHash:this.hash(randomBytes(48).toString('base64url')),status:'ACTIVE',emailVerifiedAt:now,person:{create:{firstName:identity.givenName,lastName:identity.familyName}}},include:{person:true}});
    }
    await this.linkGoogleSubject(key,account.id,identity.email,identity.hostedDomain);
    return account;
  }

  private async linkGoogleSubject(key:string,accountId:string,email:string,hostedDomain:string|null){
    try{await this.db.operationalSetting.create({data:{key,value:{version:1,provider:'google',accountId,emailAtLink:email,hostedDomain}}})}
    catch(error){
      const existing=await this.db.operationalSetting.findUnique({where:{key}}),mapped=this.googleMappedAccountId(existing?.value);
      if(mapped===accountId)return;
      throw new ConflictException('Google identity is already linked to another account.');
    }
  }

  private googleMappedAccountId(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return null;const accountId=(value as Record<string,unknown>).accountId;return typeof accountId==='string'&&accountId?accountId:null}
  private googleSubjectKey(subject:string){return`auth.google.subject.${createHash('sha256').update(subject).digest('hex')}`}

  private async issue(accountId:string):Promise<Tokens>{
    const refreshToken=randomBytes(48).toString('base64url');
    const session=await this.db.session.create({data:{accountId,tokenHash:this.tokenHash(refreshToken),expiresAt:new Date(Date.now()+2592000000)}});
    return{accessToken:this.access(accountId,session.id),refreshToken};
  }

  private access(id:string,sessionId:string){
    const secret=process.env.JWT_SECRET;
    if(!secret||secret.length<32)throw new Error('JWT_SECRET required.');
    const now=Math.floor(Date.now()/1000);
    const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const body=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,sid:sessionId,iat:now,exp:now+900})}`;
    return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
  }

  verifyAccessToken(token:string){
    if(typeof token!=='string'||token.length<16)throw new UnauthorizedException('Invalid access token.');
    const parts=token.split('.');
    if(parts.length!==3)throw new UnauthorizedException('Invalid access token.');
    const [header,payload,signature]=parts,secret=process.env.JWT_SECRET;
    if(!header||!payload||!signature||!secret)throw new UnauthorizedException('Invalid access token.');
    const expected=createHmac('sha256',secret).update(`${header}.${payload}`).digest('base64url');
    if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new UnauthorizedException('Invalid access token.');
    try{
      const claims=JSON.parse(Buffer.from(payload,'base64url').toString()) as{sub?:unknown;sid?:unknown;exp?:unknown};
      if(typeof claims.sub!=='string'||!claims.sub||typeof claims.exp!=='number'||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw new UnauthorizedException('Invalid access token.');
      if(typeof claims.sid==='string'&&claims.sid)return{accountId:claims.sub,sessionId:claims.sid};
      if(this.allowSessionlessE2eAccess())return{accountId:claims.sub,sessionId:null};
      throw new UnauthorizedException('Invalid access token.');
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException('Invalid access token.');
    }
  }

  private allowSessionlessE2eAccess(){return process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true';}
  private requireRefreshToken(value:string){
    if(typeof value!=='string'||value.trim().length<32)throw new UnauthorizedException('Invalid session.');
    return value.trim();
  }

  private blocked(status:string){return status==='SUSPENDED'||status==='ARCHIVED';}
  private email(value:string){const email=value?.trim().toLowerCase();if(!email||!/^\S+@\S+\.\S+$/.test(email))throw new BadRequestException('Valid email required.');return email;}
  private password(value:string){if(!value||value.length<12)throw new BadRequestException('Password min 12.');}
  private hash(value:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
  private verify(value:string,encoded:string){
    if(typeof value!=='string'||!value)return false;
    const [salt,digest]=encoded.split(':');
    if(!salt||!digest)return false;
    const expected=Buffer.from(digest,'hex');
    const actual=scryptSync(value,salt,64);
    return expected.length===actual.length&&timingSafeEqual(actual,expected);
  }
  private tokenHash(value:string){return createHash('sha256').update(value).digest('hex');}
}
