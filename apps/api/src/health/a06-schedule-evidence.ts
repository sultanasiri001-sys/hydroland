const root = 'https://api.github.com/repos/sultanasiri001-sys/hydroland/actions';
const workflow = '.github/workflows/a06-provider-watch.yml';
export const escalationMs = 30 * 60_000;
export type ScheduleSignal = 'CURRENT' | 'SCHEDULE_GAP' | 'EVIDENCE_UNAVAILABLE';

export type ObserverState = { unavailableSince: number | null; notified: boolean };

export function notificationDecision(previous: ObserverState | undefined, signal: ScheduleSignal, now: number) {
  const unavailableSince = signal === 'EVIDENCE_UNAVAILABLE' ? previous?.unavailableSince ?? now : null;
  const due = signal === 'SCHEDULE_GAP' || (unavailableSince !== null && now - unavailableSince >= escalationMs);
  const send = due && !previous?.notified;
  const notified = signal !== 'CURRENT' && (send || Boolean(previous?.notified));
  return { send, state: { unavailableSince, notified } };
}

async function getJson(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'hydroland-schedule-observer' },
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Schedule evidence unavailable');
  return response.json();
}

// This secondary signal measures starts of original scheduled runs that succeeded.
// The Actions collector separately verifies the provider-observation step and the 96 slots.
export async function scheduleSignal(now = Date.now(), fetcher = fetch): Promise<ScheduleSignal> {
  try {
    const cutoff = now - escalationMs;
    const query = new URLSearchParams({
      branch: 'main', event: 'schedule', created: '>=' + new Date(cutoff).toISOString(), per_page: '100',
    });
    const result = await getJson(root + '/workflows/a06-provider-watch.yml/runs?' + query, fetcher);
    const runs = result.workflow_runs;
    if (!Array.isArray(runs) || runs.length !== result.total_count || runs.length > 100) return 'EVIDENCE_UNAVAILABLE';
    for (const run of runs) {
      if (!Number.isSafeInteger(run.id) || run.id < 1 || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) return 'EVIDENCE_UNAVAILABLE';
      const first = run.run_attempt === 1 ? run : await getJson(root + '/runs/' + run.id + '/attempts/1', fetcher);
      if (first.id !== run.id || first.run_attempt !== 1 || first.event !== 'schedule' ||
          first.head_branch !== 'main' || first.path !== workflow || first.repository?.full_name !== 'sultanasiri001-sys/hydroland') return 'EVIDENCE_UNAVAILABLE';
      if (first.status !== 'completed' || first.conclusion !== 'success') continue;
      const created = Date.parse(first.created_at);
      const started = Date.parse(first.run_started_at);
      if (!Number.isFinite(created) || !Number.isFinite(started) || started < created || started > now) return 'EVIDENCE_UNAVAILABLE';
      if (created >= cutoff) return 'CURRENT';
    }
    return 'SCHEDULE_GAP';
  } catch {
    return 'EVIDENCE_UNAVAILABLE';
  }
}
