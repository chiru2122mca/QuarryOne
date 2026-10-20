# Final development preflight — 2026-10-15

**Stopped: the CLI dry run returned an empty migration plan while local migration execution is disabled. Deployment approval is not requested.** No SQL, mobile source, configuration, RLS or grants were modified to bypass this prerequisite.

Started on clean main at 27dddf7. The existing link and authenticated project listing both identify quarryone-dev / vfwdcrptpawfsiaqumjb / ap-south-1, ACTIVE_HEALTHY. Pinned CLI version 2.120.0 verified. No other project was targeted.

Fresh local TypeScript and ESLint checks passed. Existing application/database suites were not rerun for this read-only preflight; their B2.2 evidence remains historical. Git diff confirms reviewed SQL, promotion metadata, mobile source, dependencies and config are unchanged.

## Confirmed checks

- Hosted PostgreSQL 17.11. No migration-history table, quarry_private schema, public application tables or quarryone_executor role exists. The three local versions are expected pending, not recorded as applied.
- All three reviewed normalized-LF SHA-256 fingerprints match; draft/promoted pairs remain byte-identical. See fingerprints.json.
- Metadata query current_user/session_user are postgres. It is non-superuser with CREATEROLE, owns the database, has database CREATE and public schema CREATE/USAGE with grant options. CLI login has SET membership in postgres.
- postgres has Auth schema USAGE, EXECUTE on auth.uid(), and SELECT/REFERENCES on the expected Auth columns. Option A does not require delegating Auth schema/function privileges to executor.
- ensure_rls is enabled and its provider helper enables RLS on new public tables. No DDL was run to exercise it; its implementation catches/logs failures, so this is configuration evidence only.
- Data API enabled. Exposed schemas are public/graphql_public; extra search path is public/extensions. quarry_private is excluded from both. These were rechecked using explicitly read-only config comparisons against temporary local non-secret config copies. Original and hosted config stayed unchanged.

Metadata supports the proposed role-creation and ordinary ownership prerequisites, but does not execute CREATE ROLE, GRANT, SET ROLE or ALTER OWNER on the hosted database. The actual migration session remains unobserved. The prior local non-superuser tests are evidence for SQL behavior, not proof of managed-platform execution.

## Dry run and stop

Executed exactly, using the pinned binary:

```text
supabase db push --linked --dry-run --skip-vault --output-format json
```

Exit 0; JSON included an empty migrations array, with no seeds or roles planned. This is **not** successful validation of the required three-file plan. The repository config still has `[db.migrations] enabled = false`; there was no override, enabling change or retry after finding the empty plan. Do not interpret an empty/up-to-date result as proof that the reviewed SQL was planned or applied.

Expected local order, based on files and absent hosted history:

1. 20261013000000_foundation.sql
2. 20261013000001_access.sql
3. 20261013000002_controlled_onboarding.sql

No recorded version conflict or metadata permission failure was found. The migration-planning prerequisite failed, and the actual migration principal/function ownership execution could not be confirmed. Those checks cannot be reported as passed. Provider-specific role/ownership restrictions and explicit transaction/history behavior remain runtime risks.

## Next action

Review/authorize changing only the local `[db.migrations] enabled` value to true, then rerun the exact-target preflight and require the CLI to report all three expected migrations. Do not modify SQL or hosted privileges to hide a failure. Confirm the actual migration-session principal through a supported read-only mechanism before declaring that requirement passed; a Management API query as postgres is not a substitute.

Only after those gates pass should the exact deployment command be presented for separate approval. No actual database push, reset, repair, hosted application DDL, RLS/grant changes, Auth users, Docker, commit or GitHub push occurred. CLI-managed login transport initialization is subject to the provider lifecycle already documented in earlier milestones; no explicit provider-role mutation was issued.

Evidence files: hosted.json, api.json, fingerprints.json and dry-run-attempt.json. No credentials or Auth user data were retained. These new verification files are left uncommitted; reviewed application/migration/config files remain unchanged.
