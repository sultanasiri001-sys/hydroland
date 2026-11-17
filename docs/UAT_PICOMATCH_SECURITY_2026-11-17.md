# UAT dependency security maintenance — 17 November 2026

Backport main #607 dependency safeguard to the existing UAT branch without merging production feature code. Original UAT source: a9294584b84fcf83618dcfbb827d151a788cea16.

The private vendored picomatch backport, provenance, bounded regression tests, and mandatory pre-audit gate are identical to main af127a3eeed90d11221d55eed16dfa01d9ff550b. Docker stages include the vendor directory to preserve local dependency links. No unrelated dependency version changed. High/critical audit rejection remains mandatory, with no exceptions. See vendor/picomatch/UPSTREAM.md for the narrow upstream patch and its limits.

No schema, migration, bootstrap, account, fixture, payment, messaging, feature flag, database plan, disk, network, or Blueprint changes. The existing source hash guard rejects unreviewed schemas before connecting. This change does not prove a fresh backup, actual incident drill, human acceptance, or completion of a whole platform acceptance point. Deployment and runtime verification must be recorded separately after required checks pass.
