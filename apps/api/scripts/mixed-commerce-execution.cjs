const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');

exports.completeGoods = async (f, line) => {
  f.ok(await f.call(f.owner, `/store/admin/orders/${line.sourceId}/status`, 'PATCH', {status: 'CONFIRMED'}));
  const items = await f.db.storeOrderItem.findMany({where: {orderId: line.sourceId}});
  const deliveries = [];
  for (const item of items) {
    const input = {requestId: randomUUID(), quantity: item.quantity, receivedAt: new Date().toISOString()};
    const path = `/store/orders/${line.sourceId}/items/${item.id}/deliveries`;
    f.denied(await f.call(f.stranger, path, 'POST', input), 404);
    const row = f.ok(await f.call(f.buyer, path, 'POST', input));
    assert.equal(f.ok(await f.call(f.buyer, path, 'POST', input)).id, row.id);
    deliveries.push(row);
  }
  assert.equal(await f.db.auditEvent.count({where: {action: 'STORE_GOODS_CUSTOMER_RECEIVED', resourceId: {in: deliveries.map(r => r.id)}}}), deliveries.length);
  return {items, deliveries};
};

exports.refundGoods = async (f, line, delivery, amountMinor) => {
  const request = {requestId: randomUUID(), quantity: 1, reason: 'DEFECT'};
  const path = `/store/deliveries/${delivery.id}/returns`;
  const claim = f.ok(await f.call(f.buyer, path, 'POST', request));
  assert.equal(f.ok(await f.call(f.buyer, path, 'POST', request)).id, claim.id);
  const original = await f.db.storeGoodsReturn.findUniqueOrThrow({where: {id: claim.id}});
  assert.equal(original.quantity, 1);
  f.ok(await f.call(f.owner, `/store/provider/returns/${claim.id}/receipt`, 'POST', {receivedAt: new Date().toISOString()}));
  f.ok(await f.call(f.owner, `/store/provider/returns/${claim.id}/remedy`, 'POST', {basis: 'VERIFIED_RIGHT', evidenceReference: 'SYNTHETIC-B08-DEFECT-' + claim.id}));
  const entry = await f.ledger.createEntry({organizationId: f.center.id, financeAccountId: f.financeAccount.id, type: 'REFUND', amountMinor,
    currency: 'SAR', referenceType: 'STORE_GOODS_RETURN_REFUND', referenceId: claim.id, requestedByAccountId: f.buyer.id});
  await f.ledger.decideEntry(entry.id, f.approver.id, true, 'Synthetic independent refund approval');
  const endpoint = `/payments/goods/returns/${claim.id}/refund`, input = {financeEntryId: entry.id};
  const before = f.requests.filter(r => r.method === 'POST' && r.path.endsWith('/refund')).length;
  f.denied(await f.call(f.stranger, endpoint, 'POST', input), 403);
  const results = await Promise.all([1, 2, 3].map(() => f.call(f.poster, endpoint, 'POST', input).then(f.ok)));
  assert.equal(new Set(results.map(row => row.operationId)).size, 1);
  assert.ok(results.every(row => row.status === 'POSTED'));
  assert.equal(f.requests.filter(r => r.method === 'POST' && r.path.endsWith('/refund')).length, before + 1);
  assert.equal((await f.db.financeEntry.findUniqueOrThrow({where: {id: entry.id}})).status, 'POSTED');
  const proof = await f.db.commerceCollectionEvidence.findUniqueOrThrow({where: {sourceType_sourceId: {sourceType: line.sourceType, sourceId: line.sourceId}}});
  assert.equal(proof.providerRefundedMinor, amountMinor);
  return {claim, entry, operation: results[0]};
};

