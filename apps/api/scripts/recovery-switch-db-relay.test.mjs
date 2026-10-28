import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {relayTarget,assertOwnedListener,hostPreflight,createRelay} from './recovery-switch-db-relay.mjs';
function fixture(){
 const token='12345678-1234-4123-8123-123456789abc',name='a02-rehearsal-'+token,labels={'hydroland.a03.run':token,'hydroland.recovery':'disposable-local'};
 return {state:{token,networkName:name,networkId:'network',postgresId:'postgres'},pg:{Id:'postgres',Name:'/phase11-postgres',State:{Running:true},Config:{Labels:labels},HostConfig:{NetworkMode:name,PublishAllPorts:false,PortBindings:{}},NetworkSettings:{Ports:{'5432/tcp':null},Networks:{[name]:{NetworkID:'network',IPAddress:'172.19.0.2'}}}},network:{Id:'network',Name:name,Internal:true,Driver:'bridge',EnableIPv6:false,Labels:labels,Containers:{postgres:{Name:'phase11-postgres',IPv4Address:'172.19.0.2/16'}}}};
}
test('relay target comes only from matching owned internal-only database attachment',()=>{
 const f=fixture();assert.deepEqual(relayTarget(f.state,f.pg,f.network),{host:'172.19.0.2',port:5432});
 for(const mutate of [f=>f.network.Internal=false,f=>f.pg.Id='foreign',f=>f.network.Labels={},f=>f.pg.HostConfig.PortBindings={'5432/tcp':[{}]},f=>f.pg.NetworkSettings.Ports['5432/tcp']=[{}],f=>f.pg.NetworkSettings.Networks.bridge={},f=>f.pg.NetworkSettings.Networks[f.state.networkName].IPAddress='8.8.8.8',f=>f.pg.NetworkSettings.Networks[f.state.networkName].NetworkID='foreign',f=>f.network.Containers.postgres.IPv4Address='172.19.0.3/16',f=>f.pg.State.Running=false]){
  const changed=structuredClone(f);mutate(changed);assert.throws(()=>relayTarget(changed.state,changed.pg,changed.network));
 }
});
test('only the recorded process IPv4-loopback listener is accepted',()=>{
 const row='0: 0100007F:1538 00000000:0000 0A 0:0 0:0 0 1000 0 1234';
 assertOwnedListener('header\n'+row,new Set(['1234']));
 for(const [text,inodes] of [[row.replace('0100007F','00000000'),new Set(['1234'])],[row,new Set(['999'])],[row+'\n'+row,new Set(['1234'])],['',new Set()]])assert.throws(()=>assertOwnedListener('header\n'+text,inodes));
});
test('internal readiness cannot substitute for host SQL; unreachable and timed-out probes retain FAIL',()=>{
 for(const error of ['P1001','ETIMEDOUT during disconnect']){
  const receipts=[];let verified=0;
  assert.throws(()=>hostPreflight({target:{host:'172.19.0.2'},expectedSystem:'123',verify:()=>verified++,persist:r=>receipts.push(structuredClone(r)),probe:()=>{throw Error(error);}}),/HOST_DATABASE/);
  assert.equal(verified,1);assert(receipts.every(r=>r.status==='FAIL'));assert(!JSON.stringify(receipts).includes(error));
 }
});
test('wrong database, server identity, user or address cannot enable recovery',()=>{
 const correct={database:'hydroland_rehearsal_source',username:'hydroland',address:'172.19.0.2',system_id:'123'};
 for(const key of Object.keys(correct)){
  const receipts=[];
  assert.throws(()=>hostPreflight({target:{host:'172.19.0.2'},expectedSystem:'123',verify:()=>{},persist:r=>receipts.push(structuredClone(r)),probe:()=>[{...correct,[key]:'wrong'}]}));
  assert.equal(receipts.at(-1).status,'FAIL');
 }
});
test('success requires SQL identity and a second live-boundary verification',()=>{
 const receipts=[];let checks=0;
 hostPreflight({target:{host:'172.19.0.2'},expectedSystem:'123',verify:()=>checks++,persist:r=>receipts.push(structuredClone(r)),probe:()=>[{database:'hydroland_rehearsal_source',username:'hydroland',address:'172.19.0.2',system_id:'123'}]});
 assert.equal(checks,2);assert.deepEqual(receipts.map(r=>r.status),['FAIL','PASS']);
});
test('relay cannot choose destination from client bytes and closes both sockets on error',()=>{
 let accept,connected;const sock=()=>Object.assign(new EventEmitter(),{destroyed:false,destroy(){this.destroyed=true;},setTimeout(){},pipe(){}});
 const upstream=sock();createRelay({host:'172.19.0.2',port:5432},{serverFactory:handler=>{accept=handler;return {};},connectFn:options=>{connected=options;return upstream;}});
 const client=sock();accept(client);assert.deepEqual(connected,{host:'172.19.0.2',port:5432});upstream.emit('error',Error('closed'));assert(client.destroyed&&upstream.destroyed);
});
