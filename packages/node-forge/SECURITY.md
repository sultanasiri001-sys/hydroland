# Internal node-forge security backport

- This private workspace vendors the source files from official `digitalbazaar/forge@v1.4.0`; the sole code change is the nested `DigestAlgorithm` child-count check in `lib/rsa.js`.
- Internal package version: `1.4.1-0`. This is not an official upstream release. The root lockfile links the workspace, so dependency installation does not fetch code from a personal fork and the fix is present even when install lifecycle scripts are disabled.
- Patch provenance: reviewed candidate [digitalbazaar/forge#1158](https://github.com/digitalbazaar/forge/pull/1158), head `f192c67ee5850e44296ef83d6a7b6df6552ba8bf). Upstream had not published a fixed npm release when this backport was prepared.
- The mobile regression uses the crafted low-exponent RSA signature vector from the upstream security discussion and asserts that verification rejects it.
- Replace this workspace only after an official upstream release is available and passes the regression and dependency audit.
- Preserve the upstream license terms in `LICENSE`; `package.json` records the original dual license.

The vendor source is based on the official MIT/BSD/GPL-licensed node-forge project; see the included license file.
