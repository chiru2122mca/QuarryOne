# QuarryOne V0.4.2B2.1 — Permission compatibility proposal

## B2.2 implementation status — 2026-10-15

The user approved Option A for local implementation/testing. Both helpers are now implemented in the access draft and its byte-identical promoted copy. request_user_id is executor-owned, invoker/stable, and mirrors the freshly inspected hosted scalar-subject → JSON-subject precedence. Missing/empty/malformed values return NULL; this deliberately fails closed rather than exposing auth.uid()'s malformed-input cast errors. require_verified_request_user remains postgres-owned, definer/stable, calls provider auth.uid() directly, reads only the four approved Auth fields, returns only UUID and raises 42501 for invalid/missing/unverified/anonymous accounts. Unknown/null anonymous status fails closed with IS FALSE.

All operational identity references now use request_user_id. Bootstrap uses only the trusted verification helper. Direct executor Auth grants were removed. Exact signature manifests (8 functions after access, 31 after onboarding) and final ACL/schema assertions preserve the trusted-owner exception and reject unexpected private functions or controller overloads. The stable postgres role receives explicit SET true / INHERIT false membership in the restricted executor; onboarding explicitly SET LOCAL ROLEs to executor for app DDL, then postgres for final checks. It does not RESET ROLE to a possibly transient session login. No provider role attributes or Auth objects are changed by application SQL.

The local harness now applies migrations through a non-superuser CLI-like login that SETs the non-superuser postgres role. Its Auth usage/uid grant options are absent, required Auth column reads exist, and API defaults deliberately start permissive. Fresh validation passed: 53 application tests, 185 SQL assertions (144 existing plus 41 permission assertions), eight non-superuser process checks, eight concurrency scenarios, rollback checks and principal rejection. The proposed helpers are locally tested; hosted DDL/runtime and real JWT security remain unverified. No Docker, hosted DDL, push/dry run or mobile integration was performed.

The approved Mumbai project's read-only 2026-10-15 snapshot confirms PostgreSQL 17.11, absent history/application schema and the unchanged auth.uid() definition. Revised hashes, old hashes and test evidence are in [verification/v042b22](../verification/v042b22/README.md). Current SQL implementation awaits review; migration execution remains disabled. The original B2.1 proposal below is preserved as historical design evidence; statements that helpers do not exist or are untested apply to that earlier milestone only.

Investigation/design only, 2026-10-14. Baseline: clean main at `3b1f2e4`. Target: `vfwdcrptpawfsiaqumjb`, Mumbai/ap-south-1. This document proposes changes for review; it does not approve or implement them. All three drafts, promoted SQL files, config, promotion hashes and mobile code remain unchanged. No remote command was needed: this investigation uses the same-day B2 catalog evidence, avoiding even the CLI's provider login-role initialization. No deployment, hosted permission change, Auth-user creation or Git push occurred.

## Root cause and observed privileges

The blocker is **delegation**, not postgres's ability to read Auth itself. Hosted postgres is not a superuser. Its existing Auth usage/read permissions do not authorize granting every required privilege to a new non-inheriting role. This is a metadata-based finding: no failed remote GRANT or migration was executed.

| Resource | B2 postgres capability | Delegation | Consequence |
| --- | --- | --- | --- |
| auth schema | USAGE; no CREATE | USAGE WITH GRANT OPTION false | Cannot establish the reviewed executor schema usage through ordinary postgres GRANT. No PUBLIC usage or executor role exists. |
| auth.users four columns | SELECT, REFERENCES | SELECT WITH GRANT OPTION true | Narrow column reads could be delegated, but remain unusable without schema access. FK creation by the migration principal is separately supported at the metadata level. |
| auth.uid() | EXECUTE | EXECUTE WITH GRANT OPTION false | The explicit executor EXECUTE grant is unavailable under observed ACLs. PUBLIC already has EXECUTE, but execution also needs schema usage. |
| public | USAGE, CREATE | App-owned objects can be governed by their owner | Useful for ordinary migrations; not proof of future private-schema creation or provider ownership rules. |
| roles | CREATEROLE; existing postgres has BYPASSRLS | Cannot infer arbitrary owner/grant rights | Do not add privileges to the executor or inherit provider/API roles to bypass the problem. |

