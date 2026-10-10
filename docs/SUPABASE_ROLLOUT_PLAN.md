# QuarryOne V0.4.1 — Supabase rollout plan

Current gate: architectural review. No Supabase project has been created, connected or deployed. No Auth client, production dependency, persistent store or application integration is included. Never run `supabase db push` for these drafts.

## Local artifacts and verification

The four architecture documents and three versioned SQL drafts define the foundation. `database/tests/` supplies a synthetic Auth schema and executable PostgreSQL assertions. `scripts/verify-database-drafts.cjs` creates its own temporary PostgreSQL cluster, listens only on loopback on a fresh port, applies the drafts, runs tests and shuts down. It does not discover or connect to an existing server, read Supabase credentials, or use the Supabase CLI. Temporary cluster/log files remain local outside Git.

Run `node scripts/verify-database-drafts.cjs`. PostgreSQL 17 binaries must be installed; optionally set `QUARRYONE_PG_BIN` to their directory. The current Windows environment provides PostgreSQL 17.11. The runner records actual results in `verification/v041/database-results.json` and a test transcript, including any failed/unavailable checks. Local test roles and `auth.uid()` are stubs; passing these tests is local PostgreSQL validation, not live Supabase Auth/RLS verification.

Also run `npm run typecheck`, `npm run lint`, `npm run test:domain`. Existing 53 domain/store/Production/Inventory tests must pass. Verify the diff excludes application source, dependencies, fixtures, mock store, UI and navigation changes. Browser/device retesting is not claimed for this architecture-only milestone.

V0.4.1 final local results: PostgreSQL 17.11 applied all three drafts; 91 SQL assertions, safe duplicate/failed-migration checks and five concurrent-operation checks passed. The scratch server was stopped. TypeScript, ESLint and all 53 existing automated tests passed. Real Supabase Auth/JWT/RLS, pgTAP on a Supabase target, invite delivery, Data API schema exposure and production query performance remain untested; no deployment is claimed.

## Review before configuring a project

1. Approve tenant/site boundaries, catalog limits, block-number scope/capacity, opening stock provenance and precision handling.
2. Approve required onboarding fields, lifecycle, single/multi mode guard and site archive/history rules.
3. Approve role matrix, customer privacy, invitation acceptance, owner transfer and retained identity/audit policy.
4. Review all SECURITY DEFINER functions, owner privileges, search_path, EXECUTE grants, RLS helper recursion and concurrency tests.
5. Review remaining contracts not implemented in SQL: stage saves, invitations, site activation/archive, profile editing and operational adapters/RPCs. No generic write bypass is permitted to fill these gaps.

Only after explicit review/authorization, plan a separate sandbox Supabase milestone. Convert approved drafts to real migration versions with an applied-version ledger; confirm target Postgres/Auth column compatibility and trusted migration ownership. The current drafts use one-time transactional application and intentionally fail on duplicate schema application. Do not use IF NOT EXISTS to conceal drift.

## Future sandbox rollout — not executed

- Create an isolated development project, configure verified Auth channels and redirects, and keep server-only credentials outside the app.
- Apply reviewed migrations to a disposable local/staging target first; verify least-privilege default grants. Do not expose `quarry_private` in Data API schema settings.
- Add pgTAP and real signed-JWT tests for anonymous/expired/forged tokens, two organizations, limited site roles, membership revocation, recursive-policy safety and every allowed/denied write path. Supabase's [database testing guide](https://supabase.com/docs/guides/database/testing) describes the future CLI workflow; none of those project commands is run now.
- Verify bootstrap retry/concurrency, no orphan owner/site/block records, revision conflicts, safe mode toggles, lifecycle gates and deployment rollback in staging.
- Implement and test whitelisted stage-save RPCs and verified invitation/outbox flows. Add site activation/archive rules before exposing additional operational sites.
- Introduce a separately reviewed repository adapter for the existing block-store contract; preserve mock mode. Handle numeric strings, current supported catalogs, production idempotency and unavailable network states intentionally.
- Implement secure block-save/opening-import RPCs before any persistent Production write. Test decimal parity, organization-wide numbering, imports and immutable audit history. No temporary direct-write grants.
- Integrate onboarding screens incrementally against approved UI specifications; test 360/390/412px plus actual Android status bars, keyboard, font scaling, tab/session behavior and no cross-tenant data leakage.
- Add future Sales/Dispatch/Collections/Expenses schemas and authorization independently, extending mode-disable/history guards before enabling their writes.

## Release, rollback and acceptance

Use staging migration dry runs, a reviewed forward-fix/backup restoration plan and an explicit release gate. No destructive down migration that discards operating history is proposed. Restrict API grants to disable an unsafe feature without erasing data; do not roll ACTIVE tenants back to DRAFT to simulate a rollback. Test backup restoration in an isolated environment before production use. Preserve catalog/site identifiers during migration/import and reconcile counts/volumes by organization/site/status/origin.

Acceptance for a later persistent launch requires real Supabase Auth/RLS tests, measured query/index behavior, verified server credential isolation, approved invitation/ownership handling, auditable migration history and physical Android validation. Local PostgreSQL success alone is insufficient to claim those passed.

## Open architectural decisions

| Decision      | Proposed default / remaining question                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbering     | Organization/year, BLK-YYYY-NNNN. Is 9,999 per organization/year enough after multi-site growth? Widen only through an explicit domain migration. |
| Catalog       | Current three supported materials and A/B/C retained. Approve extensible material names before updating domain types and import adapters.         |
| Stockyards    | Site-shared by default, optional dedicated pit; enforce dedicated-pit block alignment and forbid incompatible master-data reassignment.           |
| Opening stock | Known original production date and explicit as-of date required. Decide a separate unknown-date provenance model rather than inventing dates.     |
| Preferences   | INR, Asia/Kolkata, FT/CFT defaults; site unit/precision overrides. Decide organization-timezone defaults for future Production entry.             |
| Approvals     | Owner/Admin review and activate; decide whether independent approval is required.                                                                 |
| Access        | Operational roles assigned sites by default; decide customer privacy, accountant consolidation and per-site roles.                                |
| Invitations   | Verified email/phone recipient, single-use expiring token, transactional membership plus outbox; channel/expiry/rate limits require approval.     |
| Retention     | Restrict deletes and retain audit/history. Decide anonymization, draft cleanup and account-erasure rules.                                         |

These are review questions, not requests to configure or deploy Supabase in V0.4.1. Commit locally and wait for architecture review; do not push automatically.
