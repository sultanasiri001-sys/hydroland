import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { HYDROLAND_DEPARTMENTS, DepartmentCode } from '../governance/department-ownership.domain';
import { STAFFING_DEPARTMENTS, platformOrganization } from '../hr/staffing-catalog';
import { DEPARTMENT_REFERENCE_CATALOG as catalog } from './department-reference-catalog';
import { ISO_REFERENCE_CATALOG } from './iso-reference-catalog';
import { departmentOperatingCycle } from '../document-forms/department-operating-cycle.catalog';

// These are discovery/ownership links to existing capabilities, not permission
// grants, new enforcement rules or a legal determination of applicability.
const boundaries: Record<DepartmentCode, { path: string; categories: readonly string[] }> = {
  HR: { path: 'apps/api/src/hr', categories: ['HR_COMPLIANCE'] },
  TRAINING: { path: 'apps/api/src/governance/training-workflow.service.ts', categories: ['TRAINING', 'INSTRUCTOR'] },
  MARINE_OPERATIONS: { path: 'apps/api/src/marine-operations', categories: ['TRIP', 'BOOKING', 'BOAT', 'CAPTAIN', 'CREW', 'DIVE_LOG'] },
  INVENTORY_LOGISTICS: { path: 'apps/api/src/inventory', categories: ['EQUIPMENT'] },
  FINANCE: { path: 'apps/api/src/finance', categories: ['PAYMENT'] },
  SAFETY_COMPLIANCE_RISK: { path: 'apps/api/src/safety', categories: ['COMPLIANCE', 'MEDICAL', 'WEATHER'] },
  CUSTOMER_EXPERIENCE: { path: 'apps/api/src/customer-service', categories: [] },
  MARKETING_GROWTH: { path: 'apps/api/src/marketing', categories: [] },
  TECHNOLOGY_CYBERSECURITY: { path: 'apps/api/src/technology-security', categories: ['SECURITY', 'IDENTITY'] },
  FACILITIES_ASSETS_MAINTENANCE: { path: 'apps/api/src/facilities-maintenance', categories: ['EQUIPMENT', 'BOAT'] },
  ADMIN_AFFAIRS_RECORDS: { path: 'apps/api/src/administrative-affairs', categories: ['DOCUMENT', 'ORGANIZATION', 'CENTER'] },
  EXECUTIVE_GOVERNANCE: { path: 'apps/api/src/executive-governance', categories: ['ORGANIZATION', 'CENTER'] },
  RND_MARKET_INTELLIGENCE: { path: 'apps/api/src/research-market', categories: [] },
  LEGAL_CONTRACTS_INSURANCE: { path: 'apps/api/src/legal-governance', categories: ['COMPLIANCE'] },
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());

@Injectable()
export class DepartmentReferencesService {
  constructor(private readonly db: DatabaseService) {}

