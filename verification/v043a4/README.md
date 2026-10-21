# QuarryOne V0.4.3A.4 — Materials and stockyard configuration

Base: aa4b669. Open **More → Demo Business Setup**, complete Business Registration and Quarry Configuration, then Continue to Step 3 — **Materials & Measurements**. This milestone is UI plus session-only draft state. There is no Supabase/Auth connection, persistent storage or operational workflow change.

## Implemented form

- **Materials:** independent multiple selections for exactly Black Granite, Grey Granite and Tan Brown, matching the existing domain union and deployed schema's supported names. At least one is required. Catalog IDs are stable local draft IDs, not Supabase UUIDs.
- **Granite Grades:** Grade A/B/C description fields, all optional. Codes remain fixed and preconfigured; no custom grades or grade-removal control.
- **Stockyards:** add/edit/remove named yards, associated to a quarry by ID and optionally a pit/bench by ID. Entire quarry (shared) stores pitId=null. At least one valid yard is required per configured quarry. Name comparisons ignore case and all whitespace within a quarry; the same name is allowed in different quarries. Display names retain their internal spacing and trim only outer whitespace on Save/Continue.
- **Measurement Preferences:** Feet (FT)/Metres (M) and Cubic Feet (CFT)/Cubic Metres (m³), with FT/CFT defaults. INR and the current timezone are displayed; the default remains Asia/Kolkata. Existing display precision defaults remain CFT 2/m³ 3. No additional currency/timezone/precision editor is introduced.

The fixed **10 × 5 × 4 FT = 200 CFT ≈ 5.66 m³** example uses the existing calculateCubicMetres and formatVolume utilities. It deliberately retains its FT label even if the draft's preferred entry unit becomes M. The m³ example is rounded to two decimals as requested; canonical calculations and existing Production/Inventory records are untouched.

Existing Deep Slate headers, five-step progress, FormField, SelectField, PrimaryButton, safe areas and keyboard-safe Screen scrolling are reused. The new onboarding-only reference picker returns option IDs directly, so duplicate/renamed labels and array reordering cannot change associations. Material selection has native/web checked accessibility state; inputs/actions retain at least 48px touch targets.

## Associations and reference safety

Single Quarry automatically associates new yards with the primary and hides the quarry selector for valid associations. In Multi Quarry, the selector shows name/code labels but stores stable site IDs. Changing to a different quarry atomically resets the dedicated pit to Entire quarry; this behavior is explained next to the selector. Selecting a pit from another quarry is rejected without modifying the draft.

Quarry/pit renaming preserves associations because references use IDs. Existing Step 2 removal guards now operate on actual draft stockyards: a referenced quarry or dedicated pit cannot be removed until the user resolves the assignment or removes the yard. Stockyard removal itself requires Cancel/Confirm and removes only that local yard, retaining quarries/pits. Removing the last yard makes Continue invalid, but incomplete Save Draft remains available.

If an association becomes stale through future/imported draft updates, records are retained and inline validation asks the user to choose an existing quarry/pit or Entire quarry. No render-time reassignment or silent deletion occurs. A repair selector remains visible even in Single mode when the stored quarry reference is invalid. No later stockyard-dependent draft entity exists yet; future modules must add their own guarded reference contracts.

## Draft state and validation

The existing reducer/context gains MATERIALS_COMMAND actions, a monotonic stockyard ID counter and local issue state. Typed commands cover supported material toggles, fixed-grade descriptions, yard add/edit/remove, unit preferences and trim preparation. All data lives in the current root onboarding provider. Save/Back/Continue/More-resume preserve the same records and IDs. Reset clears materials/stockyards/descriptions and restores FT/CFT/INR/Asia-Kolkata defaults; the ID counter is retained through reset to avoid recycling issued yard IDs. Reload/restart creates a fresh session.

Continue to Users & Roles requires a valid Step 2 quarry configuration, at least one supported material, exactly A/B/C grades, unique nonempty yard IDs/names, valid same-site pit associations, at least one valid yard per quarry and valid preferences. Preference validation accepts only FT/M, CFT/M3, INR, a nonempty Intl-recognized timezone and integer display precision 0–6, consistent with the existing formatter. The current form edits only units. Save Draft permits incomplete/invalid configuration, with an explicit statement that a saved draft is not activation readiness.

