# QuarryOne V0.2.1 — Logo sizing and header refinement

The working tree was clean on `main` before this refinement. The approved master remains byte-for-byte unchanged. No dependencies, app configuration, mock data, navigation, form behavior, KPIs, Quick Actions, workspace card or bottom tabs were modified.

## Changes

- `src/components/QuarryOneLogo.tsx`: full, compact horizontal and emblem-only variants; preserves image aspect ratios. Existing Welcome/Login/Header variant names remain supported. Horizontal branding uses one approved emblem crop and one approved wordmark crop, with no extra text wordmark. More/Settings inherit the compact presentation from the existing Brand wrapper.
- `src/config/theme.ts`: central references and measured aspect ratios for all three derivatives.
- `src/screens/Home.tsx`: 68px header, 224×48px compact branding with 44px emblem, RK aligned right, greeting 10px below header instead of the previous larger spacing. Existing 20px screen padding retained.
- `scripts/prepare-brand-derivatives.ps1`: reproducible crop/background-mask utility using built-in Windows drawing libraries; no new dependencies or image synthesis.
- `assets/branding/quarryone-full-transparent.png`: tightly cropped full approved artwork (1124×1070).
- `assets/branding/quarryone-emblem-transparent.png`: emblem-only crop (805×818).
- `assets/branding/quarryone-wordmark-transparent.png`: wordmark-only crop (1124×238).
- `scripts/verify-v021.cjs`: browser verification for new aspect ratios, compact header and transparency, plus existing regressions.
- `verification/v021/`: this record, results and screenshots at each requested width.

Splash and Login use the full transparent derivative through the existing component, so their screen files/layouts did not need modification. Splash retains its tagline, quarry graphic, headline and CTA. Its logo is centered and uses contain scaling. The native launch splash and launcher icons remain unchanged, as this request concerns in-app branding.

## Derivative integrity

The original 1254×1254 PNG is retained at `assets/branding/quarryone-logo.png`. The utility flood-fills only near-white, low-chroma background connected to the exterior; it also removes white matte inside the wordmark's letter counters, where the approved text has no white ink. Interior whites/highlights in the quarry scene are preserved. Kept RGB pixels are not recolored. Each derivative is cropped at original resolution; there is no redrawing, stretching or generated replacement.

Source crop rectangles: full `(65,108,1124,1070)`, emblem `(205,110,805,818)`, wordmark `(65,940,1124,238)`. Image dimensions are centralized alongside their asset references. A future master artwork change requires reviewing these crops/masks before regenerating.

## Validation

- TypeScript: **passed**, `npm run typecheck`.
- ESLint: **passed**, `npm run lint`, no warnings/errors.
- Web export: **passed**.
- Browser suite: **passed** at 360×844, 390×844 and 412×844; 17 routes per width, no runtime errors or horizontal overflow.
- Header geometry: height within 64–76px (68px measured), branding clears avatar by at least 8px, RK right-aligned, greeting within 12px below header.
- Logo proportions: correct full/compact aspect ratios at all three widths. Canvas checks confirm actual alpha transparency at full-logo background corners.
- Existing tab clearance, save-flow, form/numeric input, uppercase vehicle and date-rollover checks continue to pass. Screenshots use a controlled clock; Home may show 9 October after the deliberate midnight-rollover test.
- Welcome/Home/Login screenshots visually reviewed: no white rectangle, no duplicated wordmark, no clipping or overlapping header elements.
- `git diff` verifies approved master, package manifest, lockfile, app configuration, mock data and tab navigation unchanged.

Repeat: `npx expo export --platform web`, run `node scripts/preview.cjs`, then run `node scripts/verify-v021.cjs` in another terminal (installed Chrome required).

SafeAreaView/inset handling is unchanged and source-reviewed. No physical Android device/emulator was available: notch/status/navigation insets, native font rendering and larger display/font settings remain manual checks. Browser checks are not represented as physical-device validation.
