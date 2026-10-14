# QuarryOne V0.4.2B1 — Mumbai linking and preflight

Checked on 2026-10-14, starting from clean `main` at `4580d62`. The operator explicitly confirmed `quarryone-dev`, reference `vfwdcrptpawfsiaqumjb`, region `ap-south-1` before linking. The authenticated project listing independently returned that exact identity/region and `ACTIVE_HEALTHY`. The previous Seoul project was not targeted.

## Linking and safety

Pinned Supabase CLI **2.120.0** used existing secure authentication successfully; no new login or credential entry was necessary. `link --project-ref vfwdcrptpawfsiaqumjb` exited 0, and ignored `supabase/.temp/project-ref` contains the exact approved reference. Linking metadata is machine-local and is not included in the commit. A different checkout must authenticate and link separately.

No passwords, tokens, connection strings, API keys or user data are included in this handoff. No application dependencies, mobile source, mock behavior or reviewed SQL draft contents changed. No executable migrations were created. The original config is unchanged, with migrations and seeds disabled. No push/reset/repair, config push/pull, Auth-user creation, SQL file execution, application-role DDL or permission changes were performed.

The CLI transport printed `Initialising login role...`; catalog inspection subsequently found the provider-managed `cli_login_postgres` role. There was no pre-link role snapshot, so this report cannot establish whether the provider role already existed or was initialized by the CLI. No explicit CREATE ROLE or ALTER/GRANT was sent by this preflight. Do not mistake CLI-managed authentication lifecycle for proof of zero provider-side effects. The metadata query itself reported `current_user = session_user = postgres`; the principal used by a future migration engine remains unproven.

## Actual hosted findings

| Check | Observation / evidence |
| --- | --- |
| PostgreSQL / connection | **17.11**; linked Management API catalog SELECTs succeeded. This validates that read path, not direct TCP/pooler connectivity or a migration run. |
| Schemas | auth, extensions, graphql, graphql_public, public, realtime, storage, vault. No quarry_private schema. |
| Existing QuarryOne objects | No tables/views in public or quarry_private; public has one routine, the provider automatic-RLS helper. No quarryone_executor role. |
| Migration history | `supabase_migrations.schema_migrations` does not exist, and supabase_migrations is absent. There are no recorded versions to conflict with the three proposed candidates. No migration-history objects were initialized. |
| Migration-list command | Not run: the absent history is established by catalog lookup; no history/bootstrap/repair command was needed. |
| Principal | Metadata SELECT runs as postgres: non-superuser, CREATEROLE and BYPASSRLS. These attributes do not prove role assignment, ownership transfer or future migration-engine identity. |
| auth.users | id UUID, email_confirmed_at and phone_confirmed_at timestamptz, is_anonymous boolean all exist. postgres has SELECT and REFERENCES, plus SELECT WITH GRANT OPTION, on these four columns. REFERENCES WITH GRANT OPTION is false. The drafts need postgres's FK reference access and the executor's limited SELECT, not delegation of REFERENCES. Actual grant/ownership execution remains pending. |
| auth.uid() | Owned by supabase_auth_admin, stable SQL, not SECURITY DEFINER; reads request.jwt.claim.sub / request.jwt.claims. postgres has EXECUTE. With no JWT context it returned null. No actual Auth identity or signed token was tested. |
| Public schema | PUBLIC and anon/authenticated/service_role have USAGE; CREATE ACL entries are pg_database_owner. Drafts explicitly revoke client CREATE and restrict table/function ACLs. |
| Data API | Enabled: a disposable local config comparison with api.enabled=false reported remote=true. No remote change. |
| API schemas | public and graphql_public, versus local public only. quarry_private is not exposed. This is documented drift requiring review, not an automatic configuration change. |
| API extra search path | public and extensions, confirmed using a temporary alternate local search path comparison. quarry_private is excluded. |
| Automatic new-table exposure | **Disabled, operator-confirmed from the Mumbai dashboard during this task.** CLI diff did not report this field even with an alternate local value, so it is not claimed as CLI-verified. |
| Automatic RLS | Enabled provider ensure_rls event trigger, on ddl_command_end, invokes public.rls_auto_enable(). Its SECURITY DEFINER implementation enables RLS for new public tables and catches/logs failures. Metadata confirms installation/enabled state; no test table was created to exercise it. |
| Default privileges | postgres-owned public tables lack automatic SELECT/INSERT/UPDATE/DELETE grants to anon/authenticated/service_role, consistent with the dashboard setting. Residual TRUNCATE/REFERENCES/TRIGGER/MAINTAIN grants remain; supabase_admin defaults are broader. Exposure disabled must never substitute for the drafts' explicit REVOKE ALL and post-deployment ACL checks. |
| Application RLS | Not deployed; no QuarryOne policies/tables exist to exercise. Real JWT/tenant/site/role tests are pending. |

