import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { EmailDeliveryService } from '../integrations/email-delivery.service';
import { IntegrationService } from '../integrations/integration.service';
import { AuthService } from './auth.service';

const TYPES=['AUTH_EMAIL_VERIFICATION','AUTH_PASSWORD_RESET'] as const;

@Injectable()
export class AuthEmailOutboxWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:NodeJS.Timeout;
  private running=false;

  constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly email:EmailDeliveryService,private readonly integrations:IntegrationService){}

  onModuleInit(){
    void this.run();
    this.timer=setInterval(()=>void this.run(),15_000);
    this.timer.unref?.();
  }

  onModuleDestroy(){if(this.timer)clearInterval(this.timer)}

  private async run(){
    if(this.running)return;
    const status=this.integrations.status('EMAIL').status;
    if(status!=='PRODUCTION_ENABLED'&&status!=='SANDBOX')return;
    this.running=true;
    try{
      const rows=await this.db.notification.findMany({
        where:{type:{in:[...TYPES]},status:'PENDING'},
        include:{account:{select:{email:true}}},
        orderBy:{createdAt:'asc'},
        take:25,
      });
      for(const row of rows)await this.deliver(row);
    }finally{this.running=false}
  }

  private async deliver(row:{id:string;type:string;status:string;payload:Prisma.JsonValue;account:{email:string}}){
    const meta=this.metadata(row.payload);
    if(meta.deliveryStatus==='SENT')return;
    const expiresAt=typeof meta.expiresAt==='string'?Date.parse(meta.expiresAt):Number.NaN;
    if(Number.isFinite(expiresAt)&&expiresAt<=Date.now()){
      await this.db.notification.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'FAILED'}});
      return;
    }
    const nextAttemptAt=typeof meta.nextDeliveryAttemptAt==='string'?Date.parse(meta.nextDeliveryAttemptAt):Number.NaN;
    if(Number.isFinite(nextAttemptAt)&&nextAttemptAt>Date.now())return;
    const attempts=typeof meta.deliveryAttempts==='number'&&Number.isFinite(meta.deliveryAttempts)?Math.max(0,Math.floor(meta.deliveryAttempts)):0;
    try{
      const challenge=await this.auth.materializePendingChallenge(row.id);
      const result=await this.email.sendAuthChallenge({notificationId:row.id,to:challenge.email,purpose:challenge.purpose,token:challenge.token,expiresAt:challenge.expiresAt});
      await this.mark(row.id,row.payload,{deliveryStatus:'SENT',deliveryProvider:result.provider,providerMessageId:result.messageId,deliveryAttempts:attempts+1,lastDeliveryAt:new Date().toISOString(),nextDeliveryAttemptAt:null});
    }catch{
      const delay=Math.min(15*60_000,30_000*(2**Math.min(attempts,5)));
      await this.mark(row.id,row.payload,{deliveryStatus:'DEFERRED',deliveryAttempts:attempts+1,lastDeliveryAt:new Date().toISOString(),nextDeliveryAttemptAt:new Date(Date.now()+delay).toISOString()}).catch(()=>undefined);
    }
  }

  private metadata(payload:Prisma.JsonValue){return payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:{};}

  private async mark(id:string,payload:Prisma.JsonValue,metadata:Record<string,unknown>){
    const base=this.metadata(payload);
    await this.db.notification.updateMany({where:{id,status:'PENDING'},data:{payload:{...base,...metadata} as Prisma.InputJsonValue}});
  }
}
