# QuarryOne V0.4.2 — Supabase development rollout

## V0.4.2 current gate — deployed; hosted security acceptance completed with limitations

On 2026-10-19, the user approved deploying the three fingerprinted migrations to vfwdcrptpawfsiaqumjb (quarryone-dev, ap-south-1). After fresh target/history/hash/dry-run checks, pinned CLI 2.120.0 applied all three versions once with --skip-vault and exit 0. Read-only verification confirmed all 13 public tables with RLS, 31 exact function owner/security/ACL configurations, restricted executor attributes/membership, expected table/sequence privileges, all three history versions and quarry_private exclusion from the Data API/search path. No migration retry, repair, reset, user creation or security workaround occurred.

The [deployment handoff](../verification/v042-development-deployment-20261019/README.md) contains output, assertions, remaining limitations and the review gate. Promotion metadata now records the applied development versions; never edit those applied SQL files. No mobile code or dependencies changed, and no GitHub push occurred. The deployment-only review gate was subsequently superseded by separate user authorization for hosted security acceptance, recorded below. Mobile integration remains a separate review gate. Earlier milestone notes below describe historical preparation/approval boundaries.

## Hosted Auth/JWT/RLS acceptance — completed, four paths not testable

The separately authorized development-only run qone-security-c6aa0df8 completed with **97 PASS, 0 FAIL and 4 NOT TESTABLE** (101 recorded cases). The [acceptance report](../verification/hosted-security-acceptance/README.md), committed as a1cc70d, preserves identities by role, real JWT/API evidence, exact controlled fixture setup, audit checks and limitations. Real password-session JWT checks passed for cross-tenant isolation, site restrictions, old-token membership revocation, role-escalation prevention, direct-write denial and private-schema isolation. No security defect was found in the executed checks; no SQL, Auth security settings, RLS policies or grants were changed.

The four NOT TESTABLE cases remain explicit:

1. **Direct bootstrap with an unverified signed JWT:** Auth refused password login before issuing that JWT. Upstream sign-in denial passed; direct unverified-JWT bootstrap was not exercised and no privileged token or forged claims were substituted.
2. **Authenticated-anonymous JWT bootstrap:** anonymous sign-in returned HTTP 422 / anonymous_provider_disabled. Global Auth settings were unchanged. Unauthenticated no-session bootstrap/read denial separately passed.
3. **Invitation acceptance / membership onboarding API:** not implemented. Authorized privileged membership fixtures supported RLS tests only; they do not prove invitation acceptance.
4. **Production-save / operational inventory endpoint:** not implemented. Direct table-write denial passed; no artificial production or inventory history was created.

Six synthetic Auth identities, two organizations, two sites, five organization memberships and nine immutable audit events remain retained. Client authorization proof used public API credentials plus real user JWTs; privileged Auth administration and membership fixture setup are documented separately. Email/phone verification delivery, missing endpoints, full hosted concurrency/recovery and mobile integration are not established by this acceptance. Review these limitations before separately approving further implementation. The earlier deployment report and preparation matrix remain historical evidence, not current status or claims that every planned scenario passed.

## V0.4.2B2.2 historical gate — Option A implemented locally, review pending

Option A is implemented in all three draft/promoted pairs. The trusted postgres-owned current-request verification bridge replaces direct executor Auth reads; operational identity uses the invoker helper matching the observed Auth claim precedence. Explicit SET-only migration membership, signature ownership manifests and final ACL/schema checks preserve restricted operational ownership. The local migration harness now uses a non-superuser CLI-like session, including explicit restoration to postgres after executor DDL.

Fresh checks passed: TypeScript, ESLint, 53 application tests, 185 SQL assertions, eight non-superuser API/executor process checks, eight concurrency scenarios, wrong-principal rejection and both rollback checks. Read-only hosted metadata confirms absent migration history/quarry_private schema and current auth.uid() semantics on the exact approved Mumbai target. Updated hashes and byte equality are recorded in the promotion plan; prior B2 fingerprints are preserved in historical evidence.

