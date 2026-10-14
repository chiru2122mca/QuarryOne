# QuarryOne V0.4.2B2 — Hosted development migration preparation

Date: 2026-10-14. Started on clean `main` at `be52f88`. The existing local link and authenticated project identity match **quarryone-dev / vfwdcrptpawfsiaqumjb / ap-south-1** exactly. CLI **2.120.0**, hosted PostgreSQL **17.11**, project ACTIVE_HEALTHY. No other project was targeted. Docker was neither started nor used; skipping a Supabase-stack rehearsal is the operator's explicit decision.

**Deployment readiness: blocked by Auth schema grant authority. No hosted dry run or migration deployment was executed.** The request explicitly requires stopping when hosted privileges are incompatible. Local promotion and validation were completed without changing those privileges or the SQL logic.

## Files and promotion

Created these files in reviewed order:

1. `supabase/migrations/20261013000000_foundation.sql`
2. `supabase/migrations/20261013000001_access.sql`
3. `supabase/migrations/20261013000002_controlled_onboarding.sql`

Each is a **byte-identical copy** of its corresponding reviewed draft. The only differences are filename and directory. Comments (including draft-review comments), explicit BEGIN/COMMIT wrappers, tenant/site FKs, generated volumes, opening-stock provenance, six-digit numbering, policies, executor restrictions, audit and controller logic are unchanged. All three normalized-LF SHA-256 fingerprints match the existing promotion plan. No Auth stubs, synthetic users, seed files or test helpers were copied. Candidate timestamps are valid, unique and ordered.

Updated `database/promotion-plan.json`, `supabase/README.md` and `docs/SUPABASE_ROLLOUT_PLAN.md` to record local promotion and the blocker. Added the evidence in this directory. Application source, dependencies, tests, existing harness, drafts and `supabase/config.toml` remain unchanged. Migration execution is still disabled in the config, as are seeds; creating files does not authorize deployment.

## Hosted preflight and exact blocker

Fresh metadata-only SELECTs established:

- PostgreSQL 17.11; Management API query principal and session user are postgres. The future direct migration session has not been established.
- No migration-history schema/table, public application relations/types or quarry_private schema. No quarryone_executor role. No recorded conflict with the proposed versions was found; this must be rechecked before deployment.
- postgres is non-superuser, CREATEROLE, BYPASSRLS, has public schema CREATE, and has SET access through provider memberships. cli_login_postgres has SET membership in postgres without INHERIT or ADMIN. Role attributes alone do not prove that all ownership transfers will work.
- Required auth.users columns have the expected UUID/timestamptz/boolean types. postgres has REFERENCES and SELECT WITH GRANT OPTION on all four. Auth column selection is compatible at the metadata level.
- auth.uid() exists, owned by supabase_auth_admin, with the expected request-claim implementation. postgres has EXECUTE but **not EXECUTE WITH GRANT OPTION**. PUBLIC currently has EXECUTE; this does not give postgres permission to issue an explicit grant to the new executor.
- auth schema is owned by supabase_admin. postgres has USAGE but **has_schema_privilege('postgres', 'auth', 'USAGE WITH GRANT OPTION') = false**. The inspected membership graph contains no supabase_admin membership. The schema ACL grants no PUBLIC usage and the proposed executor does not exist or inherit an existing API role.

The reviewed access draft requires:

```sql
GRANT USAGE ON SCHEMA auth TO quarryone_executor;
GRANT SELECT(id,email_confirmed_at,phone_confirmed_at,is_anonymous)
  ON auth.users TO quarryone_executor;
GRANT EXECUTE ON FUNCTION auth.uid() TO quarryone_executor;
```

The first grant lacks a grant-authorized path under the observed postgres ACLs. Merely having USAGE, CREATEROLE or BYPASSRLS does not delegate schema privileges; see PostgreSQL 17's [GRANT rules](https://www.postgresql.org/docs/17/sql-grant.html). A freshly created NOINHERIT executor has no alternative auth schema usage. Without it, qualified auth.uid()/auth.users access in its SECURITY DEFINER paths cannot be considered deployable. The explicit function grant also lacks grant option; existing PUBLIC execution may allow execution once schema usage exists, but must not be represented as a successful explicit delegation.

No GRANT was attempted to test this remotely. Under ordinary PostgreSQL authorization, an unauthorized GRANT can warn or fail rather than produce the intended ACL; provider-specific overrides were not exercised. This is a **metadata-based deployment blocker**, not a captured failed deployment. Establish a provider-supported, narrowly scoped grantor/ownership strategy through architectural review before continuing. Do not add executor membership in authenticated/service_role, broad Auth access, superuser/BYPASSRLS privileges, or weaken RLS as a workaround.

