# QuarryOne V0.4.3A.5 — Users and roles configuration

Base commit: `d60be69`. Open **More → Demo Business Setup**, complete Steps 1–3, then Continue to **Users & Roles**. This is **Demo Invitation Setup** in the existing session-only onboarding context. There is no separate user store, Auth integration, real permission grant, invitation delivery or persistent storage.

## Owner and team drafts

`draft.primaryOwner` is created automatically with stable local identity `draft-primary-owner`, OWNER and ALL_SITES. Its name and business contact are derived from Step 1 on every business reducer update, including edits made after visiting Step 4. No Owner edit/remove/deactivate/demote control exists. Team commands reject the Owner identity, OWNER is absent from the invitation role allowlist and generic draft-section updates cannot replace the derived Owner.

Additional drafts have stable monotonic `draft-invitation-N` IDs, name, one contact channel/recipient, intended role, access scope, stable site-ID assignments and optional remarks. Add/edit/remove is entirely local. Removal requires confirmation; Cancel retains data. Removed and reset IDs are not recycled within the session. Reset clears additional drafts and Step 1-derived Owner details while retaining fixed Owner identity/role/scope.

Owner-only setup can Continue or use **Skip for Now — I'll add team members later.** No additional team member is required. Skip is disabled while additional drafts exist, so it cannot silently discard data or bypass invalid added rows. Remove unwanted rows with confirmation to return to Owner-only setup. An incomplete primary Owner must be corrected in Step 1 before Continue/Skip.

## Roles and site intentions

The allowlist matches the reviewed role matrix and deployed foundation migration: ADMIN, QUARRY_MANAGER, PRODUCTION_SUPERVISOR, SALES_ACCOUNTANT and DISPATCH_GATE_OPERATOR. Friendly labels and capability descriptions are shown. These descriptions are future intentions, not newly implemented operational capabilities.

- Owner and Admin use ALL_SITES. Admin has no separate quarry-selection control.
- Operational roles default to ASSIGNED_SITES. The existing permission matrix explicitly permits an Owner/Admin to grant operational ALL_SITES; the demo exposes that choice explicitly with a note that it also includes future quarries. This does not expand role capabilities.
- Adding an operational draft in Single Quarry automatically assigns the primary site and hides unnecessary selection controls. Multi Quarry starts with no implicit selection; one or more sites must be chosen by ID. Labels include quarry name and code.
- Changing role explicitly resets to the conservative default for the new role: Admin clears assignments and uses All Sites; operational roles use Assigned Quarries, retaining prior explicit assignments when already assigned. Moving from All Sites to assignments uses the primary in Single mode and an empty selection in Multi mode. Changing role does not implicitly carry All Sites into another operational role. Selecting the unchanged role/scope preserves the current intention.
- Navigation, quarry renaming and reordering preserve assignment IDs. Removed references are retained and invalid, never automatically assigned to another quarry. The repair UI lists removed references for explicit deselection and configured sites for correction, including in Single mode when an existing association is invalid. Existing Step 2 guards prevent removing sites referenced by invitation drafts.

Local intent never conveys real authorization. No database role, RLS, grant, deployed SQL, Auth setting or backend resource was changed or queried remotely.

## Validation and session behavior

Continue validates every added row: nonempty trimmed name, supported role and contact channel, valid normalized contact, unique local IDs, compatible role/scope and valid nonempty assigned-site IDs. Admin must have All Sites. All Sites stores an empty assignment array. Duplicated or stale site assignments fail validation. Clear inline errors and a summary are shown after a Continue attempt; the existing wizard layout determines the allowlisted Review destination.

Emails are trimmed and lowercased and checked for basic format only, without deliverability/account verification. India-first mobile numbers accept ten digits starting 6–9, optionally `+91`, with spaces/hyphens. National and +91 forms share the same canonical `+91` identity. Duplicate contacts, including reuse of the primary Owner's business phone, block Continue. The form stores one chosen email or mobile, not both. There is no external lookup, OTP, SMS, email or WhatsApp action.

Save Draft retains incomplete entries, trims names/remarks and canonicalizes valid contacts, then shows **Demo draft saved for this session.** It does not claim readiness or delivery. Back/Continue, More/resume and root context preserve draft state. Reload/restart clears it. Review remains the pre-existing non-activating placeholder.

