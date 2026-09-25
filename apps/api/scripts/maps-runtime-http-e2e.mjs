const base=process.env.MAPS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const response=await fetch(`${base}/integrations/maps/public-config`);
const body=await response.json().catch(()=>null);
if(!response.ok)throw new Error(`Maps public config expected 200, got ${response.status}: ${JSON.stringify(body)}`);
if(body?.engine!=='MAPLIBRE'||body?.engineVersion!=='6.11.2')throw new Error(`Unexpected map engine contract: ${JSON.stringify(body)}`);
if(body?.status!=='SANDBOX'||body?.provider!=='E2E_MAPS'||body?.enabled!==true)throw new Error(`Sandbox maps integration was not exposed as operational: ${JSON.stringify(body)}`);
if(body?.styleUrl!=='https://maps.hydroland.test/style.json')throw new Error(`Public map style URL mismatch: ${JSON.stringify(body)}`);
if(Object.keys(body||{}).some(key=>/secret|password|private|apiKey/i.test(key)))throw new Error('Maps public config exposed a secret-shaped property.');
console.log('Maps runtime HTTP E2E passed: governed public config exposes MapLibre sandbox metadata without secret fields.');
