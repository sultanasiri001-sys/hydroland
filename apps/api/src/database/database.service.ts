import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  declare $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }

  async tryAcquireLease(key: string, ttlMs: number): Promise<boolean> {
    const leaseKey = `LEASE:${key}`;
    const cutoff = new Date(Date.now() - Math.max(1_000, ttlMs));
    const value = JSON.stringify({ type: 'SCHEDULER_LEASE' });
    const rows = await this.$queryRaw<Array<{ key: string }>>`
      INSERT INTO "OperationalSetting" ("key", "value", "updatedAt")
      VALUES (${leaseKey}, ${value}::jsonb, NOW())
      ON CONFLICT ("key") DO UPDATE
        SET "value" = EXCLUDED."value", "updatedAt" = NOW()
      WHERE "OperationalSetting"."updatedAt" < ${cutoff}
      RETURNING "key"
    `;
    return rows.length > 0;
  }
}
