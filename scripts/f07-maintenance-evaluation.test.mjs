import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateMaintenance } from './f07-maintenance-evaluation.mjs';

const time = h => new Date(Date.UTC(2030, 0, 1, h)).toISOString();
const config = { sourceRef: 'fixture', policyRef: 'fixture-policy', evaluatedAt: time(72), horizonHours: 24, maxInputAgeHours: 5 };
const sample = { assetRef: 'test-asset', issuedAt: time(10), lastMeasurementAt: time(5), observedThrough: time(34), predictedFault: true, firstFaultAt: time(11) };
const report = rows => evaluateMaintenance({ ...config, rows });

test('compares independently completed windows against their observed outcomes', () => {
  const observed = report([
    sample, { ...sample, assetRef: 'b', firstFaultAt: null }, { ...sample, assetRef: 'c', predictedFault: false },
    { ...sample, assetRef: 'd', predictedFault: false, firstFaultAt: time(34) },
  ]);
  assert.deepEqual(observed.matrix, { truePositive: 1, falsePositive: 1, falseNegative: 1, trueNegative: 1 });
  assert.equal(observed.accuracy, 0.5);
  assert.equal(observed.sensitivity, 0.5);
  assert.equal(observed.falseAlarmRate, 0.5);
  assert(!JSON.stringify(observed).includes('test-asset'));
});
test('keeps stale forecasts and unfinished windows outside the denominator', () => {
  const observed = report([{ ...sample, lastMeasurementAt: time(4) }, { ...sample, assetRef: 'b', observedThrough: time(33) }]);
  assert.deepEqual(observed.excluded, { staleInput: 1, incompleteFollowUp: 1 });
  assert.equal(observed.evaluated, 0);
  for (const key of ['accuracy','sensitivity','falseAlarmRate']) assert.equal(observed[key], null);
});
test('empty inputs and unobserved classes produce no fabricated rates', () => {
  assert.equal(report([]).accuracy, null);
  assert.equal(report([sample]).falseAlarmRate, null);
  assert.equal(report([{...sample, firstFaultAt:null}]).sensitivity, null);
});
test('rejects invalid provenance, future measurements, unobserved faults and ambiguous dates', () => {
  for (const changes of [{ lastMeasurementAt: time(11) }, { observedThrough: time(73) },
    { firstFaultAt: time(35) }, { firstFaultAt: time(9) }, { firstFaultAt: undefined },
    { assetRef: ' ' }, { predictedFault: 'yes' }, { issuedAt: '2030-02-31T06:00:00Z' }]) {
    assert.throws(() => report([{ ...sample, ...changes }]));
  }
  assert.throws(() => evaluateMaintenance({ ...config, sourceRef: null, rows: [] }));
  assert.throws(() => evaluateMaintenance({ ...config, horizonHours: 0, rows: [] }));
});
test('rejects overlapping same-asset records and permits adjacent intervals irrespective of input order', () => {
  assert.throws(() => report([sample, sample]), /Overlapping/);
  const next = { ...sample, issuedAt: time(34), lastMeasurementAt: time(34), observedThrough: time(58), firstFaultAt: time(34) };
  assert.equal(report([next, sample]).evaluated, 2);
});
