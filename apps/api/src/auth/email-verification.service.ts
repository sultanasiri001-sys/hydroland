import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

type Delivery='SENT'|'UNAVAILABLE'|'FAILED';
type Challenge={version:1;tokenHash:string;expiresAt:string;issuedAt:string};

@Injectable()
export class EmailVerificationService{
  constructor(private readonly db:DatabaseService){}

  async issueAndSend(accountId:string,email:string):Promise<Delivery>{
    const config=this.deliveryConfig();if(!config)return'UNAVAILABLE';
    const token=`${accountId}.${randomBytes(32).toString('base64url')}`,now=new Date();
    const challenge:Challenge={version:1,tokenHash:this.hash(token),expiresAt:new Date(now.getTime()+60*60*1000).toISOString(),issuedAt:now.toISOString()};
    await this.db.operationalSetting.upsert({where:{key:this.key(accountId)},create:{key:this.key(accountId),value:challenge},update:{value:challenge,updatedAt:now}});
    return this.send(config,email,token);
  }

  async resend(email:string):Promise<{accepted:true;delivery:'ACCEPTED'|'UNAVAILABLE'}>{
    const config=this.deliveryConfig();if(!config)return{accepted:true,delivery:'UNAVAILABLE'};
    const account=await this.db.account.findUnique({where:{email:email.trim().toLowerCase()},select:{id:true,email:true,status:true,emailVerifiedAt:true}});
    if(account&&!account.emailVerifiedAt&&(account.status==='PENDING_VERIFICATION'||account.status==='ACTIVE'))await this.issueAndSend(account.id,account.email);
    return{accepted:true,delivery:'ACCEPTED'};
  }

  async verify(token:string){
    const clean=typeof token==='string'?token.trim():'';const separator=clean.indexOf('.');if(separator<1||clean.length>256)throw new UnauthorizedException('Invalid or expired email verification token.');
    const accountId=clean.slice(0,separator);if(!/^[0-9a-f-]{36}$/i.test(accountId))throw new UnauthorizedException('Invalid or expired email verification token.');
    const row=await this.db.operationalSetting.findUnique({where:{key:this.key(accountId)}}),challenge=this.challenge(row?.value);
    if(!challenge||new Date(challenge.expiresAt)<=new Date()||!this.equalHash(challenge.tokenHash,this.hash(clean)))throw new UnauthorizedException('Invalid or expired email verification token.');
    const now=new Date();
    const result=await this.db.$transaction(async tx=>{
      const activated=await tx.account.updateMany({where:{id:accountId,emailVerifiedAt:null,status:{in:['PENDING_VERIFICATION','ACTIVE']}},data:{status:'ACTIVE',emailVerifiedAt:now}});
      if(activated.count!==1)throw new UnauthorizedException('Invalid or expired email verification token.');
      await tx.operationalSetting.deleteMany({where:{key:this.key(accountId)}});
      return activated.count;
    });
    if(result!==1)throw new UnauthorizedException('Invalid or expired email verification token.');
    return{verified:true as const,accountId};
  }

  providerAvailable(){return Boolean(this.deliveryConfig())}

  private deliveryConfig(){
    const status=(process.env.HYDROLAND_INTEGRATION_EMAIL_STATUS||'NOT_SELECTED').trim().toUpperCase();
    if(status!=='PRODUCTION_ENABLED'&&status!=='SANDBOX')return null;
    const provider=(process.env.HYDROLAND_EMAIL_PROVIDER||'').trim().toUpperCase(),apiKey=(process.env.RESEND_API_KEY||'').trim(),from=(process.env.HYDROLAND_EMAIL_FROM||'').trim(),origin=(process.env.WEB_ORIGIN||'').trim().replace(/\/$/,'');
    if(provider!=='RESEND'||!apiKey||!from||!/^https:\/\//i.test(origin))return null;
    return{apiKey,from,origin};
  }

  private async send(config:{apiKey:string;from:string;origin:string},email:string,token:string):Promise<Delivery>{
    const link=`${config.origin}/#verify-email=${encodeURIComponent(token)}`;
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.from,to:[email],subject:'تأكيد بريد HYDROLAND',html:`<div dir="rtl"><h2>تأكيد البريد الإلكتروني</h2><p>أكمل تفعيل حساب HYDROLAND خلال ساعة واحدة.</p><p><a href="${link}">تأكيد البريد الإلكتروني</a></p><p>إذا لم تطلب إنشاء الحساب فتجاهل الرسالة.</p></div>`}),signal:AbortSignal.timeout(8000)});
      return response.ok?'SENT':'FAILED';
    }catch{return'FAILED'}
  }

  private challenge(value:unknown):Challenge|null{if(!value||typeof value!=='object'||Array.isArray(value))return null;const item=value as Record<string,unknown>;if(item.version!==1||typeof item.tokenHash!=='string'||typeof item.expiresAt!=='string'||typeof item.issuedAt!=='string')return null;return{version:1,tokenHash:item.tokenHash,expiresAt:item.expiresAt,issuedAt:item.issuedAt}}
  private key(accountId:string){return`auth.email-verification.account.${accountId}`}
  private hash(value:string){return createHash('sha256').update(value).digest('hex')}
  private equalHash(left:string,right:string){const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b)}
}
