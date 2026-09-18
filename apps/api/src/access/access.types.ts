export type ScopeType = 'GLOBAL' | 'REGION' | 'CENTER' | 'DEPARTMENT' | 'SELF';

export interface AccessGrant {
  roleKey:string;
  permission:string;
  scopeType:ScopeType;
  scopeId:string|null;
}
export interface AccessContext {
  accountId:string;
  grants:AccessGrant[];
  active:boolean;
}
export function canAccess(context:AccessContext,permission:string,resourceScopeId?:string):boolean {
  if(!context.active) return false;
  return context.grants.some(g=>{
    if(g.permission!==permission) return false;
    if(g.scopeType==='GLOBAL') return true;
    if(g.scopeType==='SELF') return resourceScopeId===context.accountId;
    return Boolean(resourceScopeId)&&g.scopeId===resourceScopeId;
  });
}
