import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const THEME_CATALOG = [
  { id: 'ocean-horizon', nameAr: 'هيدرولاند الأساسي', nameEn: 'Ocean Horizon', category: 'core', symbol: 'H', description: 'الهوية البحرية الأساسية الفاخرة لهيدرولاند', builtIn: true, enabled: true },
  { id: 'ramadan-nights', nameAr: 'ليالي رمضان', nameEn: 'Ramadan Nights', category: 'seasonal', symbol: '☾', description: 'ليل بحري هادئ بلمسات زمردية وذهبية', builtIn: true, enabled: true },
  { id: 'eid-al-fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Al-Fitr', category: 'seasonal', symbol: '✦', description: 'ثيم احتفالي راقٍ بلؤلؤ وذهب وتركواز', builtIn: true, enabled: true },
  { id: 'hajj-season', nameAr: 'موسم الحج', nameEn: 'Hajj Season', category: 'seasonal', symbol: '◆', description: 'هوية هادئة ومحترمة بلمسات سوداء وذهبية', builtIn: true, enabled: true },
  { id: 'founding-day', nameAr: 'يوم التأسيس', nameEn: 'Founding Day', category: 'national', symbol: '1727', description: 'درجات ترابية ونخيلية مستوحاة من الهوية السعودية', builtIn: true, enabled: true },
  { id: 'national-day', nameAr: 'اليوم الوطني', nameEn: 'Saudi National Day', category: 'national', symbol: '🇸🇦', description: 'أخضر سعودي فاخر مع تفاصيل لؤلؤية', builtIn: true, enabled: true },
] as const;
const CUSTOM_THEME_KEY = 'themes.custom';
const TOKEN_KEYS = ['primary','secondary','accent','gold','bg','surface','text','muted'] as const;
type ThemeStatus = 'DRAFT'|'PUBLISHED'|'ARCHIVED';
type CustomTheme = { id:string; nameAr:string; nameEn?:string; category:string; symbol?:string; description?:string; tokens?:Record<string,string>; builtIn?:false; enabled?:boolean };
type ThemeScheduleRow = { id:string; themeId:string; name:string|null; status:ThemeStatus; startsAt:Date; endsAt:Date; createdById:string|null; createdAt:Date; updatedAt:Date };

@Injectable()
export class ThemesService {
  constructor(private readonly db:DatabaseService, private readonly audit:AuditService) {}

