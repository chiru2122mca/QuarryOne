# QuarryOne V0.3.3 — Granite block inventory management

Incremental work on `main`, starting from a clean V0.3.2 tree (`cdcacee`). The V0.3.1 block model, fixtures, volume utilities and session store are reused without modification. Production, Splash, Login, Home, branding, root store provider and the five-tab configuration are unchanged. No dependencies or backend/storage functionality were added.

## Inventory and business rules

More → **Block Inventory** opens `/more/stock`. The existing `/stock` path redirects there, preserving existing links. Inventory and Details are nested inside the More stack, keeping Home · Production · Dispatch · Sales · More visible and More selected. The former More tab wrapper moved to `more/index.tsx`; its other menu entries/appearance remain intact.

Six compact KPI cards calculate Total Blocks, Available Blocks, Available Volume, Reserved Blocks, Dispatched Blocks and Rejected Blocks from the complete shared inventory. Historical volume is explicitly labelled as including all statuses. AVAILABLE is the only status included in saleable/available volume. RESERVED, DISPATCHED and REJECTED never contribute to that value. Total historical count/volume includes all records.

The selector also defines **usable on-hand stock** as AVAILABLE + RESERVED: held blocks remain on hand but are not saleable; dispatched and rejected records are excluded from that usable subset and remain in historical records. No additional on-hand KPI or status-changing workflow was added.

The unchanged seed contains 18 historical blocks (15 AVAILABLE, 3 REJECTED). Reserved and Dispatched counts are zero because those workflows/history do not yet exist. Tests use isolated read-only examples of future statuses; no fabricated reservation/dispatch records are added to the app.

Each tappable card shows block number, material/grade, quarry/pit, original dimensions/unit, selected volume, stockyard location and current status. Sort order is production date descending, block number descending, then ID ascending as a stable final tie-breaker. All records remain visible by default, including rejected/dispatched history.

## Search, filters and details

- Block-number search is trimmed, case-insensitive and supports partial matching.
- Material, grade, pit and status filters combine with search using AND.
- Dropdown filters collapse behind Show/Hide Filters to avoid unnecessary initial scrolling; search remains visible.
- Clear Filters resets search and all four filters. Volume display is a separate preference and remains selected.
- `Showing X of Y blocks` clearly labels filtered results. KPI totals never use the filtered subset.
- Empty results explain how to clear filters. Filtering/sorting produces a projection, never mutates store records.
- CFT/m³ display uses the existing canonical-m³ conversion/formatting utilities.

Cards open `/more/block/[id]`. Details includes block number, production date, quarry, pit, material, grade, each dimension, original unit, both CFT and m³ volume, stockyard, supervisor, remarks and current status. It is read-only: no reservation, dispatch, rejection, adjustment, editing or upload action exists.

Missing, unknown or ambiguous IDs resolve to a Block not found message and an Open Block Inventory action. `/more/block` explicitly handles a missing ID. A session-created block disappears on full app reload; a previously saved link then gracefully shows the missing-record state.

Seed detail pages are pre-rendered for the existing static browser export using `generateStaticParams`. The local preview resolves nested-route HTML and uses the exported dynamic Details template for unknown IDs. Valid seed HTML is resolved before the fallback, avoiding incorrect SSR hydration. This is local static-file tooling, not a new API/backend or persistence layer.

## Store integration

Both screens call the existing `useMockOperations` hook, backed by the existing root `OperationsProvider` and singleton. Only search/filter/panel/unit preferences are local component state; block inventory, statuses and totals are never independently stored.

A successful Add Production save is immediately visible in Production and Inventory as AVAILABLE. Available volume increases by the new block's canonical volume. Details reads the same record, including original dimensions and stockyard/remarks. Tab/stack navigation keeps this session instance alive. Reload restores the original fixtures.

## Files added/modified

Added:

