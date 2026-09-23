const { PrismaClient } = require('@prisma/client');
const { buildOperationalDocumentCatalog } = require('../.tmp-operational-template-seed/operational-document-catalog.js');

async function main(){
  const organizationId=process.env.ORGANIZATION_ID?.trim();
  if(!organizationId) throw new Error('ORGANIZATION_ID is required.');
  const prisma=new PrismaClient();
  try{
    const org=await prisma.organization.findUnique({where:{id:organizationId},select:{id:true}});
    if(!org) throw new Error(`Organization not found: ${organizationId}`);
    const catalog=buildOperationalDocumentCatalog(organizationId);
    await prisma.$transaction(async tx=>{
      for(const template of catalog){
        await tx.documentTemplate.upsert({
          where:{organizationId_code_version:{organizationId:template.organizationId,code:template.code,version:template.version}},
          create:{id:template.id,organizationId:template.organizationId,code:template.code,titleAr:template.titleAr,titleEn:template.titleEn,department:template.department,version:template.version,status:'ACTIVE',printable:template.printable,fields:template.fields},
          update:{titleAr:template.titleAr,titleEn:template.titleEn,department:template.department,status:'ACTIVE',printable:template.printable,fields:template.fields},
        });
      }
    });
    const count=await prisma.documentTemplate.count({where:{organizationId,status:'ACTIVE'}});
    if(count<catalog.length) throw new Error(`Expected at least ${catalog.length} active templates, found ${count}`);
    console.log(`Seeded ${catalog.length} operational document templates for organization ${organizationId}.`);
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{console.error(e);process.exit(1);});
