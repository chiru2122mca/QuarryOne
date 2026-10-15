# QuarryOne V0.4.2B2.2 — Permission compatibility implementation

Date: 2026-10-15. Started on main at 3b1f2e4, preserving the uncommitted B2.1 proposal, rollout notes and evidence. Those related materials are included with this milestone; unrelated mobile source/config/dependencies remain unchanged. User authorization covers local Option A implementation/testing only. No dry run, deployment or Git push is authorized/performed.

## SQL changes

Updated all three source/promoted pairs, with **no differences between each pair's bytes**:

- database/drafts/202610100001_foundation.draft.sql and supabase/migrations/20261013000000_foundation.sql: stable non-superuser postgres/CREATEROLE guard before DDL. Tables, FKs, numeric expressions, status/origin/numbering constraints unchanged. Source review comment clarified.
- database/drafts/202610100002_access.draft.sql and supabase/migrations/20261013000001_access.sql: two helpers, no executor Auth grants, explicit stable-principal SET-only membership, identity-based predicates/policies, eight-signature owner/security manifest and final ACL/schema assertions.
- database/drafts/202610100003_controlled_onboarding.draft.sql and supabase/migrations/20261013000002_controlled_onboarding.sql: trusted bootstrap verification, request identity for admin checks/audit/member changes, executor DDL context, 31-signature manifest, owner-aware revokes and final allowlists. Explicit SET LOCAL ROLE postgres restores the intended principal even from a CLI-like transient login.

Existing tenant/site conditions, fixed bootstrap OWNER/ALL_SITES assignment, lock/idempotency/revision behavior, last-owner protection, lifecycle, audits, stock provenance, production/volume integrity and block numbering remain intact. No test-only SQL entered the three executable migrations. Migration order/versions are unchanged and execution/seeds remain disabled in config.

## Auth helpers and permissions

request_user_id() is executor-owned, SECURITY INVOKER, STABLE, zero-argument UUID, fixed empty search path. It reads scalar request.jwt.claim.sub first, then JSON request.jwt.claims sub, matching the freshly inspected hosted auth.uid() implementation. Empty/missing/invalid UUID or malformed JSON fails closed to NULL. On malformed data the return differs deliberately from auth.uid()'s cast exception; no alternative actor is accepted. Valid scalar identity short-circuits even malformed JSON, preserving Auth precedence.

require_verified_request_user() is postgres-owned, SECURITY DEFINER, STABLE, zero-argument UUID with an empty search path. It calls provider-owned auth.uid() directly, never the executor-owned resolver. It reads only id/email_confirmed_at/phone_confirmed_at/is_anonymous for that UUID. Confirmed email or phone and explicitly non-anonymous status are required; NULL anonymous status is rejected. Invalid/malformed/missing/deleted/unverified/anonymous identities raise 42501. It returns no account metadata, accepts no victim identity argument, performs no dynamic SQL or operational writes, and is executable only by executor/owner.

The executor retains its restricted attributes and receives no direct Auth schema/table grants. Provider PUBLIC EXECUTE on auth.uid() is not changed; absence of Auth schema usage prevents direct invocation by executor, confirmed in non-superuser processes. The trusted postgres owner uses existing rights; no provider BYPASSRLS/superuser attribute was introduced or changed. The synthetic migration role is even NOBYPASSRLS. The pre-existing local service_role simulation remains test scaffolding only.

Exact signature manifests check owner, SECURITY DEFINER/INVOKER, volatility and empty search path, preserve the single trusted-owner exception, and reject unknown private signatures/public controller overloads. Final checks enforce the authenticated allowlist (five predicates plus request identity, and six public controllers), no private anon/service execution, no extra bridge ACL grantees, no client schema CREATE/executor membership and no executor Auth reads. Local tests inspect the same catalogs after all migrations.

Request-setting tests are SQL simulations, not JWT validation. PostgREST must validate real tokens before installing request claims; no SQL login/claims-setting RPC is added for clients. Tenant/site/role authorization still comes from current database memberships, including post-lock revocation rechecks. Audit identity remains the end user across nested definers.

## Fingerprints and review metadata

| Migration | Revised normalized-LF SHA-256 |
| --- | --- |
| 20261013000000_foundation | 41b29e626b2904eaebca830bd983b3854770789397734624365e1197d48207ab |
| 20261013000001_access | 274d9c8d1aaa32be223120b533cd4f463fb02bd481cb883752fea1824850c162 |
| 20261013000002_controlled_onboarding | 8b2237310db08181fc7f2b5ce40be9fe2d2230a8bebefb306778d15898876c48 |

