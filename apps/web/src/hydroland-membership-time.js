// Derive the preview deadline from two server timestamps, never the device's
// wall clock. Start at the request's monotonic timestamp to conservatively
// subtract the whole round trip, including authentication refresh and parsing.
// This is a presentation deadline only; the server still enforces authorization,
// expiry and issuing-session revocation on every verification.
function membershipDeadline(data, requestStartedAt, now = performance.now()) {
  const expiresAt = typeof data?.expiresAt === 'string' ? Date.parse(data.expiresAt) : NaN;
  // Verification has its own fresh server timestamp; issuance already supplies
  // observedAt. Do not fall back to Date.now() if either timestamp is missing.
  const stamp = data?.verifiedAt ?? data?.observedAt;
  const serverAt = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
  if (!Number.isFinite(expiresAt) || !Number.isFinite(serverAt) ||
      !Number.isFinite(requestStartedAt) || requestStartedAt < 0 ||
      !Number.isFinite(now) || now < requestStartedAt) throw new Error('INVALID_PASS');
  const lifetimeMs = Math.min(300_000, expiresAt - serverAt);
  const deadline = requestStartedAt + lifetimeMs;
  if (lifetimeMs <= 0 || now >= deadline) throw new Error('PASS_EXPIRED');
  return deadline;
}

export { membershipDeadline };
