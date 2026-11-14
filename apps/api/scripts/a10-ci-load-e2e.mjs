import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

if (process.env.CI !== 'true') throw new Error('A10 load check is CI-only');
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET required');

const db = new PrismaClient();
const base = process.env.A10_E2E_BASE_URL || 'http://127.0.0.1:3101/api/v1';
const profile = { concurrent: 8, requestsPerWorker: 25, requestTimeoutMs: 10000, maxErrors: 0 };
const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
let person;
let account;
let session;
let roleAssignment;

const readApiSnapshot = async () => {
  const pid = process.env.A10_API_PID;
  if (!pid || !/^\d+$/.test(pid)) return { rssMiB: null, cpuTicks: null, ticksPerSecond: null };
  try {
    const [status, stat] = await Promise.all([
      readFile(`/proc/${pid}/status`, 'utf8'),
      readFile(`/proc/${pid}/stat`, 'utf8'),
    ]);
    const rss = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    const commandEnd = stat.lastIndexOf(')');
    const fields = commandEnd >= 0 ? stat.slice(commandEnd + 1).trim().split(/\s+/) : [];
    const userTicks = Number(fields[11]);
    const systemTicks = Number(fields[12]);
    const ticksPerSecond = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim());
    return {
      rssMiB: rss ? Number((Number(rss[1]) / 1024).toFixed(1)) : null,
      cpuTicks: Number.isFinite(userTicks + systemTicks) ? userTicks + systemTicks : null,
      ticksPerSecond: Number.isFinite(ticksPerSecond) && ticksPerSecond > 0 ? ticksPerSecond : null,
    };
  } catch {
    return { rssMiB: null, cpuTicks: null, ticksPerSecond: null };
  }
};

const requestOverview = async token => {
  const response = await fetch(`${base}/admin/overview`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(profile.requestTimeoutMs),
  });
  await response.arrayBuffer();
  return response.status;
};

try {
  person = await db.person.create({ data: { firstName: 'A10', lastName: 'CI Load' } });
  account = await db.account.create({
    data: {
      personId: person.id,
      email: `a10-ci-load-${suffix}@example.invalid`,
      passwordHash: 'synthetic-ci-only',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  roleAssignment = await db.roleAssignment.create({
    data: { accountId: account.id, role: 'ADMIN', status: 'ACTIVE', scope: {} },
  });
  session = await db.session.create({
    data: {
      accountId: account.id,
      tokenHash: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: account.id,
    sid: session.id,
    iat: now,
    exp: now + 900,
  })}`;
  const token = `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;

  for (let i = 0; i < 5; i += 1) {
    const status = await requestOverview(token);
    if (status !== 200) throw new Error(`A10 load warm-up expected 200, got ${status}`);
  }

  const apiBefore = await readApiSnapshot();
  const samples = [];
  const statuses = Object.create(null);
  let errors = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: profile.concurrent }, async () => {
    for (let i = 0; i < profile.requestsPerWorker; i += 1) {
      const requestStarted = performance.now();
      try {
        const status = await requestOverview(token);
        samples.push({ ms: performance.now() - requestStarted, status });
        statuses[status] = (statuses[status] || 0) + 1;
        if (status !== 200) errors += 1;
      } catch (error) {
        samples.push({ ms: performance.now() - requestStarted, status: 0 });
        statuses.networkError = (statuses.networkError || 0) + 1;
        errors += 1;
      }
    }
  }));
  const elapsedMs = performance.now() - started;
  const apiAfter = await readApiSnapshot();
  const sorted = samples.map(item => item.ms).sort((a, b) => a - b);
  const percentile = p => Number(sorted[Math.ceil(p * sorted.length) - 1]?.toFixed(1) ?? 0);
  const result = {
    status: 'MEASURED',
    scope: 'synthetic PostgreSQL, localhost, authenticated read-only GET /admin/overview',
    profile,
    requests: samples.length,
    statuses,
    errors,
    elapsedMs: Number(elapsedMs.toFixed(1)),
    requestsPerSecond: Number((samples.length / (elapsedMs / 1000)).toFixed(2)),
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(1)),
    apiRssBeforeMiB: apiBefore.rssMiB,
    apiRssAfterMiB: apiAfter.rssMiB,
    apiRssDeltaMiB: apiBefore.rssMiB !== null && apiAfter.rssMiB !== null
      ? Number((apiAfter.rssMiB - apiBefore.rssMiB).toFixed(1))
      : null,
    apiCpuSeconds: apiBefore.cpuTicks !== null && apiAfter.cpuTicks !== null
      && apiBefore.ticksPerSecond !== null && apiBefore.ticksPerSecond === apiAfter.ticksPerSecond
      ? Number(((apiAfter.cpuTicks - apiBefore.cpuTicks) / apiBefore.ticksPerSecond).toFixed(3))
      : null,
    apiCpuPercentOfOneCore: apiBefore.cpuTicks !== null && apiAfter.cpuTicks !== null
      && apiBefore.ticksPerSecond !== null && apiBefore.ticksPerSecond === apiAfter.ticksPerSecond
      ? Number((((apiAfter.cpuTicks - apiBefore.cpuTicks) / apiBefore.ticksPerSecond) / (elapsedMs / 1000) * 100).toFixed(1))
      : null,
  };
  console.log(JSON.stringify(result));
  if (samples.length !== profile.concurrent * profile.requestsPerWorker) {
    throw new Error('A10 load sample count differs from the fixed profile');
  }
  if (errors > profile.maxErrors) throw new Error(`A10 load had ${errors} failed requests`);
} finally {
  if (session) await db.session.deleteMany({ where: { id: session.id } }).catch(() => {});
  if (roleAssignment) await db.roleAssignment.deleteMany({ where: { accountId: account.id } }).catch(() => {});
  if (account) await db.account.delete({ where: { id: account.id } }).catch(() => {});
  if (person) await db.person.delete({ where: { id: person.id } }).catch(() => {});
  await db.$disconnect();
}