exports.completeRental = async (f, line, offer) => {
  const paymentPath = `/trips/admin/equipment-rentals/${line.sourceId}/payment-confirmation`;
  f.denied(await f.call(f.stranger, paymentPath, 'POST'), 403);
  f.ok(await f.call(f.owner, paymentPath, 'POST'));
  const handoverPath = `/trips/admin/equipment-rentals/${line.sourceId}/handover-scan`;
  const handover = {code: offer.assetCode, handoverCondition: 'Synthetic inspected item, no original damage'};
  f.ok(await f.call(f.owner, handoverPath, 'POST', handover));
  f.ok(await f.call(f.owner, handoverPath, 'POST', handover));
  const returnPath = `/trips/equipment-rentals/${line.sourceId}/return-scan`;
  const input = {code: offer.assetCode, condition: 'OK', notes: 'Synthetic original equipment received intact'};
  f.ok(await f.call(f.owner, returnPath, 'POST', input));
  f.ok(await f.call(f.owner, returnPath, 'POST', input));
  const [rental] = await f.db.$queryRaw`SELECT "status","paymentStatus","returnedAt" FROM "EquipmentRental" WHERE "id"=${line.sourceId}`;
  assert.equal(rental.status, 'RETURNED'); assert.equal(rental.paymentStatus, 'PAID'); assert.ok(rental.returnedAt);
  assert.equal(await f.db.auditEvent.count({where: {resource: 'EquipmentRental', resourceId: line.sourceId, action: 'EQUIPMENT_RENTAL_ITEM_HANDED_OVER'}}), 1);
  assert.equal(await f.db.auditEvent.count({where: {resource: 'EquipmentRental', resourceId: line.sourceId, action: 'EQUIPMENT_RENTAL_ITEM_RETURNED'}}), 1);
};

exports.completeCourse = async (f, line) => {
  const {trainingStandardFixture} = await import('./training-standard-isolated-fixture.mjs');
  const standards = trainingStandardFixture(f.db, f.base);
  const instructor = await f.account('instructor');
  await f.db.roleAssignment.create({data: {accountId: instructor.id, role: 'INSTRUCTOR', status: 'ACTIVE'}});
  await f.db.organizationMember.create({data: {organizationId: f.center.id, accountId: instructor.id, role: 'INSTRUCTOR', status: 'ACTIVE'}});
  const enrollment = await f.db.trainingEnrollment.findUniqueOrThrow({where: {id: line.sourceId}});
  f.ok(await f.call(f.owner, `/center/me/training/enrollments/${line.sourceId}/instructor`, 'PATCH', {
    instructorAccountId: instructor.id, expectedUpdatedAt: enrollment.updatedAt.toISOString(), reason: 'Synthetic B08 instructor assignment', transferUpcomingSessions: true,
  }));
  const assigned = await standards.bind(line.sourceId, 'B08-SYNTHETIC-SKILL');
  const sessionId = randomUUID(), startsAt = new Date(Date.now() + 3000).toISOString(), endsAt = new Date(Date.now() + 60_000).toISOString();
  f.ok(await f.call(f.owner, `/center/me/training/enrollments/${line.sourceId}/sessions`, 'POST', {
    requestId: sessionId, instructorAccountId: instructor.id, expectedUpdatedAt: assigned.updatedAt.toISOString(),
    ...standards.context, startsAt, endsAt, reason: 'Synthetic isolated B08 session, no real certification',
  }));
  const action = async (actor, name, professional = false) => {
    const row = await f.db.trainingSession.findUniqueOrThrow({where: {id: sessionId}});
    const path = professional ? `/training/professional/me/sessions/${sessionId}/attendance` : `/center/me/training/sessions/${sessionId}/actions`;
    return f.ok(await f.call(actor, path, 'PATCH', {action: name, expectedUpdatedAt: row.updatedAt.toISOString(),
      ...(!professional ? {reason: 'Synthetic B08 actual session lifecycle evidence'} : {})}));
  };
  await action(f.owner, 'OPEN'); await action(instructor, 'INSTRUCTOR_CHECK_IN', true); await action(f.owner, 'STUDENT_CHECK_IN');
  const planPath = `/training/professional/me/enrollments/${line.sourceId}/plan`;
  const completePath = `/training/professional/me/enrollments/${line.sourceId}/complete`;
  let plan = f.ok(await f.call(instructor, planPath));
  const skillId = randomUUID();
  f.ok(await f.call(instructor, planPath, 'POST', {requestId: skillId, expectedUpdatedAt: plan.record.updatedAt,
    stageType: 'Synthetic B08 stage', deliveryMode: 'THEORY', skillCode: 'B08-SYNTHETIC-SKILL', name: 'Synthetic procedure, no real accreditation', reason: 'B08 operational acceptance'}));
  plan = f.ok(await f.call(instructor, planPath));
  f.denied(await f.call(instructor, completePath, 'POST', {expectedUpdatedAt: plan.record.updatedAt, reason: 'Synthetic B08 incomplete course must refuse', reviewed: true}), 409);
  f.ok(await f.call(instructor, `/training/skills/${skillId}/assessment`, 'PATCH', {status: 'COMPETENT'}));
  // Observe the original short session window; never alter source timestamps.
  while (Date.now() <= Date.parse(startsAt)) await new Promise(resolve => setTimeout(resolve, 100));
  await action(f.owner, 'START'); await action(f.owner, 'COMPLETE');
  plan = f.ok(await f.call(instructor, planPath)); assert.equal(plan.canComplete, true);
  const originalStartsAt = Date.parse(line.contractSnapshot.originalSchedule.startsAt);
  assert.ok(originalStartsAt - Date.now() <= 60_000);
  while (Date.now() < originalStartsAt) await new Promise(resolve => setTimeout(resolve, 200));
  const input = {expectedUpdatedAt: plan.record.updatedAt, reason: 'Synthetic B08 completed original course', reviewed: true};
  f.ok(await f.call(instructor, completePath, 'POST', input));
  assert.equal(f.ok(await f.call(instructor, completePath, 'POST', input)).replayed, true);
  const saved = await f.db.trainingEnrollment.findUniqueOrThrow({where: {id: line.sourceId}, include: {record: true}});
  assert.equal(saved.status, 'COMPLETED'); assert.equal(saved.record.status, 'COMPLETED'); assert.equal(saved.record.progressPercent, 100);
  assert.equal(await f.db.auditEvent.count({where: {resource: 'trainingEnrollment', resourceId: line.sourceId, action: 'training.course_completed'}}), 1);
  return {instructor, record: saved.record};
};

