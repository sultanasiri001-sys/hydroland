import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const hour = 3_600_000;

function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error('Use explicit UTC dates.');
  }
  const timestamp = Date.parse(value);
  const normalized = value.includes('.') ? value : value.slice(0, -1) + '.000Z';
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== normalized) {
    throw new Error('Invalid UTC date.');
  }
  return timestamp;
}

function reference(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A source, policy or asset reference is missing.');
  return value.trim();
}

function duration(hours, allowZero = false) {
  if (!Number.isFinite(hours) || (allowZero ? hours < 0 : hours <= 0) || !Number.isSafeInteger(hours * hour)) {
    throw new Error('Supply an explicit policy duration in hours.');
  }
  return hours * hour;
}

export function evaluateMaintenance(input) {
  const { sourceRef, policyRef, evaluatedAt, horizonHours, maxInputAgeHours, rows } = input;
  const source = reference(sourceRef), policy = reference(policyRef);
  const now = instant(evaluatedAt);
  const horizon = duration(horizonHours), maxAge = duration(maxInputAgeHours, true);
  if (!Array.isArray(rows)) throw new Error('Supply an array of forecast and outcome rows.');
  const visits = new Map(), excluded = { staleInput: 0, incompleteFollowUp: 0 };
  const matrix = { truePositive: 0, falsePositive: 0, falseNegative: 0, trueNegative: 0 };
  for (const row of rows) {
    const asset = reference(row.assetRef), start = instant(row.issuedAt), end = start + horizon;
    const measurement = instant(row.lastMeasurementAt), through = instant(row.observedThrough);
    const fault = row.firstFaultAt === null ? null : instant(row.firstFaultAt);
    if (typeof row.predictedFault !== 'boolean' || !Number.isSafeInteger(end) ||
        measurement > start || through < start || through > now ||
        (fault !== null && (fault < start || fault > through))) {
      throw new Error('Inconsistent observation or prediction chronology.');
    }
    if (!visits.has(asset)) visits.set(asset, []);
    visits.get(asset).push(start);
    if (start - measurement > maxAge) { excluded.staleInput++; continue; }
    if (through < end) { excluded.incompleteFollowUp++; continue; }
    const hadFault = fault !== null && fault < end;
    if (row.predictedFault) {
      if (hadFault) matrix.truePositive++; else matrix.falsePositive++;
    } else {
      if (hadFault) matrix.falseNegative++; else matrix.trueNegative++;
    }
  }
  for (const starts of visits.values()) {
    starts.sort((a, b) => a - b);
    if (starts.some((start, index) => index > 0 && start < starts[index - 1] + horizon)) {
      throw new Error('Overlapping windows for the same asset would double-count exposure.');
    }
  }
  const { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn } = matrix;
  const evaluated = tp + fp + fn + tn;
  return {
    sourceRef: source, policyRef: policy, evaluatedAt, horizonHours, maxInputAgeHours,
    totalRows: rows.length, evaluated, excluded, matrix,
    accuracy: evaluated ? (tp + tn) / evaluated : null,
    sensitivity: tp + fn ? tp / (tp + fn) : null,
    falseAlarmRate: fp + tn ? fp / (fp + tn) : null,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Pass one JSON evaluation file.');
    const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
    process.stdout.write(JSON.stringify(evaluateMaintenance(input), null, 2) + '\n');
  } catch (error) {
    console.error(error instanceof SyntaxError ? 'Input must be valid JSON.' : error.message);
    process.exitCode = 1;
  }
}
