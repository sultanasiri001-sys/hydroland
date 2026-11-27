import {
  TrainingCertificationContractError, notConnectedExternalCertification, trainingCertificationDigest,
  trainingCertificationReceipt, trainingCertificationRequest, trainingCertificationSource,
} from './training-certification-contract';
import type { TrainingCertificationRequest, TrainingCertificationSource } from './training-certification-contract';

export type TrainingCertificationAdapterResult = {
  status: 'NOT_CONNECTED' | 'UNKNOWN' | 'CONTRACT_ACCEPTED';
  code: string;
  requestId: string;
  requestDigest: string;
  checkedAt: string;
  replayed: boolean;
  syntheticRequestAttempted: boolean;
  officialIssuance: false;
  externalCertification: ReturnType<typeof notConnectedExternalCertification>;
};
export type TrainingCertificationReservation =
  | { state: 'RESERVED'; token: string; leaseExpiresAt: string }
  | { state: 'REPLAY'; result: TrainingCertificationAdapterResult }
  | { state: 'IN_FLIGHT' }
  | { state: 'CONFLICT' };
export type TrainingCertificationRecovery = Exclude<TrainingCertificationReservation, { state: 'RESERVED' }>;

/** The caller supplies a durable atomic store. An in-memory test store is not production persistence. */
export interface TrainingCertificationAttemptStore {
  /** Start the lease at atomic acquisition, using the store's trusted clock. Never re-reserve an existing key. */
  reserve(key: string, requestDigest: string, leaseMs: number): Promise<TrainingCertificationReservation>;
  /** Fence expired/consumed tokens and durably record dispatch intent before invoking the synthetic driver. */
  beginExchange(key: string, token: string): Promise<void>;
  /** Consume the exact live token once, atomically with the result and its audit. */
  finish(key: string, token: string, result: TrainingCertificationAdapterResult): Promise<void>;
  /**
   * Preserve an existing completion. Otherwise consume the pending token into UNKNOWN,
   * immediately for its failed owner, or only after lease expiry for another caller.
   * Derive syntheticRequestAttempted from the recorded dispatch intent, never from the
   * fallback. Recovery must fence late workers and must not delete/re-reserve the key.
   */
  recover(key: string, requestDigest: string, fallback: TrainingCertificationAdapterResult, ownerToken?: string): Promise<TrainingCertificationRecovery>;
}
export interface TrainingCertificationTestDriver {
  readonly kind: 'SYNTHETIC';
  exchange(request: TrainingCertificationRequest, options: { signal: AbortSignal }): Promise<unknown>;
}
export type TrainingCertificationAdapterDependencies = {
  /** A trusted server actor reference, never taken from the request body. */
  actorAccountId: string;
  /** Reauthorizes the actor and reads the current native evidence; null means no approved current result. */
  readCurrentSource(): Promise<TrainingCertificationSource | null>;
  store: TrainingCertificationAttemptStore;
  driver?: TrainingCertificationTestDriver;
  timeoutMs?: number;
  now?: () => number;
};
const unknownCodes = new Set(['SOURCE_CHANGED', 'ADAPTER_TIMEOUT', 'ADAPTER_FAILURE', 'SYNTHETIC_RESULT_UNKNOWN', 'CONTRACT_SOURCE_MISMATCH', 'ADAPTER_RESPONSE_INVALID', 'ATTEMPT_INTERRUPTED']);

