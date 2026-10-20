# QuarryOne V0.4.3A.2 — Business Registration

Base: f29afbe. Open **More → Demo Business Setup → Business Registration**. This is a UI and session-draft milestone only. Nothing is sent to Supabase, Auth or a GST verification service. The other four onboarding stages remain placeholders.

## Form and validation

Business Information contains required Business Name, Business Contact Number and State, plus optional Legal Business Name, District, Business Address and GSTIN. Owner Information contains required Owner Display Name. Required labels carry an asterisk. The existing FormField provides 54px inputs, inline errors, accessibility hints/required/invalid markers, a phone keyboard, uppercase GSTIN input and a multiline address. Cards, colors, header, progress and action buttons reuse the approved design system.

`src/features/onboarding/businessRegistration.ts` supplies a pure validator and normalizer with centralized labels, hints and error copy. Stable field keys and Unicode-friendly name/state/address validation prepare for future Telugu localization; no localization dependency or actual translated interface is introduced.

- Required text must remain nonempty after trimming. Internal spacing and multiline addresses are preserved; names/state/district may contain Telugu or other Unicode text. State is a required free-text field, not a government-directory lookup.
- The supported India-first contact format is a **10-digit mobile number starting 6–9**, optionally prefixed with **+91**. Spaces and hyphens are accepted and removed on validation. Bare 91/leading-0 prefixes, landlines, other country codes, extensions, letters and parentheses are outside this milestone's supported format. The helper explains the mobile format beside Business Contact Number. No ownership/OTP/reachability verification is claimed.
- Optional GSTIN is trimmed and uppercased. If supplied, it must match the standard PAN-based 15-character shape: nonzero two-digit code, five letters/four digits/one letter, nonzero alphanumeric entity code, Z and one alphanumeric check character. This is **structure only**: no checksum, state-directory matching, special GST/UIN formats, registration status or external service check. See the official [GST registration structure reference](https://gst.kar.nic.in/latestupdates/ppt-regn-29102015-new.pdf).

Continue and Save Draft both validate required fields and supplied optional GSTIN. Invalid attempts stay on Business Registration, retain entries and show inline errors plus an alert summary; no success acknowledgement is shown. This deliberately follows the requirement not to display success while required information is invalid. Editing an errored field rechecks that field. A valid Continue advances through the existing allowlist to Quarry Configuration. A valid Save Draft shows exactly **“Demo draft saved for this session.”** The screen explicitly says data is not yet saved to Supabase.

## Existing draft integration

Every edit updates the existing onboarding draft context, so partial entries survive header/footer Back, leaving/reopening the wizard and navigating to other stages. There is no second store or local form-value copy. Only validation errors are screen-local. Save/Continue commit trimmed values (and normalized phone/GSTIN); a revalidation of unchanged values preserves the previous session-save acknowledgement. Business Registration suppresses an acknowledgement inherited from another stage if its own required values are invalid.

BusinessDraft adds only district/address with empty defaults. Reset Demo Draft clears all eight business values, local errors, session acknowledgement and the navigation bookmark. Reload/restart clears the entire in-memory draft. There is no persistence or real business creation. Business district/address still need a separately reviewed future server-save whitelist/schema mapping; this milestone does not silently alter database contracts.

The shared OnboardingStepLayout gains optional content, before-Continue/before-Save guards, reset cleanup and confirmation/preferences display hooks. Defaults preserve the other four stages. No destinations, route allowlist, navigation architecture or navigation-action component is duplicated. FormField extensions are optional; existing operational callers keep their previous defaults.

## Files

- Added `src/screens/BusinessRegistration.tsx` and `src/features/onboarding/businessRegistration.ts`.
- Modified `src/app/onboarding/business.tsx`, `src/features/onboarding/model.ts`, `src/components/onboarding/OnboardingStepLayout.tsx`, `src/components/ui.tsx` and `docs/ONBOARDING_ARCHITECTURE.md`.
- Added `tests/onboarding/businessRegistration.test.cjs`; updated `scripts/verify-onboarding.cjs` to exercise registration plus all existing wizard navigation/resume/reset checks and write new evidence here, preserving historical V0.4.3A.1 artifacts.
- Added this report, validation summaries and browser screenshots in `verification/v043a2/`.

## Validation

```text
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
npm run typecheck
npm run lint
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

Final executed results: **TypeScript PASS, ESLint PASS, 72 automated tests PASS (0 failures)**, formatting/whitespace checks PASS, web export PASS (73 static routes), and browser checks PASS at **360px, 390px and 412px**. The automated suite contains 53 operational/domain tests, 10 onboarding foundation tests and 9 registration tests. The browser script checks all eight fields, required/invalid markers, phone input type, invalid Continue/Save blocking, format correction, trimming, Telugu input preservation, successful navigation, save acknowledgement, partial Back/reopen retention, full navigation regression, reset, reload clearing, and invalid confirmation inherited from a placeholder. It also checks overflow, 48px touch targets, header bounds and observed mutation/Auth/database network requests. Final evidence records **zero page errors and zero mutation/Auth/database requests**.

The first browser run found that revalidating unchanged values cleared a previous save acknowledgement; normalization now dispatches a draft update only if values change, and the rebuilt full suite passed. Invalid Business Registration also hides an acknowledgement inherited from a saved placeholder stage. The final artifacts replace partial screenshots from the initial run. Export notices concerned color-output environment variables only; no dependency/config workaround was introduced.

See `validation-results.json`, `responsive-results.json`, [390px Business Information](business-390.png), [360px Owner Information/actions](owner-actions-360.png) and [412px inline validation](validation-412.png). All 12 screenshots are synthetic browser fixtures, not physical Android evidence.

## Manual Android / Expo Go validation pending

1. Start Expo, open Android Expo Go and enter through More → Demo Business Setup. Check dark header/status bar, safe areas, 360/390/412px widths and larger system fonts. No physical Android pass is claimed.
2. Tap Continue and Save Draft with empty/invalid entries. Confirm errors are readable, announced and no success appears. Correct fields using the phone keyboard, enter a multiline address and optional GSTIN, then save/continue.
3. With the keyboard open, scroll from the first input to Owner Information and Continue/Save Draft. Confirm buttons remain reachable, tapping them works, and Android system Back dismisses/exits appropriately. Browser tests cannot validate a real soft keyboard.
4. Navigate Back, leave/reopen, and verify values. Try incomplete entries, reset from Business Registration and another stage, then reload/restart to verify session-only defaults. Check Telugu text entry/rendering and TalkBack on-device.
5. Verify Home, Production and Inventory retain their existing behavior and records.

No database, Auth, migration, RLS/grant, operational model/store, dependency or backend configuration changes are included. Do not push automatically. Wait for Expo Go validation before V0.4.3A.3.
