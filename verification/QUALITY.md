# Verification record

Checked on 6 October 2026.

- `npm run typecheck`: passed with no TypeScript diagnostics.
- `npm run lint`: passed with no lint warnings/errors.
- `npx expo export --platform android`: passed; Hermes Android bundle generated. This is a bundle check, not an installed APK test.
- `npx expo export --platform web`: passed; static route export generated.
- Browser checks: 17 routes at each of 360×844, 390×844 and 412×844; route resolution and horizontal overflow checked. Screenshot samples stored here.
- Interaction checks: branded welcome → login → Home; tabs; production validation/success; dynamic sale total (20×4200 = 84000; 30×4200 = 126000), sale success; dispatch/challan confirmation; More → Reports → placeholder.
- Source review: safe-area provider, screen top/bottom insets, bottom tab inset height, no absolutely positioned tab bar, scrollable forms, Android keyboard resize, KeyboardAvoidingView, numeric decimal keyboard and minimum 54px primary controls.

See `results.json` for the final browser run and `files.txt` for created source/assets/tooling files.

Physical Android keyboard behavior, navigation-bar/cutout safe areas and installation remain unverified because no device/emulator was available. Browser emulation cannot establish native behavior.

`audit.json` records npm's 31 dependency advisories (21 high, 10 moderate). Major-version forced remediation was not applied to this SDK-pinned prototype.
