import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { EmailDeliveryService, AuthEmailPurpose } from '../integrations/email-delivery.service';
import { AuthService } from './auth.service';

@Injectable()
export class AuthChallengeDeliveryService {
  constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly email:EmailDeliveryService){}

  async dispatch(emailInput:string,purpose:AuthEmailPurpose):Promise<void>{
    const email=typeof emailInput==='string'?emailInput.trim().toLowerCase():'';
    if(!email)return;
    try{
      const account=await this.db.account.findUnique({where:{email},select:{id:true}});
      if(!account)return;
      const type=purpose==='VERIFY_EMAIL'?'AUTH_EMAIL_VERIFICATION':'AUTH_PASSWORD_RESET';
      const challenge=await this.db.notification.findFirst({where:{accountId:account.id,type,status:'PENDING'},orderBy:{createdAt:'desc'},select:{id:true,payload:true}});
      if(!challenge)return;
      const materialized=await this.auth.materializePendingChallenge(challenge.id);
      const result=await this.email.sendAuthChallenge({notificationId:challenge.id,to:materialized.email,purpose:materialized.purpose,token:materialized.token,expiresAt:materialized.expiresAt});
      await this.mark(challenge.id,challenge.payload,{deliveryStatus:'SENT',deliveryProvider:result.provider,providerMessageId:result.messageId,lastDeliveryAt:new Date().toISOString()});
    }catch{
      const account=await this.db.account.findUnique({where:{email},select:{id:true}}).catch(()=>null);
      if(!account)return;
      const type=purpose==='VERIFY_EMAIL'?'AUTH_EMAIL_VERIFICATION':'AUTH_PASSWORD_RESET';
      const challenge=await this.db.notification.findFirst({where:{accountId:account.id,type,status:'PENDING'},orderBy:{createdAt:'desc'},select:{id:true,payload:true}}).catch(()=>null);
      if(challenge)await this.mark(challenge.id,challenge.payload,{deliveryStatus:'DEFERRED',lastDeliveryAt:new Date().toISOString()}).catch(()=>undefined);
    }
  }

  private async mark(id:string,payload:Prisma.JsonValue,metadata:Record<string,unknown>){
    const base=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:{};
    await this.db.notification.updateMany({where:{id,status:'PENDING'},data:{payload:{...base,...metadata} as Prisma.InputJsonValue}});
  }
}