These are configuration drafts, not available inventory, memberships or real database catalog/site records. No second store, new dependency, operational preference mutation, migration, RLS/grant change or backend setting is introduced. Users & Roles and activation remain future milestones.

## Files

- Added `src/screens/MaterialsMeasurements.tsx`, `src/features/onboarding/materialsSetup.ts` and `src/components/onboarding/OnboardingReferenceField.tsx`.
- Updated `src/app/onboarding/materials.tsx` and `src/features/onboarding/model.ts`.
- Added `tests/onboarding/materialsSetup.test.cjs` and `scripts/verify-materials-scenarios.cjs`; updated `scripts/verify-onboarding.cjs` to run Step 3 scenarios while retaining previous milestone regression checks.
- Updated `docs/ONBOARDING_ARCHITECTURE.md` and added this verification directory. Deployed SQL, existing block domain/store, earlier form implementations, shared operational UI defaults and dependencies are unchanged.

## Validation

```text
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
npm run typecheck
npm run lint
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

The suite passed **120 tests, 0 failures**: the existing 102 tests plus 18 new Step 3 cases covering supported selection, fixed-grade defaults/descriptions, yard identity/edit/remove, duplicate names, per-quarry coverage, shared/dedicated references, parent-change pit reset, stale references, rename stability, Step 2 dependency guards, confirmation, all four unit combinations, canonical conversion example, malformed preferences, Save/Resume/Back, reset/non-recycled IDs, Unicode names and operational/network isolation.

TypeScript and ESLint passed. Expo web export passed with 73 static routes. Headless Chrome scenarios passed at **360px, 390px and 412px**, with no horizontal overflow, no page errors, at least 48px tested control heights and no mutation/Auth/backend requests. The browser suite exercises Step 3 gating, selection, descriptions, partial Save, shared/dedicated associations, duplicates, confirmation, reference protection, parent changes, units and session resume while retaining previous onboarding regression checks. See `responsive-results.json`, `validation-results.json` and the 39 PNG screenshots in this directory. The initial browser attempts exposed test-driver modal timing problems; the driver now waits for dialog dismissal and samples control bounds atomically. The final rerun passed without application workarounds.

Screenshots for materials at 360px, multi-quarry stockyards at 390px and measurements at 412px were visually inspected. Browser results do not establish native Android keyboard, TalkBack, status-bar or safe-area behavior. A protected-path diff confirmed no changes to deployed SQL, dependencies, existing operational domain/store/screens or earlier onboarding forms.

## Manual Android validation

1. Run Expo Go and open the wizard. Verify 360px/390px/412px layouts, dark header/status bar, bottom safe area, larger fonts, checkbox state announcements and outdoor readability.
2. Configure one and multiple materials, descriptions and yards. In Single mode check the automatic quarry and hidden selector. In Multi mode verify each yard's quarry/pit selector, Entire quarry and the reset-to-shared behavior on quarry change. Try duplicate names and incomplete Continue; Save Draft must still retain the data without claiming readiness.
3. With the soft keyboard open, scroll through descriptions/stockyards to Save/Continue. Verify selector and removal dialogs, Cancel/Confirm, TalkBack and Android hardware Back behavior. Browser checks cannot verify the native keyboard/safe area.
4. Assign a dedicated yard, return to Step 2 and attempt to remove its pit/quarry; verify reference protection. Rename entries and return to Step 3; references must remain valid. Save/leave/reopen/reset/restart and confirm session-only behavior and defaults.
5. Confirm Production and Inventory retain their existing units, totals and records. Onboarding preferences do not yet configure operational screens.

Physical Android verification is pending. Supabase persistence/Auth, server stage-save contracts, durable UUID mapping, custom catalogs/grades, stock adjustments and operational adapter integration remain deferred. Wait for physical Android validation before V0.4.3A.5. Do not push automatically.
