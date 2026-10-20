# QuarryOne V0.4.3A.1 — Onboarding foundation

This milestone adds a **prototype, session-only** five-stage wizard. Open **More → Demo Business Setup**. Login, Welcome and Home entry behavior are unchanged. No business forms, Auth integration, database writes, invitations or activation are implemented.

## Routes and navigation

| Order | Route | Placeholder |
| --- | --- | --- |
| 1 | /onboarding/business | Business Registration |
| 2 | /onboarding/quarry | Quarry Configuration |
| 3 | /onboarding/materials | Materials & Measurements |
| 4 | /onboarding/users | Users & Roles |
| 5 | /onboarding/review | Review & Activate |

`/onboarding` resumes the session's last visited step, falling back to Business Registration. Each destination is an explicit route. `getOnboardingStep` and `adjacentOnboardingStep` resolve only fixed allowlisted identifiers; arbitrary URL/step strings are never passed to the router. Query parameters do not choose wizard destinations.

Header Back and footer Back go to the previous stage; on the first stage they return to More. Continue goes to the next stage. Continue is disabled on the final stage, with an explicit explanation that activation is unavailable. Progress represents navigation position, not validated readiness. Navigation uses replace between steps to avoid accumulating wizard history; native/system Back can exit to the preceding app route. Android behavior still requires device verification.

## State and components

`src/features/onboarding/model.ts` contains typed business, quarry/site/pit, material/grade, stockyard, measurement and invitation drafts, plus a pure reducer. Draft identifiers are local references, not database IDs or effective permissions. Invitation roles match the existing documented role vocabulary and exclude owner creation. Invitation drafts do not create users or memberships.

Defaults: one incomplete primary quarry, multi-site disabled, FT dimensions, CFT display, CFT 2 decimals, m³ 3 decimals, INR, Asia/Kolkata and A/B/C grades. No business name, pits, stockyards or invitation recipients are fabricated.

`OnboardingProvider` wraps the root navigator alongside the existing OperationsProvider. It retains onboarding draft state while changing steps, leaving the wizard or switching tabs; it does not replace or modify the granite block store. `UPDATE_DRAFT` replaces one typed section, `NAVIGATE` bookmarks an allowlisted step, `SAVE_DRAFT` acknowledges the current in-memory draft, and `RESET_DEMO` restores fresh defaults and step one. There is no persistent storage, network client or authentication dependency. Changes invalidate the save acknowledgement; navigation preserves it. Reloading/restarting clears the draft.

Reusable components live in `src/components/onboarding/`:

- OnboardingHeader reuses DarkAppHeader and scopes light status-bar text to the focused wizard screen.
- OnboardingProgress exposes the step and an accessible progress bar.
- OnboardingStepLayout reuses Screen's safe areas, scrolling and KeyboardAvoidingView, with compact existing tokens and placeholder content.
- OnboardingNavigationActions reuses PrimaryButton for Continue, Save Draft and Back. Existing buttons are at least 54px high; header Back is 48px.

Save Draft displays exactly **“Demo draft saved for this session.”** It does not promise permanent storage. Reset demo draft is a reversible session-only reset and returns to stage one. No complete input forms are added; entered-field preservation is tested through reducer updates in this foundation phase.

## Files

- Modified: `src/app/_layout.tsx` (provider), `src/screens/More.tsx` (demo entry), `docs/ONBOARDING_ARCHITECTURE.md` (current mobile scope versus historical server architecture).
- Added routes: `src/app/onboarding/index.tsx`, `business.tsx`, `quarry.tsx`, `materials.tsx`, `users.tsx`, `review.tsx`.
- Added state: `src/features/onboarding/model.ts`, `OnboardingProvider.ts`.
- Added the four components above, `tests/onboarding/foundation.test.cjs`, `scripts/verify-onboarding.cjs` and this verification directory.

## Validation

Run the automated suites with:

```text
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
npm run typecheck
npm run lint
```

The first typecheck encountered stale ignored Expo Router generated types. Starting Expo offline regenerated the new destinations; no type assertions, route casts, dependencies or app configuration were added to bypass route checking. After adding new routes on another checkout, start Expo once before checking against previously generated types. See the official [typed-route generation documentation](https://docs.expo.dev/router/reference/typed-routes/).

Browser validation is reproducible using the web export and an ephemeral loopback-only preview started and closed by the verification script:

```text
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

The responsive script covers all five steps at 360px, 390px and 412px, forward/back behavior, final disabled Continue, exact save acknowledgement, session resume, reset, reload clearing, allowlist query handling, 48px touch targets, header bounds and horizontal overflow. It records screenshots and results, and fails on page errors or observed mutation/Auth/database requests. Browser checks are not physical Android tests.

Executed results: TypeScript PASS, ESLint PASS, **63 automated tests PASS** (53 existing block/domain/Production/Inventory tests plus 10 new onboarding tests), formatting and whitespace checks PASS, web export PASS (73 static routes), and responsive browser checks PASS at **360px, 390px and 412px**. `responsive-results.json` records zero page errors and zero observed mutation/Auth/database requests. Six screenshots show the Business and Review screens at each width.

Initial browser attempts could not reach a separately sandboxed preview; the final successful script serves the export and runs Chrome outside that sandbox on a temporary loopback port. The first rendered progress check found that React Native Web did not expose numeric progress from accessibilityValue alone. Explicit ARIA values fixed that accessibility issue, and the rebuilt export passed the full browser run. Intermediate stalled validation processes were stopped; the results above refer to the completed final commands. Nonblocking tool notices concerned conflicting color-output environment variables and an npm update announcement; no dependency was changed.

See [360px Business screenshot](business-360.png), [390px Review screenshot](review-390.png), `responsive-results.json` and `validation-results.json`. Draft-field update/preservation tests use the actual reducer; the UI intentionally has no business inputs yet.

## Manual Expo Go checks still required

1. Start Expo, open on Android, and navigate More → Demo Business Setup. Confirm the existing five-tab navigation and Login/Home flow remain intact outside the wizard.
2. Walk forward and back through every stage; test both header Back and system Back. Check dark header/status bar, bottom safe area, text scaling and scroll reachability on 360px/390px/412px devices.
3. Save Draft, leave and reopen; confirm the exact session-only message and last visited stage. Reset, then reload/restart and verify defaults. Complete field entry/keyboard behavior must be checked when actual forms are added; this milestone supplies the keyboard-safe container only.
4. Confirm Production/Inventory data remain unchanged after wizard navigation and reset.

No Supabase requests, Auth users, real organizations, migrations, RLS/grant changes, dependency changes or operational business changes are part of this milestone. Review before V0.4.3A.2; do not push automatically.
