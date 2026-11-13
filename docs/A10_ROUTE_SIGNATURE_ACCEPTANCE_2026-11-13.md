# A10 — literal controller route signature guard

The guard parses TypeScript syntax without executing application code. It
collects Nest controller and method paths through named, aliased and namespace
imports, including path arrays and controller option paths. It compares method
and canonical path, normalizes parameter names/case/slashes, and rejects ALL
overlaps at the same signature. Nonliteral, inherited, versioned and custom
mapping forms require explicit review rather than disappearing from coverage.

On main ff04b0239af6a0428af0fbeaa22f6d69df0b9bc4, the guard read 443 source
files and collected 538 literal route signatures, with zero conflicts. Seven
parser/negative-control cases passed locally. API CI now runs both the cases
and the current source scan after the existing protected-route/RBAC check.

This is source-level coverage of explicit controller method signatures. It
does not prove module-registration uniqueness, dynamically added routes,
runtime routing precedence, cross-tenant permission correctness, load targets
or recovery acceptance. Those remain separate parts of A10. No application
route, schema, dependency, permission, operational threshold or data changes.
