import { renderAdministrativeDocumentPdf, AdministrativePdfLayoutItem } from './administrative-document-pdf';
import { DocumentAssetService } from './document-asset.service';
import { DocumentPrintContract } from './document-print.service';
import { OWNER_DECISION_POLICY, verifyDecision } from './owner-administrative-decision.domain';

/** A receipt for the separate owner record, never a new rendering of the source document. */
export async function renderOwnerDecisionPdf(receipt: any, assets: DocumentAssetService, observe?: (i: AdministrativePdfLayoutItem) => void) {
  const r = verifyDecision(receipt, receipt.organizationId, receipt.documentId, receipt.sourceVersion), s = r.source;
  const field = (key: string, label: string, value: unknown) => ({ key, labelAr: label, labelEn: key, type: 'TEXT', required: true, value });
  const c: DocumentPrintContract = {
    documentId: r.id, organizationId: r.organizationId, referenceNumber: r.referenceNumber, department: s.department,
    status: 'قرار إداري من المالك — لا اعتماد مستقل أو توقيع إلكتروني', documentVersion: 1, contentHash: r.receiptHash, renderProfile: 'ADMINISTRATIVE_FORM_V1',
    template: { id: '', code: OWNER_DECISION_POLICY, titleAr: 'إثبات قرار إداري من المالك', titleEn: 'Owner Administrative Decision Receipt', version: 1, printable: true },
    branding: s.branding, createdAt: new Date(r.recordedAt), updatedAt: new Date(r.recordedAt),
    fields: [field('scope', 'نطاق القرار وحدوده', r.scopeNotice), field('note', 'ملاحظة المالك وتوجيه المتابعة', r.note),
      field('source', 'مرجع المستند المصدر وإصداره', `${s.referenceNumber} / v${s.version}`), field('sourceStatus', 'حالة المصدر عند التسجيل — لم تتغير بهذا القرار', s.status),
      field('sourceTemplate', 'القالب المثبت للمصدر', `${s.template.titleAr} / ${s.template.code} / v${s.template.version}`),
      ...s.template.fields.map((f: any) => field(f.key, f.labelAr || f.labelEn, s.payload[f.key])),
      field('actor', 'صاحب القرار — حساب المالك المتحقق', r.actorAccountId), field('recordedAt', 'وقت تسجيل القرار', r.recordedAt)],
    approvals: { createdByAccountId: r.actorAccountId, approvedByAccountId: null, signedByAccountId: null, archivedByAccountId: null, approvedAt: null, signedAt: null, archivedAt: null },
  };
  return renderAdministrativeDocumentPdf(c, assets, observe);
}