/** TEST-only execution. No environment switch, guessed endpoint, credential or F08 permission enables agency issuance. */
export async function runTrainingCertificationAdapter(input: unknown, dependencies: TrainingCertificationAdapterDependencies): Promise<TrainingCertificationAdapterResult> {
  const now = dependencies.now ?? Date.now;
  const request = trainingCertificationRequest(input, now());
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(dependencies.actorAccountId)) throw new TrainingCertificationContractError('ADAPTER_ACTOR_REQUIRED');
  const timeoutMs = dependencies.timeoutMs ?? 2000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 8000) throw new TrainingCertificationContractError('ADAPTER_TIMEOUT_INVALID');
  const requestDigest = trainingCertificationDigest(request);
  const expectedSourceDigest = trainingCertificationDigest({ binding: request.binding, internalResult: request.internalResult });
  const result = (status: TrainingCertificationAdapterResult['status'], code: string, attempted = false): TrainingCertificationAdapterResult => ({
    status, code, requestId: request.requestId, requestDigest, checkedAt: new Date(now()).toISOString(), replayed: false,
    syntheticRequestAttempted: attempted, officialIssuance: false, externalCertification: notConnectedExternalCertification(),
  });
  const current = async () => {
    // Authorization/database failures propagate to the application's normal error boundary.
    const source = await dependencies.readCurrentSource();
    return source !== null && trainingCertificationDigest(trainingCertificationSource(source)) === expectedSourceDigest;
  };
  if (!await current()) return result('UNKNOWN', 'SOURCE_CHANGED');
  if (!dependencies.driver) return result('NOT_CONNECTED', 'NO_CERTIFICATION_ADAPTER_CONNECTED');
  if (dependencies.driver.kind !== 'SYNTHETIC') throw new TrainingCertificationContractError('SYNTHETIC_DRIVER_REQUIRED');

  const key = `${dependencies.actorAccountId}:${request.binding.organizationId}:${request.requestId}`;
  let reservation = await dependencies.store.reserve(key, requestDigest, timeoutMs + 10_000);
  if (reservation.state === 'IN_FLIGHT') {
    // Expired attempts are reconciled to UNKNOWN, never dispatched again. A live owner remains in flight.
    reservation = await dependencies.store.recover(key, requestDigest, result('UNKNOWN', 'ATTEMPT_INTERRUPTED'));
  }
  if (reservation.state === 'CONFLICT') return result('UNKNOWN', 'IDEMPOTENCY_CONFLICT');
  if (reservation.state === 'IN_FLIGHT') return result('UNKNOWN', 'REQUEST_IN_FLIGHT');
  if (reservation.state === 'REPLAY') {
    if (!await current()) return result('UNKNOWN', 'SOURCE_CHANGED');
    // Never let a store value widen the boundary or return private driver content.
    const saved = reservation.result;
    if (!saved || typeof saved !== 'object' || saved.requestId !== request.requestId || saved.requestDigest !== requestDigest
      || !['UNKNOWN', 'CONTRACT_ACCEPTED'].includes(saved.status) || saved.officialIssuance !== false
      || saved.externalCertification?.status !== 'NOT_CONNECTED' || typeof saved.syntheticRequestAttempted !== 'boolean'
      || saved.replayed !== false || (saved.status === 'CONTRACT_ACCEPTED' && !saved.syntheticRequestAttempted)
      || typeof saved.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(saved.checkedAt)
      || !Number.isFinite(Date.parse(saved.checkedAt)) || Date.parse(saved.checkedAt) < Date.parse(request.requestedAt) || Date.parse(saved.checkedAt) > now()
      || new Date(saved.checkedAt).toISOString() !== saved.checkedAt
      || (saved.status === 'CONTRACT_ACCEPTED' ? saved.code !== 'SYNTHETIC_CONTRACT_ACCEPTED' : !unknownCodes.has(saved.code))) throw new TrainingCertificationContractError('ADAPTER_STORE_RESULT_INVALID');
    return { ...result(saved.status, saved.code, saved.syntheticRequestAttempted), checkedAt: saved.checkedAt, replayed: true };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let completed: TrainingCertificationAdapterResult | undefined;
  const timedOut = Symbol('certification-timeout');
  try {
    if (typeof reservation.token !== 'string' || !reservation.token.length || reservation.token.length > 512
      || typeof reservation.leaseExpiresAt !== 'string' || !Number.isFinite(Date.parse(reservation.leaseExpiresAt))) {
      throw new TrainingCertificationContractError('ADAPTER_RESERVATION_INVALID');
    }
    // Do not dispatch if a source/authority changed while acquiring the reservation.
    if (!await current()) {
      completed = result('UNKNOWN', 'SOURCE_CHANGED');
    } else {
      // The atomic store checks the live lease here; a fenced/expired worker cannot start an exchange.
      await dependencies.store.beginExchange(key, reservation.token);
      const timeout = new Promise<symbol>(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(timedOut); }, timeoutMs);
      });
      let response: unknown;
      try {
        response = await Promise.race([Promise.resolve().then(() => dependencies.driver!.exchange(structuredClone(request), { signal: controller.signal })), timeout]);
      } catch {
        // Provider errors may contain URLs, headers or secrets. Return only a fixed code.
        completed = result('UNKNOWN', controller.signal.aborted ? 'ADAPTER_TIMEOUT' : 'ADAPTER_FAILURE', true);
      }
      if (!completed) {
        if (response === timedOut) completed = result('UNKNOWN', 'ADAPTER_TIMEOUT', true);
        else {
          try {
            const receipt = trainingCertificationReceipt(response, request, now());
            completed = result(receipt.outcome, receipt.outcome === 'CONTRACT_ACCEPTED' ? 'SYNTHETIC_CONTRACT_ACCEPTED' : 'SYNTHETIC_RESULT_UNKNOWN', true);
          } catch (error) {
            if (!(error instanceof TrainingCertificationContractError)) throw error;
            completed = result('UNKNOWN', error.code === 'CONTRACT_SOURCE_MISMATCH' ? 'CONTRACT_SOURCE_MISMATCH' : 'ADAPTER_RESPONSE_INVALID', true);
          }
        }
      }
      if (!await current()) completed = result('UNKNOWN', 'SOURCE_CHANGED', true);
    }
    if (!completed) throw new TrainingCertificationContractError('ADAPTER_RESULT_MISSING');
    await dependencies.store.finish(key, reservation.token, completed);
    return completed;
  } catch (error) {
    controller.abort();
    try {
      // A failed source read or ambiguous commit cannot leave an indefinitely reusable reservation.
      // The original error still propagates even if safe UNKNOWN recovery succeeds.
      await dependencies.store.recover(key, requestDigest, result('UNKNOWN', 'ATTEMPT_INTERRUPTED'), reservation.token);
    } catch (recoveryError) {
      // Preserve both operational errors for the application's normal error boundary; expose no driver text.
      throw new AggregateError([error, recoveryError], 'ADAPTER_RECOVERY_FAILED', { cause: error });
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}
