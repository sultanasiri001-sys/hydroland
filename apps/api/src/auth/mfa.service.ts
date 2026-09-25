import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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

  async verifyChallenge(challengeToken:string,code:string){
    const token=this.requireChallenge(challengeToken),now=new Date();
    const session=await this.db.session.findUnique({where:{tokenHash:this.challengeHash(token)},include:{account:{select:{status:true,emailVerifiedAt:true}}}});
    if(!session||session.revokedAt||session.expiresAt<=now||session.account.status!=='ACTIVE'||!session.account.emailVerifiedAt)throw new UnauthorizedException('Invalid MFA challenge.');
    const credential=await this.credential(session.accountId);
    if(!credential?.enabledAt||!await this.verifyCode(session.accountId,credential,code,true))throw new UnauthorizedException('Invalid MFA code.');
    const consumed=await this.db.session.updateMany({where:{id:session.id,tokenHash:this.challengeHash(token),revokedAt:null,expiresAt:{gt:now}},data:{revokedAt:now}});
    if(consumed.count!==1)throw new UnauthorizedException('Invalid MFA challenge.');
    return session.accountId;
  }

  async status(accountId:string){const credential=await this.credential(accountId);return{enabled:Boolean(credential?.enabledAt),recoveryCodesRemaining:credential?.enabledAt?credential.recoveryCodeHashes.length:0}}

  async beginSetup(accountId:string){
    const account=await this.db.account.findUnique({where:{id:accountId},select:{email:true,status:true,emailVerifiedAt:true}});
    if(!account||account.status!=='ACTIVE'||!account.emailVerifiedAt)throw new UnauthorizedException('Active verified account required.');
    const secret=encodeBase32(randomBytes(20));
    await this.save(accountId,{version:1,enabledAt:null,setupExpiresAt:new Date(Date.now()+10*60*1000).toISOString(),encryptedSecret:protectSecret(secret),recoveryCodeHashes:[]});
    const label=encodeURIComponent(`HYDROLAND:${account.email}`),issuer=encodeURIComponent('HYDROLAND');
    return{secret,otpauthUri:`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,expiresInSeconds:600};
  }

  async confirmSetup(accountId:string,code:string,currentSessionId:string){
    const credential=await this.credential(accountId);
    if(!credential||credential.enabledAt||!credential.setupExpiresAt||new Date(credential.setupExpiresAt)<=new Date())throw new UnauthorizedException('MFA setup expired or unavailable.');
    if(!verifyTotp(revealSecret(credential.encryptedSecret),code))throw new UnauthorizedException('Invalid MFA code.');
    const recoveryCodes=Array.from({length:10},()=>createRecoveryCode());
    await this.save(accountId,{...credential,enabledAt:new Date().toISOString(),setupExpiresAt:null,recoveryCodeHashes:recoveryCodes.map(recoveryHash)});
    await this.revokeOthers(accountId,currentSessionId);
    return{enabled:true,recoveryCodes};
  }

  async disable(accountId:string,code:string,currentSessionId:string){
    const credential=await this.credential(accountId);if(!credential?.enabledAt)throw new BadRequestException('MFA is not enabled.');
    if(!await this.verifyCode(accountId,credential,code,false))throw new UnauthorizedException('Invalid MFA code.');
    await this.db.operationalSetting.deleteMany({where:{key:this.settingKey(accountId)}});await this.revokeOthers(accountId,currentSessionId);return{enabled:false};
  }

  private async credential(accountId:string):Promise<Credential|null>{
    const row=await this.db.operationalSetting.findUnique({where:{key:this.settingKey(accountId)}}),value=row?.value;if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const item=value as Record<string,unknown>;if(item.version!==1||typeof item.encryptedSecret!=='string'||!Array.isArray(item.recoveryCodeHashes))return null;
    return{version:1,enabledAt:typeof item.enabledAt==='string'?item.enabledAt:null,setupExpiresAt:typeof item.setupExpiresAt==='string'?item.setupExpiresAt:null,encryptedSecret:item.encryptedSecret,recoveryCodeHashes:item.recoveryCodeHashes.filter((entry):entry is string=>typeof entry==='string')};
  }
  private save(accountId:string,credential:Credential){return this.db.operationalSetting.upsert({where:{key:this.settingKey(accountId)},create:{key:this.settingKey(accountId),value:credential},update:{value:credential,updatedAt:new Date()}})}
  private async verifyCode(accountId:string,credential:Credential,code:string,consumeRecovery:boolean){const normalized=String(code||'').trim().toUpperCase();if(/^\d{6}$/.test(normalized))return verifyTotp(revealSecret(credential.encryptedSecret),normalized);const hash=recoveryHash(normalized),index=credential.recoveryCodeHashes.indexOf(hash);if(index<0)return false;if(consumeRecovery)await this.save(accountId,{...credential,recoveryCodeHashes:credential.recoveryCodeHashes.filter((_,position)=>position!==index)});return true}
  private settingKey(accountId:string){return`auth.mfa.account.${accountId}`}
  private challengeHash(token:string){return`mfa:${createHash('sha256').update(token).digest('hex')}`}
  private requireChallenge(value:string){if(typeof value!=='string'||value.trim().length<32)throw new UnauthorizedException('Invalid MFA challenge.');return value.trim()}
  private revokeOthers(accountId:string,currentSessionId:string){return this.db.session.updateMany({where:{accountId,id:{not:currentSessionId},revokedAt:null},data:{revokedAt:new Date()}})}
}
