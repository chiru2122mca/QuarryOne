# Migrations enabled — approved development dry run

2026-10-15. Started on main at 27dddf7 with only the previous verification/final-preflight evidence untracked. Preserved it. Exact link and authenticated target identity verified: quarryone-dev, vfwdcrptpawfsiaqumjb, ap-south-1, ACTIVE_HEALTHY. CLI version 2.120.0 verified.

Only tracked configuration change: supabase/config.toml [db.migrations] enabled false → true. Other config values, comments, Auth/API/security settings, reviewed SQL, promotion metadata, application code and dependencies remain unchanged. The three normalized-LF hashes match the reviewed plan; source/promoted files remain byte-identical.

Executed:

```text
supabase db push --linked --dry-run --skip-vault --output-format json
```

Exit 0, dryRun true, upToDate false. Exactly these pending migrations, in order:

1. 20261013000000_foundation.sql
2. 20261013000001_access.sql
3. 20261013000002_controlled_onboarding.sql

No unexpected versions, seeds or roles files were planned; no migration-history conflict/error was reported. Structured result is saved in dry-run.json and matching hashes/target are in verification.json. The additional output-format flag changes reporting only.

The actual SQL execution principal and managed-platform role/function ownership compatibility remain unverified until execution. This planning-only success is not proof that all DDL, RLS, grant or explicit transaction/history operations will succeed. Earlier read-only metadata and local non-superuser tests are supporting evidence, not hosted execution tests.

No actual push, hosted application objects/permissions/Auth-setting changes, reset, repair, test users or GitHub push occurred. The CLI provider-login lifecycle remains distinct from explicit application DDL, as recorded in prior preflights.

Commit only the single-line configuration change after local validation. Preserve both verification directories untracked. After reviewing this result, obtain explicit deployment approval before running the proposed command from this repository:

```powershell
$approvedRef = 'vfwdcrptpawfsiaqumjb'
if ((Get-Content -LiteralPath 'supabase/.temp/project-ref' -Raw).Trim() -ne $approvedRef) { throw 'Stop: linked project mismatch' }
npm exec --yes --package=supabase@2.120.0 -- supabase db push --linked --skip-vault
```

That deployment command has **not** been executed. Stop on any unexpected error and inspect actual history/objects; do not reset/repair or broaden privileges. Local TypeScript/ESLint results are recorded separately after completion. Application/SQL suites were not rerun for this single boolean config change; their B2.2 results remain historical.
