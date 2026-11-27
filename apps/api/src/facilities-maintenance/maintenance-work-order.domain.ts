import { BadRequestException } from '@nestjs/common';
import { templateObject } from '../document-forms/document-template-input';

export const MAINTENANCE_DEPARTMENT = 'FACILITIES_ASSETS_MAINTENANCE';
export const MAINTENANCE_STATES = ['REQUESTED','APPROVED','SCHEDULED','IN_PROGRESS','AWAITING_INSPECTION','INSPECTED','CLOSED','REJECTED'] as const;
export type MaintenanceState = typeof MAINTENANCE_STATES[number];
export type AssetKind = 'MARINE'|'EQUIPMENT';
export type Actor = {accountId:string;personId:string;manager:boolean};
export type AssetSource = {id:string;kind:AssetKind;name:string;organizationId:string;resourceId:string|null;status:string};
export type WorkOrder = {id:string;organizationId:string;marineAssetId:string|null;equipmentResourceId:string|null;maintenanceRecordId:string|null;planId:string|null;planDueAt:Date|null;status:MaintenanceState;revision:number;startsAt:Date|null;endsAt:Date|null;metadata:Record<string,any>;createdAt:Date;updatedAt:Date};
export type PreventivePlan = {id:string;organizationId:string;marineAssetId:string|null;equipmentResourceId:string|null;intervalDays:number;nextDueAt:Date;active:boolean;revision:number;metadata:Record<string,any>;createdAt:Date;updatedAt:Date};
export const object = (value:unknown, keys:string[]) => templateObject(value,keys);
export function identifier(value:unknown, name='reference'):string {
  if(typeof value!=='string'||!value.length||value.length>150||value!==value.trim()||/[\u0000-\u0020]/u.test(value))throw new BadRequestException(`Invalid ${name}.`);
  return value;
}
export function note(value:unknown, minimum=3, maximum=2000):string {
  if(typeof value!=='string'||value.trim().length<minimum||value.length>maximum||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))throw new BadRequestException('أدخل وصفًا أو مرجعًا واضحًا.');
  return value.trim();
}
export function integer(value:unknown,min=0,max=2147483647):number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new BadRequestException('القيمة العددية خارج النطاق.');
  return value;
}
export function date(value:unknown):Date {
  if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new BadRequestException('أدخل وقتًا صحيحًا مع المنطقة الزمنية.');
  return new Date(value);
}
export function assetKind(value:unknown):AssetKind {
  if(value!=='MARINE'&&value!=='EQUIPMENT')throw new BadRequestException('اختر أصلًا بحريًا أو معدة مسجلة.');return value;
}
export function envelope(input:Record<string,unknown>){return {requestId:identifier(input.requestId),expectedRevision:integer(input.expectedRevision,1)};}
export const sourceOf=(row:{marineAssetId:string|null;equipmentResourceId:string|null})=>({kind:(row.marineAssetId?'MARINE':'EQUIPMENT') as AssetKind,id:(row.marineAssetId??row.equipmentResourceId)!});
