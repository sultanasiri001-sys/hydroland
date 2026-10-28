import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function identity(pid,read=readFileSync){
 assert(Number.isSafeInteger(pid)&&pid>1);
 const text=read(`/proc/${pid}/stat`,'utf8');
 const fields=text.slice(text.lastIndexOf(')')+2).trim().split(/\s+/);
 return {pid,group:Number(fields[2]),session:Number(fields[3]),start:fields[19],boot:read('/proc/sys/kernel/random/boot_id','utf8').trim()};
}
export async function terminateRecorded(record,{group=false,readIdentity=identity,readBoot=()=>readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),kill=process.kill.bind(process),timeoutMs=5000,now=Date.now,wait=sleep}={}){
 assert(Number.isSafeInteger(record.pid)&&record.pid>1);assert.match(record.start,/^\d+$/);
 assert.equal(readBoot(),record.boot,'Different boot; refuse signalling');
 let current;
 try{current=readIdentity(record.pid);}catch(error){if(error.code!=='ENOENT'&&error.code!=='ESRCH')throw error;}
 if(current)assert.deepEqual(current,record,'PID identity changed; refuse signalling');
 if(group){assert.equal(record.group,record.pid);assert.equal(record.session,record.pid);}
 const target=group?-record.pid:record.pid;
 // An absent leader cannot prove ownership of a surviving numeric target.
 // Probe for absence only; a reused PID/PGID must never authorize SIGKILL.
 if(!current){
  try{kill(target,0);}catch(error){if(error.code==='ESRCH')return;throw error;}
  throw new Error('Recorded process termination unconfirmed: leader absent; refuse signalling');
 }
 const deadline=now()+timeoutMs;
 try{kill(target,'SIGKILL');}catch(error){if(error.code==='ESRCH')return;throw error;}
 while(now()<deadline){
  try{kill(target,0);}catch(error){if(error.code==='ESRCH')return;throw error;}
  await wait(Math.min(25,deadline-now()));
 }
 throw new Error('Recorded process termination unconfirmed');
}
