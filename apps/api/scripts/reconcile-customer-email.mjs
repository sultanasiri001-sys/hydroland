import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {PrismaClient} from '@prisma/client';

// Reconcile a single accepted customer notice. Only an explicit delivered event
// proves acceptance by the receiving mail server. Never enqueue or resend here.
export async function reconcileCustomerEmail(db, id, key, transport = fetch) {
  const row = await db.customerNoticeEmail.findUnique({where:{id}});
  if (row?.state === 'PROVIDER_DELIVERED') return 'ALREADY_RECORDED';
  if (row?.state !== 'PROVIDER_ACCEPTED' || !row.providerMessageId || !row.recipientHash) return 'UNCONFIRMED';
  if (!key) throw new Error('Provider read credential is required.');
  const providerId = row.providerMessageId;
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(providerId)) return 'UNCONFIRMED';
  const response = await transport('https://api.resend.com/emails/' + providerId, {
    method:'GET', redirect:'error', signal:AbortSignal.timeout(8000),
    headers:{Authorization:'Bearer ' + key, Accept:'application/json'},
  });
  if (!response.ok) throw new Error('Provider lookup did not succeed.');
  const receipt = await response.json();
  if (receipt?.object !== 'email' || receipt.id !== providerId || receipt.last_event !== 'delivered' ||
      !Array.isArray(receipt.to) || receipt.to.length !== 1 || typeof receipt.to[0] !== 'string' ||
      ![receipt.cc, receipt.bcc].every(list => Array.isArray(list) && list.length === 0) ||
      createHash('sha256').update(receipt.to[0]).digest('hex') !== row.recipientHash) return 'UNCONFIRMED';

  return db.$transaction(async tx => {
    if (await tx.customerNoticeEmail.count({where:{providerMessageId:providerId}}) !== 1) return 'UNCONFIRMED';
    const changed = await tx.customerNoticeEmail.updateMany({
      where:{id, state:'PROVIDER_ACCEPTED', providerMessageId:providerId, recipientHash:row.recipientHash},
      data:{state:'PROVIDER_DELIVERED'},
    });
    if (!changed.count) {
      const current = await tx.customerNoticeEmail.findUnique({where:{id},select:{state:true}});
      return current?.state === 'PROVIDER_DELIVERED' ? 'ALREADY_RECORDED' : 'UNCONFIRMED';
    }
    await tx.auditEvent.create({data:{action:'customer_email.provider_delivered',resource:'CustomerNoticeEmail',
      resourceId:id,metadata:{provider:'RESEND',providerMessageId:providerId}}});
    return 'RECORDED';
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = new PrismaClient();
  try {
    if (process.argv.length !== 3) throw new Error('Supply one customer notice ID.');
    const result = await reconcileCustomerEmail(db, process.argv[2], process.env.RESEND_API_KEY);
    console.log(result);
    if (result === 'UNCONFIRMED') process.exitCode = 2;
  } catch {
    console.error('Delivery receipt could not be verified.');
    process.exitCode = 1;
  } finally { await db.$disconnect(); }
}
