# Stage 2 — Operational headers

The approved Home layout remains unchanged. This stage applies the existing Deep Slate header to operational screens, using the supplied `docs/design-references/Figma_References_Screenshot.jpeg` as a visual guide while preserving the current granite block workflow.

## Screens and source files

| Screens                              | Modified source                      |
| ------------------------------------ | ------------------------------------ |
| Production                           | `src/screens/ProductionList.tsx`     |
| Add Production                       | `src/screens/AddBlockProduction.tsx` |
| Block Inventory                      | `src/screens/BlockInventory.tsx`     |
| Block Details, including missing IDs | `src/screens/BlockDetails.tsx`       |
| Sales, Dispatch, Expenses            | `src/screens/Lists.tsx`              |
| New Sale, New Dispatch, Add Expense  | `src/screens/EntryForm.tsx`          |
| More                                 | `src/screens/More.tsx`               |
| Customers                            | `src/app/customers.tsx`              |
| Reports                              | `src/app/reports.tsx`                |

Shared changes:

- `src/components/DarkAppHeader.tsx`: optional profile visibility and test ID, with the original Home defaults retained. A drawn white arrow avoids reliance on font glyph rendering.
- `src/components/OperationalHeader.tsx` (new): reuses that title bar, supplies functional back navigation, direct-entry fallback destinations and orange add actions. Status-bar entries are pushed only while the route is focused and removed on blur.
- `src/components/ui.tsx`: opt-in fixed header slot above keyboard-aware scrolling; operational body padding is 16px horizontally and 12px above content. Compact KPI values use one line and scale within the existing card width.
- `scripts/verify-operational-headers.cjs` (new): responsive checks and screenshots for all 13 operational screens.
- `scripts/verify-stage2-regressions.cjs` (new): runs the accepted Production, Inventory and Home browser suites with the new accessible Add Production label and separate output folders.

## Behavior and layout

Title bars use `#263238`, white titles/arrows and 48px controls; orange add actions use `#F57C00`. Production, Sales, Dispatch and More root tabs have no back arrow. Nested screens return through existing Router history, with a sensible existing-route fallback for direct entry. Router/native headers remain hidden using the existing layouts; bottom navigation is unchanged.

The header handles the top safe area. The content handles left/right/bottom insets without adding a second top inset. Existing KeyboardAvoidingView behavior, keyboard tap handling, decimal inputs, field targets and scrollable forms are retained. Native system-bar treatment follows the SDK 57 [StatusBar documentation](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/) and [safe-area documentation](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/).

Subtitles remain in the content area. Production and legacy list KPI cards now opt into compact sizing. Domain models, fixtures, volume utilities, store implementation, search/filter logic, detail lookup, form save rules and Home source were not changed. The legacy mock Sales/Dispatch quantities and reports remain demo functionality as before. No dependencies, backend services or persistence were added.

## Validation

Final results: TypeScript and ESLint passed. All 53 existing automated tests passed. Web export passed. All 39 operational screen/width combinations passed, with no page errors; the Production, Inventory and Home browser regression suites also passed at all three widths. Final Inventory and Details screenshots were visually reviewed to confirm the white back arrows render.

- TypeScript: `npm run typecheck`.
- ESLint: `npm run lint`.
- Existing automated suites: `npm run test:domain` — 53 passed, 0 failures.
- Web export: `npx expo export --platform web`.
- Browser: `node scripts/verify-operational-headers.cjs` — 13 screens × 360/390/412px, checking fixed 56px title bars (before native insets), title fit, white text, orange actions, 48px header controls, content separation, no horizontal overflow, scrolling, invalid form messages and add/back navigation.
- Existing browser regressions: `node scripts/verify-stage2-regressions.cjs` — Production saves and session stability, Inventory filters/details/units and new blocks, and approved Home calculations/layout/actions at all three widths.

See `results.json`, the screen screenshots and the `production/`, `inventory/`, `home/` subfolders for evidence. Browser form tests exercise scrolling and validation; they do not emulate Android's software keyboard or status bar.

## Pending physical Expo Go review

Run `npm start`, open the app in Expo Go, then:

1. Visit each operational screen. Confirm white status icons, correct notch/status-bar clearance, a single header and readable titles at the device's font size.
2. Open Add Production, New Sale, New Dispatch and Add Expense. Focus fields near the bottom; confirm the keyboard does not cover the current field or prevent scrolling to the primary action.
3. Use add/back actions and Android system Back. Confirm root tabs have no back arrow and tab navigation retains session blocks and inventory filters.
4. Save a granite block and confirm it appears in Production, Inventory, Details and the existing live Home totals. Check FT/M and CFT/m³ display without changing the business rules.

Physical Android checks remain pending; no device pass is claimed. The supplied untracked design references are preserved. Commit locally only and wait for Expo Go verification before any push.
