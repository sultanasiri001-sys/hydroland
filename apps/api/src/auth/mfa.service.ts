import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { createRecoveryCode, encodeBase32, protectSecret, recoveryHash, revealSecret } from './mfa-crypto';
import { verifyTotp } from './totp';

type Credential={version:1;enabledAt:string|null;setupExpiresAt:string|null;encryptedSecret:string;recoveryCodeHashes:string[]};

@Injectable()
export class MfaService{
  constructor(private readonly db:DatabaseService){}

  async isEnabled(accountId:string){return Boolean((await this.credential(accountId))?.enabledAt)}

  async beginChallenge(accountId:string){const challengeToken=randomBytes(48).toString('base64url');await this.db.session.create({data:{accountId,tokenHash:this.challengeHash(challengeToken),expiresAt:new Date(Date.now()+5*60*1000)}});return{mfaRequired:true as const,challengeToken}}

  // The caller's transaction includes issuing the resulting authenticated session.
  async verifyChallenge(challengeToken:string,code:string,tx:Prisma.TransactionClient){
    const token=this.requireChallenge(challengeToken),now=new Date();
    const session=await tx.session.findUnique({where:{tokenHash:this.challengeHash(token)},include:{account:{select:{status:true,emailVerifiedAt:true}}}});
    if(!session||session.revokedAt||session.expiresAt<=now||session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt)throw new UnauthorizedException('Invalid MFA challenge.');
    const credential=await this.credential(session.accountId,tx);
    if(!credential?.enabledAt||!await this.verifyCode(session.accountId,credential,code,true,tx))throw new UnauthorizedException('Invalid MFA code.');
    const consumed=await tx.session.updateMany({where:{id:session.id,tokenHash:this.challengeHash(token),revokedAt:null,expiresAt:{gt:now}},data:{revokedAt:now}});
    if(consumed.count!==1)throw new UnauthorizedException('Invalid MFA challenge.');
    return session.accountId;
  }

  async invalidateChallenge(challengeToken:string){const token=this.requireChallenge(challengeToken);await this.db.session.updateMany({where:{tokenHash:this.challengeHash(token),revokedAt:null},data:{revokedAt:new Date()}})}

  async status(accountId:string){const credential=await this.credential(accountId);return{enabled:Boolean(credential?.enabledAt),recoveryCodesRemaining:credential?.enabledAt?credential.recoveryCodeHashes.length:0}}

  async beginSetup(accountId:string){
    return this.db.serializable(async tx=>{
      const account=await tx.account.findUnique({where:{id:accountId},select:{email:true,status:true,emailVerifiedAt:true}});
      if(!account||account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new UnauthorizedException('Active verified account required.');
      const existing=await this.credential(accountId,tx);
      if(existing?.enabledAt)throw new ConflictException({code:'MFA_ALREADY_ENABLED',message:'المصادقة الثنائية مفعّلة بالفعل. حدّث حالة أمان الحساب.'});
      // Reopening an unexpired setup must not replace the key in another tab.
      const reusable=existing?.setupExpiresAt&&Date.parse(existing.setupExpiresAt)>Date.now();
      const secret=reusable?revealSecret(existing.encryptedSecret):encodeBase32(randomBytes(20));
      const setupExpiresAt=reusable?existing.setupExpiresAt!:new Date(Date.now()+10*60*1000).toISOString();
      if(!reusable)await this.save(accountId,{version:1,enabledAt:null,setupExpiresAt,encryptedSecret:protectSecret(secret),recoveryCodeHashes:[]},tx);
      const label=encodeURIComponent(`HYDROLAND:${account.email}`),issuer=encodeURIComponent('HYDROLAND');
      return{secret,otpauthUri:`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,expiresInSeconds:Math.max(1,Math.ceil((Date.parse(setupExpiresAt)-Date.now())/1000))};
    });
  }

  async confirmSetup(accountId:string,code:string,currentSessionId:string){
    return this.db.serializable(async tx=>{
      const credential=await this.credential(accountId,tx);
      if(!credential||credential.enabledAt||!credential.setupExpiresAt||new Date(credential.setupExpiresAt)<=new Date())throw new UnauthorizedException('MFA setup expired or unavailable.');
      if(!verifyTotp(revealSecret(credential.encryptedSecret),code))throw new UnauthorizedException('Invalid MFA code.');
      const recoveryCodes=Array.from({length:10},()=>createRecoveryCode());
      await this.save(accountId,{...credential,enabledAt:new Date().toISOString(),setupExpiresAt:null,recoveryCodeHashes:recoveryCodes.map(recoveryHash)},tx);
      await this.revokeOthers(accountId,currentSessionId,tx);
      return{enabled:true,recoveryCodes};
    });
  }

  async disable(accountId:string,code:string,currentSessionId:string){
    return this.db.serializable(async tx=>{
      const credential=await this.credential(accountId,tx);if(!credential?.enabledAt)throw new BadRequestException('MFA is not enabled.');
      if(!await this.verifyCode(accountId,credential,code,false,tx))throw new UnauthorizedException('Invalid MFA code.');
      await tx.operationalSetting.deleteMany({where:{key:this.settingKey(accountId)}});
      await this.revokeOthers(accountId,currentSessionId,tx);return{enabled:false};
    });
  }

  private async credential(accountId:string,tx:Prisma.TransactionClient=this.db):Promise<Credential|null>{
    const row=await tx.operationalSetting.findUnique({where:{key:this.settingKey(accountId)}}),value=row?.value;if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const item=value as Record<string,unknown>;if(item.version!==1||typeof item.encryptedSecret!=='string'||!Array.isArray(item.recoveryCodeHashes))return null;
    return{version:1,enabledAt:typeof item.enabledAt==='string'?item.enabledAt:null,setupExpiresAt:typeof item.setupExpiresAt==='string'?item.setupExpiresAt:null,encryptedSecret:item.encryptedSecret,recoveryCodeHashes:item.recoveryCodeHashes.filter((entry):entry is string=>typeof entry==='string')};
  }
  private save(accountId:string,credential:Credential,tx:Prisma.TransactionClient){return tx.operationalSetting.upsert({where:{key:this.settingKey(accountId)},create:{key:this.settingKey(accountId),value:credential},update:{value:credential,updatedAt:new Date()}})}
  private async verifyCode(accountId:string,credential:Credential,code:string,consumeRecovery:boolean,tx:Prisma.TransactionClient){const normalized=String(code||'').trim().toUpperCase();if(/^\d{6}$/.test(normalized))return verifyTotp(revealSecret(credential.encryptedSecret),normalized);const hash=recoveryHash(normalized),index=credential.recoveryCodeHashes.indexOf(hash);if(index<0)return false;if(consumeRecovery)await this.save(accountId,{...credential,recoveryCodeHashes:credential.recoveryCodeHashes.filter((_,position)=>position!==index)},tx);return true}
  private settingKey(accountId:string){return`auth.mfa.account.${accountId}`}
  private challengeHash(token:string){return`mfa:${createHash('sha256').update(token).digest('hex')}`}
  private requireChallenge(value:string){if(typeof value!=='string'||value.trim().length<32)throw new UnauthorizedException('Invalid MFA challenge.');return value.trim()}
  private revokeOthers(accountId:string,currentSessionId:string,tx:Prisma.TransactionClient){return tx.session.updateMany({where:{accountId,id:{not:currentSessionId},revokedAt:null},data:{revokedAt:new Date()}})}
}
