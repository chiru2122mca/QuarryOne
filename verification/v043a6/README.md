# QuarryOne V0.4.3A.6 — Review and activation preview

Base commit: `3ea8455`. Open **More → Demo Business Setup**, complete Steps 1–4 and Continue to **Review & Activate**. This milestone completes the five-stage UI-only wizard. All values remain in the existing in-memory onboarding provider; there is no new store or backend integration.

## Review summary and editing

Four compact cards display actual current-session values:

- Business Registration: business name, optional legal name/GSTIN, Owner display name/contact and state/district/business address.
- Quarry Configuration: Single/Multiple mode, every primary/additional quarry's name/code/state/district/address and its pits/benches, with friendly type labels.
- Materials & Measurements: selected materials, fixed A/B/C descriptions (missing grades are explicitly unconfigured), every stockyard's quarry and shared/dedicated pit, FT/M and CFT/m³ preferences, currency and timezone.
- Users & Roles: Business Owner/All Quarry Sites labels while preserving OWNER/ALL_SITES in the draft, Owner contact, optional team drafts with contact/role/site intentions and remarks, or an explicit Owner-only message.

Associations resolve stable draft IDs, not labels or array positions. Missing or cross-quarry references display missing-reference labels and fail readiness. Business and quarry addresses stay separate. Summary builders copy returned records/arrays rather than mutate the draft. Blank values are shown as not provided; no sample business data is substituted.

Each card has an accessible 48px Edit action. Destinations come from the existing step definitions through a four-step allowlist; arbitrary routes, query strings and the review step itself are rejected. Continue through the existing forms to return to Step 5 after editing. Review recomputes from the current draft and retains unrelated values and all site/pit/stockyard/invitation IDs. No prior form or operational business rule is changed.

## Readiness and preview contracts

`validateOnboardingReadiness(draft)` is pure and calls the existing Business Registration, Quarry Configuration, Materials & Measurements and Users & Roles validators. Its `ready` result is the conjunction of all four validators. It returns per-step results/routes plus structured issues with step, field, message and affected entity ID where relevant. Quarry prerequisite details are reported under Step 2 rather than repeated in Step 3; Owner name/contact issues are reported under Step 1. Materials, grades, stockyards, preferences, invitation identities and role/site restrictions reuse existing rules. Owner-only setup is valid when the other required configuration is complete.

The top readiness card distinguishes **Ready for demo preview** from **Configuration needs attention**. Each affected step has its messages and a Fix action. Reaching Step 5 or a full progress bar does not imply readiness. **Preview Activation** replaces the final disabled Continue. Invalid attempts show feedback beside that action and a **Correct next issue** link; no confirmation payload or modal is produced. Incomplete Save Draft remains available.

`buildActivationPreview(draft)` revalidates on every invocation. A valid result supplies only display counts: business name, quarry count, pit/bench count, stockyard count, materials, Owner name/count and additional team member count. The local scrollable confirmation states exactly:

> This is a demonstration. No organization has been created or activated in Supabase.

**Return to Review** and Android modal Back dismiss the preview. The URL/workspace and business draft remain unchanged. Modal visibility is component-local and tied to the same draft object; a changed/reset draft cannot retain an earlier confirmation. There is no stored activation flag, lifecycle transition, server-issued organization ID, receipt, token, timestamp, permission grant or automatic workspace navigation.

Client checks are not authoritative server validation. No authenticated identity, server revision, permission or database invariant is established by this preview.

## Session behavior and UI

Save Draft retains even incomplete review data and shows the existing session-only acknowledgement. Back, More/resume and Edit/Continue preserve the same provider instance. Reset restores the existing defaults and clears entered business/configuration/team content; reload/restart creates a fresh session. Previewing does not save or activate the draft.

Existing dark header, progress, safe areas, keyboard-safe Screen, cards/buttons, Deep Slate/Safety Orange/Stone White tokens and bottom navigation are reused. Shared wizard components gain optional final-action label/callback/feedback props; Steps 1–4 keep their current behavior. The confirmation scrolls within the viewport and Edit/preview/return/correction actions retain minimum 48px targets. Native device behavior still requires manual verification.

## Files

