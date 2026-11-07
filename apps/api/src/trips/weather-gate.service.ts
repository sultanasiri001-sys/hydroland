import { Prisma } from '@prisma/client';
import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { validWeatherReview, WeatherReviewContext } from './weather-review-context';
import { mandatoryBindingStatus } from './mandatory-policy.domain';

export type WeatherGateMode = 'ENFORCE' | 'ADVISORY';
export type WeatherDecision = 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED' | 'UNAVAILABLE';
export type WeatherReviewStatus='PENDING'|'APPROVED'|'REJECTED';

export type WeatherSnapshot = {
  forecastContext?: WeatherReviewContext;
  provider?: string;
  source?: string;
  observedAt?: string;
  windSpeedKph?: number;
  windGustKph?: number;
  windDirectionDeg?: number;
  waveHeightM?: number;
  waveDirectionDeg?: number;
  wavePeriodS?: number;
  swellHeightM?: number;
  swellDirectionDeg?: number;
  swellPeriodS?: number;
  currentSpeedMps?: number;
  currentDirectionDeg?: number;
  waterTemperatureC?: number;
  decision?: WeatherDecision;
  reason?: string;
};

export type WeatherGateSettings = {
  enabled: boolean;
  mode: WeatherGateMode;
  provider: string;
};

type SettingRow = { value: unknown };

@Injectable()
export class WeatherGateService {
  constructor(private readonly db: DatabaseService,private readonly audit:AuditService) {}

  private defaults(): WeatherGateSettings {
    return { enabled: false, mode: 'ADVISORY', provider: 'STORMGLASS' };
  }

  async settings(tx: Prisma.TransactionClient = this.db): Promise<WeatherGateSettings> {
    const binding=await this.binding(tx);
    const rows = await tx.$queryRaw<SettingRow[]>`
      SELECT "value" FROM "OperationalSetting" WHERE "key" = 'WEATHER_GATE' LIMIT 1
    `;
    const value = rows[0]?.value;
    const record = value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, unknown> : this.defaults();
    return {
      enabled: binding==='MANDATORY'||record.enabled === true,
      mode: binding==='MANDATORY'||record.mode === 'ENFORCE' ? 'ENFORCE' : 'ADVISORY',
      provider: typeof record.provider === 'string' && record.provider.trim() ? record.provider : 'STORMGLASS',
    };
  }

  async configure(accountId:string,input: { enabled?: boolean; mode?: WeatherGateMode }) {
    return this.db.serializable(async tx=>{
      const current=await this.settings(tx);
      const next:WeatherGateSettings={...current,provider:'STORMGLASS',enabled:typeof input.enabled==='boolean'?input.enabled:current.enabled,mode:input.mode==='ENFORCE'||input.mode==='ADVISORY'?input.mode:current.mode};
      if(await this.binding(tx)==='MANDATORY'&&(!next.enabled||next.mode!=='ENFORCE'))throw new ForbiddenException('لا يمكن تعطيل متطلب الطقس الإلزامي عبر إعداد عام.');
      await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('WEATHER_GATE',${JSON.stringify(next)}::jsonb,NOW()) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","updatedAt"=clock_timestamp()`;
      const state=next.enabled&&next.mode==='ENFORCE'?'ENABLED':'DISABLED';
      await tx.$executeRaw`INSERT INTO "PolicyControl" ("id","category","ruleKey","labelAr","state","updatedByAccountId","createdAt","updatedAt") VALUES (gen_random_uuid()::text,'WEATHER','WEATHER_GATE','اشتراط مراجعة الطقس',${state},${accountId}::uuid,NOW(),NOW()) ON CONFLICT ("category","ruleKey") DO UPDATE SET "state"=EXCLUDED."state","updatedByAccountId"=EXCLUDED."updatedByAccountId","updatedAt"=clock_timestamp()`;
      await this.audit.record({actorId:accountId,action:'WEATHER_GATE_CONFIGURED',resource:'OperationalSetting',resourceId:'WEATHER_GATE',metadata:{accountId,previous:current,current:next,policyState:state}},tx);
      return next;
    });
  }

  private async binding(tx:Prisma.TransactionClient){
    const rows=await tx.$queryRaw<Array<{metadata:unknown}>>`SELECT "metadata" FROM "PolicyControl" WHERE "category"=${'WEATHER'} AND "ruleKey"=${'WEATHER_GATE'} LIMIT 1`;
    const status=mandatoryBindingStatus('WEATHER','WEATHER_GATE',rows[0]?.metadata);
    if(status==='REVIEW_REQUIRED')throw new ConflictException({code:'MANDATORY_SOURCE_REVIEW_REQUIRED',message:'يتطلب مصدر ضابط الطقس وانطباقه مراجعة موثقة.'});
    return status;
  }

  evaluate(snapshot: WeatherSnapshot | null | undefined, settings: WeatherGateSettings) {
    if (!snapshot) {
      return {
        blocking: settings.enabled && settings.mode === 'ENFORCE',
        decision: 'UNAVAILABLE' as const,
        reason: 'Weather data unavailable.',
      };
    }
    const decision = snapshot.decision ?? 'UNAVAILABLE';
    const blocking = settings.enabled && settings.mode === 'ENFORCE' && decision !== 'ALLOWED';
    return { blocking, decision, reason: snapshot.reason ?? null };
  }

  evaluateReview(snapshot:WeatherSnapshot|null|undefined,status:WeatherReviewStatus|null|undefined,settings:WeatherGateSettings,context?:WeatherReviewContext|null,fetchedAt?:Date|string|null){
    if(!snapshot)return this.evaluate(null,settings);
    if(!validWeatherReview(snapshot,context,fetchedAt))return{blocking:settings.enabled&&settings.mode==='ENFORCE',decision:'REVIEW_REQUIRED' as const,reason:'Weather forecast context is missing or changed; refresh and review the current trip forecast.'};
    const decision:WeatherDecision=status==='APPROVED'?'ALLOWED':status==='REJECTED'?'DEFERRED':'REVIEW_REQUIRED';
    const blocking=settings.enabled&&settings.mode==='ENFORCE'&&decision!=='ALLOWED';
    const reason=status==='APPROVED'?'Weather forecast reviewed and approved by an authorized operator.':status==='REJECTED'?'Weather forecast was rejected by an authorized operator.':'Fresh weather forecast requires human operational review.';
    return{blocking,decision,reason};
  }
}
