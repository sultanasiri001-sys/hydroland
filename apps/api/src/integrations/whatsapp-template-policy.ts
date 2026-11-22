// Operations lists the exact provider-approved template name and language pairs,
// for example booking_confirmed:ar,invoice_issued:en_US. Empty means disabled.
export function approvedWhatsAppTemplates(): Set<string> {
  const configured = process.env.HYDROLAND_WHATSAPP_APPROVED_TEMPLATES?.trim();
  if (!configured) return new Set();
  const entries = configured.split(',').map(entry => entry.trim());
  if (entries.some(entry => !/^[a-z0-9_]+:[a-z]{2,3}(?:_[A-Z]{2})?$/.test(entry))) return new Set();
  return new Set(entries);
}
