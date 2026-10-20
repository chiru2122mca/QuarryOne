# QuarryOne V0.4.2 — Approved development deployment

Date: 2026-10-19. Target: **quarryone-dev / vfwdcrptpawfsiaqumjb / ap-south-1 (Mumbai)**, PostgreSQL 17.11. Pinned CLI 2.120.0. User explicitly approved applying only the three reviewed migrations. All three succeeded; execution stopped after read-only verification and reporting. Real Auth/JWT/RLS testing requires review and separate authorization.

## Before execution

The exact local link and authenticated hosted identity matched. History was absent/empty; no QuarryOne schema existed. All three hashes matched the literal reviewed B2.2 fingerprints, and the local directory contained exactly the three approved files. A fresh dry run reported exactly the expected order with no seeds or custom-role files.

| File | Verified normalized-LF SHA-256 |
| --- | --- |
| 20261013000000_foundation.sql | 41b29e626b2904eaebca830bd983b3854770789397734624365e1197d48207ab |
| 20261013000001_access.sql | 274d9c8d1aaa32be223120b533cd4f463fb02bd481cb883752fea1824850c162 |
| 20261013000002_controlled_onboarding.sql | 8b2237310db08181fc7f2b5ce40be9fe2d2230a8bebefb306778d15898876c48 |

## Deployment output

Executed once, as approved:

```text
npm exec --yes --package=supabase@2.120.0 -- supabase db push --linked --skip-vault
```

Relevant CLI output:

```text
Initialising login role...
Connecting to remote database...
Applying migration 20261013000000_foundation.sql...
Applying migration 20261013000001_access.sql...
Applying migration 20261013000002_controlled_onboarding.sql...
```

Structured output reported dryRun=false, all three filenames in order, no seed/roles files, and `Finished supabase db push.` **Exit code 0; no timeout, retry, reset or history repair.** `roles: []` refers to extra roles files, not the restricted executor created inside the reviewed access migration. The CLI announced a newer release; version 2.120.0 was retained.

The reviewed fail-closed guards requiring non-superuser postgres with CREATEROLE completed in each migration. This establishes effective postgres execution of those guards; the query session's identity alone is not the evidence. Explicit SET-role changes and ownership transfers succeeded. No new BYPASSRLS/superuser attribute was granted by the application migrations.

## Post-deployment validation

- Exactly **13 intended public tables**, all owned by quarryone_executor and **all with RLS enabled**: profiles, organizations, organization_settings, quarry_sites, quarry_pits, stockyards, organization_memberships, site_memberships, materials, granite_grades, granite_blocks, production_entries, customers.
- Exactly **13 SELECT policies**, scoped to authenticated. No unexpected write policies. Authenticated has only reviewed SELECT table grants; anon/service_role have no application table privileges. Full table/sequence ACL inspection found only the expected owner/read grants.
- Four private tables are executor-owned with no API-role table privileges. Private sequence grants also match the owner-only allowlist. Private-table security relies on schema/ACL isolation and controlled execution as designed; this is not a claim that private tables require public-style RLS policies.
- **31 reviewed functions** match exact signature, owner, SECURITY DEFINER/INVOKER, volatility and fixed empty search path. The sole privileged exception, require_verified_request_user(), is postgres-owned and executable only by postgres/executor. Other functions remain executor-owned. Authenticated execution matches the six private policy/identity helpers and six public controllers; anon/service_role execute none. No unexpected function ACL grantees or grant options were found.
- Executor is NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOBYPASSRLS. No API/unauthenticated role has membership. Only trusted postgres is a direct member, through the provider/creator ADMIN grant and the reviewed explicit SET grant; both are INHERIT false and the explicit SET grant is true.
- Executor has no auth schema usage or SELECT on any of the four Auth columns. No broad direct Auth grants were introduced.
- Provider automatic-RLS event trigger remains enabled. Effective Data API schemas are **public, graphql_public**; extra search path **public, extensions**. **quarry_private is excluded from both**, verified after deployment without changing hosted settings.
- History records exactly **20261013000000 foundation**, **20261013000001 access**, **20261013000002 controlled_onboarding**. No unexpected version was found.
- **104 core catalog assertions passed**, plus full object-grant/policy/automatic-RLS and API-exposure checks.

No migration, permission or ownership error occurred. One supplemental read-only ACL reporting query used the wrong PostgreSQL char type cast; correcting that reporting expression completed the check. No deployed SQL or permission was altered, and no migration was retried. Intentional failure/rollback or live identity tests were not run on the hosted database.

## Evidence and repository state

- before.json and dry-run.json: target, prior history, reviewed hashes and exact pending plan.
- deployment-attempt.json, deployment-result.json and deployment-output.log: one approved execution and sanitized output.
- after-catalog.json and validation.json: exact tables/history/function/security catalog results.
- object-grants.json and grant-validation.json: full table/sequence ACL and policy checks.
- api-exposure.json: private schema exclusion after deployment.
- local-checks.json: fresh TypeScript/ESLint and unchanged SQL/mobile/config checks after completion.

Only local reporting/bookkeeping was updated: database/promotion-plan.json now records the applied versions and immutable status; docs/SUPABASE_ROLLOUT_PLAN.md points to this handoff. Historical local-promotion authorization records are retained and superseded by the later deployment approval block. Reviewed SQL, source/promoted hashes, mobile source, dependencies and config remain unchanged. Previous untracked preflight evidence is preserved. No automatic Git commit or GitHub push was requested/performed.

## Remaining work and review gate

No deployment blocker was found after the successful catalog checks. This is schema/ACL verification, **not real signed-JWT security testing**. Auth users were not created; public controllers, bootstrap workflows, cross-tenant/site requests, verification channels, old-token membership revocation, last-owner races and hosted recovery were not exercised with actual identities. Prior local simulated tests remain separate historical evidence.

Please review this deployment before authorizing real Auth/JWT/RLS tests. Mobile backend connection, operational APIs/adapters, invitations and subsequent features remain outside this deployment. Applied migration files must not be edited; future schema changes require reviewed forward migrations. No reset/repair, broad privilege workaround or automatic retry is proposed.
