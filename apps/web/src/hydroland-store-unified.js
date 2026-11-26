(() => {
  const ui = window.HydrolandI18n.createScope('store-unified', {
    'أضف للسلة': 'Add to cart', 'عدد المقاعد': 'Seats', 'إزالة': 'Remove',
    'موعد التسليم (بتوقيت السعودية)': 'Handover time (Saudi time)',
    'موعد الإرجاع (بتوقيت السعودية)': 'Return time (Saudi time)',
    'اختر موعد تسليم مستقبليًا وإرجاعًا بعده.': 'Choose a future handover time and a later return time.',
    'عدد المقاعد يتجاوز المتاح.': 'The seat count exceeds availability.',
    'هذا العرض موجود في السلة.': 'This offer is already in the cart.',
    'تمت إضافة العرض إلى السلة.': 'Offer added to cart.',
    'سعر العرض غير متاح.': 'The offer price is unavailable.',
    'السلة المختلطة متاحة بالريال السعودي.': 'Mixed orders are available in Saudi riyals.',
    'سلع': 'Goods', 'رحلة': 'Trip', 'دورة': 'Course', 'تأجير': 'Rental',
    'طلب موحد': 'Unified order', 'طلباتي الموحدة': 'My unified orders',
    'إجمالي الطلب': 'Order total', 'المصدر الأصلي': 'Original source',
    'إجمالي التحصيل': 'Total collected', 'المبلغ المسترد': 'Refunded amount', 'صافي التحصيل': 'Net collected', 'المتبقي للتحصيل': 'Remaining to collect',
    'يتطلب مراجعة': 'Review required', 'التحصيل والرد قيد المراجعة.': 'Collection and refunds require review.',
    'يوجد طلب رد بانتظار المطابقة.': 'A refund request awaits reconciliation.',
    'الحالة': 'Status', 'حالة الدفع': 'Payment status', 'المورد': 'Provider',
    'إصدار السياسة': 'Policy version', 'عدد الوحدات': 'Quantity',
    'الموعد الأصلي (بتوقيت السعودية)': 'Original schedule (Saudi time)',
    'الشروط المحفوظة': 'Saved terms', 'عرض الشروط والدفع': 'Review terms and pay',
    'تحديث حالة الدفع': 'Refresh payment status', 'فاتورة المركز الأصلية': 'Original center invoice',
    'السداد لكل بند مستقل. سداد بند لا يسدد بقية الطلب ولا يؤكد تنفيذ خدماته.': 'Each source is paid separately. Paying one source does not pay the rest of the order or confirm its services were delivered.',
    'إنشاء الطلب لا يخصم أي مبلغ. تُراجع شروط كل بند قبل دفعه.': 'Creating the order does not charge any amount. Review each source’s terms before payment.',
    'جارٍ تحميل الطلبات الموحدة...': 'Loading unified orders...',
    'تعذر تحميل الطلبات الموحدة.': 'Could not load unified orders.',
    'تم إنشاء الطلب الموحد. راجع شروط كل بند لإتمام دفعه.': 'Unified order created. Review each source’s terms to complete its payment.',
    'تعذر إنشاء الطلب الموحد.': 'Could not create the unified order.',
    'تعذر التحقق من بيانات الطلب.': 'Could not verify the order details.',
    'تعذر تحميل شروط الدفع.': 'Could not load payment terms.',
    'تفاصيل الدفع': 'Payment details', 'إغلاق': 'Close',
    'جارٍ تحميل شروط الطلب...': 'Loading the original order terms...',
    'السجل التجاري': 'Commercial registration', 'المبلغ': 'Amount',
    'اطلعت على شروط هذا البند وأوافق عليها': 'I have reviewed and accept this source’s terms',
    'وافق على الشروط للمتابعة.': 'Accept the terms to continue.',
    'المتابعة إلى الدفع': 'Continue to payment',
    'تعذر تجهيز الدفع؛ حدّث حالة الطلب قبل المحاولة مجددًا.': 'Could not prepare payment. Refresh the order status before trying again.',
    'رابط الدفع غير صالح.': 'Invalid payment link.',
    'تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.': 'Collection has been verified and is awaiting the center’s financial reconciliation.',
    'تم تأكيد التحصيل ومطابقته ماليًا.': 'Collection has been confirmed and financially reconciled.',
    'لم يكتمل التحصيل بعد.': 'Collection is not complete.',
    'انتهى رابط الدفع أو أُلغي.': 'The payment link has expired or been canceled.',
    'حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.': 'The center needs to review the payment status. Do not create another payment.',
    'رد كامل عند الإلغاء قبل الانطلاق بـ٤٨ ساعة أو أكثر. داخل آخر ٤٨ ساعة وقبل الانطلاق: خصم ٥٠٪. عدم الحضور بعد إغلاق الرحلة: لا استرداد، مع بقاء الحقوق النظامية المنطبقة.': 'Full refund when canceled at least 48 hours before departure. Within the last 48 hours before departure, 50% is deducted. No ordinary refund for a no-show after the trip closes; applicable statutory rights remain.',
    'إلغاء مجاني قبل موعد التسليم بـ٢٤ ساعة أو أكثر. داخل آخر ٢٤ ساعة وقبل التسليم: خصم ٢٥٪. لا استرداد اختياري بعد التسليم، مع بقاء الحقوق النظامية المنطبقة. تعذر التسليم من مقدم الخدمة يستوجب رد المبلغ كاملًا.': 'Free cancellation at least 24 hours before handover. Within the last 24 hours before handover, 25% is deducted. No ordinary voluntary refund after handover; applicable statutory rights remain. Provider failure to hand over the equipment requires a full refund.',
    'لا يُطلب ضمان مالي مقدم. يتحمل المستأجر الضرر الجديد المثبت عند الإرجاع وفق حالة القطعة المسجلة عند التسليم.': 'No upfront deposit is required. The renter is liable for new damage evidenced at return against the recorded handover condition.',
    'هذه بيانات الطلب وشروطه، وليست فاتورة ضريبية نهائية.': 'These are the order details and terms, not a final tax invoice.'
  });
  const auth = () => window.HydrolandAuth;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (value, currency = 'SAR') => new Intl.NumberFormat('ar-SA', {style:'currency', currency}).format(value / 100);
  const financialMoney = value => Number.isSafeInteger(value) && value >= 0 ? money(value) : ui.t('يتطلب مراجعة');
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ar-SA', {timeZone:'Asia/Riyadh'}) : '—';
  const session = () => {const version = auth()?.getSessionVersion?.(); return () => auth()?.isAuthenticated?.() && version === auth()?.getSessionVersion?.();};
  const kinds = {GOODS:'سلع', TRIP:'رحلة', COURSE:'دورة', RENTAL:'تأجير'};
  const sourceKinds = {STORE_ORDER:'GOODS', TRIP_BOOKING:'TRIP', TRAINING_ENROLLMENT:'COURSE', EQUIPMENT_RENTAL:'RENTAL'};
  const parse = async response => {
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join('، ') : typeof body?.message === 'string' ? body.message : '');
    return body;
  };
  const request = async (path, options) => parse(await auth().authorizedFetch(path, options));
  const policyVersion = snapshot => snapshot?.policySnapshot?.version || snapshot?.refundPolicy?.snapshot?.version || snapshot?.version || '—';
  const canonicalActions = line => {
    const id = encodeURIComponent(line.sourceId || '');
    const base = {STORE_ORDER:'/store/orders/', TRAINING_ENROLLMENT:'/payments/courses/', EQUIPMENT_RENTAL:'/payments/rentals/', TRIP_BOOKING:'/payments/bookings/'}[line.sourceType];
    if (!base || !id || sourceKinds[line.sourceType] !== line.kind) return {};
    const paths = {quote:base + id + '/quote', checkout:line.kind === 'TRIP' ? '/payments' : base + id + '/checkout',
      refresh:line.kind === 'TRIP' ? line.paymentId && '/payments/' + encodeURIComponent(line.paymentId) + '/refresh' : base + id + '/refresh'};
    // API actions must stay bound to the original source, never an arbitrary URL.
    return Object.fromEntries(Object.entries(paths).filter(([key, path]) => path && line.actions?.[key] === path));
  };

  function mount({cart, catalog, panel, renderCart, loadProducts, toast, openPayment}) {
    const cartLines = document.createElement('div');cartLines.className = 'hl-unified-cart';cartLines.dataset.unifiedCart = '';
    panel.querySelector('.hl-store-summary').after(cartLines);
    const orders = document.createElement('section');orders.className = 'hl-unified-orders';orders.hidden = true;orders.dataset.unifiedOrders = '';panel.append(orders);
    const style = document.createElement('style');style.textContent = '.hl-unified-cart,.hl-unified-orders{min-width:0;overflow-wrap:anywhere}.hl-unified-cart:empty{display:none}.hl-unified-cart article{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;padding:.5rem 0}.hl-unified-cart article span{flex:1;min-width:10rem}.hl-unified-orders article,.hl-unified-orders [data-unified-line]{display:grid;gap:.65rem;border:1px solid #30556b;padding:1rem;margin:.7rem 0;border-radius:12px}.hl-unified-actions{display:flex;gap:.5rem;flex-wrap:wrap}.hl-unified-offer{display:grid;gap:.5rem;margin-top:.6rem;min-width:0}.hl-unified-offer label{display:grid;gap:.3rem}.hl-unified-offer input{box-sizing:border-box;max-width:100%;min-width:0;width:100%;padding:.5rem;border:1px solid #527288;border-radius:8px;background:#12354a;color:inherit}.hl-unified-orders button,.hl-unified-offer button,.hl-unified-cart button,#hl-unified-payment-dialog button{padding:.6rem .8rem;border:1px solid #527288;border-radius:9px;background:#12354a;color:inherit;cursor:pointer}.hl-unified-orders button:disabled,.hl-unified-offer button:disabled{opacity:.55;cursor:default}#hl-unified-payment-dialog{width:min(640px,calc(100vw - 24px));box-sizing:border-box;max-height:85vh;overflow:auto;background:#071f31;color:#edf7fb;border:1px solid #30556b;border-radius:18px;padding:1.2rem;overflow-wrap:anywhere}#hl-unified-payment-dialog::backdrop{background:#071524bb}#hl-unified-payment-dialog header{display:flex;justify-content:space-between;align-items:center;gap:1rem}#hl-unified-payment-dialog p{line-height:1.8}#hl-unified-payment-dialog label{display:flex;align-items:flex-start;gap:.6rem;margin:1rem 0}';document.head.append(style);
    let pending = null, creating = false, ordersVersion = 0, paymentVersion = 0;
    const showError = (error, fallback) => toast(error?.message || ui.message(fallback));
    const cartKind = row => row.cartKind || 'GOODS';
    const needsUnified = () => {const rows=[...cart.values()];return rows.some(row=>row.cartKind)||new Set(rows.map(row=>row.organizationId).filter(Boolean)).size>1;};
    const formatCart = () => {
      ui.setHTML(cartLines, [...cart.entries()].map(([key, row]) => ui.html`<article><span>${esc(row.nameAr || row.title)} · ${esc(row.quantity)} · ${esc(money(row.priceMinor * row.quantity, row.currency))}${row.scheduledHandoverAt ? '<small>' + esc(date(row.scheduledHandoverAt)) + ' — ' + esc(date(row.dueAt)) + '</small>' : ''}</span><button type="button" data-unified-remove="${esc(key)}" ${creating ? 'disabled' : ''}>إزالة</button></article>`).join(''));
      cartLines.querySelectorAll('[data-unified-remove]').forEach(button => button.addEventListener('click', () => {if (!creating) {cart.delete(button.dataset.unifiedRemove);renderCart();}}));
      const clear = panel.querySelector('[data-clear-catalog-cart]');if (clear) clear.disabled = creating;
      panel.closest('#store').querySelectorAll('[data-unified-add]').forEach(button => {button.disabled = creating || button.hasAttribute('data-unified-unavailable');});
    };
    const add = (kind, offer, values = {}) => {
      if (creating) return;
      const key = kind + ':' + offer.id;
      if (cart.has(key)) {toast(ui.message('هذا العرض موجود في السلة.'));return;}
      const priceMinor = kind === 'TRIP' ? offer.price?.pricePerSeatMinor : offer.priceMinor;
      if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) {toast(ui.message('سعر العرض غير متاح.'));return;}
      cart.set(key, {...offer, ...values, cartKind:kind, quantity:values.seats || 1, priceMinor, currency:offer.currency || 'SAR'});
      renderCart();toast(ui.message('تمت إضافة العرض إلى السلة.'));
    };
    const renderOffers = grid => {
      for (const [kind, selector, list] of [['TRIP','[data-store-trip]',catalog.trips], ['COURSE','[data-store-course]',catalog.courses], ['RENTAL','[data-store-rental]',catalog.rentals]]) {
        grid.querySelectorAll(selector).forEach(card => {
          const id = kind === 'TRIP' ? card.dataset.storeTrip : kind === 'COURSE' ? card.dataset.storeCourse : card.dataset.storeRental;
          const offer = list.find(row => row.id === id);if (!offer) return;
          const form = document.createElement('form');form.className = 'hl-unified-offer';form.dataset.unifiedOffer = kind;
          const capacity = ['DISABLED','REVIEW'].includes(offer.bookingPolicy?.capacityLimit) ? 2000 : Number(offer.remainingSeats ?? offer.capacity ?? 0);
          const blocked = kind === 'RENTAL' ? !offer.available : kind === 'TRIP' ? Boolean(window.HydrolandBookingAvailability?.explain?.(offer)) || capacity < 1 : capacity < 1;
          const fields = kind === 'TRIP' ? ui.html`<label>عدد المقاعد<input name="seats" type="number" min="1" max="${esc(Math.max(1, capacity))}" step="1" value="1" required></label>`
            : kind === 'RENTAL' ? ui.html`<label>موعد التسليم (بتوقيت السعودية)<input name="scheduledHandoverAt" type="datetime-local" required></label><label>موعد الإرجاع (بتوقيت السعودية)<input name="dueAt" type="datetime-local" required></label>` : '';
          ui.setHTML(form, fields + ui.html`<button type="submit" data-unified-add="${kind}" ${blocked ? 'data-unified-unavailable' : ''} ${blocked || creating ? 'disabled' : ''}>أضف للسلة</button>`);
          form.addEventListener('submit', event => {
            event.preventDefault();if (creating || blocked || !form.reportValidity()) return;
            const input = new FormData(form);
            if (kind === 'TRIP') {
              const seats = Number(input.get('seats'));
              if (!Number.isSafeInteger(seats) || seats < 1 || seats > capacity) {toast(ui.message('عدد المقاعد يتجاوز المتاح.'));return;}
              add(kind, offer, {seats});
            } else if (kind === 'RENTAL') {
              // datetime-local is explicitly Saudi time, regardless of the device's zone.
              const start = String(input.get('scheduledHandoverAt')), end = String(input.get('dueAt'));
              const valid = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
              const scheduledHandoverAt = start + ':00+03:00', dueAt = end + ':00+03:00';
              if (!valid(start) || !valid(end) || !(Date.parse(scheduledHandoverAt) > Date.now()) || !(Date.parse(dueAt) > Date.parse(scheduledHandoverAt))) {toast(ui.message('اختر موعد تسليم مستقبليًا وإرجاعًا بعده.'));return;}
              add(kind, offer, {scheduledHandoverAt, dueAt});
            } else add(kind, offer);
          });
          card.append(form);
        });
      }
    };
    const snapshotDetails = line => {
      const snapshot = line.contractSnapshot || {}, sublines = Array.isArray(snapshot.lines) ? snapshot.lines : [snapshot];
      const issuer = snapshot.issuer || sublines[0]?.issuer;
      return ui.html`<details><summary>الشروط المحفوظة</summary><p>المورد: ${esc(issuer?.legalName || issuer?.displayName || '—')}</p><p>المصدر الأصلي: ${esc(line.sourceId)}</p><ul>${sublines.map(item => ui.html`<li>${esc(item.title || item.equipmentName || line.title)} · ${esc(item.quantity || 1)} · ${esc(money(item.amountMinor ?? line.amountMinor, line.currency))} · ${ui.label('إصدار السياسة')}: ${esc(policyVersion(item.refundPolicy ? item : snapshot))}</li>`).join('')}</ul>${snapshot.originalSchedule?.startsAt || snapshot.scheduledHandoverAt ? ui.html`<p>الموعد الأصلي (بتوقيت السعودية): ${esc(date(snapshot.originalSchedule?.startsAt || snapshot.scheduledHandoverAt))} — ${esc(date(snapshot.originalSchedule?.endsAt || snapshot.originalDueAt))}</p>` : ''}<small>هذه بيانات الطلب وشروطه، وليست فاتورة ضريبية نهائية.</small></details>`;
    };
    const validOrder = order => order && typeof order.id === 'string' && Number.isSafeInteger(order.totalMinor) && order.totalMinor >= 0 && order.currency === 'SAR' && Array.isArray(order.lines) && order.lines.length > 0 && order.lines.every(line => Boolean(sourceKinds[line.sourceType]) && sourceKinds[line.sourceType] === line.kind && typeof line.id === 'string' && typeof line.sourceId === 'string' && Number.isSafeInteger(line.amountMinor) && line.amountMinor >= 0 && line.currency === 'SAR') && order.lines.reduce((total, line) => total + line.amountMinor, 0) === order.totalMinor;
    const renderOrders = (rows, active, version) => {
      const current = () => active() && version === ordersVersion;
      ui.setHTML(orders, rows.length ? ui.html`<h3>طلباتي الموحدة</h3><p>السداد لكل بند مستقل. سداد بند لا يسدد بقية الطلب ولا يؤكد تنفيذ خدماته.</p>` + rows.map(order => ui.html`<article data-unified-order="${esc(order.id)}"><h4>طلب موحد · ${esc(order.id)}</h4><p>إجمالي الطلب: ${esc(money(order.totalMinor, order.currency))}</p><div data-unified-totals><p>إجمالي التحصيل: ${esc(financialMoney(order.paidMinor))}</p><p>المبلغ المسترد: ${esc(financialMoney(order.refundedMinor))}</p><p>صافي التحصيل: ${esc(financialMoney(order.netCollectedMinor))}</p><p>المتبقي للتحصيل: ${esc(financialMoney(order.remainingMinor))}</p></div>${order.financialReviewRequired ? ui.html`<p>التحصيل والرد قيد المراجعة.</p>` : ''}${order.refundPending ? ui.html`<p>يوجد طلب رد بانتظار المطابقة.</p>` : ''}${order.lines.map(line => {
        const actions = canonicalActions(line), paid = line.amountMinor === 0 || Number(line.capturedMinor) > 0 || ['CAPTURED','PAID','REFUNDED'].includes(line.paymentStatus);
        const invoice = line.kind === 'TRIP' ? line.paymentId && {type:'TRIP_PAYMENT', id:line.paymentId} : {type:line.sourceType, id:line.sourceId};
        return ui.html`<section data-unified-line="${esc(line.id)}"><h4>${esc(line.title)} · ${ui.label(kinds[line.kind])}</h4><strong>${esc(money(line.amountMinor, line.currency))}</strong><p>الحالة: <bdi>${esc(line.status)}</bdi> · حالة الدفع: <bdi data-unified-payment-state>${esc(line.paymentStatus || '—')}</bdi></p><div data-unified-source-totals><p>إجمالي التحصيل: ${esc(financialMoney(line.capturedMinor))}</p><p>المبلغ المسترد: ${esc(financialMoney(line.refundedMinor))}</p><p>صافي التحصيل: ${esc(financialMoney(line.netCollectedMinor))}</p><p>المتبقي للتحصيل: ${esc(financialMoney(line.remainingMinor))}</p></div>${line.financialReviewRequired ? ui.html`<p>التحصيل والرد قيد المراجعة.</p>` : ''}${line.refundPending ? ui.html`<p>يوجد طلب رد بانتظار المطابقة.</p>` : ''}${snapshotDetails(line)}<div class="hl-unified-actions">${actions.quote && actions.checkout && !paid && !line.financialReviewRequired && !['CANCELLED','EXPIRED','RETURNED'].includes(line.status) ? ui.html`<button type="button" data-unified-pay>عرض الشروط والدفع</button>` : ''}${actions.refresh ? ui.html`<button type="button" data-unified-refresh>تحديث حالة الدفع</button>` : ''}${invoice ? ui.html`<button type="button" data-account-invoices data-invoice-type="${esc(invoice.type)}" data-invoice-source="${esc(invoice.id)}">فاتورة المركز الأصلية</button>` : ''}</div><p role="status" data-unified-feedback></p></section>`;
      }).join('')}</article>`).join('') : '');
      orders.hidden = !rows.length;
      for (const card of orders.querySelectorAll('[data-unified-order]')) {
        const order = rows.find(row => row.id === card.dataset.unifiedOrder);
        for (const section of card.querySelectorAll('[data-unified-line]')) {
          const line = order.lines.find(row => row.id === section.dataset.unifiedLine);
          section.querySelector('[data-unified-pay]')?.addEventListener('click', () => {
            if (!current()) return;
            if (line.kind === 'GOODS' || line.kind === 'COURSE') void openPayment(line.kind === 'GOODS' ? 'STORE' : 'COURSE', line.sourceId);
            else void openSourcePayment(line);
          });
          section.querySelector('[data-unified-refresh]')?.addEventListener('click', async event => {
            if (!current() || event.currentTarget.disabled) return;
            const button = event.currentTarget;button.disabled = true;
            try {await request(canonicalActions(line).refresh, {method:'POST'});if (current()) await loadOrders();}
            catch (error) {if (current()) section.querySelector('[data-unified-feedback]').textContent = error?.message || ui.t('تعذر تحميل الطلبات الموحدة.');}
            finally {if (current()) button.disabled = false;}
          });
        }
      }
    };
    const loadOrders = async () => {
      if (!auth()?.isAuthenticated?.()) return;
      const active = session(), version = ++ordersVersion;orders.hidden = false;ui.setText(orders, 'جارٍ تحميل الطلبات الموحدة...');
      try {
        const result = await request('/store/unified-orders');if (!active() || version !== ordersVersion) return;
        const rows = result?.items;
        if (!Array.isArray(rows) || !rows.every(validOrder)) throw new Error('');
        renderOrders(rows, active, version);
      } catch (error) {if (active() && version === ordersVersion) orders.textContent = error?.message || ui.t('تعذر تحميل الطلبات الموحدة.');}
    };
    const create = async () => {
      if (creating || !needsUnified() || !auth()?.isAuthenticated?.()) return;
      if ([...cart.values()].some(row => row.currency && row.currency !== 'SAR')) {toast(ui.message('السلة المختلطة متاحة بالريال السعودي.'));return;}
      const items = [...cart.values()].map(row => {
        const kind = cartKind(row), expectedUnitPriceMinor = row.priceMinor;
        if (kind === 'GOODS') return {kind, productId:row.id, quantity:row.quantity, expectedUnitPriceMinor};
        if (kind === 'TRIP') return {kind, tripId:row.id, seats:row.quantity, expectedUnitPriceMinor};
        if (kind === 'COURSE') return {kind, courseId:row.id, expectedUnitPriceMinor};
        return {kind, resourceId:row.id, scheduledHandoverAt:row.scheduledHandoverAt, dueAt:row.dueAt, expectedUnitPriceMinor};
      });
      const fingerprint = JSON.stringify(items);
      if (!pending || pending.fingerprint !== fingerprint) pending = {fingerprint, requestId:crypto.randomUUID()};
      const active = session();creating = true;renderCart();
      try {
        const order = await request('/store/unified-orders', {method:'POST', body:JSON.stringify({requestId:pending.requestId, items})});
        if (!active()) return;
        if (!validOrder(order)) throw new Error(ui.t('تعذر التحقق من بيانات الطلب.'));
        cart.clear();pending = null;renderCart();
        renderOrders([order], active, ++ordersVersion);
        toast(ui.message('تم إنشاء الطلب الموحد. راجع شروط كل بند لإتمام دفعه.'));
        window.dispatchEvent(new CustomEvent('hydroland:unified-order-created', {detail:{order}}));
        await loadProducts();
      } catch (error) {if (active()) showError(error, 'تعذر إنشاء الطلب الموحد.');}
      finally {if (active()) {creating = false;renderCart();}}
    };
    const dialog = document.createElement('dialog');dialog.id = 'hl-unified-payment-dialog';
    ui.setHTML(dialog, ui.html`<header><h3>تفاصيل الدفع</h3><button type="button" data-unified-close>إغلاق</button></header><div data-unified-payment-body></div>`);document.body.append(dialog);
    dialog.querySelector('[data-unified-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {paymentVersion++;dialog.querySelector('[data-unified-payment-body]').replaceChildren();});
    const paymentMessage = state => state?.collectionVerified ? 'تم تأكيد التحصيل ومطابقته ماليًا.'
      : state?.status === 'CAPTURED' ? 'تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.'
      : ['PENDING','CREATED','INITIATED'].includes(state?.status) ? 'لم يكتمل التحصيل بعد.'
      : ['CANCELLED','FAILED'].includes(state?.status) ? 'انتهى رابط الدفع أو أُلغي.' : 'حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.';
    const openSourcePayment = async line => {
      if (!auth()?.isAuthenticated?.()) return;
      const active = session(), version = ++paymentVersion, actions = canonicalActions(line), body = dialog.querySelector('[data-unified-payment-body]');
      const current = () => active() && version === paymentVersion && dialog.open && dialog.isConnected;
      ui.setText(body, 'جارٍ تحميل شروط الطلب...');if (!dialog.open) dialog.showModal();
      try {
        if (!actions.quote || !actions.checkout) throw new Error('');
        const quote = await request(actions.quote);if (!current()) return;
        const snapshot = quote?.snapshot, expectedSource = line.kind === 'TRIP' ? snapshot?.source?.id : snapshot?.sourceId;
        if (!snapshot || expectedSource !== line.sourceId || (line.kind === 'TRIP' ? snapshot.source?.kind !== 'TRIP_BOOKING' : snapshot.sourceType !== 'EQUIPMENT_RENTAL') || snapshot.amountMinor !== line.amountMinor || snapshot.currency !== line.currency
          || typeof quote.quoteHash !== 'string' || quote.policyVersion !== '2026-11-21.1') throw new Error('');
        const terms = line.kind === 'TRIP' ? 'رد كامل عند الإلغاء قبل الانطلاق بـ٤٨ ساعة أو أكثر. داخل آخر ٤٨ ساعة وقبل الانطلاق: خصم ٥٠٪. عدم الحضور بعد إغلاق الرحلة: لا استرداد، مع بقاء الحقوق النظامية المنطبقة.'
          : 'إلغاء مجاني قبل موعد التسليم بـ٢٤ ساعة أو أكثر. داخل آخر ٢٤ ساعة وقبل التسليم: خصم ٢٥٪. لا استرداد اختياري بعد التسليم، مع بقاء الحقوق النظامية المنطبقة. تعذر التسليم من مقدم الخدمة يستوجب رد المبلغ كاملًا.';
        ui.setHTML(body, ui.html`<h4>${esc(line.title)}</h4><p>المورد: ${esc(snapshot.issuer?.legalName || snapshot.issuer?.displayName || '—')}</p><p>السجل التجاري: ${esc(snapshot.issuer?.registrationNumber || '—')}</p><p>المبلغ: ${esc(money(snapshot.amountMinor, snapshot.currency))}</p><p>عدد الوحدات: ${esc(snapshot.quantity || snapshot.lines?.length || 1)}</p><p>الموعد الأصلي (بتوقيت السعودية): ${esc(date(snapshot.originalSchedule?.startsAt || snapshot.scheduledHandoverAt))} — ${esc(date(snapshot.originalSchedule?.endsAt || snapshot.originalDueAt))}</p><p>${ui.label(terms)}</p>${line.kind === 'RENTAL' && snapshot.damagePolicy?.version === 'RENTAL_DAMAGE_1' ? ui.html`<p>لا يُطلب ضمان مالي مقدم. يتحمل المستأجر الضرر الجديد المثبت عند الإرجاع وفق حالة القطعة المسجلة عند التسليم.</p>` : ''}<p>إصدار السياسة: ${esc(quote.policyVersion)}</p><small>هذه بيانات الطلب وشروطه، وليست فاتورة ضريبية نهائية.</small><label><input type="checkbox" data-unified-accepted>اطلعت على شروط هذا البند وأوافق عليها</label><button type="button" data-unified-checkout>المتابعة إلى الدفع</button><p role="status" data-unified-checkout-feedback></p>`);
        const button = body.querySelector('[data-unified-checkout]'), feedback = body.querySelector('[data-unified-checkout-feedback]');
        button.addEventListener('click', async () => {
          if (!current() || button.disabled) return;
          if (!body.querySelector('[data-unified-accepted]').checked) {ui.setText(feedback, 'وافق على الشروط للمتابعة.');return;}
          const data = line.kind === 'TRIP' ? {bookingId:line.sourceId, idempotencyKey:'booking:' + line.sourceId, policyAcceptance:{version:quote.policyVersion, quoteHash:quote.quoteHash}}
            : {quoteHash:quote.quoteHash, acceptedPolicyVersion:quote.policyVersion, idempotencyKey:'rental:' + line.sourceId};
          button.disabled = true;
          try {
            const state = await request(actions.checkout, {method:'POST', body:JSON.stringify(data)});if (!current()) return;
            if (state?.checkoutUrl) {
              const url = new URL(state.checkoutUrl);
              if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error(ui.t('رابط الدفع غير صالح.'));
              window.location.assign(url.toString());return;
            }
            ui.setText(feedback, paymentMessage(state));
            void loadOrders();
          } catch (error) {if (current()) feedback.textContent = error?.message || ui.t('تعذر تجهيز الدفع؛ حدّث حالة الطلب قبل المحاولة مجددًا.');}
          finally {if (current()) button.disabled = false;}
        });
      } catch (error) {if (current()) body.textContent = error?.message || ui.t('تعذر تحميل شروط الدفع.');}
    };
    const clearSession = () => {pending = null;creating = false;ordersVersion++;paymentVersion++;orders.replaceChildren();orders.hidden = true;cartLines.replaceChildren();dialog.close();};
    panel.querySelector('.hl-store-orders').addEventListener('click', loadOrders);
    return {renderOffers, renderCart:formatCart, needsUnified, create, clearSession, busy:() => creating};
  }
  window.HydrolandUnifiedStore = {mount};
})();
