import {authorizedFetch} from './api';
export type OfflinePackageStatus={tripId:string;briefingVersion?:number;status:'NOT_READY'|'UPDATE_REQUIRED'|'READY'|string;reason?:string;checksum?:string;generatedAt?:string};
export type OfflinePackageContent={tripId:string;briefingVersion:number;checksum:string;generatedAt:string;manifest:unknown};
export function getOfflinePackageStatus(tripId:string){return authorizedFetch<OfflinePackageStatus>(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package`)}
export function getOfflinePackageContent(tripId:string){return authorizedFetch<OfflinePackageContent>(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package/content`)}