The read-only `config diff` reported three declared changes: API schemas, Auth signup setting and Auth site URL, plus ten remote-only settings. Sensitive values were not retained. The local Auth URL is deliberately a placeholder; do not push this whole local config to align it with hosted settings. No signup/redirect changes are authorized here.

## Draft compatibility and deployment gates

All three normalized-LF SHA-256 fingerprints still match the Stage A promotion plan. Foundation → access → controlled onboarding remains the required order. The target identity/preflight was added to the plan without changing candidate filenames or SQL hashes; the plan remains proposal-only and not promoted.

Hosted 17.11 matches the engine used by Stage A's successful local tests. Generated numeric m³ volumes, composite tenant/site FKs, deferred invariants and SQL syntax have local regression evidence, but were not instantiated remotely. The access draft creates the restricted NOLOGIN/NOSUPERUSER/NOBYPASSRLS executor, grants membership to CURRENT_USER, delegates four Auth-column reads, and transfers table/function ownership. Controlled functions retain empty search paths, explicit execution grants and authoritative membership policies. No compatibility finding justifies weakening those controls.

Outstanding deployment blockers:

1. Rehearse role creation/GRANT/SET ROLE and ownership transfer under the actual pinned CLI migration principal on an explicitly approved disposable Supabase environment. Inspect current_user/session_user inside that run; do not bind durable ownership to a transient provider login role.
2. Rehearse explicit BEGIN/COMMIT draft wrappers with CLI migration-history recording and failure recovery. B1 did not apply anything or test the migration engine. Reconcile target history again immediately before any promotion/application.
3. Review the public/graphql_public exposure drift and all default ACL owners. Verify the exact post-application table/sequence/function privileges and automatic-RLS outcome; do not rely on the dashboard toggle alone.
4. Real signed-JWT/RLS tests for two tenants, restricted sites, revoked memberships with old tokens, bootstrap, escalation, last-owner concurrency and denied client writes require separately approved identities and deployed objects.
5. Stage-save/invitation contracts and mobile six-digit numbering/nullable opening-stock date adapters remain future work. The Android app still uses existing session-only mock state.

## Fresh local validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test:domain`: **53 passed, 0 failed**.
- TOML parse, disabled migration/seed gates, absence of executable migrations, exact local link and all three SQL fingerprints: passed.
- Pinned CLI parsed the config and completed read-only hosted config comparisons.
- Native PostgreSQL suites were not rerun in B1; Stage A's 144 assertions, four authenticator checks and eight concurrency scenarios remain historical evidence, not fresh B1 results.
- No real JWT/RLS tests, direct database connection test, migration execution rehearsal or physical Android tests were performed.

The sandbox offline npm cache was unavailable; the approved pinned CLI ran through the existing external npm cache without dependency changes. Initial `config diff --output json` was rejected; the correct flag is `--output-format json`. An initial composite catalog SELECT failed from shell argument handling; the same metadata-only query passed when arguments were sent directly to the pinned executable. No failed attempt applied SQL changes. Disposable comparison copies held only the non-secret local config; repository config was preserved.

Evidence: [local checks](local-results.json), [hosted catalog](hosted-catalog.json), [hosted privileges](hosted-permissions.json), [config drift](hosted-config-diff.json), [API enablement comparison](api-probe.json), [API search-path comparison](api-enabled-probe.json).

## Recommended V0.4.2B2

Review this handoff and explicitly approve the rehearsal/deployment scope first. Resolve migration-principal/ownership and transaction/history gates on a disposable target. Approve intended hosted configuration separately. Then review promotion of the three fingerprinted files, reconcile history, and approve applying them to this exact Mumbai development reference. After application, verify actual ACL/RLS/ownership and execute real Auth/JWT tests before any mobile integration. Do not push, deploy or advance automatically.