exports.completeTrip = async (f, line, offer) => {
  const tripId = offer.trip.id;
  // Synthetic prerequisites exercise the existing operational reader and actual
  // clearance/confirmation/completion commands without fabricating completion.
  const [site, crew] = await Promise.all(['SITE', 'INSTRUCTOR'].map(type => f.db.calendarResource.create({data: {type, name: 'Synthetic B08 ' + type,
    ...(type === 'INSTRUCTOR' ? {referenceId: f.owner.id} : {})}})));
  await f.db.safetyChecklist.create({data: {tripId, decision: 'ALLOWED', items: {synthetic: true}, notes: 'Synthetic CI-only prerequisite', decidedAt: new Date()}});
  await f.db.crewAssignment.create({data: {tripId, resourceId: crew.id, accountId: f.owner.id, roleType: 'INSTRUCTOR', status: 'ACCEPTED', respondedAt: new Date()}});
  const calendar = f.app.get(f.load('trips/calendar-allocation.service.js').CalendarAllocationService);
  await calendar.allocate(f.owner.id, tripId, [site.id, crew.id]);
  const compliance = f.app.get(f.load('trips/trip-compliance.service.js').TripComplianceService);
  await compliance.update(f.owner.id, tripId, {regulatoryStatus: 'APPROVED', permitStatus: 'APPROVED', permitReference: 'SYNTHETIC-B08', authorityReference: 'SYNTHETIC-NOT-A-PERMIT'});
  const participants = await f.db.bookingParticipant.findMany({where: {bookingId: line.sourceId}});
  assert.equal(participants.length, 1);
  for (const participant of participants) f.ok(await f.call(f.owner,
    `/trips/admin/${tripId}/bookings/${line.sourceId}/participants/${participant.id}/eligibility`, 'PATCH', {
      status: 'ELIGIBLE', expectedUpdatedAt: participant.updatedAt.toISOString(), reason: 'Synthetic B08 eligibility evidence only', reviewed: true,
    }));
  f.ok(await f.call(f.owner, `/trips/admin/${tripId}/bookings/${line.sourceId}/confirm`, 'PATCH'));
  const granted = f.ok(await f.call(f.owner, `/trips/admin/${tripId}/operational-clearance`, 'POST', {reason: 'Synthetic B08 isolated operational review'}));
  const clearance = f.app.get(f.load('trips/operational-clearance.service.js').OperationalClearanceService);
  const current = await clearance.currentStatus(tripId);
  if (current.status !== 'ACTIVE') {
    const event = await f.db.auditEvent.findUniqueOrThrow({where: {id: granted.auditEventId}});
    const changedAt = await clearance.latestOperationalChange(tripId);
    const zone = await f.db.$queryRaw`SHOW TimeZone`;
    const revisions = await f.db.$queryRaw`
      SELECT 'AuditEvent' AS source,MAX("occurredAt")::text AS stamp,pg_typeof(MAX("occurredAt"))::text AS type FROM "AuditEvent" WHERE "id"=${granted.auditEventId}
      UNION ALL SELECT 'Trip',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "Trip" WHERE "id"=${tripId}
      UNION ALL SELECT 'Booking',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "Booking" WHERE "tripId"=${tripId}
      UNION ALL SELECT 'BookingParticipant',MAX(p."updatedAt")::text,pg_typeof(MAX(p."updatedAt"))::text FROM "BookingParticipant" p JOIN "Booking" b ON b."id"=p."bookingId" WHERE b."tripId"=${tripId}
      UNION ALL SELECT 'PolicyControl',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "PolicyControl" WHERE "category" IN ('TRIP','CREW','WEATHER','BOAT','COMPLIANCE','BOOKING','EQUIPMENT','DIVE_LOG','MARINE')
      UNION ALL SELECT 'SafetyChecklist',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "SafetyChecklist" WHERE "tripId"=${tripId}
      UNION ALL SELECT 'CrewAssignment',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "CrewAssignment" WHERE "tripId"=${tripId}
      UNION ALL SELECT 'CalendarEvent',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "CalendarEvent" WHERE "referenceType"='TRIP' AND "referenceId"=${tripId}
      UNION ALL SELECT 'CalendarAllocation',MAX(a."updatedAt")::text,pg_typeof(MAX(a."updatedAt"))::text FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE e."referenceType"='TRIP' AND e."referenceId"=${tripId}
      UNION ALL SELECT 'CalendarResource',MAX(r."updatedAt")::text,pg_typeof(MAX(r."updatedAt"))::text FROM "CalendarResource" r JOIN "CalendarAllocation" a ON a."resourceId"=r."id" JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE e."referenceType"='TRIP' AND e."referenceId"=${tripId}
      UNION ALL SELECT 'TripComplianceReview',MAX("updatedAt")::text,pg_typeof(MAX("updatedAt"))::text FROM "TripComplianceReview" WHERE "tripId"=${tripId}
    `;
    throw new Error('Synthetic operational clearance diagnostic ' + JSON.stringify({current, changedAt, occurredAt: event.occurredAt, zone, revisions}));
  }
  const wait = offer.trip.endsAt.getTime() - Date.now(); assert.ok(wait <= 60_000);
  if (wait > 0) console.log('B08 observing original trip completion window, milliseconds=' + wait);
  while (Date.now() <= offer.trip.endsAt.getTime()) await new Promise(resolve => setTimeout(resolve, 200));
  // The full application runs operational invalidation workers. Re-review the
  // live readiness immediately before completion, through its actual authority.
  f.ok(await f.call(f.owner, `/trips/admin/${tripId}/operational-clearance`, 'POST', {reason: 'Synthetic B08 current completion readiness review'}));
  const preview = f.ok(await f.call(f.owner, `/trips/admin/${tripId}/lifecycle`));
  assert.equal(preview.clearance.status, 'ACTIVE', JSON.stringify(preview.clearance));
  const input = {requestId: randomUUID(), expectedUpdatedAt: preview.trip.updatedAt, expectedState: preview.stateToken,
    reason: 'Synthetic B08 completed trip with original attendance', financialAcknowledged: true,
    attendedParticipantIds: participants.map(row => row.id), siteName: 'SYNTHETIC LOOPBACK SITE', maxDepthM: 1, durationMin: 1};
  f.ok(await f.call(f.owner, `/trips/admin/${tripId}/complete`, 'POST', input));
  assert.equal(f.ok(await f.call(f.owner, `/trips/admin/${tripId}/complete`, 'POST', input)).alreadyApplied, true);
  assert.equal((await f.db.trip.findUniqueOrThrow({where: {id: tripId}})).status, 'COMPLETED');
  assert.equal(await f.db.auditEvent.count({where: {action: 'TRIP_COMPLETED', resourceId: tripId}}), 1);
};