auth is owned by supabase_admin; auth.uid() by supabase_auth_admin. B2 explicitly showed postgres cannot SET ROLE to supabase_auth_admin. No such ownership transfer or provider-owned object modification is proposed. The function-level unavailable grant identified here is auth.uid() EXECUTE; there is no evidence about grant options on unrelated Auth functions, and the application does not require them.

Sources: [B2 hosted metadata](../verification/v042b2/hosted-preflight.json), [exact Auth ACL checks](../verification/v042b2/auth-grant-prerequisites.json), PostgreSQL 17 [GRANT rules](https://www.postgresql.org/docs/17/sql-grant.html), and Supabase's [managed postgres limitations](https://supabase.com/docs/guides/database/postgres/roles-superuser). Provider-specific privilege overrides are untested; do not assume they make a missing grant option safe.

## Exact Auth dependency map

| SQL object | Direct dependency | Why |
| --- | --- | --- |
| public.profiles.id FK (foundation) | auth.users(id) | Referential integrity; not a runtime Auth lookup by operational functions. Keep the FK. |
| quarry_private.is_member(uuid) | auth.uid() | Active organization membership. |
| quarry_private.is_admin(uuid) | auth.uid() | Active Owner/Admin membership. |
| quarry_private.can_access_site(uuid,uuid) | auth.uid() | Active organization and site scope. |
| quarry_private.can_view_profile(uuid) | auth.uid() | Self/shared-organization profile access. |
| quarry_private.can_read_customers(uuid) | auth.uid() | Allowed organization role. |
| membership_read / site_membership_read policies | auth.uid() | Self-record visibility. These run under authenticated, which already has Auth usage; their direct calls are not themselves the executor blocker. |
| quarry_private.require_admin(uuid) | auth.uid() | Membership recheck after acquiring tenant lock. |
| quarry_private.audit(uuid,text,jsonb) | auth.uid() | Actor identity, independent of SECURITY DEFINER current_user. |
| public.bootstrap_organization(uuid,text,text) | auth.uid(), auth.users | The sole direct user-row lookup: require an existing, verified, non-anonymous current user before fixed Owner bootstrap. |
| public.set_organization_member(uuid,uuid,text,text,boolean) | auth.uid() | Actor role check; target user is not accepted as actor identity. |

All six public controllers transitively use these checks. Other triggers/numbering helpers do not directly read Auth. Changing only bootstrap's user lookup would therefore leave executor-owned identity calls broken.

The current executor needs schema usage, auth.uid() execution and four user-column reads, plus its app schema/table/function privileges. Under the recommendation below it needs **none of those direct Auth privileges**: just app-owned identity-helper execution and execution of one trusted verification bridge. Its existing table ownership, scoped policy predicates, locks and controlled writes remain intact.

## Alternatives

| Option | Security / RLS | Required changes and checked prerequisites | Complexity / maintenance | Assessment |
| --- | --- | --- | --- | --- |
| A: narrow Auth bridge, restricted operational owner | Only a tiny read-only helper runs with existing postgres privileges. Operational RPCs/predicates stay executor-owned. Keep authoritative database membership checks and fail-closed bootstrap. | Introduce current-request identity and verified-user helpers; replace executor Auth calls; remove ungrantable Auth grants; preserve bridge ownership in both transfer loops. B2 confirms postgres already has Auth usage, required reads and uid execution; no Auth grant delegation needed. Creating/owning the helper and role transfer still require approved DDL validation. | Moderate SQL/test change, low runtime complexity; maintain exact identity semantics and helper ACL/owner checks. | **Recommended, conditional on approval and ownership validation.** |
| B: different owner | Keeping all operational definers under postgres would give their code a broader effective privilege boundary. A fresh narrow Auth-reader owner would be better isolated but encounters the same schema delegation blocker. Invoker-only membership predicates risk recursive RLS and cannot perform controlled writes without a new design. | All-postgres removes transfers but changes the trust model substantially. A new reader role needs a provider-supported exact Auth grantor path not evidenced here. Giving executor membership in authenticated/service_role adds unrelated capabilities and is rejected. | Either simple but broad, or significant RLS/grant redesign with provider coordination. | Do not adopt as a quick fix. A dedicated reader could supersede the postgres bridge only after its exact privileges are demonstrably obtainable. |
| C: server-side verification / Edge Function | Auth service verification can validate the current token/user. DB must still enforce tenant/site/role, fresh revocation and last-owner rules. A service-role call with caller-provided actor ID alone is unsafe. | New server endpoint, approved Auth API verification, restricted DB ingress and non-forgeable actor binding; prevent direct RPC bypass and replay. No privilege path/service runtime has been validated or approved. Current service_role intentionally lacks mutation/controller shortcuts. | Highest complexity: secrets, deployment, availability, logging, attestation/replay, rate limits, cross-service consistency and incident maintenance. | Future fallback if a narrow database bridge is disallowed. Not a validated substitute or an invitation to grant broad service-role writes now. |

Supabase documents [SECURITY DEFINER search-path and function grants](https://supabase.com/docs/guides/database/functions) and [Edge authentication](https://supabase.com/docs/guides/functions/auth). Those patterns do not prove either alternative's hosted execution. No candidate implementation has been created or tested in this milestone.

## Recommended architecture: Option A with two distinct helpers

| Proposed object | Owner / execution | Contract / callers |
| --- | --- | --- |
| quarry_private.request_user_id() RETURNS uuid | quarryone_executor; SECURITY INVOKER, STABLE, empty search_path | Read only trusted request settings using the observed auth.uid() precedence (request.jwt.claim.sub, then request.jwt.claims sub). No Auth schema access. Executor and the specific authenticated policy paths may execute it. No identity argument or privileged owner is needed. |
| quarry_private.require_verified_request_user() RETURNS uuid | Stable existing postgres; SECURITY DEFINER, STABLE, empty search_path | Resolve the current request UUID directly through provider-owned auth.uid() and read only its auth.users row: id, email_confirmed_at, phone_confirmed_at, is_anonymous. Return that UUID only if the row exists, is non-anonymous and has a verified channel; otherwise raise 42501. EXECUTE only to executor and owner. No user-ID/email argument, arbitrary lookup, writes, dynamic SQL or operational table reads. |

The identity helper is not token verification. PostgREST must authenticate/validate the JWT before supplying request context, exactly as with auth.uid() today. Direct SQL connections can set custom GUCs and are outside this client boundary; never grant clients SQL login or a claims-setting RPC. Missing/empty/invalid UUID or malformed claims must fail closed, never fall back to a caller argument, session_user/current_user, user_metadata or an owner/service identity. A parity test must compare the helper with the deployed auth.uid() semantics.

The privileged bridge must not call an executor-owned identity resolver: deriving its UUID directly with auth.uid() avoids trusting lower-privilege replaceable code for its Auth read. Only bootstrap requires verified-channel/non-anonymous lookup today. Replace its initializer/inline Auth query with the trusted helper result before any profile/organization writes or idempotency return. Preserve its payload matching, advisory lock, fixed OWNER/ALL_SITES assignment, current membership recheck and transaction atomicity. Do not silently extend email/phone verification rules to unrelated operational modules; user deletion still meets the existing FK/history constraints.

The verification bridge intentionally uses an **already privileged** stable postgres owner. No role receives a new BYPASSRLS or superuser attribute, and no operational controller gains postgres ownership. This still creates a small privileged code boundary requiring explicit review. Compromise of that helper's body/owner is serious even though its approved contract is read-only. Keep its schema unexposed, owner writable only by trusted migration administrators, fixed qualified references and restrictive EXECUTE ACL. Return neither Auth rows nor account attributes. Do not use it as a generic query or tenant authorization oracle.

The executor cannot access Auth directly or replace the postgres-owned bridge. Audit uses request_user_id(), preserving the end user's actor ID across nested definers. Membership revocation, tenant/site isolation, post-lock authorization rechecks, last-owner constraints and audit immutability remain database checks under the existing operational owner. Existing ownership bypass on its own tables remains the reviewed mechanism; no broader RLS bypass is introduced.

## Ownership compatibility finding

The transfer design is **conditionally compatible**, not hosted-proven. PostgreSQL requires the current owner to have SET ROLE access to the target role, and the target to have CREATE on the containing schema; see [ALTER FUNCTION](https://www.postgresql.org/docs/17/sql-alterfunction.html). The drafts grant executor CREATE on app schemas, but currently rely on `GRANT quarryone_executor TO CURRENT_USER` and a local migration superuser. No hosted executor exists to inspect.

PostgreSQL 17 non-superuser CREATEROLE behavior and [createrole_self_grant](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-CREATEROLE-SELF-GRANT) must not be mistaken for guaranteed SET membership. Creator administration and SET/INHERIT options differ; a bare grant can retain existing membership options. The proposed migration must explicitly establish and assert SET access for stable postgres, without giving application clients membership or relying on automatic inheritance. Prefer explicit SET true / INHERIT false for the trusted migration principal, plus narrowly explicit helper EXECUTE grants. No role attribute changes to provider roles are needed.

Require the migration's effective current_user to be postgres before creation; reject an unexpected transient CLI principal rather than assigning permanent bridge ownership to it. The observed query session is postgres and cli_login_postgres has SET access to postgres, but actual migration-session identity is still unknown. Provider restrictions or defaults could still block function creation/ownership changes; they require an approved hosted DDL test, not speculation from role flags.

Both access and onboarding currently iterate **all** private functions for ownership transfer. They would overwrite the bridge's trusted owner. Replace blanket transfer with an explicit reviewed signature/owner manifest: ordinary app functions → executor; the single verification bridge → postgres. Reject unexpected private functions/signatures, verify final proowner/prosecdef/proconfig/ACLs and avoid signature-name/overload confusion. Keep table-owner behavior unchanged. No Auth-owned object is transferred.

## Exact migration changes proposed for approval

### Foundation: 20261013000000_foundation.sql and corresponding draft

- Add an early fail-closed deployment-principal prerequisite (effective postgres, expected managed-role attributes) before DDL, with a matching non-superuser local migration test model. This is a proposed guard, not implemented here.
- Keep profiles→auth.users FK and every operational table, composite FK, numeric expression, provenance, status, audit and number constraint unchanged. No Auth schema object is created or altered.

### Access/RLS: 20261013000001_access.sql and corresponding draft

- Keep the restricted executor attributes. Replace CURRENT_USER-dependent membership with explicit stable-principal SET authorization and catalog assertions; no API/client membership.
- Remove all three direct executor grants on auth schema, the four auth.users columns and auth.uid(). Do not alter provider Auth grants.
- Create the two proposed helpers before dependent functions/policies. Explicitly pin verified-request helper ownership to postgres. Restrict its ACL immediately, and grant only executor execution. Give identity-helper execution only to the roles needing the specified policy/bridge paths.
- Replace auth.uid() references in the five predicates and the two membership policies with request_user_id(); preserve every existing membership/role/site condition and SELECT-only policy.
- Replace the function-owner loop with the explicit manifest and owner checks. Preserve existing table transfers. Ensure the five current predicate EXECUTE grants and the one new identity-helper grant survive final revokes; do not grant authenticated access to the verification bridge.

### Controlled onboarding: 20261013000002_controlled_onboarding.sql and corresponding draft

- public.bootstrap_organization(uuid,text,text): require_verified_request_user() supplies v_user; remove direct auth.users read and direct uid initialization. Do not add an actor parameter.
- quarry_private.require_admin(uuid), quarry_private.audit(uuid,text,jsonb), public.set_organization_member(uuid,uuid,text,text,boolean): use request_user_id() for the actor. Keep locking/rechecks/role restrictions intact.
- Ownership manifest must preserve the bridge's postgres owner and ordinary executor ownership. After blanket private-function revokes, explicitly restore only the intended identity/predicate grants; assert executor-only verification-helper execution, safe search paths and no API role membership.
- Keep the other five controllers, production completeness, owner/deferred triggers, block numbering, revision lifecycle and history protection unchanged except dependent helper resolution.

The helper contracts are design interfaces, not implementation SQL. Neither proposed helper exists today. No approved SQL file has been edited.

## Fingerprints and promotion metadata after approval

1. Obtain explicit architecture/SQL implementation approval. Preserve B2/B2.1 reports as historical evidence.
2. Implement the reviewed changes in the draft sources and the corresponding **unapplied** migration files together. Do not change an applied migration; recheck hosted history immediately beforehand. If any proposed version was applied elsewhere, stop and plan new forward versions instead.
3. Record a full source/target diff, reasons and old/new normalized-LF SHA-256 for each changed file. Foundation guard would change its hash too. Prove each promoted file matches its revised source byte-for-byte, or document every deliberately approved difference.
4. Update database/promotion-plan.json with revised fingerprints, approval provenance, status and fresh validation evidence. Do not mark deployed/compatible based only on local tests. Candidate versions may stay only if still unapplied and conflict-free.
5. Keep migration execution disabled until the next explicitly approved dry-run/deployment preparation gate. No stale B2 fingerprint or success report should validate new SQL.

## Fresh checks executed in B2.1

- TypeScript and ESLint passed.
- 53 existing application tests passed, 0 failures.
- Unchanged native PostgreSQL 17.11 harness: 144 SQL assertions, four non-superuser authorization checks, eight concurrency scenarios, duplicate-apply safety and failed-DDL rollback passed. Scratch server stopped.
- All three original draft hashes and promoted byte copies remain unchanged.

The harness output path alone was redirected in memory to verification/v042b21. It tests the **existing blocked design** with synthetic Auth and a scratch migration superuser. These results do not validate the new helpers, non-superuser role ownership or signed-JWT isolation. No proposed helper tests or live security tests were run. No new hosted query was required; previous same-day catalog observations are retained as evidence, not a fresh live permissions snapshot.

See [B2.1 validation evidence](../verification/v042b21/README.md).

## Step-by-step implementation and hosted verification plan

1. Review this recommendation and explicitly authorize implementation only. Confirm acceptance of the single trusted postgres-owned read boundary, helper identity semantics and stable migration-role assertions.
2. Implement the approved manifest/helper changes locally; update checksums and promotion review as above. Add a realistic non-superuser migration principal to the local tests with observed Auth schema/function grant restrictions, rather than relying on superuser DDL success.
3. In that local model prove old schema/uid delegation is unavailable, the bridge uses only its pre-existing reads, executor cannot use Auth directly, role SET/ownership transfers succeed and helper ACLs survive both migrations' revoke/transfer phases. Test no JWT, malformed/empty claim, absent/deleted user, unverified and anonymous users, verified email/phone users, and stale channel changes. Verify issuer/gateway identity boundary separately; GUC simulation is not signed-token verification.
4. Test the bridge's null/failure contract, no caller-supplied victim UUID, no account metadata leakage, no dynamic search-path hijack/overloads and denial to anon/authenticated/service_role. Test identity parity and audit actor across nested definers. Run all old tenant/site/role/revocation/last-owner/bootstrap retry/concurrency/rollback tests unchanged in intent.
5. With explicit authorization, refresh read-only target/version/history/Auth/ACL/principal evidence for this exact Mumbai project. Verify CREATE on database/private schema, ability to create a postgres-owned function, and role membership/owner prerequisites. Stop on any drift. Do not query other projects or use admin keys as user identity.
6. Run the pinned CLI dry run with --linked --dry-run --skip-vault only after the implementation/prerequisites are approved. Confirm pending order and no conflicts. It still cannot validate actual ownership or SQL execution.
7. Obtain separate explicit hosted-development DDL/deployment approval. Under a known postgres effective principal apply/rehearse the reviewed changes, inspect all resulting owner attributes, memberships (including SET), schema/table/column/function ACLs, search paths, RLS and history. Verify executor Auth access is denied and bridge execution is restricted before enabling any consumer. On warnings/failure stop, inspect actual effects and use reviewed recovery; do not repair/reset to hide problems.
8. Obtain separate Auth test-user authorization. With real signed tokens exercise two organizations, site-limited users, revocation using an old valid token, unverified/anonymous/expired/forged tokens, bootstrap spoofing/retries and owner-removal races through REST/RPC. Verify the private helpers are not Data API endpoints and the existing public RPCs cannot bypass checks. Audit actor must equal the end user, not postgres/executor.
9. Record tested vs pending behavior and request review before mobile integration. Backend adapters, invitations, stage saves and operational write endpoints remain out of scope. No Docker testing is presumed after the explicit B2 decision.

Remaining risks include provider Auth/default-grant drift, function privilege overrides, exact CLI migration identity and transaction/history handling, replacement of the privileged helper by a compromised migration admin, request-claim parity over future platform upgrades, and live revocation/concurrency behavior. They cannot be resolved merely by a proposal or a dry run.
