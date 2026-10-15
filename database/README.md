# QuarryOne local database migrations and security tests

Current milestone: V0.4.2B2.2, Option A implemented locally and awaiting review. Three sources under `drafts/` have byte-identical unapplied counterparts under `supabase/migrations/`. The promotion plan records current normalized-LF SHA-256 values; `verification/v042b22/fingerprint-changes.json` preserves old/new values. No production migration includes Auth stubs, fixtures or assertion helpers. The mobile prototype still uses its mock store.

The approved Mumbai link is `vfwdcrptpawfsiaqumjb`. Read-only inspection is separate from the harness; no hosted DDL, migration push/dry run or Auth test-user creation occurred. Migration/seed execution remains disabled. Local success is not hosted security verification.

## Security architecture

- Each migration requires stable non-superuser postgres with CREATEROLE before DDL.
- quarryone_executor retains NOLOGIN/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT/NOBYPASSRLS. Trusted postgres receives explicit SET-only membership; API roles receive none.
- request_user_id() is executor-owned SECURITY INVOKER/STABLE with an empty search path. It matches inspected Auth claim precedence; malformed identities return NULL, never a role name or caller ID.
- require_verified_request_user() is the sole postgres-owned SECURITY DEFINER/STABLE helper. It uses auth.uid() directly, reads only current-user verification fields and returns UUID or 42501. Only executor/owner may execute it; it is not a Data API endpoint.
- Other functions remain executor-owned. Signature manifests and final ACL/schema assertions enforce owner/config/execution allowlists. Executor has no direct Auth schema/table access.
- Onboarding explicitly SET LOCAL ROLEs to executor for owned-table/trigger/function DDL and back to postgres for assertions. No provider Auth objects or role attributes are changed.

## Native local test workflow

Run `node scripts/verify-database-drafts.cjs`. PostgreSQL 17 binaries are required; `QUARRYONE_PG_BIN` may override their directory. The runner creates a new temporary loopback-only cluster and shuts it down. It never connects to existing databases or Supabase and never starts Docker. Fresh evidence goes to `verification/v042b22/`; older reports remain historical.

1. `tests/00_auth_stub.sql` supplies local synthetic Auth/assertion helpers/roles. Never deploy it. A scratch superuser is used only for scaffolding, fixtures and privileged integrity probes. The migration postgres role is non-superuser and NOBYPASSRLS; a separate CLI-like login can SET it without inheriting it. Auth usage/uid EXECUTE are usable but not grantable; required column reads exist. Permissive defaults deliberately stress explicit revokes.
2. All three drafts apply in foundation, access/RLS, controlled-onboarding order through the non-superuser migration session. Wrong-principal rejection is tested before DDL.
3. `tests/10_foundation.sql` retains tenant/site/bootstrap/lifecycle/volume/numbering regressions.
4. `tests/20_hardening.sql` retains opening-stock, constraints, audit and authorization regressions; its ownership allowlist recognizes only the approved trusted-helper exception.
5. `tests/30_permission_architecture.sql` adds 41 assertions: owner/config/ACL catalogs, denied direct Auth reads, verified/anonymous/missing/deleted/unverified users, email/phone verification, malformed/empty claims, identity parity, no impersonation parameter or metadata result, and audit identity.
6. Separate non-superuser processes run eight API/executor checks. Eight concurrency scenarios retain numbering, bootstrap retries, last-owner, primary-site, revision, capacity, yard/pit and post-lock revocation guarantees. Duplicate-apply and failed-DDL rollback checks remain.

Latest results: 185 SQL assertions (144 existing plus 41 new), eight non-superuser process checks, eight concurrency scenarios, two rollback checks, three non-superuser migration applications and wrong-principal rejection passed. Request settings are simulated; no signed JWT test is claimed. The harness report's liveSupabase field describes the harness, not separate metadata inspection.

Next: review the implementation, then separately authorize target/history/ownership preflight, dry run and deployment as distinct gates. Real hosted Auth/JWT tests require further approval. Do not reset/repair history or broaden client/Auth privileges to bypass a failure.
