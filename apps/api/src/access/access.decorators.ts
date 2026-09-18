import { SetMetadata } from '@nestjs/common';
export const PERMISSION_KEY='hydroland:permission';
export const SCOPE_PARAM_KEY='hydroland:scope-param';
export const RequirePermission=(permission:string)=>SetMetadata(PERMISSION_KEY,permission);
export const ResourceScopeParam=(paramName:string)=>SetMetadata(SCOPE_PARAM_KEY,paramName);
