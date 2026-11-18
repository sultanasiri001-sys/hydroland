import assert from 'node:assert/strict';
import { DatabaseService } from '../dist/database/database.service.js';
import { DiveLogReviewService } from '../dist/dive-logs/dive-log-review.service.js';

// Called by the loopback-only center trip suite with the draft created for an actual fixture attendee.
export async function checkDiveLogReview(db, { call, log, admin, adminToken, ownerToken, personAccount, tokenFor }, check) {
  const reviewer = await personAccount('dive-log-reviewer');
  await db.roleAssignment.create({ data: { accountId: reviewer.id, role: 'REVIEWER', status: 'ACTIVE' } });
  const reviewerToken = await tokenFor(reviewer.id);
  const path = '/dive-logs/review/' + log.id;
  const decisions = [
    { token: adminToken, actor: admin, body: { status: 'VERIFIED', reason: 'Attendance reviewed' } },
    { token: reviewerToken, actor: reviewer, body: { status: 'REJECTED', reason: 'Evidence needs correction' } },
  ];
  const events = { resource: 'DiveLog', resourceId: log.id, action: 'DIVE_LOG_REVIEWED' };
  const stored = () => db.diveLog.findUniqueOrThrow({ where: { id: log.id } });
  try {
    const denied = await call(ownerToken, path, 'PATCH', decisions[0].body);
    check(denied.status === 400, 'A diver with an instructor role cannot review their own attendance record');
    check((await call(reviewerToken, path, 'PATCH', { status: 'REJECTED' })).status === 400, 'A rejection needs its own reason');

    const connection = new DatabaseService();
    try {
      const service = new DiveLogReviewService(connection, { record: async () => { throw new Error('Synthetic audit outage'); } });
      await assert.rejects(service.decide(admin.id, log.id, 'VERIFIED'), /Synthetic audit outage/);
    } finally {
      await connection.$disconnect();
    }
    check((await stored()).status === 'DRAFT' && await db.auditEvent.count({ where: events }) === 0,
      'A failed audit rolls the decision back in PostgreSQL and leaves the original draft for review');

    const responses = await Promise.all(decisions.map(d => call(d.token, path, 'PATCH', d.body)));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const winning = decisions[responses.findIndex(r => r.status === 200)];
    const reviewed = await stored(), audit = await db.auditEvent.findMany({ where: events });
    check(reviewed.status === winning.body.status && reviewed.sourceTripId === log.sourceTripId &&
      reviewed.sourceParticipantId === log.sourceParticipantId && Boolean(reviewed.verifiedAt) === (reviewed.status === 'VERIFIED'),
      'Two legitimate simultaneous decisions retain the one committed outcome and its trip and attendance references');
    check(audit.length === 1 && audit[0].actorId === winning.actor.personId &&
      audit[0].metadata.reviewerAccountId === winning.actor.id && audit[0].metadata.status === reviewed.status &&
      audit[0].metadata.previousStatus === 'DRAFT' && audit[0].metadata.reason === winning.body.reason,
      'The sole committed audit identifies the acting person and matches the stored review');
    check((await call(winning.token, path, 'PATCH', winning.body)).status === 409 && await db.auditEvent.count({ where: events }) === 1,
      'Retrying the already decided log does not duplicate the decision or audit');
    console.log('PASS: trip-linked dive log review, single decision, actual reviewer, repeat and audit rollback');
  } finally {
    await db.auditEvent.deleteMany({ where: events });
  }
}