  private async customThemes():Promise<CustomTheme[]> {
    const rows=await this.db.$queryRawUnsafe<Array<{value:unknown}>>('SELECT "value" FROM "OperationalSetting" WHERE "key"=$1 LIMIT 1',CUSTOM_THEME_KEY);
    const value=rows[0]?.value;
    return Array.isArray(value)?value.filter((item):item is CustomTheme=>Boolean(item&&typeof item==='object'&&typeof(item as CustomTheme).id==='string')).map(item=>({...item,builtIn:false,enabled:item.enabled!==false})):[];
  }
  private async saveCustomThemes(items:CustomTheme[]) {
    await this.db.$executeRawUnsafe('INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ($1,$2::jsonb,NOW()) ON CONFLICT ("key") DO UPDATE SET "value"=$2::jsonb,"updatedAt"=NOW()',CUSTOM_THEME_KEY,JSON.stringify(items));
  }
  private cleanTokens(tokens:unknown) {
    if(!tokens||typeof tokens!=='object'||Array.isArray(tokens)) return {};
    return Object.fromEntries(Object.entries(tokens).filter(([key,value])=>TOKEN_KEYS.includes(key as typeof TOKEN_KEYS[number])&&typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)));
  }
  private cleanTheme(input:Partial<CustomTheme>, id:string, previous?:CustomTheme):CustomTheme {
    const nameAr=String(input.nameAr??previous?.nameAr??'').trim();
    if(nameAr.length<2||nameAr.length>80) throw new BadRequestException('Arabic theme name is required.');
    const category=String(input.category??previous?.category??'custom').trim().slice(0,32)||'custom';
    if(!/^[a-z0-9-]{2,32}$/i.test(category)) throw new BadRequestException('Invalid theme category.');
    return {id,nameAr,nameEn:String(input.nameEn??previous?.nameEn??'').trim().slice(0,80)||undefined,category,symbol:String(input.symbol??previous?.symbol??'H').trim().slice(0,8)||'H',description:String(input.description??previous?.description??'').trim().slice(0,240)||undefined,tokens:input.tokens===undefined?(previous?.tokens||{}):this.cleanTokens(input.tokens),builtIn:false,enabled:input.enabled===undefined?(previous?.enabled!==false):Boolean(input.enabled)};
  }

  async catalog(){return [...THEME_CATALOG,...(await this.customThemes()).filter(theme=>theme.enabled!==false)]}
  async adminCatalog(){return [...THEME_CATALOG,...await this.customThemes()]}

  async createCustomTheme(input:Partial<CustomTheme>,accountId?:string){
    const id=String(input.id||'').trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]{2,48}$/.test(id)) throw new BadRequestException('Theme id must be a 3-49 character lowercase slug.');
    if((await this.adminCatalog()).some(theme=>theme.id===id)) throw new ConflictException('Theme id already exists.');
    const theme=this.cleanTheme(input,id);
    const custom=await this.customThemes();custom.push(theme);await this.saveCustomThemes(custom);
    await this.audit.record({action:'CUSTOM_THEME_CREATED',resource:'Theme',resourceId:id,metadata:{accountId:accountId??null,category:theme.category}});
    return theme;
  }

  async updateCustomTheme(id:string,input:Partial<CustomTheme>,accountId?:string){
    if(THEME_CATALOG.some(theme=>theme.id===id)) throw new BadRequestException('Built-in themes are immutable.');
    const custom=await this.customThemes();const index=custom.findIndex(theme=>theme.id===id);
    if(index<0) throw new NotFoundException('Custom theme not found.');
    const previous=custom[index];const updated=this.cleanTheme(input,id,previous);custom[index]=updated;await this.saveCustomThemes(custom);
    if(updated.enabled===false&&previous.enabled!==false){await this.db.$executeRawUnsafe('UPDATE "ThemeSchedule" SET "status"=\'ARCHIVED\',"updatedAt"=NOW() WHERE "themeId"=$1 AND "status" IN (\'DRAFT\',\'PUBLISHED\')',id)}
    await this.audit.record({action:'CUSTOM_THEME_UPDATED',resource:'Theme',resourceId:id,metadata:{accountId:accountId??null,enabled:updated.enabled,category:updated.category}});
    return updated;
  }

  private async assertThemeExists(themeId:string){if(!(await this.catalog()).some(theme=>theme.id===themeId))throw new BadRequestException('Unknown or disabled theme.')}
  private async assertNoPublishedOverlap(startsAt:Date,endsAt:Date,excludeId?:string){const rows=await this.db.$queryRawUnsafe<Array<{id:string}>>('SELECT "id" FROM "ThemeSchedule" WHERE "status"=\'PUBLISHED\' AND "startsAt" < $1 AND "endsAt" > $2 AND ($3::text IS NULL OR "id" <> $3) LIMIT 1',endsAt,startsAt,excludeId??null);if(rows.length)throw new ConflictException('Published theme schedule overlaps an existing published schedule.')}
  async active(){const rows=await this.db.$queryRawUnsafe<ThemeScheduleRow[]>('SELECT * FROM "ThemeSchedule" WHERE "status" = \'PUBLISHED\' AND "startsAt" <= NOW() AND "endsAt" >= NOW() ORDER BY "startsAt" DESC LIMIT 1');const active=rows[0];if(active){const valid=(await this.catalog()).some(theme=>theme.id===active.themeId);if(valid)return active}return{themeId:'ocean-horizon',status:'FALLBACK'}}
  async listSchedules(){return this.db.$queryRawUnsafe<ThemeScheduleRow[]>('SELECT * FROM "ThemeSchedule" ORDER BY "startsAt" DESC')}
  async schedule(input:{themeId?:string;name?:string;startsAt?:string;endsAt?:string;status?:ThemeStatus},createdById?:string){const themeId=input.themeId??'';await this.assertThemeExists(themeId);if(!input.startsAt||!input.endsAt)throw new BadRequestException('startsAt and endsAt are required.');const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)throw new BadRequestException('Invalid theme schedule window.');const status:ThemeStatus=input.status??'DRAFT';if(!['DRAFT','PUBLISHED','ARCHIVED'].includes(status))throw new BadRequestException('Invalid theme status.');if(status==='PUBLISHED')await this.assertNoPublishedOverlap(startsAt,endsAt);const id=randomUUID();const rows=await this.db.$queryRawUnsafe<ThemeScheduleRow[]>('INSERT INTO "ThemeSchedule" ("id","themeId","name","status","startsAt","endsAt","createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',id,themeId,input.name??null,status,startsAt,endsAt,createdById??null);const created=rows[0];await this.audit.record({action:'THEME_SCHEDULE_CREATED',resource:'ThemeSchedule',resourceId:created.id,metadata:{accountId:createdById??null,themeId:created.themeId,status:created.status,startsAt:created.startsAt,endsAt:created.endsAt}});return created}
  async setStatus(id:string,status:ThemeStatus,accountId?:string){if(!['DRAFT','PUBLISHED','ARCHIVED'].includes(status))throw new BadRequestException('Invalid theme status.');const existing=await this.db.$queryRawUnsafe<ThemeScheduleRow[]>('SELECT * FROM "ThemeSchedule" WHERE "id"=$1 LIMIT 1',id);if(!existing[0])throw new NotFoundException('Theme schedule not found.');if(status==='PUBLISHED'){await this.assertThemeExists(existing[0].themeId);await this.assertNoPublishedOverlap(existing[0].startsAt,existing[0].endsAt,id)}const rows=await this.db.$queryRawUnsafe<ThemeScheduleRow[]>('UPDATE "ThemeSchedule" SET "status"=$2,"updatedAt"=NOW() WHERE "id"=$1 RETURNING *',id,status);const updated=rows[0];await this.audit.record({action:'THEME_SCHEDULE_STATUS_CHANGED',resource:'ThemeSchedule',resourceId:id,metadata:{accountId:accountId??null,themeId:updated.themeId,previousStatus:existing[0].status,status:updated.status}});return updated}
}
