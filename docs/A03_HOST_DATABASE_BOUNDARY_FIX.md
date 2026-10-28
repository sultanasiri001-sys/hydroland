# Proposed correction for PR537 host database boundary

Local proposal against PR537 reviewed tree 62d5b5e1e22363d8af4c4512c764980fb0c19be5 (remote a3ab8dfdbe18398361148bc5d7b554956effa14b). No publication, rerun, resource creation or real socket tests performed. The first failed run 40602151770 remains FAIL: no migration/restore/switch acceptance. This proposal must receive independent review before assembly or execution.

## Diagnosis

In-container pg_isready and docker-exec psql exercised PostgreSQL's namespace. The host-side migration and later helper Prisma client both use runner 127.0.0.1:5432. Docker HostConfig.PortBindings was configuration intent, not proof of reachability. P1001 is consistent with unsupported publication on an internal bridge (Moby issue36174), but the exact daemon-level failure was not packet-traced. Docker explicitly documents host access directly to container IPs on an internal bridge.

Sources: https://docs.docker.com/reference/cli/docker/network/create/#network-internal-mode---internal and https://github.com/moby/moby/issues/36174 . These support the proposed path, not an assertion that it has run successfully on this runner.

## Smallest proposed boundary change

Keep PostgreSQL and every application attached exclusively to the same labelled IPv4 internal bridge. Remove ineffective Docker -p publication. Add a single host Node TCP relay bound exclusively to 127.0.0.1:5432 with a fixed inspected PostgreSQL bridge IP:5432 destination. No client-selected address, DNS lookup, second bridge, privileged container, iptables/daemon adjustment, host-network application or provider endpoint is introduced. Existing host Prisma URLs and all migration/fixture/restore/switch algorithms remain unchanged.

The original recovery and helper guards now require zero Docker publication and a live owned relay, rather than accepting the old publication request as proof. Relay verification checks container/network IDs, run/disposable labels, internal-only attachment, private IPv4 endpoint agreement, recorded process start/boot identity and actual /proc listener inode ownership. No wildcard or IPv65432 listener is accepted. The helper receipt now says applicationHostListenerCreated=false and databaseAccess=owned-loopback-relay, avoiding a false global no-host-listener claim.

A child waits at an IPC gate until its identity is atomically recorded in ci-ownership.json; then it binds the fixed listener and reports READY. It has a thirty-minute maximum lifetime, 32-connection cap, five-second connect timeout and 120-second idle timeouts. Socket errors close both ends; no payload or URL is logged. Existing always cleanup stops the recorded relay group after application shutdown and before PostgreSQL/network teardown, using the reviewed identity/termination checks. It never signals an arbitrary PID or sweeps other listeners. Uncertain termination remains FAIL. A cleanup failure can leave the owned relay until its lifetime/ephemeral-runner boundary; that is not cleanup acceptance.

## Explicit threat comparison

| Option | Application/DB external route | Host access | Decision |
|---|---|---|---|
| Existing internal bridge + Docker publication | No external route | Requested loopback mapping failed | Preserve failed evidence; do not rerun unchanged |
| Noninternal bridge or dual-homed PostgreSQL | Adds external connectivity through DB network | Published port may work | Rejected: widens isolation boundary |
| Move only migrations into a container | Isolation can remain | Later host helper Prisma still broken | Incomplete fix |
| Fixed loopback relay to inspected internal DB IP | Internal-only topology unchanged | Explicit bounded runner-local DB path | Proposed; trusted ephemeral host remains in boundary |

The relay is an intentional new host listener, not a covert fallback. It uses Docker's documented direct host path; if host-to-container communication is restricted in CI, fail the preflight and stop. Do not add routes/firewall changes, external networks or alternate destinations. Trusted host processes can access the synthetic DB, as intended by the original loopback design. Application containers cannot reach host127.0.0.1, and this listener does not bind the bridge gateway.

## Read-only host preflight and evidence

After container readiness and relay startup, before recovery, use the same generated Prisma client and fixed source URL from the host in a separate child. Compare current_database, current_user, inet_server_addr and pg_control_system().system_identifier with the value independently read through the verified owned container. The preflight child has an eight-second timeout with SIGKILL covering connection, SQL and disconnect; the enclosing startup step has a thirty-second timeout plus three-second kill grace. No migration retry or database mutation occurs during preflight. Failure preserves a separate FAIL receipt with sanitized HOST_DATABASE_PATH_UNAVAILABLE_OR_IDENTITY_MISMATCH classification; timeout before probe completion retains initial FAIL. Only successful SQL identity plus a second live listener/ownership check publishes PASS. The receipt is explicitly uploaded; original recovery receipts are not rewritten.

## Local validation and limits

Six new mocked relay/preflight tests pass: owned endpoint/ten refusal cases, loopback+socket ownership refusals, unreachable/timeout failure receipts, wrong DB/user/address/system identifier, two-stage verification on success, and fixed upstream/error closure. Eleven adapted existing helper tests pass, retaining provenance, external/dual-network refusal, artifact cleanup and receipt race checks. No real listener, Docker, PostgreSQL, process signal or provider operation was executed.

The new behavior is not yet proven on GitHub's Linux runner. Required first changed-head evidence: relay inode belongs to recorded process, host query matches owned server system ID, original recovery PASS, helper+wrapper PASS, and owned cleanup PASS. Missing evidence leaves acceptance open. No production rollback, provider PITR, object bytes/ACL recovery or RPO/RTO claim follows from this patch.
