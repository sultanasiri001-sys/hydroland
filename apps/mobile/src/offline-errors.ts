export class OfflineAccessError extends Error{
 constructor(public readonly code:'NEEDS_ONLINE_VERIFICATION'|'OFFLINE_ENCRYPTION_UNAVAILABLE'|'OFFLINE_CACHE_CORRUPT'|'PENDING_SYNC',message:string){super(message)}
}