See the [B2.2 handoff](../verification/v042b22/README.md). Local permission compatibility is demonstrated; managed-platform DDL, actual CLI migration identity, transaction/history behavior, effective hosted ACLs and real JWT/RLS tests remain pending. No hosted deployment, dry run, roles/grants/DDL change, Docker or mobile change is authorized/performed. Review this implementation before granting any next preflight/dry-run/deployment scope. Migration execution remains disabled. Earlier milestone notes below are historical.

## V0.4.2B2.1 current gate — permission architecture review

The [permission compatibility proposal](SUPABASE_PERMISSION_RESOLUTION.md) recommends a single trusted postgres-owned, current-user-only Auth verification helper, plus an unprivileged request-identity helper, while keeping all operational controllers/predicates under quarryone_executor. It evaluates alternative ownership and Edge verification paths, maps exact proposed migration changes and records unverified ownership/grant assumptions. Both blanket ownership-transfer loops must preserve the proposed verification helper's trusted owner; operational role SET authority must be explicit.

This is design only. The proposed helpers do not exist; SQL drafts, promoted files, config and promotion fingerprints remain unchanged. Fresh existing application/security/concurrency/rollback checks passed, but do not prove the proposal. No new hosted operation or Git push occurred. Await architecture review before implementing changes, and separate approval before any dry run or deployment. B2's Auth grant blocker remains active.

## V0.4.2B2 current gate — locally promoted, Auth grant blocker

The operator chose native PostgreSQL tests plus the isolated hosted development environment, explicitly skipping Docker/Supabase-stack rehearsal. On 2026-10-14, fresh checks verified the exact Mumbai link/project and PostgreSQL 17.11. No application objects/history were found. Three versioned migration files were promoted locally as byte-identical copies, with reviewed hashes/order preserved; no test stubs were included. Existing local checks passed again: TypeScript, ESLint, 53 application tests, 144 SQL assertions, four non-superuser checks, eight concurrency scenarios and rollback checks.

**Stop before dry run/deployment:** postgres lacks `USAGE WITH GRANT OPTION` on provider-owned auth, required by the access draft's `GRANT USAGE ON SCHEMA auth TO quarryone_executor`. Its Auth-column SELECT grant options exist, but auth.uid() EXECUTE grant option is also absent (PUBLIC execution currently exists). Do not infer grant authority from CREATEROLE/BYPASSRLS or weaken executor/RLS restrictions. No grant, role change or hosted DDL was attempted. A provider-supported minimal grantor strategy requires architectural review. Local migration execution remains disabled.

The [B2 handoff](../verification/v042b2/README.md) records the metadata-based blocker, promoted files, fresh evidence and conditional exact deployment commands. No hosted dry run was executed under the explicit stop-on-incompatibility rule; expected pending files are not a CLI-confirmed pending list. Resolve/review the blocker, revalidate any approved SQL changes and enable local migrations deliberately before a new dry run. Actual deployment still requires separate approval. B1 and Stage A notes below are historical evidence.

## V0.4.2B1 current gate — Mumbai linked, deployment pending

On 2026-10-14 the operator explicitly confirmed `quarryone-dev`, project `vfwdcrptpawfsiaqumjb`, region `ap-south-1`. CLI 2.120.0 independently verified the identity/region and linked this checkout. PostgreSQL reports 17.11; public/quarry_private application tables and migration history are absent. Read-only metadata confirms the required Auth columns, null auth.uid() without JWT, postgres query principal and enabled automatic-RLS trigger. Data API is enabled; exposed schemas are public/graphql_public and extra search path public/extensions. The operator verified automatic new-table exposure is disabled; that toggle is not independently reported by CLI diff. No hosted settings were changed.

