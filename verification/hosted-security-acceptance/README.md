# QuarryOne V0.4.2 — Hosted Auth/JWT/RLS security acceptance

Target: **quarryone-dev / vfwdcrptpawfsiaqumjb / ap-south-1 (Mumbai)**. Synthetic run: **qone-security-c6aa0df8**. Start timestamp: 2026-10-19T18:33:30.438Z. All requests were confined to this project and synthetic identities/data.

## Outcome

**97 PASS, 0 FAIL, 4 NOT TESTABLE** across 101 recorded cases. No actual security defect was found in the executed checks. This is a scoped acceptance result, not proof of the four unavailable paths or complete mobile-onboarding readiness.

The evidence records **119 HTTP requests**, including 16 privileged Auth setup/recovery operations and 88 requests bearing real password-session user JWTs. Remaining requests cover password-session issuance and public/unauthenticated Auth/API paths. Case counts also include catalog and read-only observer assertions; they are not all separate client API requests. Direct table mutation tests comprise 39 denials: INSERT, UPDATE and DELETE against each of 13 tables.

No migrations, grants, RLS policies, Auth security settings or mobile code were changed. No inventory/production history was created or deleted. No passwords, session tokens, API keys or service credentials are retained in the evidence. No security fix was implemented.

Local `npm run typecheck` and `npm run lint` both passed (exit 0). The application test suite was not rerun for this documentation-only acceptance task; hosted results above are the checks executed here. See local-checks.json.

## Deployment prerequisite checks

The exact linked project and hosted project identity/region were verified with pinned CLI 2.120.0. Before account creation, the catalog matched all three deployed versions, 13 public tables with RLS, 31 reviewed function signatures/owners/SECURITY DEFINER settings/fixed search paths and intended API EXECUTE grants. No application role was a member of the restricted executor. No unsafe direct mutation grants were found. Effective API schemas excluded quarry_private.

A final read-only comparison found **zero owner/EXECUTE ACL drift** from the approved deployment. These are catalog assertions, separate from the actual user-session REST/RPC tests below. See preflight.json and postflight.json.

## Identities, without credentials

| Identity | Auth UUID | Synthetic application role / retained state |
| --- | --- | --- |
| Owner A | de7f3908-efe1-421b-a64e-d25afbed6330 | Organization A OWNER / ALL_SITES, active |
| Owner B | f6292989-3d26-49a7-b7a5-70fb8225d5a5 | Organization B OWNER / ALL_SITES, active |
| Supervisor A | e4a3d205-2193-4f82-a695-251f3ab0dc98 | PRODUCTION_SUPERVISOR / ASSIGNED_SITES, organization active; A1 site grant revoked by test |
| Revoked Member A | 49edbfd4-3a0d-4039-9814-f9f0e653babf | PRODUCTION_SUPERVISOR / ASSIGNED_SITES, organization membership inactive |
| Admin A | c252ebfd-4eda-4312-8748-eb70f2f9cbf6 | ADMIN / ALL_SITES, active; needed for admin-to-owner escalation negative test |
| Unverified account | a271b124-6b2c-4d73-a5a0-367d4cf45d8d | No application membership/profile; Auth refused password-session issuance |
| Unauthenticated access | No user identity | Public anon key; no user session |

Five synthetic accounts were email-confirmed using the controlled Auth Admin create-user procedure, and one was deliberately unverified. Account names/addresses were synthetic and used a reserved .invalid domain. This tests admin-provisioned verification plus real password sessions, **not email delivery or a user completing an email verification link**. Passwords were cryptographically generated and kept only in process memory. No existing customer/owner/user identity was used.

Privileged service credentials were retrieved into memory through the existing authenticated CLI, used only for synthetic Auth administration, and never used as a client-authorization test identity. Successful/denied business requests used the public anon API key plus the specific user's Auth-issued password-session JWT. Auth /user accepted each signed session and returned the expected synthetic UUID.

## Fixtures and controlled setup

- Organization A: **a452ada3-3539-43e6-9e57-ec0440ea2499**.
- Organization B: **428d6505-e984-4fd4-83b2-f42c649ea7e8**.
- Site A1: **ecedce84-5402-4382-8b39-1fed3b8f383b**.
- Site A2 and idempotency request UUIDs are recorded in results.json.

Owners bootstrapped their organizations and created sites through real signed-JWT RPC calls. The missing invitation-acceptance flow required the explicitly authorized privileged fixture exception: insert only the three synthetic staff profiles and memberships into Organization A, and bump that draft organization's configuration revision. The transaction verified Organization A's exact synthetic business name and Owner A UUID before any write, used SET LOCAL ROLE quarryone_executor, and committed no new role, function, grant or policy. **fixture-setup.json contains the exact scoped SQL and its limitations.**

That administrative fixture setup is not proof of a working client membership-creation/invitation endpoint. Its direct inserts do not fabricate a user audit actor or demonstrate application audit coverage for invitation acceptance. Site grants and subsequent revocations were made through the existing controlled operations using Owner A's actual JWT. No client write grants were added.

## Executed acceptance results

