import { createHmac, timingSafeEqual } from 'node:crypto';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const decodeBase32=(value:string)=>{
  const clean=value.replace(/=+$/,'').toUpperCase();let bits=0,buffer=0;const bytes:number[]=[];
  for(const char of clean){const index=alphabet.indexOf(char);if(index<0)throw new Error('Invalid base32 value.');buffer=(buffer<<5)|index;bits+=5;if(bits>=8){bytes.push((buffer>>>(bits-8))&255);bits-=8}}
  return Buffer.from(bytes);
};

export const verifyTotp=(secret:string,code:string,nowMs=Date.now())=>{
  const normalized=String(code||'').trim();if(!/^\d{6}$/.test(normalized))return false;
  const key=decodeBase32(secret),counterNow=Math.floor(nowMs/30000);
  for(const offset of[-1,0,1]){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(counterNow+offset));const digest=createHmac('sha1',key).update(counter).digest(),position=digest[digest.length-1]&15;const value=((digest[position]&127)<<24)|((digest[position+1]&255)<<16)|((digest[position+2]&255)<<8)|(digest[position+3]&255),expected=String(value%1000000).padStart(6,'0');if(timingSafeEqual(Buffer.from(expected),Buffer.from(normalized)))return true}
  return false;
};
