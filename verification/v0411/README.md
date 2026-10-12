# V0.4.1.1 — Database architecture hardening review

Draft-only changes, committed locally for architecture review. No Supabase resources, migration deployment, mobile feature, dependency or operational business-rule change. The mobile four-digit mock generator, fixtures and shared store remain unchanged; the durable database proposal now uses six digits. Existing untracked design references remain untouched.

## Security findings and fixes

| Finding in V0.4.1                                                                              | V0.4.1.1 fix and verification                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbering relied on current inventory and a four-digit counter                                 | Six-digit format; retained organization/year number/UUID ledger; counters cannot rewind/delete; identities cannot be rebound; explicit 2200H exhaustion; concurrency and final-slot tests          |
| A text-only reservation could be consumed by an unrelated future import                        | Reserve against server block UUID; insert must match it exactly; different UUID and replay are rejected                                                                                            |
| Opening stock required a known production date                                                 | Nullable original date only for OPENING_STOCK; required reference date; number year derives from that reference; no production_entries event/volume inflation                                      |
| Function owner/bypass behavior depended on the migration account                               | Explicit NOLOGIN/NOSUPERUSER/NOBYPASSRLS executor owns QuarryOne tables/functions; client role inheritance/SET ROLE prohibited; minimal Auth-column grants; empty search_path                      |
| Function/default grants were not exhaustively allowlisted                                      | Revoke public/private defaults, regrant only six authenticated control RPCs and five policy predicates; service-role direct-table/control shortcuts removed; permissive-default regression fixture |
| Additional sites and permission changes did not consistently invalidate reviewed configuration | All such controlled changes advance revision; reviewed_revision must equal current revision before activation; stale/new snapshot tests                                                            |
| A waiting authorization decision needed explicit fresh membership lookup                       | Recheck membership after organization lock; blocked admin request is denied after concurrent revocation                                                                                            |
| Site-grant cleanup failed after parent suspension                                              | Grant requires active parent; revoke permits suspended parent; no restored access                                                                                                                  |
| Integrity checks could race for underlying trusted writes                                      | Tenant-row locks serialize owner/site/master/block writes; yard reassignment versus block insert leaves a consistent pit relation                                                                  |
| Audit details/retention and idempotency matching were incomplete                               | Before/after permission/mode details; full bootstrap semantic-payload match; immutable audit history; failed transactions do not commit changes                                                    |
| Extremely small positive inputs could produce an unrepresentable canonical volume              | Generated volume must be finite/positive; numeric underflow rejected; normal decimal precision retained                                                                                            |

Local tests use synthetic Auth identities. Four additional checks run through a non-superuser authenticator connection; a superuser-backed SET ROLE cannot accurately test permission to assume another role, so the dedicated connection tests that boundary explicitly. No RLS restrictions were relaxed to pass tests.

## Schema and numbering decisions

- Same 13 public tables and hierarchy; fourth private support table is block_number_ledger.
- Format BLK-YYYY-NNNNNN, 000001–999999, organization-wide across all sites. PRODUCTION uses production_date year; OPENING_STOCK always uses opening_stock_as_of year, including when an older production date is known. A number prefix is not a production event.
- UUID-bound committed reservations are never recycled. Abandoned committed reservations can leave gaps. Failed transactions roll back reservation/counter/block together; a label must not be shown as issued before commit.
- Opening-stock original date may be null. Its reference date is mandatory; a known original date cannot exceed it. Inventory totals include opening stock, while newly produced totals join production_entries or select origin=PRODUCTION.
- Origin, identifying dates, tenant/site/row identity and block numbers remain immutable under this draft. Block deletion, ledger rebind/delete, counter rewind/delete and audit rewrite/delete are denied.
- `reviewed_revision` binds activation to the exact reviewed snapshot; stage-save and invitation-acceptance contracts are documented, not implemented as new endpoints.

## Updated files

- All three `database/drafts/20261010000{1,2,3}_*.draft.sql` files.
- `database/tests/00_auth_stub.sql`, `10_foundation.sql`, new `20_hardening.sql` and `database/README.md`.
- `scripts/verify-database-drafts.cjs` (new output directory, non-superuser checks and additional races).
- Existing `docs/ONBOARDING_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `ROLE_PERMISSION_MATRIX.md`, `SUPABASE_ROLLOUT_PLAN.md`.
- This report, `database-results.json` and `database-test.log`; original V0.4.1 evidence is preserved separately.

## Executed validation

| Check                                     | Actual final result                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`npm run typecheck`)          | Passed                                                                                                                                                                            |
| ESLint (`npm run lint`)                   | Passed                                                                                                                                                                            |
| Existing application/domain/store tests   | 53 passed, 0 failures                                                                                                                                                             |
| PostgreSQL version                        | 17.11, fresh temporary loopback-only cluster                                                                                                                                      |
| SQL syntax/application                    | All 3 drafts applied transactionally                                                                                                                                              |
| Constraint/role/RLS/onboarding assertions | 144 passed across original and hardening SQL suites                                                                                                                               |
| Non-superuser authenticator checks        | 4 passed: role assumption, revoked-tenant access, direct table mutation and private numbering execution                                                                           |
| Concurrency                               | 8 scenarios passed: numbering, duplicate bootstrap, owner removal, first site creation, revision conflicts, final-slot exhaustion, yard/block integrity, revocation while waiting |
| Migration rollback                        | Duplicate application rejected without data changes; failed DDL transaction fully rolled back                                                                                     |
| Scratch cleanup                           | PostgreSQL server stopped                                                                                                                                                         |

See the JSON and transcript for actual results. Intentional SQL denials/constraint errors in the transcript are expected test outcomes. Run `node scripts/verify-database-drafts.cjs` with PostgreSQL 17 binaries; `QUARRYONE_PG_BIN` is the optional binary-directory override. It does not discover/connect to an existing database or read Supabase credentials.

## Deployment risks and tests not executed

No live Supabase security verification occurred. Signed JWT/gateway identity mapping, real Auth.users columns/RLS, provider role creation/ownership-transfer capability, role inheritance, Data API schema exposure, production performance, pgTAP on a Supabase target and physical Android checks remain untested. Stage-save receipts, invitation persistence/acceptance/delivery, site activation/archive workflows and persistent adapters are still contracts/future work.

The executor is a trusted table owner with owner-level powers over QuarryOne tables, not a client role. Keep its membership restricted to reviewed migration operators. Inspect real default privileges and Auth grants in staging; do not grant global BYPASSRLS/superuser or weaken Auth/RLS merely to make deployment work. Server jobs need separately reviewed grants. Global database administrators remain outside client RLS guarantees.

The unchanged mobile domain cannot yet consume six-digit numbers or null production dates. A future adapter/domain-version migration must introduce origin-aware dates and six-digit validation, preserve legacy source identifiers and never automatically migrate demo fixtures into business history. Earlier deployed migration versions, if any exist outside this repository, must use a reviewed forward migration rather than edited replay.

Open assumptions: shared versus dedicated yards, documentary corrections of unknown dates, future-reference-date acceptance, independent activation approval, catalog extensibility, site-specific roles, customer privacy, invite channels/expiry and retention. Current drafts do not add a future-date prohibition or a correction workflow silently.

## Recommended V0.4.2 sequence (not executed)

Architectural approval → isolated staging/Auth/role preflight → approved immutable migrations → ownership/grant/schema-exposure audit → real signed-JWT multi-tenant/site/revocation tests → numbering/opening-stock/onboarding rollback and concurrency tests → implement reviewed save/acceptance contracts → adapter/import compatibility review → separate release approval. Do not deploy or push automatically.
