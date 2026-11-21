import { qrMatrix } from './hydroland-membership-qr.js';

const base = new URL('./assets/document-identity-v2/', import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = minor => (minor / 100).toFixed(2);
const samples = [
  { title: 'رحلة غوص بحرية', quantity: 2, netUnit: 25000 },
  { title: 'تأجير طقم غوص', quantity: 2, netUnit: 7500 },
];

// Only the disconnected sample uses the illustrative 15% rate and zero VAT ID.
export function sampleInvoice(sellerName, timestamp = new Date().toISOString()) {
  const rows = samples.map(line => {
    const net = line.quantity * line.netUnit, vat = Math.round(net * 15 / 100);
    return { ...line, net, vat, gross: net + vat };
  });
  const net = rows.reduce((sum, row) => sum + row.net, 0);
  const vat = rows.reduce((sum, row) => sum + row.vat, 0);
  return { sellerName, vatNumber: '000000000000000', timestamp, number: 'DEMO-INV-0001', rows, net, vat, gross: net + vat };
}

export function previewQr(invoice) {
  const fields = [invoice.sellerName, invoice.vatNumber, invoice.timestamp, money(invoice.gross), money(invoice.vat)];
  const bytes = [];
  fields.forEach((field, index) => {
    const encoded = new TextEncoder().encode(field);
    if (encoded.length > 255) throw new RangeError('اسم البائع يتجاوز طول الحقل المسموح به في الرمز.');
    bytes.push(index + 1, encoded.length, ...encoded);
  });
  const text = btoa(String.fromCharCode(...bytes));
  const matrix = qrMatrix(text, text.length <= 287 ? 12 : 17);
  const size = matrix.length + 8;
  const path = matrix.flatMap((row, y) => row.map((dark, x) => dark ? 'M' + (x+4) + ' ' + (y+4) + 'h1v1h-1z' : '').filter(Boolean)).join('');
  return '<svg role="img" aria-label="رمز فاتورة تجريبي" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="' + path + '" fill="black"/></svg>';
}

export async function showInvoicePreview(win, seller, options = {}) {
  const name = seller.name?.trim();
  if (!name) throw new Error('اسم البائع غير متاح.');
  const invoice = sampleInvoice(name, options.timestamp);
  const logo = seller.logo;
  if (logo && (!['image/png','image/jpeg'].includes(logo.mimeType) || !/^[a-zA-Z0-9+/]+=*$/.test(logo.base64))) throw new Error('شعار المركز غير صالح.');
  const centerMark = logo ? '<img class="seller-logo" alt="شعار المركز" src="data:' + logo.mimeType + ';base64,' + logo.base64 + '">' : '';
  const localTime = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Riyadh', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(invoice.timestamp)).replace(',', ' ·');
  const row = (label, value) => '<div class="pair"><span>' + label + '</span><bdi>' + escape(value) + '</bdi></div>';
  const qr = previewQr(invoice);
  const assets = await fetch(new URL('invoice-print.json', base));
  if (!assets.ok) throw new Error('تعذّر تحميل هوية المستند.');
  const identity = await assets.json();
  if (win.closed) return;
  const doc = win.document;
  doc.open();
  doc.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة تجريبية | هيدرولاند</title></head><body></body></html>');
  doc.close();
  const brandStyle = doc.createElement('style');
  brandStyle.textContent = identity.css;
  doc.head.append(brandStyle);
  doc.body.innerHTML = `<nav aria-label="خيارات الطباعة"><button data-paper="thermal">إيصال ٨٠ مم</button><button data-paper="a4">مستند A4</button><button data-print disabled>طباعة</button></nav>
    <main><header><div class="brand"><img alt=""><div><strong>HYDROLAND</strong><b>هيدرولاند</b></div></div>
      <h1>فاتورة ضريبية مبسطة</h1></header>
    <article><p class="status">نموذج تجريبي للطباعة</p>
    <section class="seller">${centerMark}<div><small>البائع ومقدّم الخدمة</small><h2>${escape(name)}</h2>
    ${seller.displayName && seller.displayName !== name ? '<p>' + escape(seller.displayName) + '</p>' : ''}</div></section>
    <p class="address">عنوان تجريبي، المملكة العربية السعودية</p>
    <div class="meta">${row('الرقم الضريبي التجريبي', invoice.vatNumber)}${row('رقم الفاتورة', invoice.number)}${row('وقت الإصدار بتوقيت الرياض', localTime)}${row('منصة الحجز والتحصيل', 'هيدرولاند')}</div>
    <h3>تفاصيل الخدمات <span>ريال سعودي</span></h3>
    <table><thead><tr><th>الخدمة</th><th>العدد</th><th>سعر الوحدة قبل الضريبة</th><th>قيمة الضريبة</th><th>الإجمالي شامل الضريبة</th></tr></thead>
    <tbody>${invoice.rows.map(l => '<tr><td>'+l.title+'</td><td>'+l.quantity+'</td><td>'+money(l.netUnit)+'</td><td>'+money(l.vat)+'</td><td>'+money(l.gross)+'</td></tr>').join('')}</tbody></table>
    <section class="totals">${row('المجموع قبل الضريبة', money(invoice.net))}${row('ضريبة القيمة المضافة (١٥٪)', money(invoice.vat))}<div class="sum">${row('الإجمالي شامل الضريبة',money(invoice.gross))}</div></section>
    <figure>${qr}<figcaption>رمز استجابة تجريبي</figcaption></figure><p class="note">استُخدمت بيانات ضريبية افتراضية للمعاينة فقط.</p></article>
    <footer><bdi>HYDROLAND / APPROVED IDENTITY V2</bdi><span>صفحة ١ من ١</span></footer></main>`;
  const pageRule = doc.createElement('style'); doc.head.append(pageRule);
  const format = selected => {
    doc.body.className = selected;
    pageRule.textContent = '@page{size:' + (selected === 'a4' ? 'A4' : '80mm 250mm') + ';margin:0}';
    for (const button of doc.querySelectorAll('[data-paper]')) button.setAttribute('aria-pressed', String(button.dataset.paper === selected));
  };
  for (const button of doc.querySelectorAll('[data-paper]')) button.onclick = () => format(button.dataset.paper);
  format(options.paper === 'a4' ? 'a4' : 'thermal');
  doc.querySelector('.brand img').src = identity.logo;
  await Promise.all([doc.fonts.load('700 16px Tajawal'),doc.fonts.load('400 16px Tajawal'),...Array.from(doc.images).map(img => img.decode())]);
  const print = doc.querySelector('[data-print]'); print.disabled = false; print.onclick = () => win.print();
}
