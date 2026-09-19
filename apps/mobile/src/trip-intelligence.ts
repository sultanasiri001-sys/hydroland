import {authorizedFetch} from './api';
export type OfflinePackageStatus={tripId:string;briefingVersion?:number;status:'NOT_READY'|'UPDATE_REQUIRED'|'READY'|string;reason?:string;checksum?:string;generatedAt?:string};
export function getOfflinePackageStatus(tripId:string){return authorizedFetch<OfflinePackageStatus>(`/trip-intelligence/${encodeURIComponent(tripId)}/offline-package`)}
