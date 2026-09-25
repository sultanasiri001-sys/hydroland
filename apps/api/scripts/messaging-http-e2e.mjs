import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.MESSAGING_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const headers=token=>({authorization:`Bearer ${token}`,'content-type':'application/json'});
const parse=async response=>{const body=await response.json().catch(()=>null);return{response,body}};
const ok=async response=>{const {body}=await parse(response);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const accounts=[];const persons=[];let conversationId;
try{
  for(const name of ['sender','recipient','outsider']){
    const person=await db.person.create({data:{firstName:name,lastName:'MessagingE2E'}});persons.push(person);
    const account=await db.account.create({data:{personId:person.id,email:`${name}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);
  }
  const [sender,recipient,outsider]=accounts;
  const senderToken=tokenFor(sender.id),recipientToken=tokenFor(recipient.id),outsiderToken=tokenFor(outsider.id);

  let r=await fetch(base+'/messages/conversations');if(r.status!==401)throw new Error(`Anonymous messaging list expected 401, got ${r.status}`);
  let body=await ok(await fetch(base+'/messages/conversations',{method:'POST',headers:headers(senderToken),body:JSON.stringify({participantAccountIds:[recipient.id],title:'رحلة القحمة'})}));
  conversationId=body.id;if(!conversationId||body.participants?.length!==2)throw new Error('Conversation creation/participants mismatch');

  body=await ok(await fetch(base+'/messages/conversations',{headers:headers(recipientToken)}));if(!Array.isArray(body)||!body.some(item=>item.id===conversationId))throw new Error('Recipient conversation list missing created conversation');
  r=await fetch(base+`/messages/conversations/${conversationId}`,{headers:headers(outsiderToken)});if(r.status!==403)throw new Error(`Outsider conversation read expected 403, got ${r.status}`);

  body=await ok(await fetch(base+`/messages/conversations/${conversationId}/messages`,{method:'POST',headers:headers(senderToken),body:JSON.stringify({kind:'TEXT',body:'موعد الانطلاق الساعة السابعة صباحًا'})}));
  if(body.kind!=='TEXT'||!body.body?.includes('السابعة'))throw new Error('Text message response mismatch');
  const textMessageId=body.id;

  body=await ok(await fetch(base+`/messages/conversations/${conversationId}`,{headers:headers(recipientToken)}));
  if(!body.messages?.some(message=>message.id===textMessageId&&message.kind==='TEXT'))throw new Error('Recipient did not receive persisted text message');

  body=await ok(await fetch(base+`/messages/conversations/${conversationId}/messages`,{method:'POST',headers:headers(recipientToken),body:JSON.stringify({kind:'VOICE',mediaUrl:'https://media.hydroland.test/voice/e2e.m4a',durationSec:9})}));
  if(body.kind!=='VOICE'||body.durationSec!==9)throw new Error('Voice message response mismatch');

  r=await fetch(base+`/messages/conversations/${conversationId}/messages`,{method:'POST',headers:headers(outsiderToken),body:JSON.stringify({kind:'TEXT',body:'forbidden'})});if(r.status!==403)throw new Error(`Outsider send expected 403, got ${r.status}`);
  r=await fetch(base+`/messages/conversations/${conversationId}/messages`,{method:'POST',headers:headers(senderToken),body:JSON.stringify({kind:'VOICE',mediaUrl:'http://insecure.test/voice.m4a',durationSec:3})});if(r.status!==400)throw new Error(`Insecure voice URL expected 400, got ${r.status}`);
  r=await fetch(base+`/messages/conversations/${conversationId}/messages`,{method:'POST',headers:headers(senderToken),body:JSON.stringify({kind:'TEXT',body:'   '})});if(r.status!==400)throw new Error(`Blank text expected 400, got ${r.status}`);

  body=await ok(await fetch(base+`/messages/conversations/${conversationId}/read`,{method:'POST',headers:headers(recipientToken),body:'{}'}));if(body.status!=='READ')throw new Error('Read marker response mismatch');
  const readRows=await db.$queryRawUnsafe('SELECT "lastReadAt" FROM "ConversationParticipant" WHERE "conversationId"=$1 AND "accountId"=$2',conversationId,recipient.id);if(!readRows[0]?.lastReadAt)throw new Error('Read marker did not persist');
  const recipientNotifications=await db.notification.findMany({where:{accountId:recipient.id,type:'MESSAGE_RECEIVED'}});if(!recipientNotifications.length)throw new Error('Recipient message notification was not created');

  console.log('Messaging HTTP/DB E2E passed: auth guard, conversation creation/list, participant-only read/send, text persistence, voice metadata validation, read persistence and notification delivery.');
} finally {
  if(conversationId)await db.$executeRawUnsafe('DELETE FROM "Conversation" WHERE "id"=$1',conversationId).catch(()=>{});
  for(const account of accounts){await db.notification.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{});}
  for(const person of persons)await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
