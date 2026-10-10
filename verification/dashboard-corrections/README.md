# Stage 1 — Final dashboard corrections

Application scope: `src/screens/Home.tsx` only. Header, logo, 2×2 card layout, Quick Actions, Recent Dispatch card layout and fixed tab navigation are retained. No operational rules, domain models, store implementation, fixtures, dependencies, backend configuration or persistence were changed.

## Live values

Home now subscribes through the existing `useMockOperations` hook. Production uses the existing `productionTotals` selector and `formatVolume` utility: count of all produced records plus their unrounded canonical m³ sum, rounded only for display. Rejected records are included exactly as in the existing Production totals. This is session-derived data, not a new server feed or a today-only production total.

The lower Stock summary reuses `inventorySummary` to show AVAILABLE block count and available m³. Its business/status exclusions remain unchanged. Adding a block from existing Add Production updates both Home summaries immediately through the existing subscription.

## Demo-only values and units

- Dispatch KPI: count of the existing mock dispatch records, labelled Records · Demo. It is not a live block-dispatch total.
- Sales: existing ₹4.25 L mock value, labelled Today · Demo.
- Expenses: existing ₹68,400 mock value, labelled Today · Demo.
- Outstanding: existing ₹8.75 L mock value, labelled Outstanding · Demo.
- Recent Dispatches: same mock vehicle/customer/material/status/amount cards, with a Demo section label. Their old tonne quantities are omitted rather than falsely converted to CFT/m³ or presented as live block dispatch data.

No Tons labels remain anywhere on Home. No linked dispatch blocks, live financial data or measurement conversion from mass was invented. Operational demo modules remain unchanged until separately integrated.

Body gaps reduce 12→10px and KPI vertical padding 12→10px, with a 100px minimum card height. The live volume line is retained at 14px, count/value figures remain 24px (Expenses 21px to avoid 360px clipping), and demo/source captions use 12px. Interactive target sizes and the approved hierarchy remain intact.

## Validation

Final results: TypeScript passed, ESLint passed, all 53 existing automated tests passed (0 failures), and browser checks passed at 360px, 390px and 412px with no page errors. The live Production/Stock updates were verified through the existing Add Production workflow at every width.

Run `npm run typecheck`, `npm run lint`, `npm run test:domain`. Browser QA uses `npx expo export --platform web`, `node scripts/preview.cjs`, then `node scripts/verify-home-polish.cjs` in another terminal.

The existing 53 business/domain tests remain unchanged. Browser checks cover 360/390/412px, full numeric figures, 2×2 geometry, source labels, absence of Home tonnage, greeting rules, fixed header/navigation, preserved actions, and adding a 10×5×4 FT block through Production. Expected live updates: produced count 18→19, produced volume 78.729→84.392 m³ and available stock 15→16. These test snapshots use a controlled local clock; application data is still session-only and device-time-aware.

See `results.json` and initial/updated Home screenshots for the final browser outcomes. Physical Android status-bar/safe-area, keyboard and font-scaling checks remain manual. The supplied design reference remains untouched and untracked as before; the commit includes only this correction and its QA artifacts. Do not push automatically or proceed with Stage 2 without review.
