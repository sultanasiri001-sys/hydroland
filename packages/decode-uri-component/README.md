# HYDROLAND decode URI compatibility backport

This private workspace contains the upstream 0.5.1 linear decoder from
`SamVerschueren/decode-uri-component`, commit
`58ed85f5adc7cfaee5e49e4d52b067f172d0bcb6` (tag `v0.5.1`). The MIT license is retained.

The algorithm is unchanged. Only the module export is CommonJS, and literal
`+` is converted to a space before decoding, preserving the existing 0.2.2
form-query behavior used by query-string 7 and Expo Router 57. Registry 0.5.1
is ESM; using it directly would break that CommonJS caller. No Expo major
upgrade or security-gate exception is introduced.

Upstream 0.5.1 fixes GHSA-qr28-fpjm-wq7f (quadratic whole-string replacement)
and incorporates the earlier linear decoder fix for GHSA-vcc3-ghjq-m6fr.
The root override pins this workspace to 0.5.1. The release audit still checks
all mobile and repository dependencies and rejects high/critical findings.

Run `node --test packages/decode-uri-component/test.cjs` for bounded malformed
input and compatibility regressions, and `node apps/mobile/scripts/decode-uri-security.mjs`
after a full install to verify the actual query-string dependency resolves this
workspace and retains form/query behavior.
