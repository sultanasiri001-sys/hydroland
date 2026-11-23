import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { revealSecret } = require('../dist/auth/mfa-crypto.js');
const { DatabaseService } = require('../dist/database/database.service.js');
const digest = value => createHash('sha256').update(value).digest('hex');
const ticketId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

async function binding(db, accountId, noticeId, sessionId) {
  const [row] = await db.$queryRaw`
    SELECT s."pushTokenCiphertext" AS cipher
    FROM "Notification" n
    JOIN "Account" a ON a.id = n."accountId"
    JOIN "Session" s ON s."accountId" = a.id
    WHERE n.id::text = ${noticeId} AND a.id::text = ${accountId} AND s.id::text = ${sessionId}
      AND a.status = 'ACTIVE' AND a."emailVerifiedAt" IS NOT NULL
      AND n.type IN ('BOOKING_CONFIRMED','INVOICE_ISSUED') AND n.status IN ('SENT','READ')
      AND s."pushTokenCiphertext" IS NOT NULL AND s."revokedAt" IS NULL
      AND s."tokenHash" NOT LIKE 'mfa:%' AND s."expiresAt" > timezone('UTC', clock_timestamp())
    FOR UPDATE OF s FOR SHARE OF n, a`;
  return row?.cipher;
}

async function recordResult(tx, claim, result, phase) {
  let state, ticket = null;
  if (result?.status === 'error') {
    if (result.details?.error === 'DeviceNotRegistered') {
      const session = await tx.session.findUnique({where:{id:claim.sessionId}, select:{pushTokenCiphertext:true}});
      const cipher = session?.pushTokenCiphertext;
      // A late rejection must not displace a newer registration, even for the same physical token.
      if (cipher && digest(cipher) === claim.bindingDigest) {
        await tx.session.updateMany({where:{id:claim.sessionId, accountId:claim.accountId, pushTokenCiphertext:cipher},
          data:{pushTokenCiphertext:null, pushTokenHash:null}});
      }
      state = 'DEVICE_UNREGISTERED';
    } else {
      state = 'PROVIDER_REJECTED';
    }
  } else if (phase === 'receipt') {
    if (result?.status !== 'ok') return 'AWAITING_RECEIPT';
    state = 'PROVIDER_CONFIRMED';
  } else if (result?.status === 'ok' && typeof result.id === 'string' && ticketId.test(result.id)) {
    state = 'AWAITING_RECEIPT';
    ticket = result.id.toLowerCase();
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${ticket}, 0))`;
    const [other] = await tx.$queryRaw`SELECT "notificationId" FROM "TrialPushDispatch"
      WHERE "ticketId"=${ticket} AND "notificationId"<>${claim.notificationId} FOR UPDATE`;
    if (other) {
      // Preserve the first association to recognize any further reuse. Neither submission has unique evidence.
      await tx.$executeRaw`UPDATE "TrialPushDispatch" SET state='REVIEW_REQUIRED',"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE "notificationId"=${other.notificationId}`;
      state = 'REVIEW_REQUIRED';
      ticket = null;
    }
  } else {
    state = 'REVIEW_REQUIRED';
  }
  await tx.$executeRaw`UPDATE "TrialPushDispatch" SET state=${state},
    "ticketId"=COALESCE(${ticket}, "ticketId"), "updatedAt"=timezone('UTC',clock_timestamp())
    WHERE "notificationId"=${claim.notificationId}`;
  return state;
}

// One explicit operator invocation targets one registered QA session. There is no startup poller.
export async function sendTrial(db, accountId, notificationId, sessionId, post) {
  if (!accountId || !notificationId || !sessionId) return 'INELIGIBLE';
  const claim = await db.$transaction(async tx => {
    const cipher = await binding(tx, accountId, notificationId, sessionId);
    if (!cipher) return null;
    const rows = await tx.$queryRaw`INSERT INTO "TrialPushDispatch"
      ("notificationId","accountId","sessionId","bindingDigest",state,"updatedAt")
      VALUES (${notificationId},${accountId},${sessionId},${digest(cipher)},'RESERVED',timezone('UTC',clock_timestamp()))
      ON CONFLICT ("notificationId") DO NOTHING RETURNING *`;
    return rows[0] ?? false;
  });
  if (!claim) return claim === false ? 'ALREADY_CLAIMED' : 'INELIGIBLE';

  // Commit the single-use reservation before network I/O. Crash or ambiguous response cannot trigger a second send.
  return db.$transaction(async tx => {
    const cipher = await binding(tx, accountId, notificationId, sessionId);
    if (!cipher || digest(cipher) !== claim.bindingDigest) {
      await tx.$executeRaw`UPDATE "TrialPushDispatch" SET state='SUPPRESSED',"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE "notificationId"=${notificationId}`;
      return 'SUPPRESSED';
    }
    const to = revealSecret(cipher, 'push-device:' + sessionId);
    let ticket;
    try {
      const response = await post('send', [{to, title:'هيدرولاند', body:'لديك إشعار جديد داخل المنصة.', ttl:0}]);
      if (!response?.errors?.length && Array.isArray(response?.data) && response.data.length === 1) ticket = response.data[0];
    } catch { /* No automatic retry after uncertain submission. */ }
    return recordResult(tx, claim, ticket, 'ticket');
  }, {timeout:10000});
}

export async function checkTrialReceipt(db, accountId, notificationId, post) {
  if (!accountId || !notificationId) return 'INELIGIBLE';
  return db.$transaction(async tx => {
    const [claim] = await tx.$queryRaw`SELECT * FROM "TrialPushDispatch"
      WHERE "notificationId"=${notificationId} AND "accountId"=${accountId} FOR UPDATE`;
    if (!claim || claim.state !== 'AWAITING_RECEIPT') return claim?.state ?? 'INELIGIBLE';
    const response = await post('getReceipts', {ids:[claim.ticketId]});
    const entries = Object.entries(response?.data ?? {});
    if (response?.errors?.length || entries.length !== 1 || entries[0][0] !== claim.ticketId) return 'AWAITING_RECEIPT';
    return recordResult(tx, claim, entries[0][1], 'receipt');
  }, {timeout:10000});
}

async function run() {
  const [action, notice, session] = process.argv.slice(2);
  const account = process.env.B07_PUSH_TRIAL_ACCOUNT_ID?.trim();
  const auth = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (!account || !auth || !notice || !((action === 'check' && !session) || (action === 'send' && session))) {
    throw Error('Explicit trial account, Expo access token and command required (send NOTICE SESSION or check NOTICE).');
  }
  const post = async (endpoint, body) => {
    const res = await fetch('https://exp.host/--/api/v2/push/' + endpoint, {method:'POST',redirect:'error',
      headers:{Authorization:'Bearer ' + auth, 'Content-Type':'application/json'},body:JSON.stringify(body),
      signal:AbortSignal.timeout(4000)});
    if (!res.ok) throw Error('Expo request unavailable.');
    return res.json();
  };
  const db = new DatabaseService();
  try { console.log(action === 'send' ? await sendTrial(db, account, notice, session, post) : await checkTrialReceipt(db, account, notice, post)); }
  finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => { console.error('Trial command did not complete. Inspect its saved state before continuing.'); process.exitCode = 1; });
}
