/** Synthetic HTTP data for virtual-device screenshots. Never imported by the app or API. */
import http from 'node:http';
import {randomUUID, createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const NATIVE_FIXTURE_EMAIL = 'qa-mobile@example.test';
export const NATIVE_FIXTURE_PASSWORD = 'NativeFixtureOnly!123';
export function createNativeProductFixture() {
  const accountId = '10000000-0000-4000-8000-000000000001';
  const stamp = '2026-11-27T12:00:00.000Z';
  const profile = {id: accountId, email: NATIVE_FIXTURE_EMAIL, status: 'ACTIVE', roleAssignments: [{id: 'native-diver-role', role: 'DIVER', status: 'ACTIVE', updatedAt: stamp}], person: {firstName: 'بيانات قبول صناعية', lastName: 'QA', phone: null, professional: null}};
  const issuer = {organizationId: 'native-center', legalName: 'QA · مركز قبول اصطناعي', displayName: 'QA · مركز قبول اصطناعي', registrationNumber: null, address: null, taxStatus: 'UNVERIFIED', invoiceReadiness: 'REVIEW_REQUIRED'};
  const trip = {id: 'native-trip', title: 'QA · رحلة بحرية اصطناعية', type: 'DIVE', status: 'OPEN', startsAt: '2030-12-12T07:00:00.000Z', endsAt: '2030-12-12T10:00:00.000Z', capacity: 8, remainingSeats: 6, centerName: issuer.displayName, price: {configured: true, pricePerSeatMinor: 15000, currency: 'SAR'}, location: {name: 'موقع قبول اصطناعي'}, safety: {decision: 'PENDING'}, weather: {reviewStatus: null, evaluation: {blocking: false}}, bookingPolicy: {safetyApproval: 'REVIEW_REQUIRED', weatherGate: 'REVIEW_REQUIRED', capacityLimit: 'ENFORCED'}};
  const contract = {version: '2026-11-21.1', source: {kind: 'TRIP_BOOKING', id: 'native-booking', offeringId: trip.id, parentId: null}, customerAccountId: accountId, kind: 'TRIP', title: trip.title, quantity: 1, unitPriceMinor: 15000, amountMinor: 15000, currency: 'SAR', recordedAt: stamp, originalSchedule: {startsAt: trip.startsAt, endsAt: trip.endsAt}, issuer, termsAcceptanceStatus: 'NOT_RECORDED', refundPolicy: {status: 'RECORDED', snapshot: {version: '2026-11-21.1', lineId: 'native-booking', kind: 'TRIP', currency: 'SAR', grossAmountMinor: 15000, contractedAt: stamp, contractedScheduledAt: trip.startsAt, calendarTimeZone: 'Asia/Riyadh'}}, financialActionExecuted: false};
  const bookings = [{id: 'native-booking', tripId: trip.id, accountId, status: 'PENDING', seats: 1, createdAt: stamp, trip, contractSnapshot: contract}];
  const course = {id: 'native-course', title: 'QA · دورة غوص اصطناعية', courseCode: 'QA-COURSE', status: 'ACTIVE', startsAt: trip.startsAt, endsAt: trip.endsAt, priceMinor: 25000, currency: 'SAR', remainingSeats: 4, capacity: 6, organization: issuer};
  const enrollments = [{id: 'native-enrollment', courseCode: course.courseCode, studentAccountId: accountId, status: 'PENDING', enrolledAt: stamp, storeCourseOfferId: course.id, record: {id: 'native-record', progressPercent: 0, status: 'DRAFT', stages: [], sessions: []}}];
  const preferences = {schemaVersion: 1, revision: 0, email: true, sms: false, whatsapp: false, push: false, bookings: true, invoices: true, quietStart: null, quietEnd: null, timeZone: 'Asia/Riyadh', phoneVerified: false, maskedPhone: null, available: {SMS: false, WHATSAPP: false, PUSH: false}, phoneVerificationAvailable: false, canReview: false};
  const notifications = [{id: 'native-notification', type: 'QA_FIXTURE', status: 'SENT', createdAt: stamp, payload: {title: 'QA · إشعار قبول اصطناعي', message: 'هذا سجل صناعي لا يرسل رسالة إلى مزود أو جهاز.', bookingId: 'native-booking'}}];
  const credentials = [{id: 'native-credential', issuer: 'QA', title: 'QA · مؤهل اصطناعي غير متحقق', credentialNumber: 'QA-ONLY', issuedAt: stamp, expiresAt: null, verificationStatus: 'UNVERIFIED', documents: []}];
  const payments = [{id: 'native-payment', bookingId: 'native-booking', accountId, amountMinor: 15000, refundedAmountMinor: 0, currency: 'SAR', status: 'CREATED', createdAt: stamp, provider: 'PENDING_PROVIDER', invoice: null}];
  const calls = [], sessions = new Map();
  function tokens() {const sessionId = randomUUID(); const accessToken = ['qa', Buffer.from(JSON.stringify({sub: accountId, sid: sessionId, exp: Math.floor(Date.now() / 1000) + 3600})).toString('base64url'), 'synthetic-no-signature'].join('.'); const refreshToken = 'qa-refresh-' + randomUUID(); sessions.set(accessToken, refreshToken); return {accessToken, refreshToken};}
  const response = (res, status, body) => {res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Hydroland-Test-Fixture': 'SYNTHETIC_NATIVE_UI_ONLY'}); res.end(JSON.stringify(body));};
  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'), route = url.pathname.replace(/^\/api\/v1/, '');
    let buffer = ''; for await (const chunk of req) {buffer += chunk; if (buffer.length > 65_536) return response(res, 413, {message: 'Fixture request limit.'});}
    let body; try {body = buffer ? JSON.parse(buffer) : {};} catch {return response(res, 400, {message: 'JSON required.'});}
    const call = {method: req.method, route, status: null};
    calls.push(call); if (calls.length > 2000) calls.shift();
    res.once('finish', () => {call.status = res.statusCode;});
    if (route === '/health/native-fixture') return response(res, 200, {synthetic: true, scope: 'VIRTUAL_DEVICE_UI_ONLY', actualAcceptance: false});
    if (req.method === 'POST' && route === '/auth/login') return body.email === NATIVE_FIXTURE_EMAIL && body.password === NATIVE_FIXTURE_PASSWORD ? response(res, 200, tokens()) : response(res, 401, {message: 'Synthetic fixture credentials required.'});
    if (req.method === 'POST' && route === '/auth/refresh') {const existing = [...sessions].find(([, token]) => token === body.refreshToken); if (!existing) return response(res, 401, {}); sessions.delete(existing[0]); return response(res, 200, tokens());}
    if (req.method === 'POST' && route === '/auth/logout') {for (const [access, refresh] of sessions) if (refresh === body.refreshToken) sessions.delete(access); return response(res, 200, {revoked: true});}
    if (req.method === 'GET' && route === '/trips') return response(res, 200, [trip]);
    if (req.method === 'GET' && route === '/store/courses') return response(res, 200, [course]);
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!sessions.has(token)) return response(res, 401, {message: 'Fixture session required.'});
    const views = {
      '/me': profile, '/credentials': credentials, '/credentials/verification-organizations': [],
      '/me/diver-profile': {profile: null, equipment: []}, '/auth/mfa/status': {enabled: false, recoveryCodesRemaining: 0},
      '/me/data-requests': {items: [], more: false}, '/me/data-requests/centers': [],
      '/trips/bookings/mine': bookings, '/trips/bookings/native-booking/participants': [{id: 'native-participant', bookingId: 'native-booking', fullName: 'QA · مشارك اصطناعي', eligibilityStatus: 'PENDING'}],
      '/payments/bookings/native-booking/quote': {snapshot: contract, policyVersion: '2026-11-21.1', quoteHash: createHash('sha256').update(JSON.stringify(contract)).digest('hex'), financialActionExecuted: false},
      '/training/mine/enrollments': enrollments, '/training/enrollments/native-enrollment': enrollments[0], '/training/mine/certificates': {items: []},
      '/payments/mine': payments, '/account/invoices': {items: [], nextOffset: null}, '/wallet/mine': {currency: 'SAR', balanceMinor: 0}, '/wallet/mine/entries': [],
      '/notifications': notifications, '/notifications/delivery/preferences': preferences, '/notifications/delivery/deliveries': {items: [], schemaVersion: 1},
    };
    if (req.method === 'GET' && Object.hasOwn(views, route)) return response(res, 200, views[route]);
    if (req.method === 'POST' && route === '/notifications/native-notification/read') {notifications[0].status = 'READ'; return response(res, 200, {id: 'native-notification', status: 'READ'});}
    return response(res, 404, {message: 'No native UI fixture route. Production operations are unavailable.'});
  };
  return {handler, calls, data: {profile, trip, bookings, course, enrollments, credentials, payments, preferences, notifications, contract}, tokens};
}
export async function startNativeProductFixture(port = 3001) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Use an unprivileged local port.');
  const fixture = createNativeProductFixture(), server = http.createServer((req, res) => {void fixture.handler(req, res).catch(() => {res.writeHead(500); res.end();});});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(port, '127.0.0.1', resolve);});
  return {server, ...fixture};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {server, calls} = await startNativeProductFixture(Number(process.env.NATIVE_FIXTURE_PORT || 3001));
  console.log('SYNTHETIC_NATIVE_UI_ONLY listening on loopback:' + server.address().port);
  // Diagnose the virtual-device boundary without retaining bodies, credentials,
  // authorization headers, or issued session tokens in the CI artifact.
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => {
    process.stdout.write(JSON.stringify({kind: 'SYNTHETIC_NATIVE_HTTP_REQUESTS', calls}) + '\n', () => process.exit(0));
  }));
}
