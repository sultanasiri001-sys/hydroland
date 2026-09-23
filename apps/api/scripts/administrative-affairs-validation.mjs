import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schema=read('prisma/schema.prisma');
const service=read('src/administrative-affairs/administrative-affairs-persistence.service.ts');
const controller=read('src/administrative-affairs/administrative-affairs.controller.ts');
const guard=read('src/administrative-affairs/administrative-affairs-ownership.guard.ts');
const moduleFile=read('src/administrative-affairs/administrative-affairs.module.ts');

const requiredModels=['model OrgUnit {','model AdministrativeRecord {','model AdministrativeRouting {','model AdministrativeMeeting {'];
for(const token of requiredModels) if(!schema.includes(token)) throw new Error('ADMIN_SCHEMA_MISSING:'+token);
for(const token of ['AccessTokenGuard','@UseGuards(AccessTokenGuard)','req.auth.accountId']) if(!controller.includes(token)) throw new Error('ADMIN_AUTH_BOUNDARY_MISSING:'+token);
for(const token of ['ADMIN_SELF_APPROVAL_DENIED','ADMIN_APPROVER_NOT_ASSIGNED','ADMIN_ORGANIZATION_SCOPE_DENIED','ADMIN_PERMISSION_REQUIRED','ADMIN_ROUTING_CONCURRENT_MODIFICATION']) if(!service.includes(token)) throw new Error('ADMIN_RUNTIME_CONTROL_MISSING:'+token);
for(const token of ['ADMIN_EXECUTIVE_AUTHORITY_GRANT_DENIED','ADMIN_IAM_PRIVILEGE_GRANT_DENIED','ADMIN_EXTERNAL_DOMAIN_STATE_MUTATION_DENIED']) if(!guard.includes(token)) throw new Error('ADMIN_OWNERSHIP_CONTROL_MISSING:'+token);
for(const token of ['AdministrativeAffairsController','AdministrativeAffairsPersistenceService','AdministrativeAffairsOwnershipGuard']) if(!moduleFile.includes(token)) throw new Error('ADMIN_MODULE_WIRING_MISSING:'+token);
if(!service.includes("tx.auditEvent.create")) throw new Error('ADMIN_TRANSACTIONAL_AUDIT_MISSING');
if(!service.includes("updateMany")) throw new Error('ADMIN_ATOMIC_CAS_MISSING');
console.log('Administrative Affairs closure invariants: PASS');
