import { NotificationDispatcher } from './notification-dispatcher.service';
const state:string[]=[];
const outbox:any={claim:async()=>[{id:'1',accountId:'u',eventKey:'ok',payload:{},attempts:0},{id:'2',accountId:'u',eventKey:'fail',payload:{},attempts:0}],markSent:async(id:string)=>state.push('sent:'+id),markFailed:async(id:string)=>state.push('failed:'+id)};
const channel:any={send:async(i:any)=>{if(i.eventKey==='fail')throw new Error('delivery');}};
(async()=>{const r=await new NotificationDispatcher(outbox).dispatch(channel);if(r.sent!==1||r.failed!==1||state.join(',')!=='sent:1,failed:2')throw new Error(JSON.stringify({r,state}));console.log('notification dispatcher tests passed');})().catch(e=>{console.error(e);process.exit(1)});
