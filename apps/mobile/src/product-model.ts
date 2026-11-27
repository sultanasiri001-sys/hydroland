/** Shared presentation types for the existing server contracts. No client role is authority. */
export type Row = Record<string, unknown>;
export type Profile = {
  id: string;
  email: string;
  status: string;
  roleAssignments: Array<{id: string; role: string; status: string; updatedAt?: string}>;
  person: {firstName: string; lastName?: string | null; phone?: string | null; professional?: Row | null};
};
export const destinations = [
  {path: '/account', key: 'account', ar: 'حسابي', en: 'My account', hintAr: 'الملف والخصوصية وأمان الدخول', hintEn: 'Profile, privacy and sign-in security'},
  {path: '/credentials', key: 'credentials', ar: 'مؤهلاتي', en: 'Credentials', hintAr: 'إضافة الوثائق ومتابعة مراجعتها', hintEn: 'Upload evidence and follow its review'},
  {path: '/trips', key: 'trips', ar: 'الرحلات', en: 'Trips', hintAr: 'استكشاف الرحلات وتجهيز يوم الرحلة', hintEn: 'Explore trips and prepare for the day'},
  {path: '/bookings', key: 'bookings', ar: 'حجوزاتي', en: 'Bookings', hintAr: 'المشاركون والشروط والدفع والإلغاء', hintEn: 'Participants, terms, checkout and cancellation'},
  {path: '/training', key: 'training', ar: 'التدريب', en: 'Training', hintAr: 'الدورات والتقدم والجلسات والشهادات', hintEn: 'Courses, progress, sessions and certificates'},
  {path: '/finance', key: 'finance', ar: 'المالية', en: 'Finance', hintAr: 'الدفعات والفواتير وطلبات الاسترداد', hintEn: 'Payments, invoices and refund requests'},
  {path: '/notifications', key: 'notifications', ar: 'الإشعارات', en: 'Notifications', hintAr: 'صندوق الوارد وخيارات التواصل', hintEn: 'Inbox and delivery preferences'},
] as const;
export function object(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
export function rows(value: unknown, keys: string[] = ['items']): Row[] {
  if (Array.isArray(value)) return value.map(object);
  const data = object(value);
  for (const key of keys) if (Array.isArray(data[key])) return (data[key] as unknown[]).map(object);
  return [];
}
export function text(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback;
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Invalid record reference.');
  return encodeURIComponent(value);
}
export function integer(value: string, min = 1, max = 100): number {
  if (!/^\d+$/.test(value)) throw new Error('أدخل عددًا صحيحًا. / Enter a whole number.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error('القيمة خارج الحد المسموح. / The value is outside the allowed range.');
  return number;
}
export function moneyInput(value: string, currency = 'SAR'): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency.');
  const digits = new Intl.NumberFormat('en-GB', {style: 'currency', currency}).resolvedOptions().maximumFractionDigits ?? 2;
  const match = value.trim().match(/^(\d{1,10})(?:[.,](\d+))?$/);
  if (!match || (match[2]?.length ?? 0) > digits) throw new Error('تحقق من منازل المبلغ العشرية حسب عملته. / Check the amount’s decimal places for its currency.');
  const result = Number(match[1]) * (10 ** digits) + Number((match[2] ?? '').padEnd(digits, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large.');
  return result;
}
export function money(value: unknown, currency: unknown = 'SAR', locale: 'ar' | 'en' = 'ar'): string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return '—';
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : 'SAR';
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {style: 'currency', currency: code});
  return formatter.format(value / (10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2)));
}
export function date(value: unknown, locale: 'ar' | 'en' = 'ar'): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh', calendar: 'gregory'}).format(new Date(value));
}
export function roles(profile: Profile | null): string[] {
  return profile?.roleAssignments?.filter(item => item.status === 'ACTIVE').map(item => item.role) ?? [];
}
export function authorityFingerprint(profile: Profile): string {
  if (!profile || typeof profile.id !== 'string' || profile.status !== 'ACTIVE' || !Array.isArray(profile.roleAssignments)) throw new Error('Account is unavailable.');
  return JSON.stringify([profile.id, profile.status, profile.roleAssignments.map(role => [role.id, role.role, role.status, role.updatedAt ?? '']).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
}
export function httpsUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('الرابط غير متاح. / The link is unavailable.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('لم يتم توفير رابط آمن. / A secure link was not provided.');
  return url.href;
}
export function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value));
  const encoded = params.toString();
  return encoded ? '?' + encoded : '';
}
