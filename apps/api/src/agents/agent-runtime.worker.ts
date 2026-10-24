import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgentRuntimeService } from './agent-runtime.service';

@Injectable()
export class AgentRuntimeWorker implements OnModuleInit,OnModuleDestroy {
  private readonly logger=new Logger(AgentRuntimeWorker.name);
  private timer?:NodeJS.Timeout;
  private inflight?:Promise<void>;
  private stopping=false;
  constructor(private readonly runtime:AgentRuntimeService){}
  onModuleInit(){if(process.env.NODE_ENV==='test'&&process.env.HYDROLAND_AI_TEST_MANUAL_WORKER==='1')return;this.poll();this.timer=setInterval(()=>this.poll(),5000);this.timer.unref?.();}
  async onModuleDestroy(){this.stopping=true;if(this.timer)clearInterval(this.timer);await this.inflight;}
  private poll(){if(this.stopping||this.inflight)return;this.inflight=this.tick().catch(()=>{this.logger.warn('AI runtime poll failed; execution receipts remain durable and are never replayed automatically.');}).finally(()=>{this.inflight=undefined;});}
  private async tick(){await this.runtime.heartbeat();if(this.stopping)return;const claim=await this.runtime.claim();if(claim)await this.runtime.runClaim(claim);}
}
