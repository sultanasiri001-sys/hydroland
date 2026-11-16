console.error(JSON.stringify({
  target: 'hydroland-pitr-a09-20261114',
  result: 'BLOCKED',
  reason: 'A09 is immutable and must not be re-applied. Use the guarded forward-only A10 reconciliation command.',
}));
process.exitCode = 2;

