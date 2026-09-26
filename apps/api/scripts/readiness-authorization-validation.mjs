import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const health=read('src/health/health.controller.ts');
const readiness=read('src/health/integration-readiness.controller.ts');
const settlement=read('src/payments/settlement-readiness.controller.ts');
const distress=read('src/integrations/distress-ais-readiness.controller.ts');
const onboarding=read('src/integrations/official-onboarding-readiness.controller.ts');
const integrationController=read('src/integrations/integration.controller.ts');
const inventory=read('scripts/production-integration-inventory.mjs');

const guarded=[readiness,settlement,distress,onboarding];
for(const source of guarded){
  if(!source.includes('@UseGuards(AccessTokenGuard,AdminGuard)'))throw new Error('Detailed readiness controller is not protected by AccessTokenGuard + AdminGuard.');
}
if(health.includes("@Get('integrations/"))throw new Error('Public HealthController must not expose detailed integration readiness routes.');
if(!integrationController.includes("@Get('maps/public-config')")||!integrationController.includes("@Get('weather/public-config')"))throw new Error('Public maps/weather config routes must remain available.');
if(!integrationController.includes('@UseGuards(AccessTokenGuard,AdminGuard) @Get(\'catalog\')'))throw new Error('Integration catalog must remain Admin-only.');

for(const route of ['payment','settlement','email','sms','whatsapp','object-storage','translation','esign','distress-ais','nafath','regulatory']){
  const guardedRead=`adminRead('/health/integrations/${route}')`;
  const publicRead=`read('/health/integrations/${route}')`;
  if(!inventory.includes(guardedRead))throw new Error(`Production inventory must authenticate readiness route: ${route}`);
  if(inventory.includes(publicRead))throw new Error(`Production inventory must not access readiness route publicly: ${route}`);
}
for(const route of ['/integrations/maps/public-config','/integrations/weather/public-config']){
  if(!inventory.includes(`read('${route}')`))throw new Error(`Public inventory route must remain unauthenticated: ${route}`);
}

console.log('Stage 3 readiness authorization validation passed.');
