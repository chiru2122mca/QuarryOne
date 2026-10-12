# QuarryOne V0.4.1.1 local database proposals

These files are architecture drafts, not a configured Supabase project. Review the four documents under `docs/` before any future integration. No files are placed in `supabase/migrations` and no application source uses this schema.

Apply order for the isolated local test harness:

1. `tests/00_auth_stub.sql` — local-only synthetic identities, roles and assertions; never deploy to Supabase.
2. `drafts/202610100001_foundation.draft.sql` — core tables and tenant constraints, fail-closed permissions.
3. `drafts/202610100002_access.draft.sql` — read RLS based on memberships, not UI settings.
4. `drafts/202610100003_controlled_onboarding.draft.sql` — transactional onboarding prototypes and invariant guards.
5. `tests/10_foundation.sql` — original foundation regressions updated to six-digit durable numbering (mobile generator unchanged).
6. `tests/20_hardening.sql` — opening-date/provenance, number retention/UUID reservations, ownership/grants, privilege escalation, review snapshots and audit regressions.

Run `node scripts/verify-database-drafts.cjs` from the repository. Requires PostgreSQL 17 binaries; `QUARRYONE_PG_BIN` can override their directory. The runner initializes a fresh temporary cluster on a loopback-only random port, tests transactional and concurrent behavior plus non-superuser API-like roles, and shuts down. It never connects to an existing database or Supabase. Hardening logs/results are in `verification/v0411/`; original milestone evidence is preserved in `verification/v041/`.

Migrations are one-time versioned transactions; duplicate application fails safely. Bootstrap has an idempotency key, site creation has same-code retry semantics, and configuration transitions use expected revisions. Stage-specific save APIs, verified invitations, operational-write RPCs and adapters are future implementation contracts. Client tables are read-only in this draft.

No live deployment or Supabase Auth/RLS verification has occurred. Keep all files local and wait for architectural review before configuring Supabase.