The complete [B1 preflight handoff](../verification/v042b1/README.md) separates actual metadata, operator evidence and pending DDL/security tests. CLI-managed login-role initialization was reported by the transport; no explicit role DDL was executed and its prior existence was not established. Metadata-query postgres identity does not prove the future migration principal. Residual default privileges still require explicit revokes and post-application checks. The three SQL hashes are unchanged; the promotion plan now records the approved target, while files remain proposal-only.

Current approval boundary: review B1 before approving any B2 rehearsal, promotion, hosted migration or configuration change. No real JWT/RLS tests, migration-engine transaction/history rehearsal or mobile backend integration have occurred. No pushing is authorized. The Stage A discussion below is retained as historical preparation evidence; its statements that no reference was known describe Stage A only.

## Stage A baseline (historical)

Current gate: review Stage A before authorizing Stage B. Baseline main HEAD was a0c0b76, with a clean tree and three commits ahead of origin/main. Existing history is preserved. The intended hosted development project name is quarryone-dev; no project reference is known or linked, and no Supabase project, hosted user or migration has been created, modified or deployed. No Auth client, dependency, persistent store or mobile integration is added. The reviewed SQL drafts remain unchanged and are not executable CLI migrations.

## Stage A compatibility assessment

Local PostgreSQL success validates SQL on the tested engine and synthetic roles, not the Supabase-managed environment. Supabase's [hosted postgres role is not a superuser](https://supabase.com/docs/guides/database/postgres/roles-superuser); this is a material difference from the scratch-cluster migration executor. No hosted compatibility is claimed.

| Area                          | Reviewed/local evidence                                                                                                               | Pending Supabase verification                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL version            | Drafts apply on 17.11; local config requests major 17; stored generated columns and current SQL syntax parse                          | Inspect actual approved development target version and align config; do not assume every hosted project uses 17                                                                                                             |
| auth.users                    | profiles references its UUID id; executor needs SELECT on id/email_confirmed_at/phone_confirmed_at/is_anonymous                       | Confirm real columns, FK/reference privileges, Auth owner/RLS and permission to grant the exact four columns; synthetic stub is not a production substitute                                                                 |
| auth.uid()/JWT                | Policies/controllers use identity plus authoritative memberships, not user-supplied role claims                                       | Real signed access token, gateway role mapping, null/expired/forged token behavior, verified versus anonymous Auth accounts; do not simulate security by allowing client-set session claims                                 |
| RLS                           | 13 public tables enabled; active organization/site membership and role predicates; four non-superuser local checks                    | Exercise real REST/RPC requests for two tenants/sites; verify effective grants, revocation with old valid JWT and schema exposure                                                                                           |
| SECURITY DEFINER owner        | Explicit NOLOGIN/NOSUPERUSER/NOBYPASSRLS quarryone_executor; empty search_path; owner-based nonrecursive predicates                   | Prove hosted migration principal can create/grant/assume role and transfer ownership without broader bypass; inspect FORCE RLS and effective role membership graph                                                          |
| Function execution            | Six authenticated public controllers and five policy predicates; internal functions denied; permissive-default regression tests       | Check pg_proc ownership/proconfig/ACLs and provider default ACLs after promotion; no unreviewed overload/execution path                                                                                                     |
| Schemas/exposure              | Local config requests public only and excludes quarry_private from exposure and request search path; private tables/grants restricted | Dashboard/effective PostgREST exposed schemas and extra_search_path are independent settings; local file does not configure a hosted project                                                                                |
| Numeric generated volume      | Exact numeric FT conversion, original dimensions, generated finite positive unrounded m³; decimal and underflow tests                 | Target generated-expression behavior, numeric string serialization and client representability; Android adapter is not ready for durable types                                                                              |
| Composite FKs                 | Organization/site keys in parent references; dedicated yard/pit consistency and retained number/UUID registry                         | Verify resulting constraints/unique indexes and same-tenant/site violation cases on target                                                                                                                                  |
| Triggers/deferred constraints | Commit-time owner/production-entry invariants, tenant locks, immutable numbers/dates/audit and concurrent yard tests                  | Target trigger availability, deferred enforcement, READ COMMITTED lock/recheck behavior and migration-owner execution context                                                                                               |
| Transactions/history          | Explicit BEGIN/COMMIT per draft; local duplicate application and failed-DDL rollback tests pass                                       | Pinned CLI's parsing/transaction/history recording with these wrappers must be tested on a disposable Supabase stack before hosted deployment; do not assume its history and SQL commit atomically merely from psql success |

