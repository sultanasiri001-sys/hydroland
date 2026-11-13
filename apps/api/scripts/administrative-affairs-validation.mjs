import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schema=read('prisma/schema.prisma');
const service=read('src/administrative-affairs/administrative-affairs-persistence.service.ts');
const controller=read('src/administrative-affairs/administrative-affairs.controller.ts');
const guard=read('src/administrative-affairs/administrative-affairs-ownership.guard.ts');
const moduleFile=read('src/administrative-affairs/administrative-affairs.module.ts');
const documentService=read('src/document-forms/document-persistence.service.ts');
const administrativeCatalog=read('src/document-forms/administrative-form-catalog.ts');
const operationalCatalog=read('src/document-forms/operational-document-catalog.ts');
const sectionCatalog=read('src/document-forms/section-duty-form-catalog.ts');

const requiredModels=['model OrgUnit {','model AdministrativeRecord {','model AdministrativeRouting {','model AdministrativeMeeting {','model CalendarEvent {','model CalendarAllocation {'];
for(const token of requiredModels) if(!schema.includes(token)) throw new Error('ADMIN_SCHEMA_MISSING:'+token);
for(const token of ['AccessTokenGuard','@UseGuards(AccessTokenGuard)','req.auth.accountId']) if(!controller.includes(token)) throw new Error('ADMIN_AUTH_BOUNDARY_MISSING:'+token);
for(const token of ['ADMIN_SELF_APPROVAL_DENIED','ADMIN_APPROVER_NOT_ASSIGNED','ADMIN_ORGANIZATION_SCOPE_DENIED','ADMIN_PERMISSION_REQUIRED','ADMIN_ROUTING_CONCURRENT_MODIFICATION','ADMIN_ASSIGNEE_NOT_ELIGIBLE','ADMIN_RECORD_ARCHIVED','ADMIN_MEETING_SCHEDULED','CALENDAR_RESOURCE_CONFLICT']) if(!service.includes(token)) throw new Error('ADMIN_RUNTIME_CONTROL_MISSING:'+token);
for(const token of ['ADMIN_EXECUTIVE_AUTHORITY_GRANT_DENIED','ADMIN_IAM_PRIVILEGE_GRANT_DENIED','ADMIN_EXTERNAL_DOMAIN_STATE_MUTATION_DENIED']) if(!guard.includes(token)) throw new Error('ADMIN_OWNERSHIP_CONTROL_MISSING:'+token);
for(const token of ['AdministrativeAffairsController','AdministrativeAffairsPersistenceService','AdministrativeAffairsOwnershipGuard']) if(!moduleFile.includes(token)) throw new Error('ADMIN_MODULE_WIRING_MISSING:'+token);
if(!service.includes("tx.auditEvent.create")) throw new Error('ADMIN_TRANSACTIONAL_AUDIT_MISSING');
if(!service.includes("updateMany")) throw new Error('ADMIN_ATOMIC_CAS_MISSING');
for(const token of ["referenceType:'ADMINISTRATIVE_MEETING'","tx.calendarEvent.create","tx.calendarAllocation.createMany"]) if(!service.includes(token)) throw new Error('ADMIN_UNIFIED_CALENDAR_CONTROL_MISSING:'+token);
for(const token of ['createRecordFromDocument','managedDocumentVersion','managedDocumentContentHash','ADMIN_ROUTING_REPLIED','ADMIN_ROUTING_DELIVERED','ADMIN_ARCHIVE_ROUTING_INCOMPLETE']) if(!service.includes(token)) throw new Error('A09_CORRESPONDENCE_CONTROL_MISSING:'+token);
for(const route of ["@Post('records')","@Get('records')","@Post('routings/:routingId/reply')","@Patch('routings/:routingId/deliver')"]) if(!controller.includes(route)) throw new Error('A09_CORRESPONDENCE_ROUTE_MISSING:'+route);
for(const token of ['ADMIN_RECORD_MUST_ARCHIVE_FIRST','archiveInTransaction']) if(!documentService.includes(token)) throw new Error('A09_DOCUMENT_LINK_CONTROL_MISSING:'+token);
if(!operationalCatalog.includes("'ADM-INCOMING-CORRESPONDENCE'")) throw new Error('A09_CANONICAL_INCOMING_TEMPLATE_MISSING');
for(const token of ["'recordNo'","'sender'","'subject'"]) if(!operationalCatalog.includes(token)) throw new Error('A09_INCOMING_FIELD_MISSING:'+token);
for(const token of ['"receivedDate"','"confidentiality"','"attachmentIndex"']) if(!sectionCatalog.includes(token)) throw new Error('A09_INCOMING_SECTION_FIELD_MISSING:'+token);
console.log('Administrative Affairs closure invariants: PASS');