- Added `src/screens/ReviewActivate.tsx` and pure `src/features/onboarding/reviewSetup.ts`.
- Updated `src/app/onboarding/review.tsx`, `src/components/onboarding/OnboardingStepLayout.tsx` and `src/components/onboarding/OnboardingNavigationActions.tsx`.
- Added `tests/onboarding/reviewSetup.test.cjs` and `scripts/verify-review-scenarios.cjs`.
- Updated `scripts/verify-onboarding.cjs` and `scripts/verify-users-scenarios.cjs` for the implemented final action and review/preview flows, retaining earlier milestone scenarios.
- Updated `docs/ONBOARDING_ARCHITECTURE.md` and added this verification directory.

Existing model/reducer/provider, previous four form implementations and validators, dependencies, operational domain/store/screens, deployed SQL, RLS and permissions remain unchanged.

## Validation

```text
npm run typecheck
npm run lint
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

The application suite passed **165 tests, 0 failures**: 143 existing plus 22 new review/readiness/preview cases, including Production/Inventory regression. New tests cover actual summaries, independent addresses, single/multiple quarries, ID-based stockyard/pit and team associations, friendly labels/internal enums, Owner-only readiness, invalid business/quarry/material/grade/yard/preference/invitation configuration, controlled edit destinations, updated summaries, Save/Resume/Reset, denied invalid preview, derived confirmation counts, revalidation after edits, pure selectors and no backend/operational mutation.

TypeScript, ESLint and formatting passed. Expo web export passed with 73 static routes. Metro recovered from a cache deserialization warning by doing a full crawl; Node also reported its non-blocking NO_COLOR/FORCE_COLOR warning. No dependency or application workaround was needed. An initial JSX text-escaping lint error was corrected before the final successful lint run.

The full browser suite passed at **360px, 390px and 412px**, retaining previous onboarding regressions and adding four working Edit destinations, changed-value summaries with stable IDs, independent addresses, Owner-only and staff-inclusive previews, correct confirmation counts, Return to Review without workspace navigation, More/resume, incomplete Save, denied invalid preview, per-step Fix links and Reset. Tested controls retain 48px minimum heights; no horizontal overflow, page errors or mutation/Auth/backend requests were observed. See `responsive-results.json`, `validation-results.json` and 75 PNG screenshots in this directory.

Initial browser runs stopped on the pre-existing rapid required-field clearing scenario. The driver now enters explicit whitespace, blurs and verifies each field before testing required-field errors; the existing normalizer still produces empty invalid fields. Earlier forms and validators were not changed. Preview screenshots disable animations during capture so they show the settled modal rather than a fade frame. The full final rerun passed. Settled preview at 360px, materials/stockyard summary at 390px, team summary at 412px and invalid readiness summary at 412px were visually inspected.

A protected-path diff confirmed no deployed SQL/database, dependency, operational module/domain/store, shared operational UI, model/provider or earlier form/validator changes. No physical Android or live Supabase verification is claimed by local application/browser checks.

## Physical Android checklist

1. In Expo Go, complete an Owner-only single quarry and a multi-quarry/team draft. Review all values, shared/dedicated stockyards, measurements and friendly role/access labels at 360px, 390px and 412px. Verify status-bar/bottom safe areas, larger fonts, long names/addresses, contrast and TalkBack labels.
2. Use every Edit action, modify its form and Continue back to Review. Business/quarry addresses and unrelated values must remain independent; renamed site/pit labels must retain associations. Check soft-keyboard scrolling/dismissal in the earlier forms.
3. Check incomplete configuration through a direct Review route or draft edits. Errors must identify affected steps, Fix/Correct next issue must open the proper form, and Preview must show no confirmation. Save incomplete data and return during the same session.
4. With a valid draft, open Preview Activation. Check every count and the exact demo notice. Scroll to Return to Review, test Android hardware Back and confirm no workspace change, real activation or sent invitation. Preview again after edits to confirm current values.
5. Leave to More and resume Review, then Reset Demo Draft and restart/reload. Verify the documented session-only behavior. Confirm existing Production/Inventory records, totals and canonical m³ calculations are unchanged.

Physical Android validation and approval remain pending. Do not push automatically.

## Deferred backend work

Future persistence requires separately reviewed stage-save contracts, authenticated identity/tenant authorization, stable local-to-database UUID/catalog mapping, revision/concurrency checks, authoritative server readiness validation, audited lifecycle transactions and secure invitation acceptance/delivery. Deployment, organizations, memberships/site grants, activation and operational Supabase adapters remain outside this milestone. No mobile UI readiness result may be trusted as server authorization.