- `src/features/inventory/model.ts`: pure summaries, combined filtering/sorting, default filters and safe lookup.
- `src/screens/BlockInventory.tsx`, `src/screens/BlockDetails.tsx`.
- `src/app/(tabs)/more/_layout.tsx`, `index.tsx`, `stock.tsx`, `block/[id].tsx`, `block/index.tsx`.
- `tests/blocks/inventory.test.cjs`.
- `scripts/verify-inventory.cjs`.
- `verification/v033/results.json` and 360/390/412px screenshots.
- `docs/granite-block-inventory.md`.

Modified:

- `src/app/stock.tsx`: compatibility redirect; replaces the old tonnage Stock page.
- `src/screens/More.tsx`: Stock entry renamed/routed to Block Inventory.
- `src/app/(tabs)/more.tsx`: removed in favor of the nested More stack's index wrapper.
- `scripts/preview.cjs`: nested static-route and dynamic Details resolution.
- `package.json`: adds `verify:inventory`; dependencies unchanged.
- `README.md`: current module documentation links.

## Actual validation

```powershell
npm run typecheck
npm run lint
npm run test:domain
npx expo export --platform web
node scripts/preview.cjs
# In another terminal:
npm run verify:inventory
```

- TypeScript: **passed**. Expo CLI regenerated the initially stale route definitions; no unsafe route casts or type-check exclusions were added.
- ESLint: **passed**, no warnings/errors.
- Automated domain/feature tests: **53 passed, 0 failed** (all 38 existing V0.3.1/V0.3.2 tests plus 15 Inventory tests).
- Tests cover historical/status counts, available volume exclusions, usable on-hand exclusions, search, combined filters, immutable projections, deterministic sorting, formatting, Production additions, details lookup, invalid IDs, zero/empty results, clearing and provider identity across consumer remounts.
- Web export: **passed**.
- Android export to `.expo/v033-android`: **passed**. This is a bundle check, not an installed-device test.
- Browser workflows: **passed** at **360×844, 390×844 and 412×844**, no runtime errors or horizontal overflow. Verified all KPI counts, search/filter intersection, unchanged whole-inventory KPIs, clear/empty states, unit selection, read-only Details, both missing/invalid and valid deep links, a new Production block appearing in both modules with correct values/AVAILABLE status, tab retention, final content clear of tabs and `/stock` compatibility.
- Screenshots visually reviewed. The static preview's initial directory-resolution and hydration defects were corrected and the full suite rerun with runtime-error assertions retained.
- Git diff confirms domain, fixture data, shared store, Production screens, protected screens, branding, app configuration and dependency lock unchanged.

## Manual Android testing and limitations

```powershell
pnpm install --frozen-lockfile
pnpm start --clear
```

Scan the terminal QR code in SDK 57-compatible Expo Go, with phone and PC on the same network.

1. Open More → Block Inventory: expect 18 total, 15 available, 3 rejected and 0 reserved/dispatched. Confirm historical volume exceeds available volume.
2. Search `BLK-2026-0001`; combine material/grade/pit/status filters, try an empty result, then Clear Filters. KPIs must remain full-inventory values.
3. Switch CFT/m³; open a block and verify all original measurements, both volumes, location, supervisor, remarks and status. There must be no status-changing action.
4. Add a 10×5×4 FT Production block with a stockyard location. Open Inventory: expect 19 total, 16 available, an extra 200 CFT available, and the new record first when produced today. Open Details to verify 200.00 CFT / 5.663 m³ and your entered values.
5. Switch all bottom tabs and return. The same block must remain. Reload the app: the added block is gone and fixtures return to 18.
6. Check search keyboard scrolling, enlarged font/display settings, card touch areas, nested-stack/hardware Back, status-bar/cutout insets and gesture/three-button navigation at the requested device widths.

**Pending:** No physical Android device/emulator was available. Native safe-area, font-scaling, keyboard and system-navigation checks remain manual. No unresolved automated issue is known. Session-only storage, no status transitions and zero reserved/dispatched fixtures are intentional scope limitations. Other dashboard metrics remain their existing static mock values. Do not push until physical Android testing and review approve this local milestone.