  async list(actorId: string, department?: unknown) {
    return this.db.serializable(async tx => {
      // Fresh server-side authority, including email and account state, precedes
      // every read; an old browser role cannot authorize this workspace.
      await requireVerifiedAdmin(tx, actorId);
      if (department !== undefined && (typeof department !== 'string' || !HYDROLAND_DEPARTMENTS.some(d => d.code === department))) {
        throw new BadRequestException('اختر إدارة من الهيكل المعتمد.');
      }
      const organization = await platformOrganization(tx);
      const units = organization ? await tx.orgUnit.findMany({
        where: { organizationId: organization.id, type: 'DEPARTMENT' }, select: { code: true, active: true },
      }) : [];
      const controls = await tx.policyControl.findMany({
        select: { category: true, ruleKey: true, labelAr: true, state: true, metadata: true },
        orderBy: [{ category: 'asc' }, { ruleKey: 'asc' }],
      });
      const specifications = HYDROLAND_DEPARTMENTS.map(d => ({ code: d.code, specification: departmentOperatingCycle(d.code) }));
      const templateCodes = specifications.flatMap(d => d.specification.canonicalTemplates.map(t => t.code));
      const templates = organization ? await tx.documentTemplate.findMany({
        where: { organizationId: organization.id, code: { in: templateCodes } },
        select: { code: true, department: true, version: true, status: true, printable: true },
        orderBy: [{ code: 'asc' }, { version: 'desc' }],
      }) : [];
      const documentCounts = organization ? await tx.managedDocument.groupBy({
        by: ['department', 'status'],
        where: { organizationId: organization.id, template: { code: { in: templateCodes } } },
        _count: { _all: true },
      }) : [];
      const policyViews = controls.map(c => {
        const m = object(c.metadata);
        // Recorded references are evidence of stored metadata only. They do not
        // certify the legal approval, currency or applicability of a source.
        const referencesRecorded = [m.regulatoryRequirementId, m.regulatoryVersion, m.legalApprovalReference].every(nonempty)
          && Array.isArray(m.evidenceIds) && m.evidenceIds.length > 0 && m.evidenceIds.every(nonempty);
        return { category: c.category, ruleKey: c.ruleKey, labelAr: c.labelAr, state: c.state, referencesRecorded };
      });
      const departments = HYDROLAND_DEPARTMENTS.filter(d => department === undefined || d.code === department).map(d => ({
        code: d.code,
        nameAr: STAFFING_DEPARTMENTS.find(n => n.code === d.code)!.nameAr,
        unitRecorded: units.some(u => u.code === d.code),
        unitActive: units.some(u => u.code === d.code && u.active),
        canonicalDomains: d.canonicalDomains,
        sourceBoundary: boundaries[d.code].path,
        authorityIds: catalog.authorities.filter(a => (a.departmentCodes as readonly string[]).includes(d.code)).map(a => a.id),
        legalReferenceIds: catalog.legalReferences.filter(r => (r.departmentCodes as readonly string[]).includes(d.code)).map(r => r.id),
        marineArchiveIds: catalog.marineArchives.filter(r => (r.departmentCodes as readonly string[]).includes(d.code)).map(r => r.id),
        hrSourceIds: d.code === 'HR' || d.code === 'LEGAL_CONTRACTS_INSURANCE' ? catalog.hrSources.map(s => s.id) : [],
        isoReferenceIds: ISO_REFERENCE_CATALOG.filter(s => s.departmentCodes.includes(d.code)).map(s => s.id),
        operatingCycle: {
          ...specifications.find(s => s.code === d.code)!.specification,
          organizationRecorded: Boolean(organization),
          templates: specifications.find(s => s.code === d.code)!.specification.canonicalTemplates.map(t => {
            const versions = templates.filter(v => v.code === t.code && v.department === d.code);
            const active = versions.filter(v => v.status === 'ACTIVE');
            return { ...t, recordedVersions: versions, availability: !organization ? 'ORGANIZATION_NOT_RECORDED' : active.length === 1 ? 'ACTIVE_VERSION_RECORDED' : active.length > 1 ? 'MULTIPLE_ACTIVE_VERSIONS' : 'NO_ACTIVE_VERSION_RECORDED' };
          }),
          documentCounts: documentCounts.filter(c => c.department === d.code).map(c => ({ status: c.status, count: c._count._all })),
          countScope: 'SOURCE_CATALOG_CODES_ONLY',
        },
        policies: policyViews.filter(p => boundaries[d.code].categories.includes(p.category)),
        businessOwner: d.code,
        legalReviewOwner: 'LEGAL_CONTRACTS_INSURANCE',
        permissionBoundary: 'ROLE_ACTION_RESOURCE_DEPARTMENT_CENTER_CONDITIONS_PERIOD',
        applicabilityStatus: 'REVIEW_REQUIRED',
        canActivate: false,
        existingHrReviewPath: d.code === 'HR' ? '/admin/employees/compliance-controls' : null,
      }));
      return JSON.parse(JSON.stringify({
        ...catalog,
        catalogVersion: '2026-10-24.v2',
        isoReferences: ISO_REFERENCE_CATALOG,
        referencePrecedence: ['SAUDI_APPLICABLE_REGULATION', 'ISO_APPLICABLE_SCOPE', 'WRSTC_APPLICABLE_SCOPE', 'TRAINING_AGENCY_PROGRAM_VERSION'],
        canonicalSourceTemplateCount: templateCodes.length,
        completeDocumentInventoryVerified: false,
        observedAt: new Date().toISOString(),
        canonicalDepartmentCount: HYDROLAND_DEPARTMENTS.length,
        recordedDepartmentCount: new Set(units.filter(u => HYDROLAND_DEPARTMENTS.some(d => d.code === u.code)).map(u => u.code)).size,
        effectivePolicyCount: controls.length,
        policiesWithRecordedReferences: policyViews.filter(p => p.referencesRecorded).length,
        canActivate: false,
        departments,
      }));
    });
  }
}
