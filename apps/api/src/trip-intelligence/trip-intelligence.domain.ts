export type BriefingStatus='DRAFT'|'REVIEW'|'PUBLISHED'|'SUPERSEDED';
export type TranslationLevel='MACHINE_TRANSLATABLE'|'REVIEWED_TRANSLATION'|'CONTROLLED_SAFETY_CONTENT';
export type OfflineReadiness='NOT_READY'|'UPDATE_REQUIRED'|'READY';

export interface TripBriefingVersion {
  id:string; tripId:string; version:number; status:BriefingStatus;
  divePlanVersion:number; emergencyPlanVersion:number; safetyVersion:number;
  mapVersion:number; mediaVersion:number; languageVersion:number;
  publishedAt?:Date;
}
export interface OfflinePackageManifest {
  tripId:string; briefingVersion:number; generatedAt:Date;
  files:Array<{key:string;version:number;checksum:string;sizeBytes:number;classification:'PUBLIC_CACHE'|'OPERATIONAL_OFFLINE'|'SENSITIVE_ENCRYPTED'}>;
  readiness:OfflineReadiness;
}
export interface EmergencyPhrase {
  code:string; sourceText:string; safetyReviewed:boolean; translations:Record<string,string>;
}
