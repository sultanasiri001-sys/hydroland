// No helper import or side effect before the parent persists process ownership.
await new Promise((resolve,reject)=>{
 process.once('message',message=>message==='START'?resolve():reject(new Error('Invalid start gate')));
 process.once('disconnect',()=>reject(new Error('Parent disconnected before start')));
});
const {readFile}=await import('node:fs/promises');
const {applicationVersionSwitchRehearsal}=await import('./application-version-switch-rehearsal.mjs');
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
await applicationVersionSwitchRehearsal(input);
if(process.connected)process.disconnect();