database/promotion-plan.json records the new hashes, local-only user approval, unapplied status and pending implementation review. [fingerprint-changes.json](fingerprint-changes.json) contains old/new values; [previous-promotion-plan.json](previous-promotion-plan.json) preserves the entire previous plan. Existing B2 verification remains untouched. These hashes establish file identity, not hosted runtime compatibility.

## Validation results

| Executed check | Actual result |
| --- | --- |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm run test:domain | 53 passed, 0 failed |
| Three transactional migration files | Applied successfully through a non-superuser CLI-like login SETting non-superuser postgres |
| Existing SQL regressions | 144 passed; owner/identity allowlists updated only for the approved architecture |
| New permission assertions | 41 passed |
| Total SQL assertions | **185 passed, 0 failed** |
| Non-superuser API/executor processes | **8 passed, 0 failed** |
| Concurrency scenarios | **8 passed** (9 checks including revocation-race synchronization) |
| Wrong-principal guard | Passed: rejected before any application DDL |
| Duplicate apply / failed-DDL rollback | **2 passed** |
| Scratch PostgreSQL shutdown | Passed; stopped |
| Fingerprints / byte equality / order | All 3 pairs passed; no stub/helper/seed promotion |

The extended harness remains native PostgreSQL 17.11, isolated on a new loopback scratch cluster. Initial scaffolding/fixture integrity probes use the scratch superuser; migrations run through the modeled non-superuser login. Auth schema usage/function execute are usable but not grantable by postgres, matching the observed blocker. Permissive defaults on postgres and executor deliberately stress revokes. Tests cover role/owner/catalog properties; direct Auth denial; verified email/phone acceptance; anonymous/malformed/missing/deleted/unverified rejection; no impersonation parameter or metadata result; claim parity; audit identity; and all existing tenant/site/revocation/owner/bootstrap/volume invariants. Tests are simulated local SQL, not real signed JWT requests.

Evidence: [database results](database-results.json), [database transcript](database-test.log), [local summary](local-results.json), [hosted read-only snapshot](hosted-readonly.json). Intentional denial/duplicate/rollback errors in the transcript are passing negative tests. The harness report's liveSupabase field describes the harness only, not the separate metadata SELECT.

## Hosted inspection and remaining risks

Only a metadata SELECT ran against the exact preverified link vfwdcrptpawfsiaqumjb. It returned PostgreSQL 17.11, postgres query principal, absent migration-history table/quarry_private schema and the auth.uid() definition used for parity. No hosted Auth rows, credentials or keys were read/saved. The CLI's provider login-role transport lifecycle may initialize its existing login context, as documented in B1; no application/provider role DDL or grants were explicitly executed. No db push (even dry run), reset, repair, hosted tests/users or Docker operation ran.

Local results remove the need for the unavailable Auth grant delegation, but **do not prove managed-platform execution**. Still pending: actual CLI migration-session role/SET behavior; provider role-creation/ownership restrictions; Auth RLS/default privilege drift; real helper owner/ACL/config after deployment; explicit transaction-wrapper/history behavior; Data API effective exposure and automatic-RLS outcomes; real JWT issuer/expiry/forgery/revocation and tenant/site tests. No new hosted DDL was authorized to resolve these assumptions.

## Next separately approved steps

1. Review the exact implementation diff, both helpers, manifests, explicit role context and revised fingerprints. Do not use the old B2 hashes for this SQL.
2. Authorize a read-only hosted preflight refresh on this exact Mumbai project: identity/version/history, Auth/schema/column/function prerequisites, current/session principal, ownership/SET prerequisites, defaults and API exposure. Stop on drift or conflicts.
3. Review deliberate local migration enablement and separately authorize a pinned CLI dry run with --linked --dry-run --skip-vault. This milestone does not permit that command. Dry-run success will not prove SQL execution.
4. Obtain separate development deployment approval before any actual push/DDL. Inspect objects, owners, grants, policies and history afterwards; stop on unexpected errors/warnings, with reviewed recovery rather than reset/repair.
5. Separately authorize Auth identities and real signed-JWT/RLS testing before mobile backend integration. Preserve mock behavior until its own approved adapter milestone.

Updated documentation: docs/SUPABASE_PERMISSION_RESOLUTION.md, docs/SUPABASE_ROLLOUT_PLAN.md, database/README.md and supabase/README.md. Updated local test files: database/tests/00_auth_stub.sql, database/tests/20_hardening.sql, new database/tests/30_permission_architecture.sql and scripts/verify-database-drafts.cjs. Prior uncommitted B2.1 evidence/proposal is preserved alongside this implementation.