Potential blockers are hosted privilege/ownership capability, real Auth access rules, API exposure/default grants, unknown target version, existing target migration/role history and missing onboarding/write contracts. None is proven to be a defect in the SQL drafts during Stage A, so all three drafts stay untouched. Never weaken RLS/Auth grants or give the executor global BYPASSRLS/superuser to bypass a preflight failure.

An additional migration-principal risk is GRANT quarryone_executor TO CURRENT_USER: the actual CLI principal may differ from the stable postgres role. Inspect current_user/session_user and provider-managed login roles in Stage B before executing DDL. Supabase documents [provider-managed CLI login roles](https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae). Establish an approved stable migration principal and durable reviewed membership; never grant the executor to authenticator/anon/authenticated/service_role or remove provider-managed roles to force compatibility.

## Local CLI/configuration status

CLI was absent from PATH, project dependencies and the offline npm cache. Pinned CLI 2.120.0 was subsequently executed from an ephemeral npm cache installation, with no package.json/lockfile changes. Version/help and local init in a separate temporary directory were executed; no Supabase stack was started. Telemetry was disabled for inspection/init. The generated template supplied the keys/types checked against supabase/config.toml.

The local identifier quarryone-dev is not a hosted project reference. Config explicitly disables migration execution/seeding/self-signup/anonymous sign-ins and optional services, requests PostgreSQL 17, public-only exposure and explicit object grants. No executable migration directory, seed SQL, roles.sql, linking metadata, mobile environment/client or credentials is created. TOML syntax and template key/type checks pass; actual CLI stack startup, engine availability and hosted config remain untested. The Docker executable is installed, but engine health was not queried or started. The pinned configuration is defensive preparation, not authorization to run deployment commands.

