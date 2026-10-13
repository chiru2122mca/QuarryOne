# QuarryOne V0.4.2A — Supabase deployment preparation handoff

Baseline main: a0c0b76, clean tree, three commits ahead of origin/main. Stage A preserves existing history, approved design reference, application source/dependencies, mock store and SQL draft contents. No Supabase project/user/credential, remote modification, SQL deployment, mobile integration or push occurred. Intended development project name: quarryone-dev; no hosted reference is assigned or linked.

## Files added/modified

- Added `supabase/config.toml` and `supabase/README.md`: unlinked local preparation, migration/seed/signup opt-outs, private schema excluded, no credentials or executable migration directory.
- Added `database/promotion-plan.json`: ordered normalized-LF fingerprints and three proposed 14-digit UTC target names; no files copied/promoted.
- Updated `docs/SUPABASE_ROLLOUT_PLAN.md`: compatibility/pending matrix, CLI prerequisites/status, deliberate promotion, six implemented versus missing onboarding contracts, live identity/scenario matrix, recovery and Stage B gates.
- Updated `.gitignore`: environment credentials, Supabase local/linking/branch state and signing-key files ignored; the local config is tracked.
- Added this report and fresh `database-results.json`, `database-test.log`, `config-results.json`, `promotion-results.json` and `tooling-results.json`. Previous milestone verification reports remain unchanged.

## Compatibility assessment

Local PostgreSQL 17.11 validates syntax, numeric generated columns, tenant/site FKs, triggers, deferred constraints, local RLS/grants and transaction invariants. It does **not** establish compatibility with a Supabase-managed target. The target PostgreSQL version, actual auth.users schema/access, auth.uid() signed-JWT context, effective Data API exposure and provider grants remain unverified.

The largest preflight risk is migration privilege: local DDL ran with a scratch superuser, while hosted postgres is not a normal superuser. The target operator must prove role creation, GRANT/SET ROLE and table/function ownership transfer to the restricted executor plus exact Auth-column access. CURRENT_USER may be a provider-managed CLI login role, so permanent ownership/access must not accidentally depend on a short-lived role. Do not weaken RLS or Auth access to bypass errors. CLI transaction/history behavior with explicit BEGIN/COMMIT wrappers also requires a real Supabase-stack rehearsal.

No confirmed compatibility defect justified changing the reviewed SQL; all three drafts are preserved. Detailed evidence and source references are in the rollout plan.

## CLI/configuration status

Supabase was absent from PATH/dependencies/offline cache. Pinned CLI 2.120.0 was successfully executed from an ephemeral npm cache, without modifying application dependencies. Version/help and init in a temporary directory only were executed. Telemetry was disabled for inspection/init. No login, link, start, status, db push/reset, remote config or remote SQL command was executed.

The minimal TOML parses successfully, with keys/types checked against the pinned CLI's generated template. Requested settings match the Stage A constraints; config startup/effective runtime and hosted settings remain pending. Docker executable 29.8.2 is present, but engine/container health is not verified. Node is 24.21.0 and Python is 3.14.7. Initial sandbox offline-cache/network checks were unavailable; the permitted ephemeral pinned CLI check subsequently succeeded. No credentials were requested or saved in the repository.

## Promotion and Auth/RLS plan

Keep foundation → access/ownership/RLS → controlled onboarding order. Proposed target versions 20261013000000/000001/000002 are valid, unique and increasing locally, but must be reconciled with future approved target history before promotion. The 12-digit draft labels are not blindly reused as canonical executable timestamps. Source fingerprints use UTF-8 with LF-normalized line endings only. Future promotion needs an explicit three-file diff and review, migration enablement and a disposable real-stack rehearsal; never include Auth stubs/test helpers/demo fixtures or overwrite applied history.

Live testing plans real A/B Owners, a site-restricted Supervisor, a revoked member, unauthenticated anon and an authenticated anonymous account. Scenarios cover bootstrap, guessed foreign IDs, site restrictions, role escalation, old-JWT revocation, mode transitions, last-owner races, reviewed activation, table/execute denial, number/opening-stock integrity and rollback. REST/RPC gateway identity checks cannot be replaced with SQL role simulation or admin keys. Missing stage-save/receipt, invite acceptance/delivery, site activation/archive and persistent production/import adapters are explicitly separated from the six current controller drafts. No users or such endpoints are created here.

## Fresh local results (not historical assumptions)

| Executed check                           | Result                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                               | Passed                                                                                                                                  |
| ESLint                                   | Passed                                                                                                                                  |
| Existing application/domain/store suites | 53 passed; 0 failures                                                                                                                   |
| Existing SQL drafts                      | All 3 applied transactionally on a new isolated local PostgreSQL 17.11 cluster                                                          |
| SQL constraints/RLS/authorization        | 144 assertions passed                                                                                                                   |
| Non-superuser authenticator checks       | 4 passed                                                                                                                                |
| Concurrency scenarios                    | 8 passed (numbering, bootstrap, owners, primary site, revisions, final capacity slot, yard/block consistency, waiting-admin revocation) |
| Migration rollback/safety                | Duplicate draft rejected without data changes; failed DDL fully rolled back                                                             |
| Scratch PostgreSQL cleanup               | Server stopped                                                                                                                          |
| Config syntax/preparation                | TOML parsed; pinned CLI template keys/types and no migration/link safeguards checked                                                    |
| Promotion metadata                       | 3 checksums recorded, candidate dates/uniqueness/order/wrappers checked; no target created                                              |

The unchanged PostgreSQL harness was loaded with only its report-output path redirected to this directory; its draft/test logic was not edited. Intentional denial/rollback errors in the transcript are passing negative tests. Live Supabase security/compatibility, full local Supabase stack, hosted version/history, signed tokens/verification channels, target roles/grants/schema exposure, production performance and physical Android checks were not executed.

## Stage B gates and recovery

Review this handoff → explicitly authorize an isolated development project and operator/region/version → validate stable migration principal/Auth schema/grants → deliberately promote reviewed files after history/checksum reconciliation → rehearse on disposable real Supabase stack → obtain approval for hosted dev application → execute real signed-JWT/RLS and recovery tests → implement missing contracts/adapter only in their own reviewed scope. Do not advance automatically.

Back up and identify any future target before applying versions; stop on the first unexpected error and inspect actual objects/history. A file rollback is not a rollback of all earlier committed versions. Avoid destructive reset/down migrations, role deletion or migration repair to hide drift; restore an approved backup or use a reviewed forward fix. Native mobile prototype remains independent during any future database failure.
