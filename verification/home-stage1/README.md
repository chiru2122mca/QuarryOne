# QuarryOne UI Polish — Stage 1: Home

Reference reviewed: `docs/design-references/Figma_References_Screenshot.jpeg`, dashboard panel 3. The supplied reference was already untracked when this task began; it is preserved as input and excluded from this UI commit.

## Scope and layout

Only application files `src/screens/Home.tsx` and new `src/components/DarkAppHeader.tsx` change. Operational screens, routes, shared components/tokens/branding assets, the granite block models/store/fixtures, CFT/m³ utilities and dependencies remain unchanged. No Stage 2 implementation or new business feature was added.

Home follows the reference's compact hierarchy: fixed Deep Slate header with white branding text, approved emblem, notification outline and RK profile action; compact local-time greeting/date; four white KPI cards in a 2×2 grid; icon Quick Actions; horizontal Recent Dispatches cards with status and amount. Existing workspace, location, outstanding and stock information remains below the dispatch section, preserving its values and links while removing the oversized workspace panel from the primary flow.

The reusable header supports an optional title/back callback and action slot for future use. It is applied only to Home. It paints the top safe area Deep Slate and uses a native-only, focus-scoped light status-bar entry that restores the previous style when leaving Home. Web does not call unsupported native status-bar methods. Its content row is 56px, in addition to native top safe-area padding.

Brand artwork is unchanged: the approved emblem has no wordmark, so white Quarry/orange One text beside it does not duplicate in-image text. The existing RK initials are retained; no profile photo or replacement logo is generated. Dependency-free native geometry supplies the dashboard icons.

The existing fixed five-tab navigation remains unchanged. Its global appearance is not restyled in this Home/header-only stage. All Quick Actions and View All link to existing routes. The All pits context button opens the existing Production filters; no Home pit aggregation/filtering feature is introduced. The notification outline is a noninteractive visual placeholder, not a new notification module.

Current KPI/mock dispatch values are retained, including ₹68,400 Expenses. Reference trend percentages and dispatch times are omitted because they are not supported by existing data; no invented analytics or history were added. Greeting keeps the existing 05:00/12:00/17:00 local-time rules, minute refresh and foreground refresh.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings/errors.
- `npm run test:domain`: all 53 existing tests passed.
- `npx expo export --platform web`: passed.
- `node scripts/verify-home-polish.cjs`: passed at 360×844, 390×844 and 412×844, with no runtime errors.
- Browser checks: Deep Slate header, 56px row, profile touch target, 2×2 KPI geometry and retained values, complete figures without ellipsis, compact single-line Production action, existing dispatch records, five fixed tabs, no horizontal overflow, final content clear of navigation, fixed header during scrolling, morning/afternoon/evening updates and existing action/profile routes.
- Screenshots visually reviewed. A clipped Expenses figure at 360px was corrected with a 21px bold figure while other KPI figures remain 24px. Other labels/values remain readable and numeric data is unchanged.
- Git diff verifies operational screens, data, store, measurements, branding, tokens and dependencies unchanged.

Screenshots: `home-360.png`, `home-390.png`, `home-412.png`. They use a controlled 08:30 local clock to show the morning state; the app itself uses device time. `results.json` records browser outcomes.

Repeat browser QA after exporting web: start `node scripts/preview.cjs`, then run `node scripts/verify-home-polish.cjs` in another terminal. Installed Chrome is required.

## Review gate

Physical Android validation remains manual: top cutout/status-bar colors, light status icons on Home and restoration on other screens, system font scaling, scrolling and gesture/three-button navigation. No physical-device pass is claimed. Review these Home screenshots before authorizing Stage 2. This milestone is committed locally only; do not push automatically.
