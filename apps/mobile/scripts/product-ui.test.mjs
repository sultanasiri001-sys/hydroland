import assert from 'node:assert/strict';
import {act, deferred, productWorld, response} from './product-test-runtime.mjs';
import {NATIVE_FIXTURE_EMAIL, NATIVE_FIXTURE_PASSWORD} from './product-native-fixture.mjs';
let passed = 0;
async function check(name, run) {const w = await productWorld(); try {await run(w); passed++; console.log('PASS', name);} finally {await w.close();}}
async function fillLogin(w) {await w.input('login-email', NATIVE_FIXTURE_EMAIL); await w.input('login-password', NATIVE_FIXTURE_PASSWORD);}

await check('guest home navigates every native product destination, with no protected fetch', async w => {
  await w.mount('app/index.tsx');
  assert.ok(w.has('home-login'));
  for (const key of ['account', 'credentials', 'trips', 'bookings', 'training', 'finance', 'notifications']) {await w.press('nav-' + key); assert.equal(w.navigations.at(-1).target, '/' + key);}
  assert.equal(w.calls.filter(call => call.route === '/me').length, 0);
});
await check('actual Login suppresses duplicate taps and cancels a write that finishes after unmount', async w => {
  await w.mount('app/login.tsx', {returnTo: '/trip-day?tripId=native-trip'}); await fillLogin(w);
  const gate = deferred(); let writing = false;
  w.setWriteHook(async key => {if (key === 'hydroland.session.v2') {writing = true; await gate.promise;}});
  await act(async () => {const press = w.find('login-submit', 'Pressable').props.onPress; press(); press();});
  await w.until(() => writing, 'SecureStore write');
  assert.equal(w.calls.filter(call => call.route === '/auth/login').length, 1); assert.equal(w.navigations.length, 0);
  await w.unmount(); gate.resolve();
  await w.until(() => w.calls.some(call => call.route === '/auth/logout'), 'issued session revoked'); await w.settle();
  assert.equal(await w.load('src/session.ts').loadSession(), null);
  assert.equal(w.secure.has('hydroland.session.v2'), false); assert.equal(w.navigations.length, 0);
});
await check('Login resumes only the protected local route after authoritative identity and persistence', async w => {
  await w.mount('app/login.tsx', {returnTo: '/bookings?bookingId=native-booking'}); await fillLogin(w);
  const gate = deferred(); let writing = false;
  w.setWriteHook(async key => {if (key === 'hydroland.session.v2') {writing = true; await gate.promise;}});
  await w.press('login-submit'); await w.until(() => writing, 'persist started'); assert.equal(w.navigations.length, 0);
  gate.resolve(); await w.until(() => w.navigations.length > 0, 'return navigation');
  assert.equal(w.navigations[0].target, '/bookings?bookingId=native-booking');
  assert.equal((await w.load('src/session.ts').getSessionScope()).accountId, w.fixture.data.profile.id);
  assert.ok(w.secure.has('hydroland.session.v2'));
});
await check('MFA remains ephemeral and cancelling a held verification revokes late issued tokens', async w => {
  const gate = deferred(); let verifying = false;
  w.setHandler((route, init, next) => {
    if (route === '/auth/login') return response({mfaRequired: true, challengeToken: 'q'.repeat(64), expiresAt: new Date(Date.now() + 300000).toISOString()});
    if (route === '/auth/mfa/verify') {verifying = true; return gate.promise;}
    return next();
  });
  await w.mount('app/login.tsx'); await fillLogin(w); await w.press('login-submit'); await w.until(() => w.has('login-mfa-code'), 'MFA form');
  assert.equal(w.secure.has('hydroland.session.v2'), false); assert.ok(![...w.secure.values()].some(value => value.includes('q'.repeat(64))));
  await w.input('login-mfa-code', '123456'); await w.press('login-submit'); await w.until(() => verifying, 'verify requested');
  await w.press('login-mfa-cancel'); gate.resolve(response(w.fixture.tokens()));
  await w.until(() => w.calls.some(call => call.route === '/auth/logout'), 'late MFA tokens revoked'); await w.settle();
  assert.equal(await w.load('src/session.ts').loadSession(), null); assert.equal(w.navigations.length, 0); assert.ok(w.has('login-password'));
});
await check('navigation rejects external destinations and token-bearing queries', async w => {
  const safe = w.load('src/navigation.ts').safeReturnTo;
  for (const route of ['https://outside.invalid', '//outside.invalid', '/login', '/bookings?bookingId=x&token=secret', '/training?enrollmentId=%', '/account?token=x', '/bookings?bookingId=x#secret', ['/trips'], '/__proto__']) assert.equal(safe(route), '/');
  assert.equal(safe('/trips?tripId=a%2Fb'), '/trips?tripId=a%2Fb');
  assert.equal(safe('/notifications'), '/notifications');
});
await check('all seven real screens render signed-in HTTP records, without elevated actor input', async w => {
  await w.login();
  for (const route of ['account', 'credentials', 'trips', 'bookings', 'training', 'finance', 'notifications']) {
    await w.mount('app/' + route + '.tsx'); await w.until(() => !w.text().includes('جاري تحميل بياناتك'), route + ' loaded'); assert.ok(w.has(route + '-screen'));
    assert.ok(!w.text().includes('تعذر إكمال الطلب'), route + ' has no transport error');
  }
  for (const call of w.calls.filter(call => call.init.body)) {
    const body = JSON.parse(call.init.body);
    for (const field of ['actorId', 'ownerId', 'role', 'isAdmin']) assert.equal(Object.hasOwn(body, field), false);
  }
});
await check('late private credential response is discarded after account replacement', async w => {
  await w.login(); const gate = deferred(); let held = false, second = false;
  w.setHandler((route, init, next) => {if (route === '/credentials' && !second) {held = true; return gate.promise;} if (route === '/credentials' && second) return response([{id: 'b-credential', title: 'Only account B', issuer: 'QA', verificationStatus: 'VERIFIED', documents: []}]); return next();});
  await w.mount('app/credentials.tsx'); await w.until(() => held, 'private response held');
  second = true; w.fixture.data.profile.id = '10000000-0000-4000-8000-000000000002'; w.fixture.data.profile.person.firstName = 'Account B'; await w.login();
  gate.resolve(response([{id: 'private-a', title: 'SECRET A DOCUMENT', verificationStatus: 'VERIFIED', documents: []}]));
  await w.until(() => w.text().includes('Only account B'), 'account B records'); assert.ok(!w.text().includes('SECRET A DOCUMENT'));
});
await check('profile form clears optional strings using the real account contract', async w => {
  await w.login(); let saved;
  w.setHandler((route, init, next) => {
    if (route === '/me' && init.method === 'PATCH') {
      saved = JSON.parse(init.body);
      if (Object.values(saved).some(value => typeof value !== 'string')) return response({message: 'Account fields must be strings'}, 400);
      w.fixture.data.profile.person.firstName = saved.firstName; return response(w.fixture.data.profile);
    }
    return next();
  });
  await w.mount('app/account.tsx'); await w.until(() => w.has('profile-save'), 'profile form');
  await w.input('profile-firstName', 'Updated native profile');
  for (const field of ['lastName', 'phone', 'headline', 'bio', 'regionCode']) await w.input('profile-' + field, '');
  await w.press('profile-save'); await w.until(() => saved, 'profile save');
  assert.equal(saved.firstName, 'Updated native profile');
  for (const field of ['lastName', 'phone', 'headline', 'bio', 'regionCode']) assert.equal(saved[field], '');
  await w.until(() => w.context().profile.person.firstName === saved.firstName, 'authoritative profile refreshed');
});
await check('English validation stays English when the server returns an Arabic validation message', async w => {
  await w.login(); const serverMessage = 'أدخل تعديلًا صحيحًا على بيانات الحساب.';
  w.setHandler((route, init, next) => route === '/me' && init.method === 'PATCH' ? response({message: serverMessage}, 400) : next());
  await w.mount('app/account.tsx'); await w.until(() => w.has('profile-save'), 'profile form');
  await act(async () => w.context().setLocale('en')); await w.press('profile-save');
  await w.until(() => w.text().includes('Review the entered values'), 'localized validation');
  assert.ok(!w.text().includes(serverMessage));
});
await check('same-session role suspension clears held reviewer output and all reviewer controls', async w => {
  w.fixture.data.profile.roleAssignments.push({id: 'reviewer-role', role: 'REVIEWER', status: 'ACTIVE', updatedAt: '2026-11-27T10:00:00Z'}); await w.login();
  const gate = deferred(); let held = false;
  w.setHandler((route, init, next) => {if (route === '/credentials/admin/pending') {held = true; return gate.promise;} return next();});
  await w.mount('app/credentials.tsx'); await w.until(() => w.has('credentials-view-REVIEW'), 'review tab'); await w.press('credentials-view-REVIEW'); await w.until(() => held, 'review queue held');
  const offline = w.load('src/offline-access.ts'), scope = await w.load('src/session.ts').getSessionScope();
  offline.acceptOfflineLease({version: 1, accountId: scope.accountId, sessionId: 'synthetic-session', tripId: 'native-trip', resourceKind: 'PACKAGE', resourceId: 'native-trip', sourceRevision: 'a'.repeat(64), issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300000).toISOString(), token: 'synthetic-verified-response'}, scope, offline.offlineClock());
  assert.equal(offline.offlineLeaseState('PACKAGE', 'native-trip'), true);
  w.fixture.data.profile.roleAssignments[1].status = 'SUSPENDED';
  await act(async () => {await w.context().refreshProfile();}); gate.resolve(response([{id: 'other-person', title: 'PRIVATE REVIEW DOCUMENT', issuer: 'QA', verificationStatus: 'PENDING', documents: []}])); await w.settle();
  assert.ok(!w.has('credentials-view-REVIEW')); assert.ok(!w.text().includes('PRIVATE REVIEW DOCUMENT'));
  assert.equal(offline.offlineLeaseState('PACKAGE', 'native-trip'), false, 'Known role revocation must invalidate the independent TripDay lease.');
});
await check('network failure hides private online data without inventing offline lease revocation', async w => {
  await w.login(); await w.mount('app/account.tsx'); await w.until(() => w.has('profile-save'), 'profile form');
  const offline = w.load('src/offline-access.ts'), scope = await w.load('src/session.ts').getSessionScope();
  offline.acceptOfflineLease({version: 1, accountId: scope.accountId, sessionId: 'synthetic-session', tripId: 'native-trip', resourceKind: 'PACKAGE', resourceId: 'native-trip', sourceRevision: 'a'.repeat(64), issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300000).toISOString(), token: 'synthetic-verified-response'}, scope, offline.offlineClock());
  w.setHandler((route, init, next) => route === '/me' ? response({message: 'Synthetic transport outage'}, 503) : next());
  await act(async () => {await assert.rejects(w.context().refreshProfile());});
  assert.ok(w.has('sign-in-required')); assert.equal(offline.offlineLeaseState('PACKAGE', 'native-trip'), true);
});
await check('notification drafts survive live language change without refetching or losing consent', async w => {
  await w.login(); await w.mount('app/notifications.tsx'); await w.press('notifications-tab-PREFERENCES'); await w.until(() => w.has('notice-phone') || w.has('notice-quiet-start'), 'preference form');
  await w.input('notice-quiet-start', '22:15'); await w.input('notice-quiet-end', '06:45'); await w.toggle('notice-email', false); await w.toggle('notice-confirm', true);
  const count = w.calls.filter(call => call.route === '/notifications/delivery/preferences').length;
  await w.press('change-language');
  assert.equal(w.find('notice-quiet-start', 'TextInput').props.value, '22:15'); assert.equal(w.find('notice-email', 'Switch').props.value, false); assert.equal(w.find('notice-confirm', 'Switch').props.value, true);
  assert.equal(w.calls.filter(call => call.route === '/notifications/delivery/preferences').length, count); assert.ok(w.text().includes('Delivery channels and events'));
});
await check('notification save sends actual revision and explicit consent; quiet hours validation blocks invalid input', async w => {
  await w.login(); let saved;
  w.setHandler((route, init, next) => {if (route === '/notifications/delivery/preferences' && init.method === 'POST') {saved = JSON.parse(init.body); return response({...w.fixture.data.preferences, revision: 1});} return next();});
  await w.mount('app/notifications.tsx'); await w.press('notifications-tab-PREFERENCES'); await w.until(() => w.has('notice-save'), 'preference form');
  await w.input('notice-quiet-start', '24:00'); await w.toggle('notice-confirm', true); assert.equal(w.find('notice-save', 'Pressable').props.disabled, true);
  await w.input('notice-quiet-start', '22:30'); await w.input('notice-quiet-end', '06:15'); await w.toggle('notice-email', false); await w.press('notice-save');
  await w.until(() => saved, 'preferences saved'); assert.deepEqual(saved, {email: false, sms: false, whatsapp: false, push: false, bookings: true, invoices: true, expectedRevision: 0, quietStart: 1350, quietEnd: 375, timeZone: 'Asia/Riyadh', confirmed: true});
});
await check('phone-code consent never authorizes removal of a verified phone', async w => {
  await w.login(); Object.assign(w.fixture.data.preferences, {phoneVerified: true, phoneVerificationAvailable: true, maskedPhone: '••••1234'});
  await w.mount('app/notifications.tsx'); await w.press('notifications-tab-PREFERENCES'); await w.until(() => w.has('notice-phone-confirm'), 'phone options');
  await w.input('notice-phone', '+966500000001'); await w.toggle('notice-phone-confirm', true);
  assert.equal(w.find('notice-phone-remove-confirm', 'Switch').props.value, false); assert.equal(w.find('notice-phone-remove', 'Pressable').props.disabled, true);
  await w.toggle('notice-phone-remove-confirm', true); assert.equal(w.find('notice-phone-remove', 'Pressable').props.disabled, false);
  await w.input('notice-phone', '+966500000002'); assert.equal(w.find('notice-phone-confirm', 'Switch').props.value, false, 'Consent belongs to the entered phone.');
  assert.equal(w.calls.filter(call => call.route.endsWith('/phone/remove')).length, 0);
});
await check('phone challenge is invalidated on rotation and a challenge created after in-request refresh is retained', async w => {
  await w.login(); Object.assign(w.fixture.data.preferences, {phoneVerificationAvailable: true});
  const session = w.load('src/session.ts'); let expireOnce = false, requested = 0;
  w.setHandler((route, init, next) => {
    if (route === '/notifications/delivery/phone/challenges') {
      requested++;
      if (expireOnce) {expireOnce = false; return response({message: 'Synthetic expired access token'}, 401);}
      return response({challengeId: 'synthetic-phone-' + requested, sessionId: session.getCurrentSessionId(), expiresAt: new Date(Date.now() + 300000).toISOString(), status: 'PROVIDER_ACCEPTED'});
    }
    return next();
  });
  await w.mount('app/notifications.tsx'); await w.press('notifications-tab-PREFERENCES'); await w.until(() => w.has('notice-phone'), 'phone options');
  await w.input('notice-phone', '+966500000001'); await w.toggle('notice-phone-confirm', true); await w.press('notice-phone-send'); await w.until(() => w.has('notice-phone-code'), 'first challenge');
  const key = w.context().authKey, first = session.getCurrentSessionId(); await act(async () => {await session.refreshSession();}); await w.settle();
  assert.notEqual(session.getCurrentSessionId(), first); assert.equal(w.context().authKey, key); assert.ok(!w.has('notice-phone-code'));
  assert.equal(w.find('notice-phone-confirm', 'Switch').props.value, false);
  expireOnce = true; await w.toggle('notice-phone-confirm', true); await w.press('notice-phone-send'); await w.until(() => w.has('notice-phone-code'), 'challenge after refresh inside request');
  assert.equal(requested, 3); assert.ok(!w.text().includes('انتهى التحدي أو تغيرت جلسته'));
});
await check('late phone challenge from the pre-rotation session cannot reappear', async w => {
  await w.login(); Object.assign(w.fixture.data.preferences, {phoneVerificationAvailable: true});
  const session = w.load('src/session.ts'), gate = deferred(); let held = false, oldSession;
  w.setHandler((route, init, next) => {if (route === '/notifications/delivery/phone/challenges') {oldSession = session.getCurrentSessionId(); held = true; return gate.promise;} return next();});
  await w.mount('app/notifications.tsx'); await w.press('notifications-tab-PREFERENCES'); await w.until(() => w.has('notice-phone'), 'phone options');
  await w.input('notice-phone', '+966500000001'); await w.toggle('notice-phone-confirm', true); await w.press('notice-phone-send'); await w.until(() => held, 'challenge response held');
  await act(async () => {await session.refreshSession();}); gate.resolve(response({challengeId: 'stale-phone-challenge', sessionId: oldSession, expiresAt: new Date(Date.now() + 300000).toISOString()}));
  await w.until(() => w.text().includes('انتهى التحدي أو تغيرت جلسته'), 'late challenge discarded'); assert.ok(!w.has('notice-phone-code'));
  assert.equal(w.calls.filter(call => call.route.includes('stale-phone-challenge')).length, 0);
});
await check('booking participant edit uses scoped real route and refreshes pending eligibility', async w => {
  await w.login(); let payload;
  w.setHandler((route, init, next) => {if (route === '/trips/bookings/native-booking/participants/native-participant' && init.method === 'PATCH') {payload = JSON.parse(init.body); return response([{id: 'native-participant', fullName: payload.fullName, eligibilityStatus: 'PENDING'}]);} return next();});
  await w.mount('app/bookings.tsx', {bookingId: 'native-booking'}); await w.until(() => w.has('participant-edit-native-participant'), 'participant view'); await w.press('participant-edit-native-participant');
  await w.input('participant-fullName', 'Updated QA participant'); await w.press('participant-save'); await w.until(() => payload, 'participant patch');
  assert.equal(payload.fullName, 'Updated QA participant'); assert.equal(Object.hasOwn(payload, 'eligibilityStatus'), false); assert.equal(Object.hasOwn(payload, 'accountId'), false);
});
await check('stale quote conflict clears acceptance and never silently retries checkout', async w => {
  await w.login(); let checkouts = 0, acceptance;
  w.setHandler((route, init, next) => {if (route === '/payments' && init.method === 'POST') {checkouts++; acceptance = JSON.parse(init.body); return response({message: 'Original terms changed.'}, 409);} return next();});
  await w.mount('app/bookings.tsx', {bookingId: 'native-booking'}); await w.until(() => w.has('booking-payment'), 'booking'); await w.press('booking-payment'); await w.until(() => w.has('checkout-accept'), 'original quote');
  await w.toggle('checkout-accept', true); await w.press('checkout-submit'); await w.until(() => !w.find('checkout-accept', 'Switch').props.value, 'acceptance reset');
  assert.equal(checkouts, 1); assert.equal(acceptance.idempotencyKey, 'booking:native-booking'); assert.equal(acceptance.policyAcceptance.version, '2026-11-21.1'); assert.match(acceptance.policyAcceptance.quoteHash, /^[a-f0-9]{64}$/); assert.equal(w.opened.length, 0); assert.equal(w.find('checkout-submit', 'Pressable').props.disabled, true);
});
await check('checkout opens only HTTPS returned by server and return uses authoritative refresh', async w => {
  await w.login(); let refreshed = false;
  w.setHandler((route, init, next) => {
    if (route === '/payments' && init.method === 'POST') return response({id: 'native-payment', status: 'CREATED', checkoutUrl: 'https://checkout.example.test/invoice/qa', provider: 'MOYASAR'});
    if (route === '/payments/native-payment/refresh') {refreshed = true; w.fixture.data.payments[0].status = 'CAPTURED'; return response(w.fixture.data.payments[0]);} return next();
  });
  await w.mount('app/bookings.tsx', {bookingId: 'native-booking'}); await w.until(() => w.has('booking-payment'), 'booking'); await w.press('booking-payment'); await w.until(() => w.has('checkout-accept'), 'quote'); await w.toggle('checkout-accept', true); await w.press('checkout-submit');
  await w.until(() => w.opened.length === 1, 'hosted URL'); assert.equal(w.opened[0], 'https://checkout.example.test/invoice/qa'); assert.ok(!w.opened[0].includes('Bearer')); assert.equal(refreshed, false);
  await w.resume(); await w.until(() => refreshed, 'provider refresh'); await w.until(() => w.text().includes('محصّل'), 'captured status');
});
await check('unsupported quote versions or mismatched customer are never accepted', async w => {
  const {acceptedQuote} = w.load('src/product-checkout.tsx');
  const base = {snapshot: w.fixture.data.contract, policyVersion: '2026-11-21.1', quoteHash: 'a'.repeat(64)};
  assert.equal(acceptedQuote(base, 'TRIP', 'native-booking', w.fixture.data.profile.id).quoteHash, 'a'.repeat(64));
  assert.throws(() => acceptedQuote({...base, policyVersion: 'future'}, 'TRIP', 'native-booking', w.fixture.data.profile.id));
  assert.throws(() => acceptedQuote(base, 'TRIP', 'other-booking', w.fixture.data.profile.id));
  assert.throws(() => acceptedQuote(base, 'TRIP', 'native-booking', 'other-account'));
});
await check('credential upload submits real selected bytes and removes its private picker copy', async w => {
  await w.login(); const uri = 'file:///private-cache/credential.pdf', bytes = Buffer.from('%PDF-1.4\nsynthetic credential'); w.files.set(uri, bytes);
  w.setPicker(async () => ({canceled: false, assets: [{uri, name: 'credential.pdf', mimeType: 'application/pdf'}]})); let uploaded;
  w.setHandler((route, init, next) => {if (route === '/credentials/native-credential/documents') {uploaded = JSON.parse(init.body); return response({id: 'native-document'});} return next();});
  await w.mount('app/credentials.tsx'); await w.until(() => w.has('credential-upload-native-credential'), 'upload control'); await w.press('credential-upload-native-credential'); await w.until(() => uploaded, 'document bytes uploaded');
  assert.equal(uploaded.originalName, 'credential.pdf'); assert.deepEqual(Buffer.from(uploaded.base64, 'base64'), bytes); assert.equal(w.files.has(uri), false);
});
await check('credential picker completing after logout cannot upload or retain a private copy', async w => {
  await w.login(); const gate = deferred(), uri = 'file:///private-cache/late.pdf'; let picked = false;
  w.setPicker(async () => {picked = true; return gate.promise;});
  await w.mount('app/credentials.tsx'); await w.until(() => w.has('credential-upload-native-credential'), 'upload control'); await w.press('credential-upload-native-credential'); await w.until(() => picked, 'picker opened');
  await act(async () => {await w.load('src/session.ts').clearSession();}); w.files.set(uri, Buffer.from('%PDF-late')); gate.resolve({canceled: false, assets: [{uri, name: 'late.pdf', mimeType: 'application/pdf'}]}); await w.settle();
  assert.equal(w.calls.filter(call => call.route.endsWith('/documents')).length, 0); assert.equal(w.files.has(uri), false); assert.ok(w.has('sign-in-required'));
});
await check('authenticated invoice bytes are shared temporarily and never exposed as public media', async w => {
  await w.login(); const bytes = Buffer.from('%PDF-1.4\nprivate original invoice');
  w.setHandler((route, init, next) => {if (route === '/account/invoices') return response({items: [{sourceType: 'TRIP_PAYMENT', sourceId: 'native-payment', number: 'QA-001', amountMinor: 15000, currency: 'SAR', hasDocument: true, isPurchase: true}], nextOffset: null}); if (route === '/account/invoices/TRIP_PAYMENT/native-payment/document') {assert.ok(init.headers.get('Authorization').startsWith('Bearer ')); return new Response(bytes, {headers: {'Content-Type': 'application/pdf'}});} return next();});
  await w.mount('app/finance.tsx'); await w.press('finance-tab-INVOICES'); await w.until(() => w.has('invoice-download-native-payment'), 'invoice'); await w.press('invoice-download-native-payment'); await w.until(() => w.shared.length === 1, 'native share');
  assert.deepEqual(Buffer.from(w.shared[0].bytes), bytes); assert.ok(w.shared[0].file.startsWith('file:///private-cache/hydroland-private-product/')); assert.equal(w.files.size, 0); assert.equal(w.opened.length, 0);
});
await check('refund request preserves exact minor units and does not claim financial execution', async w => {
  await w.login(); w.fixture.data.payments[0].status = 'CAPTURED'; let payload;
  w.setHandler((route, init, next) => {if (route === '/payments/native-payment/refund-request') {payload = JSON.parse(init.body); return response({status: 'REFUND_REQUESTED', auditEventId: 'qa-audit', requestedAmountMinor: payload.amountMinor, currency: 'SAR', financialActionExecuted: false, policyDecision: {status: 'REVIEW_REQUIRED'}});} return next();});
  await w.mount('app/finance.tsx'); await w.until(() => w.has('refund-submit-native-payment'), 'refund form'); await w.input('refund-reason-native-payment', 'Synthetic reason for review'); await w.input('refund-amount-native-payment', '12.35'); await w.toggle('refund-confirm-native-payment', true); await w.press('refund-submit-native-payment'); await w.until(() => payload, 'refund request');
  assert.equal(payload.amountMinor, 1235); assert.equal(payload.currency, 'SAR'); assert.ok(w.text().includes('لم يُنفذ استرداد'));
});
await check('training skill actions require actual instructor scope and reviewed evidence', async w => {
  w.fixture.data.profile.roleAssignments.push({id: 'native-instructor', role: 'INSTRUCTOR', status: 'ACTIVE', updatedAt: '2026-11-27T10:00:00Z'}); await w.login(); let assessment;
  w.setHandler((route, init, next) => {if (route === '/training/professional/me/assignments') return response([]); if (route === '/training/professional/me/skills') return response([{id: 'skill-qa', name: 'QA skill', courseCode: 'QA', canAssess: true, status: 'IN_PROGRESS', student: {displayName: 'QA student'}}]); if (route === '/training/skills/skill-qa/assessment') {assessment = JSON.parse(init.body); return response({id: 'skill-qa', status: assessment.status});} return next();});
  await w.mount('app/training.tsx'); await w.press('training-tab-PROFESSIONAL'); await w.press('professional-tab-skills'); await w.until(() => w.has('skill-COMPETENT-skill-qa'), 'skill assessment'); assert.equal(w.find('skill-COMPETENT-skill-qa', 'Pressable').props.disabled, true);
  await w.toggle('skill-reviewed-skill-qa', true); await w.press('skill-COMPETENT-skill-qa'); await w.until(() => assessment, 'assessment write'); assert.deepEqual(assessment, {status: 'COMPETENT'});
});
await check('refund entry respects recorded currency units and refuses unsupported decimals', async w => {
  await w.login(); Object.assign(w.fixture.data.payments[0], {status: 'CAPTURED', currency: 'JPY', amountMinor: 20000}); let payload;
  w.setHandler((route, init, next) => {if (route === '/payments/native-payment/refund-request') {payload = JSON.parse(init.body); return response({status: 'REFUND_REQUESTED', requestedAmountMinor: payload.amountMinor, currency: 'JPY', financialActionExecuted: false});} return next();});
  await w.mount('app/finance.tsx'); await w.until(() => w.has('refund-submit-native-payment'), 'refund form');
  await w.input('refund-reason-native-payment', 'Synthetic currency unit request'); await w.input('refund-amount-native-payment', '12.35'); await w.toggle('refund-confirm-native-payment', true); await w.press('refund-submit-native-payment');
  assert.equal(payload, undefined); await w.input('refund-amount-native-payment', '12'); await w.press('refund-submit-native-payment'); await w.until(() => payload, 'whole yen request');
  assert.equal(payload.amountMinor, 12); assert.equal(payload.currency, 'JPY');
});
console.log('PASS ' + passed + ' native product React/HTTP behavior groups; synthetic device boundaries, no actual-device acceptance claim.');
