# QuarryOne V0.2 — Branding and mobile UI refinements

## Repository verification

On 8 October 2026, before modifications: working tree clean, branch `main`, origin `https://github.com/chiru2122mca/QuarryOne.git`. Approved `assets/branding/quarryone-logo.png` existed and was tracked. Inspected the existing Router tabs/stack, shared branding/styles, Welcome, Login, Home, entry forms and More. The Expo project was retained; no dependency versions, operational modules, backend or mock-data fixtures were changed.

## Files

Created:

- `src/components/QuarryOneLogo.tsx`
- `assets/branding/quarryone-icon.png`
- `assets/branding/quarryone-adaptive-foreground.png`
- `scripts/prepare-brand-icon.ps1`
- `scripts/verify-v02.cjs`
- `verification/v02/README.md`, `results.json` and responsive screenshot samples

Modified:

- `src/config/theme.ts`: central approved asset, measured source aspect ratio, V0.2 display version.
- `src/components/ui.tsx`: logo-based Brand, optional screen spacing, opt-in compact KPI cards, Quick Action label/spacing/accessibility improvements, uppercase input option.
- `src/app/index.tsx`: flexible in-app welcome layout, official logo, required copy and V0.2 footer, shorter existing quarry blocks.
- `src/app/login.tsx`: logo integration through Brand and tighter surrounding padding.
- `src/app/settings.tsx`: central V0.2 display version.
- `src/screens/Home.tsx`: compact KPIs, tighter vertical rhythm, current device date.
- `src/screens/EntryForm.tsx`: shared spacing improvements for all four forms and uppercase vehicle entry.
- `src/screens/More.tsx`: compact menu cards and spacing.
- `app.json`: version 0.2.0 and official emblem-only icon/native launch references.
- `package.json`: app version 0.2.0 only; dependency declarations unchanged.
- `README.md`: handoff link.

## Branding and icon details

QuarryOneLogo displays the original, unmodified 1254×1254 approved PNG using contain scaling: Welcome 180px, Login 156px, Header 96px. The wordmark is already in the artwork, so Brand no longer adds duplicate QuarryOne text. The tagline is retained on Welcome/Login.

The launcher asset is an exact emblem-region extraction, not a generated replacement. `scripts/prepare-brand-icon.ps1` selects source rectangle `(190,100,840,840)`, excluding the wordmark. The approved emblem's artwork and white textured background are retained; only crop, proportional resize and white canvas padding are applied. The source logo is unchanged. Native launcher icons contain no wordmark.

Both icons are 1024×1024. The legacy icon places the crop within a centered 720px square; the adaptive foreground uses a centered 576px square (56.25% of the layer), inside Android's centered 66/108 safe zone. Its background is the existing card white `#FFFFFF`. No recolored or inferred monochrome emblem was created. The original intricate quarry scene remains inside the Q; an artist-supplied flat vector could improve very-small launcher legibility later.

The in-app Welcome is distinct from the native Expo launch splash. The latter now references the derived official emblem asset, while Welcome displays the complete emblem plus wordmark. Custom native icon/launch artwork must be checked in a rebuilt installed app, not claimed from Expo Go/browser testing.

[Android adaptive-icon guidance](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

## Mobile refinements

- Home KPI vertical padding 18→13px and internal gap 10→6px: roughly 12–13% shorter in normal text sizing, while preserving 25px KPI values. Other screens retain their original KPI sizes.
- Quick Actions use equal flex widths, 2px horizontal padding, 76px minimum height, centered single-line labels and limited font fitting for narrower/larger-text configurations. Production no longer breaks its final letter onto a second line.
- Home content gaps 16→12px and greeting margins 6→2px; shorter cards/actions bring Recent Dispatches higher. Quarry Workspace and all dashboard figures are preserved.
- Dashboard date uses local device time, refreshes every minute and refreshes when the app resumes. Existing September business fixtures/form choices remain unchanged.
- All four forms use gaps 20→14px, card padding 18→16px, screen gaps 16→12px. Inputs and primary buttons remain at least 54px; back action remains 48px. Decimal keyboards are retained. Vehicle Number uppercases typed or pasted characters. Save validation, calculated totals, confirmation and return routes remain unchanged.
- Existing KeyboardAvoidingView, scroll behavior, Android resize mode and keyboard tap handling are preserved.
- More cards use 66px minimum height and vertical padding 18→10px (about 18–20% shorter at standard text size), with all icons, titles, subtitles, chevrons and routes intact.
- Existing colors retained; no new brand colors added. App/display versions updated to 0.2.

## Validation

- TypeScript: **passed** (`npm run typecheck`).
- ESLint: **passed**, no errors/warnings (`npm run lint`).
- Expo Doctor: **20/21 passed**. The remaining check recommends newer SDK 57 patch versions: expo `57.0.26`→`~57.0.27`, expo-constants `57.0.20`→`~57.0.21`, expo-linking `57.0.11`→`~57.0.12`, expo-router `57.0.24`→`~57.0.25`. No demonstrated app incompatibility; dependency upgrades were intentionally not performed under this milestone's restriction.
- Web static export: **passed**.
- Android Hermes export: **passed**. The sandboxed attempt initially failed writing temporary bytecode; rerunning with the permitted environment resolved the filesystem issue without source/dependency changes.
- Browser suite: **passed**, 17 routes at 360×844, 390×844 and 412×844 (51 route/width combinations); no runtime errors or horizontal overflow. Checks logo ratio, welcome footer fit, Production label, date/rollover, numeric input modes, minimum form-button targets, existing tab clearance, reduced-height scrolling and uppercase vehicle input. Existing login/production/sale/dispatch/report flows also pass.
- Screenshots visually inspected for Welcome, Home and More, plus forms. Screenshot dates may show 9 October because the suite advances the clock across midnight to validate live refresh; app dates use the actual device clock.
- Git diff confirms dependency lockfile, approved logo and all `src/data` files unchanged. No pushes performed.

Repeat with `npx expo export --platform web`, start `node scripts/preview.cjs` in one terminal, then run `node scripts/verify-v02.cjs` in another (installed Chrome required).

## Outstanding manual Android tests

Browser reduced-height tests simulate available space; they do **not** test a native keyboard. No connected physical device/emulator was available. Before stakeholder distribution, manually check:

1. Notch/status/navigation insets with gesture and three-button navigation; final content remains clear of bottom tabs.
2. Welcome at smaller heights and larger Android font/display scaling; scroll fallback remains usable.
3. Numeric keyboard appearance, focused field visibility and reaching Save in all four forms with keyboard open.
4. Production label/font fitting and equal Quick Action alignment with device font settings.
5. Launcher masks (circle/squircle), emblem legibility, white background and native launch screen in an installed build.
6. Dashboard date after device timezone/date changes, midnight and background/resume.

Expo Doctor's four patch recommendations remain visible for a separately authorized maintenance update. No other unresolved automated UI issue is known.
