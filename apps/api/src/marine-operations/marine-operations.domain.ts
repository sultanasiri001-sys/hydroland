export const MARINE_ASSET_TYPES=['DIVE_BOAT','YACHT','RIB','SUPPORT_VESSEL','OTHER'] as const;
export type MarineAssetType=typeof MARINE_ASSET_TYPES[number];
export const REQUIRED_MARINE_DOCUMENTS=['REGISTRATION','NAVIGATION_LICENSE','SAFETY_CERTIFICATE'] as const;
export type MarineReadinessResult={status:'READY'|'NEEDS_REVIEW'|'NOT_READY';reasonCodes:string[]};
