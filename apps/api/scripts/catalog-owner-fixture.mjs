import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function bindFixtureOwner(db, ownerId) {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(process.env.CI, 'true');
  assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  const key = 'PLATFORM_STAFFING_ORGANIZATION:v1';
  const id = randomUUID();
  const previous = await db.$transaction(async tx => {
    const saved = await tx.operationalSetting.findUnique({where:{key}});
    await tx.organization.create({data:{id, ownerId, displayName:'Isolated control owner',
      kind:'HYDROLAND_INTERNAL_PLATFORM', status:'ACTIVE'}});
    const value = {organizationId:id};
    await tx.operationalSetting.upsert({where:{key},create:{key,value},update:{value}});
    return saved;
  });
  return async () => db.$transaction(async tx => {
    const current = await tx.operationalSetting.findUniqueOrThrow({where:{key}});
    assert.equal(current.value.organizationId, id);
    if (previous) await tx.operationalSetting.update({where:{key},data:{value:previous.value,updatedAt:previous.updatedAt}});
    else await tx.operationalSetting.delete({where:{key}});
    await tx.organization.delete({where:{id}});
  });
}
