import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const email = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();

if (process.env.ALLOW_E2E_BOOTSTRAP !== 'true') {
  console.error('Refusing E2E cleanup: ALLOW_E2E_BOOTSTRAP=true is required.');
  process.exit(1);
}
if (!email || !email.endsWith('@hydroland.test')) {
  console.error('Refusing E2E cleanup: E2E_ADMIN_EMAIL must use @hydroland.test.');
  process.exit(1);
}

try {
  const account = await db.account.findUnique({ where: { email }, select: { id: true } });
  if (!account) {
    console.log(`No E2E account found for ${email}; nothing to clean up.`);
    process.exit(0);
  }

  await db.roleAssignment.updateMany({
    where: { accountId: account.id, role: 'ADMIN', scope: { path: ['purpose'], equals: 'E2E_ONLY' } },
    data: { status: 'INACTIVE', endedAt: new Date() },
  });

  console.log(`E2E admin privileges revoked for ${email}.`);
} finally {
  await db.$disconnect();
}
