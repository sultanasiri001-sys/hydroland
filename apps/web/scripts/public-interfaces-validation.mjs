import { readFile } from 'node:fs/promises';
const root=new URL('../src/',import.meta.url);
const [html,visitor,store]=await Promise.all([
  readFile(new URL('index.html',root),'utf8'),
  readFile(new URL('hydroland-public-discovery.css',root),'utf8'),
  readFile(new URL('hydroland-store.js',root),'utf8')
]);
for(const id of ['home','explore','trips','training','store','marine-intelligence']) if(!html.includes('id="'+id+'"')) throw new Error('Missing public surface: '+id);
for(const label of ['الرحلات والأنشطة','التدريب والدورات','المتجر البحري','الذكاء البحري']) if(!html.includes(label)) throw new Error('Missing discovery route: '+label);
for(const token of ['var(--hl-theme-accent','var(--hl-theme-gold','hl-public-explore-grid','hl-public-detail-body']) if(!visitor.includes(token)) throw new Error('Public UI is not bound to approved design system: '+token);
for(const legacy of ['body.hl-visitor-mode{--hl-deep:#003b6f','background:linear-gradient(180deg,#e6f4f8']) if(visitor.includes(legacy)) throw new Error('Legacy light visitor identity still active');
for(const behavior of ["fetch(base+'/store/products')","authorizedFetch('/store/orders'","data-store-add"]) if(!store.includes(behavior)) throw new Error('Store public/checkout behavior missing: '+behavior);
console.log('HYDROLAND Phase 2 public interfaces validation passed.');