CLI prerequisites and documented commands use an ephemeral pinned runner to avoid application dependency changes. [Official CLI installation/configuration guidance](https://supabase.com/docs/guides/local-development/cli/getting-started) requires an appropriate Node/runtime setup; Node 24.21.0 is available here. The [2.120.0 release](https://github.com/supabase/cli/releases/tag/v2.120.0) is the reviewed baseline; re-review upgrades deliberately.

```powershell
# Local-only inspection; these do not log in, link or deploy.
$env:SUPABASE_TELEMETRY_DISABLED = '1'
npm exec --yes --package=supabase@2.120.0 -- supabase --version
npm exec --yes --package=supabase@2.120.0 -- supabase --help
```

Do not re-run init --force over the tracked config. Future local stack commands require a healthy container runtime, port availability and separate Stage B approval. Local config must first be reviewed for actual Auth tests, service needs and migration enablement. Credentials printed by future stack/status/Auth tools must not be committed or placed in mobile public variables. Git ignores .env files, linking/runtime state and signing-key files; no secret values are provided.

## Deliberate migration promotion plan — not performed

database/promotion-plan.json records ordered sources, normalized-LF SHA-256 fingerprints and **proposed** targets. Draft labels use 12 digits; future executable CLI versions use full 14-digit UTC YYYYMMDDHHMMSS names rather than blindly copying draft filenames. The candidates below are valid dates, unique and increasing locally, but are not reserved or confirmed against any hosted history.

| Order | Reviewed source                                              | Proposed future target (absent in Stage A)                   |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1     | database/drafts/202610100001_foundation.draft.sql            | supabase/migrations/20261013000000_foundation.sql            |
| 2     | database/drafts/202610100002_access.draft.sql                | supabase/migrations/20261013000001_access.sql                |
| 3     | database/drafts/202610100003_controlled_onboarding.draft.sql | supabase/migrations/20261013000002_controlled_onboarding.sql |

Dependencies: platform Auth schema/functions and built-in roles must already exist → foundation tables/private bookkeeping/timestamp guards and fail-closed RLS/grants → executor role/ownership and read policies → onboarding controllers/number claiming/invariant triggers and final execution allowlist. These are one-time transactional CREATE scripts, not repeat-safe schema merges. A partially completed group must not be opened to business use until all three versions and verification complete.

Promotion procedure after approval: compare fingerprints and review any differences → verify no conflicting local or authorized target versions/objects/roles → choose fresh approved versions greater than existing history if candidates conflict → review the exact three-file promotion diff without replacing originals → enable migrations in config explicitly → apply first on a disposable real Supabase local/staging environment and inspect CLI history/transaction behavior → test privileges, SQL/REST/JWT scenarios and recovery → approve the hosted development application separately. The [migration workflow](https://supabase.com/docs/guides/deployment/database-migrations) and [CLI reference](https://supabase.com/docs/reference/cli/supabase-init) describe history/version behavior. No drafts, Auth stubs or fixtures are copied into supabase/migrations during Stage A.

Never promote database/tests/00_auth_stub.sql, privileged test helpers or synthetic identities: hosted/local Supabase already has platform Auth roles and functions. Port the assertions to reviewed real-stack test fixtures; do not recreate auth.users or replace auth.uid(). Do not use migration repair/squash/reset to conceal divergence or overwrite applied versions. Existing history is unknown until an approved target inspection, so remote uniqueness remains a gate.

## Future Stage B commands — documented only, not executed

The following are examples for a separately approved session **after** the operator creates/confirms the intended isolated development project, chooses the region/version and supplies credentials through approved secret storage. They are not Stage A instructions to execute. A dry run is still a remote operation, and linking/configuration may create provider-managed state.

```powershell
# Future authorization required. Never put tokens/passwords in this file or Git.
if ([string]::IsNullOrWhiteSpace($approvedDevProjectRef)) {
  throw 'Reviewer-confirmed development project reference required before remote commands.'
}
npm exec --yes --package=supabase@2.120.0 -- supabase login
# Populate this variable from reviewer-confirmed development metadata, never a production target.
# An empty/unreviewed value must stop the session before link/deployment.
npm exec --yes --package=supabase@2.120.0 -- supabase link --project-ref $approvedDevProjectRef
npm exec --yes --package=supabase@2.120.0 -- supabase migration list --linked
# Only after deliberate promotion, compatible role/Auth preflight and local rehearsal:
npm exec --yes --package=supabase@2.120.0 -- supabase db push --dry-run
# Requires a distinct approval of the reviewed target and migration set:
npm exec --yes --package=supabase@2.120.0 -- supabase db push
```

For a future disposable **local** rehearsal, reviewed commands are supabase start, supabase db reset --local --no-seed, supabase db lint --local and supabase test db, through the same pinned runner. None was executed here. Reset is destructive to that local database; identify its ownership and backup first, and never substitute --linked/--db-url. No migration deployment follows automatically from CLI setup or a successful local test.

## Five-stage database/mobile contract readiness

| Capability                  | Existing SQL/model support                                                                | Missing operation before mobile onboarding                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Business/owner registration | bootstrap_organization; verified-identity checks, fixed Owner, full-payload idempotency   | Approved Auth session flow and whitelisted stage-1/save/profile-edit persistence                                        |
| Primary/single/multi quarry | create_quarry_site, set_multi_site; primary FK and safe-mode guards                       | Stage-2 site/pit edit/create persistence, optimistic saves and later site activation/archive/restore                    |
| Pits/benches/yards/catalog  | Scoped tables, supported material names, A/B/C, shared/dedicated yard checks              | Stage-2/3 atomic whitelisted persistence; no generic client table writes                                                |
| Measurements                | FT/M dimensions, unrounded generated m³, CFT/m³ preferences                               | Preference-save and decimal/origin-aware adapter; current mobile uses four-digit mock IDs and required production dates |
| Roles/sites                 | set_organization_member edits existing members; set_site_member manages grants/revocation | Draft invitation/receipt/outbox persistence and verified acceptance; these controllers do not enroll a new user         |
| Review/activation           | transition_onboarding, completeness checks and reviewed_revision                          | Stage-save/review UI and receipt persistence; later additional SETUP sites have no activation operation yet             |
| Opening/numbering           | Unknown opening production_date with required reference; six-digit UUID-bound ledger      | Authorized production-save/opening-import RPCs, source idempotency/provenance/audit and mobile adapter migration        |

The six public SQL controllers are implemented in the drafts; private policy predicates, reserve/allocate helpers and triggers support them but are not client write APIs. The [onboarding architecture](ONBOARDING_ARCHITECTURE.md) defines five stages, whitelists and acceptance contracts; the [schema](DATABASE_SCHEMA.md) and [permission matrix](ROLE_PERMISSION_MATRIX.md) define hierarchy, preferences, lineage and permissions. Stage-save/invitation/site-activation contracts remain future work, with no delivery, UI or backend integration in Stage A.

## Historical planned Auth/JWT/RLS verification matrix — pre-acceptance

Use disposable synthetic business data in the approved development target and real verified Auth identities. Planned identities: A Owner, B Owner, A Site-1 Production Supervisor, revoked A member, unauthenticated anon role; also two Owners for a last-owner race and an authenticated anonymous Auth account to distinguish it from anon. Never reuse real customers/blocks or log access tokens.

| Scenario                        | Planned identity/action                                                                               | Required result/evidence                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner bootstrap                 | Verified A/B Owners call same-key retries and concurrent bootstrap                                    | One tenant/key, fixed Owner/ALL_SITES, payload mismatch denied, no caller role/owner override, audit retained                                                |
| Cross-tenant isolation          | A/B token REST reads and guessed foreign IDs/RPC tenant parameters                                    | Own rows only; other-org rows absent/mutations denied; tenant FKs reject cross-org references through controlled paths                                       |
| Site restriction                | Supervisor assigned A Site-1 queries Site-2 blocks/pits/yards/production                              | Only authorized site data; mode flag never grants permission                                                                                                 |
| Role escalation                 | Supervisor/Admin tries self Owner or other-tenant membership change                                   | Denied; current DB role governs, forged user metadata does not elevate; no changed revision/audit on failure                                                 |
| Membership revocation           | Retain an unexpired signed token, revoke org/site assignment, retry requests                          | Revoked access denied; lingering site grants do not override inactive parent; suspended-parent cleanup remains possible                                      |
| Anonymous/invalid JWT           | No token, expired/forged token, authenticated anonymous or unverified user bootstrap                  | Gateway/role/verification denials; no tenant created; anonymous Auth is tested separately from anon role                                                     |
| Single/multi mode               | A Owner creates primary, races a second site, enables later and attempts unsafe disable               | One primary by default; additional sites need enablement; secondary history/grants prevent hiding access; existing blocks/financial history remain unchanged |
| Last active owner               | Two Owners attempt removal/demotion concurrently                                                      | At least one active Owner remains; Admin cannot manage Owner/Admin memberships                                                                               |
| Review activation               | Incomplete draft, stage/revision conflicts, direct skip, edited review snapshot                       | DRAFT→READY_FOR_REVIEW→ACTIVE only; completeness and reviewed_revision enforced; no partial activation after failure                                         |
| Direct writes/execute           | Authenticated Owner/Supervisor, anon and service credential attempt table/internal writes             | No direct-table or internal-function shortcut; intended RPC/predicate allowlist only; schema CREATE/SET ROLE executor denied                                 |
| Number/opening inventory        | Controlled reserved UUID save/import, unknown historical date, concurrent final slot                  | No duplicate/reuse/stealing; unknown date remains null; opening included in inventory and excluded from new production; 2200H exhaustion                     |
| Concurrent revocation/integrity | Admin waits while revoked; block save races dedicated-yard reassignment                               | Recheck current membership after lock; consistent pit/site constraints; no partial number/block/audit commits                                                |
| Exposure/ownership              | Inspect PostgREST schema/ACLs/role graph and real migration principal                                 | No private API endpoint; restricted executor and fixed search_path; no unexpected default grants/owner bypass exposed to users                               |
| Failure/recovery                | Force controlled-operation failures and rehearse failed promotion/backup restore on disposable target | Transaction/audit consistency, known migration history, preserved IDs/volumes, documented recovery rather than history repair                                |

REST/RPC tests must use real signed-JWT gateway requests, not server admin keys or SET ROLE alone. Local PostgreSQL tests remain valuable for FK/math/concurrency cases but do not validate Auth issuance, token expiry, JWKS/gateway handling, email/phone verification or effective hosted API settings. At the time of this historical plan, user creation, token issuance and all matrix actions were pending Stage B approval. The completed hosted acceptance above supersedes that gate only for its documented scope; it does not establish that every scenario in this broader matrix was executed.

Number/import/production concurrency can initially be rehearsed only through isolated privileged fixtures to test internal invariants. Signed-JWT write tests for those operations are gated on implementing separately reviewed public write RPCs; never grant clients the private number allocator merely to make the matrix executable. The same distinction applies to invitation acceptance and later site activation: their contracts exist, but their live endpoints do not.

## Local artifacts and verification

The four architecture documents and three versioned SQL drafts define the foundation. `database/tests/` supplies a synthetic Auth schema and executable PostgreSQL assertions. `scripts/verify-database-drafts.cjs` creates its own temporary PostgreSQL cluster, listens only on loopback on a fresh port, applies the drafts, runs tests and shuts down. It does not discover or connect to an existing server, read Supabase credentials, or use the Supabase CLI. Temporary cluster/log files remain local outside Git.

Run `node scripts/verify-database-drafts.cjs`. PostgreSQL 17 binaries must be installed; optionally set `QUARRYONE_PG_BIN` to their directory. The current Windows environment provides PostgreSQL 17.11. The hardening runner records actual results in `verification/v0411/database-results.json` and its transcript; the V0.4.1 evidence remains in `verification/v041/`. It tests a restricted non-superuser authenticator as well as privileged fixtures. Local identities and `auth.uid()` are stubs; passing these tests is local PostgreSQL validation, not live Supabase Auth/RLS verification.

Also run `npm run typecheck`, `npm run lint`, `npm run test:domain`. Existing 53 domain/store/Production/Inventory tests must pass. Verify the diff excludes application source, dependencies, fixtures, mock store, UI and navigation changes. Browser/device retesting is not claimed for this architecture-only milestone.

V0.4.1 final local results: PostgreSQL 17.11 applied all three drafts; 91 SQL assertions, safe duplicate/failed-migration checks and five concurrent-operation checks passed. The scratch server was stopped. TypeScript, ESLint and all 53 existing automated tests passed. Real Supabase Auth/JWT/RLS, pgTAP on a Supabase target, invite delivery, Data API schema exposure and production query performance remain untested; no deployment is claimed.

V0.4.1.1 evidence and exact final counts are in `verification/v0411/README.md` and `database-results.json`. Tests now cover retained six-digit UUID reservations, unknown opening dates, executor ownership/privileges, reviewed revisions, revoked access while waiting for a lock, final-slot exhaustion and concurrent yard/block integrity. This is still draft-only; no real migration version has been applied to Supabase.

## Review before configuring a project

1. Approve tenant/site boundaries, catalog limits, block-number scope/capacity, opening stock provenance and precision handling.
2. Approve required onboarding fields, lifecycle, single/multi mode guard and site archive/history rules.
3. Approve role matrix, customer privacy, invitation acceptance, owner transfer and retained identity/audit policy.
4. Review all SECURITY DEFINER functions, owner privileges, search_path, EXECUTE grants, RLS helper recursion and concurrency tests.
5. Review remaining contracts not implemented in SQL: stage saves, invitations, site activation/archive, profile editing and operational adapters/RPCs. No generic write bypass is permitted to fill these gaps.

Only after explicit architectural review, plan V0.4.2 as a separate sandbox Supabase milestone. Before applying anything, confirm PostgreSQL/Auth column compatibility, role-creation/ownership-transfer privileges and the minimal Auth columns needed by bootstrap. Prove the migration operator can create/assume the NOLOGIN executor and that authenticated/anon/authenticator cannot assume it. Inspect Auth.users RLS behavior for the executor rather than weakening it. Convert approved drafts to real versioned migrations; immutable applied versions must never be edited in place. If an earlier foundation has been applied anywhere, author a reviewed upgrade with explicit identity/date reconciliation instead of replaying changed draft versions. Never conceal drift with IF NOT EXISTS.

Recommended sequence after approval: establish an isolated staging target → test role/Auth preflight → apply approved schema/constraints/ownership/RLS/control-function migrations transactionally → verify exact grants and default privileges → exercise real signed-JWT two-tenant/site/revocation scenarios → test review, numbering, opening-stock and rollback/concurrency → implement reviewed stage-save/acceptance contracts → review adapter compatibility and import mapping → obtain a separate release/production approval. No step in this sequence is executed against Supabase in this milestone.

## Future sandbox rollout — not executed

- Create an isolated development project, configure verified Auth channels and redirects, and keep server-only credentials outside the app.
- Apply reviewed migrations to a disposable local/staging target first; verify least-privilege default grants, restricted executor ownership, minimal Auth column grants and no client executor membership. Do not expose `quarry_private` in Data API schema settings.
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

| Decision      | Proposed default / remaining question                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbering     | Resolved: organization/year BLK-YYYY-NNNNNN, 999,999 capacity, retained UUID reservations and explicit exhaustion. Review future adapter/legacy-ID mapping before integration.                              |
| Catalog       | Current three supported materials and A/B/C retained. Approve extensible material names before updating domain types and import adapters.                                                                   |
| Stockyards    | Site-shared by default, optional dedicated pit; enforce dedicated-pit block alignment and forbid incompatible master-data reassignment.                                                                     |
| Opening stock | Resolved: unknown production_date allowed only for OPENING_STOCK; reference date required and supplies number year. Later date corrections and future-reference-date acceptance still need reviewed policy. |
| Preferences   | INR, Asia/Kolkata, FT/CFT defaults; site unit/precision overrides. Decide organization-timezone defaults for future Production entry.                                                                       |
| Approvals     | Owner/Admin review and activate; decide whether independent approval is required.                                                                                                                           |
| Access        | Operational roles assigned sites by default; decide customer privacy, accountant consolidation and per-site roles.                                                                                          |
| Invitations   | Verified email/phone recipient, single-use expiring token, transactional membership plus outbox; channel/expiry/rate limits require approval.                                                               |
| Retention     | Restrict deletes and retain audit/history. Decide anonymization, draft cleanup and account-erasure rules.                                                                                                   |

Remaining deployment risks include provider role/ownership restrictions, actual Auth schema/RLS behavior, signed-JWT/gateway identity binding, default-grant drift, stage-save/acceptance implementation gaps, future adapter support for six digits and nullable origin-aware dates, and operational workload performance. These require real Supabase staging validation and review before V0.4.2. No existing mobile feature is changed and no additional dependency is introduced. Commit locally; do not push or configure resources automatically.