Existing header/progress/actions, FormField, SelectField, ID-returning reference picker and keyboard-safe Screen are reused. FormField gains optional capitalization/autocorrection overrides for email/mobile; every existing caller retains its previous defaults. Operational screens, prior onboarding form implementations, block models, store, volume calculations and dependencies are unchanged.

## Files

- Added `src/screens/UsersRoles.tsx` and `src/features/onboarding/usersSetup.ts`.
- Updated `src/app/onboarding/users.tsx`, `src/features/onboarding/model.ts` and optional contact-input props in `src/components/ui.tsx`.
- Added `tests/onboarding/usersSetup.test.cjs`; updated the existing foundation fixture expectation for the derived Owner field, retaining its original preservation assertions.
- Added `scripts/verify-users-scenarios.cjs`; updated `scripts/verify-onboarding.cjs` to retain all previous regression scenarios and add Step 4 flows. An existing quarry invalid-field assertion now waits for rendered error state rather than racing React rendering.
- Updated `docs/ONBOARDING_ARCHITECTURE.md`, added a mobile note to `docs/ROLE_PERMISSION_MATRIX.md` and added this verification directory.

## Validation

```text
npm run typecheck
npm run lint
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

The application suite passed **143 tests, 0 failures**: 120 existing tests plus 23 new Step 4 cases. This includes Production/Inventory regression, fixed/derived Owner, owner-only Skip, adding/editing/confirmed removal, required and duplicate contact checks, all supported roles/scopes, single/multi-site IDs, stale references, reference guards, Save/Resume/Back, normalization, reset/non-recycled identities and no network/operational mutation.

TypeScript and ESLint passed. Web export passed with 73 static routes (only Node's non-blocking NO_COLOR/FORCE_COLOR warning was reported). Browser scenarios passed at **360px, 390px and 412px**, retaining all previous onboarding regression checks and adding Step 4 Owner-only Skip, single-quarry automatic assignment, multi-quarry selection, email/Owner-phone duplicates, Admin and operational role/scope changes, confirmed removal, partial Save, Back/Continue, More/resume, live Owner name refresh and reset. Checked controls meet 48px minimum heights; no horizontal overflow, page errors or mutation/Auth/backend requests were observed. Results are in `responsive-results.json` and `validation-results.json`, with 51 PNG screenshots. Owner at 360px, multi-quarry role/site selection at 390px, single-quarry member at 412px and actions at 360px were visually inspected.

An initial browser run encountered an existing immediate assertion that raced React's quarry-error rendering. That assertion now waits for the expected attribute; no application workaround or earlier form change was required. The full rerun passed. A protected-path diff confirmed deployed migrations, database files, dependencies, operational domain/store/screens, earlier onboarding forms and the Review placeholder are unchanged. No hosted security acceptance or physical Android result is claimed by these local checks.

## Manual Expo Go validation and deferred work

1. At 360px, 390px and 412px, verify dark header/status bar, bottom safe area, readable labels, larger font settings and touch targets. Use **More → Demo Business Setup** to reach Step 4.
2. Edit Owner name/contact in Step 1 and return. The summary must follow those values; there must be no Owner removal/demotion control. With no additional rows, test Continue and Skip to the unchanged Review placeholder.
3. Add drafts in Single and Multi mode. Verify email/mobile keyboards, optional remarks, role descriptions, Admin All Sites, operational Assigned Quarries/explicit All Sites, checkbox announcements and scope-change behavior. Test duplicates using email case and equivalent mobile formats. Correct invalid Continue errors.
4. With the native keyboard open, scroll to Save/Continue. Check selectors, Cancel/Confirm removal, TalkBack, Android hardware Back and keyboard dismissal. Verify no primary action is inaccessible. Native keyboard/status bar/safe areas cannot be established by desktop browser results.
5. Save partial data, go Back/Continue, leave to More and resume. Verify the same identities and values. Reset clears team drafts/Owner details; reload creates a new session. Verify existing Production/Inventory records and totals remain unchanged.

Physical Android verification is pending. Real users, verified identities, invitation tokens/delivery/acceptance, memberships/site grants, server persistence, authorization and Review/Activation remain deferred. Wait for Expo Go validation before V0.4.3A.6. No automatic push.