| Area | Result | Evidence / observation |
| --- | --- | --- |
| Verified owner bootstrap A/B | PASS | Each real owner session created its organization with fixed OWNER/ALL_SITES membership. |
| Idempotent retry | PASS | Same request key/payload returned the same UUID for each owner; final observer counted exactly two organizations and two bootstrap receipts. |
| Idempotency mismatch | PASS | Changed payload under the existing key rejected with SQLSTATE 22023; scoped business/audit snapshot unchanged. |
| Bootstrap audit | PASS | Initial events and all nine final application audit records attribute the actual owner of the corresponding tenant. |
| Unverified password login | PASS | Auth refused a session; no verification requirement was disabled. |
| Unauthenticated bootstrap/read | PASS | No-user-session requests denied with HTTP 401 / SQLSTATE 42501. |
| Owner A/B tenant isolation | PASS | Each reads own organization, sees zero rows for the other's UUID and random foreign UUIDs, and cannot create sites under the other's organization. |
| Site restriction | PASS | Supervisor reads A1, cannot read A2 or Organization B. Multi-site mode and subsequent A2 creation do not grant implicit access. |
| Site authorization removal | PASS | Owner A revoked A1 through set_site_member; the same supervisor JWT then saw zero A1 rows. |
| Organization revocation | PASS | Owner A used set_organization_member. The previously issued unchanged JWT remained unexpired and accepted by Auth /user, but could no longer read its organization/site or mutate the tenant. |
| Supervisor self-promotion | PASS | set_organization_member rejected with 42501. |
| Admin self-promotion to Owner | PASS | Rejected with 42501 despite legitimate ADMIN membership. |
| Foreign membership changes | PASS | Owner B could not modify Organization A membership; 42501. |
| Last active Owner | PASS | Removal rejected with 23514. Failed escalation/owner attempts preserved all scoped business and audit snapshots. |
| Direct client writes | PASS | All 13 tables rejected INSERT/UPDATE/DELETE with HTTP 403 / 42501. DELETE requests targeted nonexistent UUIDs; no retained record was deleted. |
| Private Data API exposure | PASS | Explicit quarry_private Content-Profile rejected with 406 / PGRST106; private verification helper absent from public RPC surface (404 / PGRST202). |
| Forged executor-role JWT | PASS | Modifying the role claim while retaining the original signature was rejected with HTTP 401. |
| Executor assumption / execution grants | PASS | Catalog membership checks deny API-role executor membership; exact function ACLs unchanged. No direct client SQL/SET ROLE endpoint was introduced or simulated as HTTP proof. |
| Failed operations / audit integrity | PASS | Full sorted JSON snapshots of scoped organizations/settings/memberships/sites/site memberships/bootstrap receipts/audit records were hashed before and after failed attempts; hashes matched. Final audit attribution also matched tenant owners. |

Every HTTP record in requests.json identifies its authentication context and status/code without headers, bodies containing credentials or tokens. Read requests record row counts. results.json preserves the case verdicts and non-secret fixture IDs. Privileged observer snapshots validate integrity; they are **not** substituted for the client isolation/read results.

## NOT TESTABLE — explicit limits

1. **Direct bootstrap with an unverified signed user JWT:** Auth correctly refused password login before issuing that JWT. No admin token, synthetic claim setting or weakened verification requirement was substituted. The upstream sign-in rejection itself passed.
2. **Authenticated-anonymous JWT bootstrap:** ordinary anonymous sign-in returned HTTP 422 / anonymous_provider_disabled. Global anonymous Auth settings were left unchanged. Unauthenticated no-session bootstrap/read denial was independently tested and passed.
3. **Invitation acceptance / membership onboarding API:** not implemented. The authorized membership fixtures support RLS testing but cannot stand in for this missing flow.
4. **Production-save / operational inventory mutation endpoint:** not implemented. Direct write denial was tested; no artificial inventory or dispatch history was created to pretend an operational API exists.

No global settings were relaxed to turn these into passing cases.

## Test-driver correction and retained state

An initial driver assertion incorrectly required HTTP 200 from set_site_member, which returns **204 for a successful void RPC**. This was a harness false positive, not a hosted defect. The original attempt's results/requests/stop record remain in attempt1-*; driver-correction.json explains the correction. The completed results use the correct 2xx expectation. No deployed SQL or security control was fixed, and the successful supervisor grant was not replayed.

Because credentials were memory-only, resumption rotated passwords only for the five already-created, metadata-verified synthetic accounts and obtained new password sessions. No duplicate identities, organization bootstrap or privileged membership setup was performed. The revocation tests reused the unchanged JWT issued before revocation within that resumed session. Historical attempt evidence is not counted as an unresolved security failure.

Retained fixtures: **six Auth identities, two organizations, two sites, five total organization memberships and nine immutable audit events**. Supervisor A's site authorization is inactive; the revoked member's organization membership is inactive. A retained child-site grant does not override the inactive parent organization membership, as the real old-JWT checks demonstrate. Inventory and production rows for these organizations remain zero. No fixture, audit or inventory history was deleted; credentials are not retained.

## Remaining mobile-onboarding prerequisites

- Implement and separately review stage-save and verified invitation/acceptance contracts, including auditable membership creation; replace privileged setup with real supported onboarding paths.
- Validate email/phone verification delivery and recovery flows independently; these tests used controlled admin-confirmed synthetic accounts.
- Implement and review operational write/import endpoints and the mock-to-persistent adapter, preserving numbering, nullable opening-stock dates, numeric serialization and idempotency.
- Keep private schema exposure, role grants and ownership regression checks in the deployment process. Add endpoint-specific real-identity tests as new functionality is introduced.
- Mobile Supabase/Auth/session handling, production performance, recovery and Android behavior remain separate milestones. No mobile/backend integration was implemented here.

Only test documentation/evidence is committed for this task. Pre-existing deployment metadata/rollout edits and earlier untracked preflight evidence are preserved without staging them. No new migration, Auth-setting change, RLS/grant change, mobile change, security fix or GitHub push was performed. Review these findings before authorizing the missing endpoint implementations or any security remediation.
