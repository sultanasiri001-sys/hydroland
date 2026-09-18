import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const email = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();

if (process.env.ALLOW_E2E_BOOTSTRAP !== 'true') {
  console.error('Refusing to bootstrap E2E admin: ALLOW_E2E_BOOTSTRAP=true is required.');
  process.exit(1);
}
if (!email || !email.endsWith('@hydroland.test')) {
  console.error('Refusing to bootstrap E2E admin: E2E_ADMIN_EMAIL must use @hydroland.test.');
  process.exit(1);
}

try {
  const account = await db.account.findUnique({ where: { email }, select: { id: true } });
  if (!account) throw new Error(`E2E account ${email} does not exist. Register it through the API first.`);

  await db.$transaction([
    db.account.update({ where: { id: account.id }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } }),
    db.roleAssignment.upsert({
      where: { accountId_role: { accountId: account.id, role: 'ADMIN' } },
      create: { accountId: account.id, role: 'ADMIN', status: 'ACTIVE', activeAt: new Date(), scope: { purpose: 'E2E_ONLY' } },
      update: { status: 'ACTIVE', activeAt: new Date(), endedAt: null, scope: { purpose: 'E2E_ONLY' } },
    }),
  ]);

  console.log(`E2E admin bootstrap complete for ${email}.`);
} finally {
  await db.$disconnect();
}
