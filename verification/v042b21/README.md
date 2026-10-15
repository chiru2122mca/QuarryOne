# V0.4.2B2.1 investigation evidence

Date: 2026-10-14. [Permission architecture proposal](../../docs/SUPABASE_PERMISSION_RESOLUTION.md) contains the root cause, exact dependency/object map, alternatives, recommendation, migration impact and remediation/hosted-test plan.

Fresh existing checks passed: TypeScript, ESLint, 53 application tests, 144 local SQL assertions, four non-superuser authorization checks, eight concurrency scenarios and both duplicate-apply/failed-DDL rollback checks. The scratch PostgreSQL 17.11 server stopped. The unchanged harness was loaded with only its report output path redirected in memory to this directory. Its tests use synthetic Auth and a scratch superuser; they validate existing behavior, not the proposed helpers or hosted grant compatibility.

The proposal uses existing same-day [B2 hosted metadata](../v042b2/hosted-preflight.json) and [Auth grant evidence](../v042b2/auth-grant-prerequisites.json). No new hosted command/query, DDL, grant, role change, configuration change, user creation, dry run or migration deployment was performed in this investigation. No proposed helper was implemented or tested. No Docker, mobile changes, dependency changes or Git push.

All original SQL drafts, promoted migration files and promotion metadata are unchanged. Hash/copy checks are recorded in local-results.json. The proposal and these new evidence files are left uncommitted for architectural review; no local commit was requested for this milestone.
