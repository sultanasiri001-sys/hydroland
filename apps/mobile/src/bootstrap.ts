import {getAccessToken} from './session';
export type BootstrapState='LOADING'|'AUTHENTICATED'|'GUEST';
export async function bootstrapSession():Promise<BootstrapState>{try{return await getAccessToken()?'AUTHENTICATED':'GUEST'}catch{return'GUEST'}}
