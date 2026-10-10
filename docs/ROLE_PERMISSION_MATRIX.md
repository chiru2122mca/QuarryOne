# QuarryOne V0.4.1 — Authentication and permissions

Proposed Supabase Auth integration only. Current static Login and app navigation remain unchanged. No Auth project/client, invitations, live memberships or policies are configured.

## Permission model

Auth proves identity; database memberships determine permissions. Organization membership is mandatory before any tenant access. OWNER/ADMIN have ALL_SITES; operational roles default to ASSIGNED_SITES. An Owner/Admin may explicitly grant ALL_SITES to an operational role through the controlled membership operation; role capabilities remain unchanged. Site assignments apply the organization role at each assigned site; different roles at different sites are a future decision, not an implicit privilege.

| Capability                                             | Owner                | Admin             | Quarry Manager     | Production Supervisor     | Sales / Accountant      | Dispatch / Gate       |
| ------------------------------------------------------ | -------------------- | ----------------- | ------------------ | ------------------------- | ----------------------- | --------------------- |
| Read organization/catalog/preferences                  | Yes                  | Yes               | Yes                | Yes                       | Yes                     | Yes                   |
| Read blocks/production/sites/pits/yards                | All sites            | All sites         | Allowed sites      | Allowed sites             | Allowed sites           | Allowed sites         |
| Read customer master                                   | Org                  | Org               | Org                | No                        | Org                     | No                    |
| Change business/site/mode/preferences; review/activate | Yes                  | Yes               | No                 | No                        | No                      | No                    |
| Manage Owner/Admin memberships                         | Yes, retain an owner | No                | No                 | No                        | No                      | No                    |
| Manage existing operational roles and site grants      | Yes                  | Yes               | No                 | No                        | No                      | No                    |
| Invite new staff (future)                              | Any approved role    | Operational roles | No                 | No                        | No                      | No                    |
| Record Production (future)                             | Allowed              | Allowed           | Allowed sites      | Allowed sites             | No                      | No                    |
| Reject/correct production (future controlled workflow) | Allowed              | Allowed           | Allowed sites      | Proposed manager approval | No                      | No                    |
| Sales/reservation/customer writes (future)             | Allowed              | Allowed           | Allowed sites      | No                        | Allowed sites           | No                    |
| Dispatch/gate transitions (future)                     | Allowed              | Allowed           | Allowed sites      | No                        | Read sales context only | Allowed sites         |
| Collections/financial reconciliation (future)          | Allowed              | Allowed           | Proposed read-only | No                        | Allowed sites           | No                    |
| Expenses/reporting (future)                            | Allowed              | Allowed           | Allowed sites      | Production reports only   | Finance/allowed sites   | Dispatch reports only |

Future rows are intended capabilities, not implemented grants or modules. This draft exposes read access and selected onboarding RPCs only. Even Owner/Admin have no direct table INSERT/UPDATE/DELETE rights. Customer master is organization-wide for these approved roles; site-sensitive sale/collection history will have separate site policies. Dispatch will receive necessary customer/challan snapshots through a later constrained endpoint rather than unrestricted customer/financial access.

## RLS drafts

- Every requested public table has RLS enabled; anonymous users have neither table grants nor policies.
- Authenticated SELECT policies require active membership from database rows. Site tables additionally require ALL_SITES or an active matching site assignment. Suspended organization membership disables all tenant/site reads regardless of lingering grants.
- `multi_site_enabled` is never read by authorization predicates. Single-site mode does not authorize an unassigned user or deny authorized archived history.
- Composite FKs enforce tenant/site ownership of references even inside trusted operations.
- Private SECURITY DEFINER predicate helpers prevent recursive membership policies. Empty search_path and fully qualified relations reduce object-shadowing risk. The trusted migration owner must have RLS-bypass capability and must never be a client role.
- Private tables are not in exposed API schemas and have no client table grants. Predicate functions are executable solely to evaluate policies; audit, counters and admin helpers remain non-client-executable.
- No write policies or client DML grants exist. Later operational RPCs must independently check active role, tenant/site, organization lifecycle, record state, idempotency and audit before writing.
- Avoid owner-bypassing views. Any future reporting view must use `security_invoker` and tested underlying RLS; security-definer reporting endpoints need explicit capability checks.

Profiles are readable by self, or an active Owner/Admin sharing an organization with that active member; they contain display names only. Membership rows are readable by the member themselves or their organization's Owner/Admin. This avoids exposing all staff profiles or permissions to unrelated users. Authorization reads database membership rather than JWT role claims or user-editable metadata, so membership revocation does not wait for a refreshed role claim.

## Safe first-owner bootstrap

The future gateway verifies a Supabase access token. PostgreSQL receives the trusted signed identity through `auth.uid()`. `bootstrap_organization` checks a verified email or phone and rejects anonymous identities; a caller cannot supply the user ID/role. A request-key lock and transaction create the organization, default settings, fixed OWNER/ALL_SITES membership and audit atomically. Deferred ownership checks ensure no committed organization is ownerless. A retried same key does not create a second tenant; payload mismatch fails.

The local test stub lets a test superuser synthesize identities via a session setting. That is solely a test harness; clients must never be allowed arbitrary database sessions or unsigned claim injection. Supabase's gateway/real JWT behavior remains untested until a separately approved staging rollout.

## Sensitive changes

Existing membership changes use `set_organization_member`; only Owner may alter Owner/Admin rows, and the last active Owner cannot be deactivated/demoted. New memberships cannot be created through this RPC: future verified invitation acceptance is the sole path after bootstrap. `set_site_member` validates same-org site and active parent membership; scope is never inferred from UI mode. Every controlled write locks the organization first, serializing concurrent ownership/site-mode changes and auditing the verified actor.

Invitation acceptance will validate hashed single-use token, expiry, recipient identity, inviter's continuing permission and immutable org/role/site payload, then create membership/grants atomically. Token replay, changing the invite role/site, and Admin inviting Owner/Admin must fail. Owner transfer adds a verified second owner before removing the original. Server-only administrative keys are never embedded in mobile code; using one bypasses RLS and therefore still requires gateway authorization.

Lifecycle/mode RPCs validate Owner/Admin membership and expected revision. Successful transactions include audit entries; failed operations roll back data and audit. ACTIVE→DRAFT and DRAFT→ACTIVE are forbidden. Direct writes remain denied even with fabricated `role=OWNER` metadata.

## Review questions

Decide whether managers may read all organization customers, whether dual approval is needed for activation/owner transfer, whether cross-site accountant access should default to ALL_SITES, and whether per-site roles are necessary. Restrictive defaults remain until decisions are approved. Invitation delivery and account retention rules are future work.

Security references: [Supabase RLS grants and policies](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth user/profile management](https://supabase.com/docs/guides/auth/managing-user-data), [database functions](https://supabase.com/docs/guides/database/functions), [PostgreSQL SECURITY DEFINER precautions](https://www.postgresql.org/docs/17/sql-createfunction.html). The matrix is proposed QuarryOne policy, not a claim of deployed permissions.
