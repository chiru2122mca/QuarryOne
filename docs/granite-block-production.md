# QuarryOne V0.3.2 — Granite block Production integration

Base: `efea63b`, verified with a clean working tree on `main`. The existing app and V0.3.1 foundation were retained. No dependencies, database/backend configuration, persistence, offline storage, additional operational modules or new authentication were added. Home, Splash, Login, branding and bottom-tab configuration are unchanged.

## Production screens

The existing `/production` tab and `/add-production` routes now render dedicated block-based screens using the existing QuarryOne components, colors, safe-area wrapper and keyboard-aware scrolling. The generic list/form screens continue to serve the other modules without modification.

Production reads live store inventory and displays block number, ISO production date, quarry/pit names, granite material, A/B/C grade, original dimensions/unit, calculated CFT or m³ volume, supervisor and status. AVAILABLE uses the existing success color; REJECTED uses the error color. Totals are derived from all produced records, including rejected blocks; date/pit filters affect the records shown, not the session totals. A volume-display selector switches between CFT and m³. There is no new Block Inventory UI.

Add Production captures local-calendar production date (editable YYYY-MM-DD), quarry, pit, material, grade, FT/M unit, decimal length/width/height, stockyard location, supervisor and optional remarks. Number generation, uniqueness, canonical volume and record construction still use the V0.3.1 store/domain. There are no prices or payment fields.

## Store and workflow

`OperationsProvider` is mounted inside the existing root SafeAreaProvider, above the Stack. It supplies the already-existing `mockOperationsStore` singleton; it does not create another store. The existing hook now reads the provider while retaining explicit-store injection for tests. External-store subscriptions immediately update the Production list when inventory changes.

One submission controller is created per mounted Add Production form. It prevents reentrant calls and returns the same completed block on repeated Save taps. Failed validation/store commands remain retryable and surface their messages. Save is disabled once a record is successfully created.

Successful Save adds one AVAILABLE block, displays its generated number in a confirmation, closes that modal and returns to Production. The new ID is passed as a route parameter. List filters are scoped to that return ID so previously selected dates/pits cannot hide the new block, and the returned block is placed first even when backdated. Tab switches do not recreate/reset inventory. A full app/JS reload restores the original 18 fixtures; records are not persisted.

## Volume behavior

The entry adapter parses positive decimal text and delegates all calculations to the existing domain utilities. Live preview uses the same dimensions/unit that Save submits. Empty, zero, negative, nonnumeric and nonfinite dimensions produce clear validation messages.

`10 × 5 × 4 FT = 200 CFT = 5.6633693184 m³`, displayed as **200.00 CFT ≈ 5.66 m³**. Metric input such as `2.5 × 1.2 × 0.8 M` displays **84.76 CFT ≈ 2.40 m³**. The store keeps full-precision canonical m³ and original measurement values/unit; display rounding never overwrites the record. Changing FT/M interprets the entered numbers in the selected unit; it does not silently convert the dimension fields.

## Files modified

- `src/app/_layout.tsx`: mount the shared provider.
- `src/app/(tabs)/production.tsx`, `src/app/add-production.tsx`: connect existing routes to the new block screens.
- `src/stores/useMockOperations.ts`: consume the root-provided existing store.
- `src/stores/mockOperationsStore.ts`: update integration comment only; store implementation unchanged.
- `src/components/ui.tsx`: optional disabled state for PrimaryButton and AVAILABLE/REJECTED status styling; existing button/status behavior preserved.
- `package.json`: point `verify:web` to the current Production workflow check; dependencies unchanged.

Created:

- `src/stores/OperationsProvider.ts`
- `src/features/production/model.ts` (text-entry/preview/submission/total/filter adapters; not a second block model)
- `src/screens/ProductionList.tsx`
- `src/screens/AddBlockProduction.tsx`
- `tests/blocks/production.test.cjs`
- `scripts/verify-production.cjs`
- `verification/v032/results.json` and responsive list/form/confirmation screenshots
- `docs/granite-block-production.md`

## Actual validation results

- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**, no errors/warnings.
- `npm run test:domain`: **38 passed, 0 failed**, including every original V0.3.1 test (26) and 12 Production integration tests.
- Node tests cover positive/invalid dimensions, FT/M and decimal calculations, live preview, AVAILABLE creation, generated/unique numbers, duplicate-save prevention, retry/error propagation, totals, filters, provider/hook store identity across consumer remounts and local-calendar date handling.
- `npx expo export --platform web`: **passed**.
- `npx expo export --platform android --output-dir .expo/v032-android`: **passed**; this confirms bundling, not installation or a physical-device test.
- Browser workflows at **360×844, 390×844 and 412×844**: **passed**, no runtime errors. Verified mandatory-field errors, numeric input modes, 200 CFT preview, rapid double Save producing only one block, generated confirmation, immediate list inclusion, count/volume changes, filter reset, all bottom-tab switches retaining data, a second metric block, final content clear of tabs, and reload restoring fixtures. Counts change 18→19→20 and back to 18 only after reload.
- Reduced-height browser viewport verifies Save remains scroll-reachable and at least 48px high. It does **not** establish native keyboard behavior.
- Screenshots visually reviewed for list and confirmation. Initial browser testing caught the need to close the confirmation before route replacement; that was fixed and the full workflow rerun successfully.
- Git diff confirms original block domain/fixtures, dependency lock, Home/Splash/Login, generic Sales/Dispatch/Expense screens, branding and bottom-tab configuration unchanged.

## Expo Go / physical Android validation

```powershell
cd C:\Users\Chiru\Documents\ChatGPT\QuarryOne
pnpm install --frozen-lockfile
pnpm start --clear
```

Use Expo Go compatible with SDK 57. Phone and PC should be on the same network; scan the terminal QR code. No Supabase/backend setup or account is required.

1. Open Production: expect 18 seed blocks and totals derived from them. Toggle CFT/m³ and date/pit filters.
2. Tap `+`. Enter `10`, `5`, `4` in FT and a stockyard location. Verify the live 200 CFT ≈ 5.66 m³ preview.
3. Try empty/zero dimensions and an empty stockyard; verify clear errors and that correcting them permits a save.
4. Tap Save twice rapidly: expect one generated block (normally `BLK-2026-0019`) and one confirmation. View Production: expect 19 records, new block first and updated volume.
5. Switch Home/Sales/Dispatch/More and return to Production; confirm the same block remains. Add a metric/decimal record and verify the next number.
6. Test Android numeric keyboards, scrolling with keyboard open, Save reachability, back dismissal of confirmation, larger font settings, status-bar/cutout insets and gesture/three-button navigation.
7. Reload the app: expect the original mock fixtures and 18 records again.

**Outstanding:** No physical Android device/emulator was available. The native keyboard, safe areas, font/display scaling and system-navigation cases above are manual tests awaiting your validation. No unresolved automated issue is known. Other screens deliberately retain their existing static mock behavior. This local commit must not be pushed until physical Android review is approved.