The enabled ensure_rls event trigger remains present. B1 independently verified API enabled, public/graphql_public exposure, public/extensions extra search path and private-schema exclusion; the operator confirmed automatic new-table exposure disabled. Those API settings were **not refreshed in B2 after the privilege stop**. Prior default-ACL drift still requires explicit revokes and post-deployment inspection. No automatic RLS behavior was exercised through hosted table creation.

Evidence: [fresh hosted metadata](hosted-preflight.json), [Auth grant prerequisites](auth-grant-prerequisites.json), and [B1 API/ACL findings](../v042b1/README.md).

## Dry-run result

**Not executed**, following the explicit stop-on-incompatible-privileges requirement. No `db push` command was run, with or without --dry-run. No migration-history bootstrap or repair was performed.

The three local versions above are expected to be pending because the history table and application schema are absent; this is a catalog/local-file conclusion, **not a CLI-confirmed pending list**. Migration order is foundation → access/ownership/RLS → controlled onboarding. No recorded version conflicts were observed. A future successful dry run would establish planning/history alignment only, not SQL execution, ownership, RLS or transaction success.

CLI help was inspected. It states that push can update Vault secrets; use --skip-vault even for the eventual dry run. Neither --include-roles nor --include-seed is needed. No config push/pull, reset, repair, Auth-user creation, role/grant changes or hosted DDL was executed. The CLI transport may manage its provider login-role lifecycle, as documented in B1; no application-role mutation was sent by this preflight.

## Fresh local validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Existing application tests | 53 passed, 0 failed |
| Native PostgreSQL 17.11 SQL harness | All three drafts applied transactionally on a new isolated scratch cluster |
| SQL constraint/authorization/workflow assertions | 144 passed |
| Non-superuser authorization checks | 4 passed |
| Concurrency scenarios | 8 passed (including revocation recheck and its synchronization assertion) |
| Duplicate migration / failed-DDL rollback | Both passed |
| Scratch server | Stopped successfully |
| Promotion checks | Three byte-identical copies, fingerprints, version uniqueness/order and no test-only files passed |

The existing harness was loaded unchanged, with only its report path redirected in memory from verification/v0411 to verification/v042b2. It tested the reviewed drafts; byte equality ties those results to the promoted copies. It uses synthetic Auth and a scratch migration superuser, so passing it cannot resolve the hosted grant blocker. Its `liveSupabase` field describes the harness alone; separate metadata SELECT evidence is in this directory. No signed JWT/RLS tests, hosted DDL, Docker/Supabase-stack tests or physical Android checks were performed.

See [database results](database-results.json), [database transcript](database-test.log), [promotion results](promotion-results.json) and [local results](local-results.json).

## Remaining risks and eventual commands

Resolve the Auth grantor blocker first through an explicitly reviewed, narrowly scoped approach. Review any necessary SQL changes separately and update the promotion fingerprints/tests rather than editing silently. The future migration principal, executor creation/assignment/ownership transfer, provider event triggers, default ACLs, explicit transaction wrappers, migration-history recording and partial-deployment recovery remain untested on hosted Supabase. Skipping Docker leaves those checks for an explicitly approved hosted development deployment. Real Auth/JWT isolation and revoked-membership tests follow only after separate user/test authorization.

The following commands are **proposed only; do not execute while the blocker remains**. After the privilege design is approved and local migration enablement (`[db.migrations] enabled = true`) is reviewed, rerun local tests and inspect the exact SQL diff. Then from this repository:

```powershell
$approvedRef = 'vfwdcrptpawfsiaqumjb'
$actualRef = (Get-Content -LiteralPath 'supabase/.temp/project-ref' -Raw).Trim()
if ($actualRef -ne $approvedRef) { throw 'Stop: linked project mismatch' }
$env:SUPABASE_TELEMETRY_DISABLED = '1'
$cliVersion = (npm exec --yes --package=supabase@2.120.0 -- supabase --version).Trim()
if ($LASTEXITCODE -ne 0 -or $cliVersion -ne '2.120.0') { throw 'Stop: CLI version mismatch' }
npm exec --yes --package=supabase@2.120.0 -- supabase db push --linked --dry-run --skip-vault
if ($LASTEXITCODE -ne 0) { throw 'Stop: dry run failed' }
```

Check the CLI version is exactly 2.120.0; reverify authenticated hosted identity/region and fresh history before proceeding. Review the pending list/order/warnings and obtain **separate explicit approval for actual development deployment**. Only after that approval and the same link guard:

```powershell
npm exec --yes --package=supabase@2.120.0 -- supabase db push --linked --skip-vault
if ($LASTEXITCODE -ne 0) { throw 'Stop: inspect actual objects/history; do not reset or repair' }
```

No database password, token, connection URL or key should be placed in arguments, source or handoff logs. Use existing approved secure authentication. Inspect resulting history/ownership/grants/RLS immediately; do not treat file rollback as rollback of earlier committed migration versions. No automatic push, deployment or mobile integration is authorized by this milestone.
