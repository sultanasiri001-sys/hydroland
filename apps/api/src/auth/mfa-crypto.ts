import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const key=()=>{const source=(process.env.MFA_ENCRYPTION_KEY||process.env.JWT_SECRET||'').trim();if(source.length<32)throw new Error('MFA_ENCRYPTION_KEY or JWT_SECRET must be at least 32 characters.');return createHash('sha256').update(source).digest()};

export const encodeBase32=(value:Buffer)=>{let bits=0,buffer=0,out='';for(const byte of value){buffer=(buffer<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(buffer>>>(bits-5))&31];bits-=5}}if(bits>0)out+=alphabet[(buffer<<(5-bits))&31];return out};
export const protectSecret=(value:string)=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv),encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]),tag=cipher.getAuthTag();return`${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`};
export const revealSecret=(value:string)=>{const[ivValue,tagValue,dataValue]=value.split('.');if(!ivValue||!tagValue||!dataValue)throw new Error('Invalid protected secret.');const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(ivValue,'base64url'));decipher.setAuthTag(Buffer.from(tagValue,'base64url'));return Buffer.concat([decipher.update(Buffer.from(dataValue,'base64url')),decipher.final()]).toString('utf8')};
export const createRecoveryCode=()=>{const raw=encodeBase32(randomBytes(5)).slice(0,8);return`${raw.slice(0,4)}-${raw.slice(4,8)}`};
export const recoveryHash=(value:string)=>createHmac('sha256',key()).update(`recovery:${String(value||'').replace(/\s/g,'').toUpperCase()}`).digest('hex');
