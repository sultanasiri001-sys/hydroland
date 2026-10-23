import {spawn, spawnSync} from 'node:child_process';
import {createServer, request as proxyRequest} from 'node:http';
import path from 'node:path';
import {assertUatEnvironment} from './guard.mjs';
import {root} from './schema.mjs';
import {createStaticServer} from '../../apps/web/scripts/serve.mjs';

assertUatEnvironment();
const port = Number(process.env.PORT ?? 4173), apiPort = Number(process.env.HYDROLAND_UAT_API_PORT ?? 3101);
if (port === apiPort) throw new Error('UAT_PORT_CONFLICT');
const origin = new URL(process.env.RENDER_EXTERNAL_URL || process.env.HYDROLAND_UAT_WEB_ORIGIN || 'http://127.0.0.1:'+port);
if (['hydroland.onrender.com','hydroland-web.onrender.com'].includes(origin.hostname)) throw new Error('UAT_PRODUCTION_ORIGIN_DENIED');
const initialized = spawnSync(process.execPath,[path.join(root,'scripts/center-uat/bootstrap.mjs')],{stdio:'inherit'});
if (initialized.status !== 0) throw new Error('UAT_BOOTSTRAP_FAILED');
const api = spawn(process.execPath,[path.join(root,'apps/api/dist/main.js')],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',CI:'false',GITHUB_ACTIONS:'false',PORT:String(apiPort),WEB_ORIGIN:origin.origin,HYDROLAND_PUBLIC_WEB_ORIGIN:origin.origin}});
const staticServer = createStaticServer(path.join(root,'apps/web/dist'));
const gateway = createServer((req,res) => {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
  const url = new URL(req.url,'http://localhost');
  if (/^\/api\/v1\/auth\/register\/*$/i.test(url.pathname)) { res.writeHead(403,{'content-type':'application/json'}).end(JSON.stringify({message:'بيئة قبول مغلقة؛ استخدم حسابات الاختبار المخصصة.'})); return; }
  if (!url.pathname.startsWith('/api/v1/')) { staticServer.emit('request',req,res); return; }
  const upstream = proxyRequest({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:'+apiPort}}, incoming => {
    res.writeHead(incoming.statusCode,incoming.headers); incoming.pipe(res);
  });
  upstream.setTimeout(30000,()=>upstream.destroy());
  upstream.on('error',()=>{ if (!res.headersSent) res.writeHead(502,{'content-type':'application/json'}); res.end('{"message":"UAT API unavailable"}'); });
  req.on('aborted',()=>upstream.destroy()); req.pipe(upstream);
});
api.once('exit', code => { gateway.close(); process.exit(code || 1); });
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{gateway.close();api.kill(signal);});
let ready = false;
for (let attempt=0;attempt<45;attempt++) {
  try { const response=await fetch('http://127.0.0.1:'+apiPort+'/api/v1/health/ready'); if(response.ok){ready=true;break;} } catch {}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
if (!ready) {api.kill();throw new Error('UAT_API_NOT_READY');}
gateway.listen(port,'0.0.0.0',()=>console.log('HYDROLAND synthetic center UAT ready'));
