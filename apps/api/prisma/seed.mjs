import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  { key: 'professional.role_requests.review', nameAr: 'مراجعة طلبات الأدوار المهنية', description: 'استلام طلبات الأدوار المهنية واتخاذ قرار المراجعة.' },
  { key: 'audit.read', nameAr: 'قراءة سجل التدقيق', description: 'عرض أحداث سجل التدقيق ضمن نطاق الصلاحية.' },
];

const roles = [
  { key: 'PLATFORM_EXECUTIVE_OWNER', nameAr: 'المالك التنفيذي للمنصة', description: 'أعلى دور تنفيذي داخل HYDROLAND مع بقاء قيود السلامة والتنظيم والتدقيق نافذة.', permissionKeys: ['professional.role_requests.review', 'audit.read'] },
  { key: 'PROFESSIONAL_REVIEWER', nameAr: 'مراجع الطلبات المهنية', description: 'مراجع بشري مخول باستلام ومراجعة طلبات الأدوار المهنية.', permissionKeys: ['professional.role_requests.review'] },
  { key: 'AUDITOR', nameAr: 'مراجع سجل التدقيق', description: 'دور مخصص لقراءة سجل التدقيق وفق نطاق الصلاحية.', permissionKeys: ['audit.read'] },
  { key: 'DIVER', nameAr: 'غواص', description: 'دور مهني للغواص داخل المنصة بعد اكتمال متطلبات الاعتماد المطبقة.', permissionKeys: [] },
  { key: 'INSTRUCTOR', nameAr: 'مدرب غوص محترف', description: 'دور مهني للمدرب داخل المنصة بعد اكتمال متطلبات الاعتماد المطبقة.', permissionKeys: [] },
];

async function main() {
  const permissionMap = new Map();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { nameAr: permission.nameAr, description: permission.description },
      create: permission,
    });
    permissionMap.set(permission.key, record.id);
  }

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { key: role.key },
      update: { nameAr: role.nameAr, description: role.description },
      create: { key: role.key, nameAr: role.nameAr, description: role.description },
    });

    for (const permissionKey of role.permissionKeys) {
      const permissionId = permissionMap.get(permissionKey);
      if (!permissionId) throw new Error(`Missing seeded permission: ${permissionKey}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: record.id, permissionId } },
        update: {},
        create: { roleId: record.id, permissionId },
      });
    }
  }

  console.log(`Seeded ${permissions.length} permissions and ${roles.length} roles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
