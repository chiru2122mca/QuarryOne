# QuarryOne V0.4.3A.3 — Configurable Quarry Setup

Base commit: 083d45b. Open **More → Demo Business Setup**, complete Business Registration, then Continue to **Quarry Configuration**. This milestone configures local onboarding drafts only; it does not create quarry sites, pits or organizations in Supabase. Business Registration and the existing operational workflows remain unchanged.

## Form and mode behavior

The form reuses OnboardingStepLayout, the dark QuarryOne header, five-step progress, existing FormField/SelectField/PrimaryButton components, safe areas and keyboard-safe scrolling. There are no new dependencies or navigation components.

The question **“Does your business operate multiple quarry sites?”** offers **No — Single Quarry** (default) and **Yes — Multiple Quarries**. A blank primary quarry is provided automatically, with required name/code/state/district and optional address. No example business details are seeded. Codes are trimmed and uppercased; site IDs remain stable during editing. Primary Quarry is displayed first and cannot be removed in this milestone.

Single mode hides Add Quarry and additional-site removal controls. Multiple mode allows blank additional quarry cards, each with independent pits/benches. Returning to Single with any additional site (including an incomplete card) is blocked, with an explicit message that no entries were deleted. The user must confirm removal of extras first; toggling the mode itself never discards data or hides unresolved sites.

Each site supports multiple editable pit/bench entries: a required name and PIT/BENCH selector (new entries default to PIT with a blank name). Every removal opens an explicit Cancel/Confirm dialog, including incomplete entries. Additional-site removal removes its nested pits only after confirmation. Removing the primary site is blocked at the command layer as well as omitted from the UI.

## Validation and draft state

Continue requires exactly one primary, valid required fields for every site, organization-draft-wide unique quarry codes, at least one named PIT/BENCH per quarry, and pit/bench names unique within each quarry. Code comparisons ignore case/outer whitespace; pit-name comparisons ignore case/outer whitespace. The same pit name is permitted in different quarries. Duplicate/required errors are inline after Continue is attempted and recompute as entries change. Names/address remain Unicode-friendly; no state directory or unsupported code-format rules are introduced.

Save Draft intentionally allows incomplete or conflicting setup to remain in the session. It trims site/pit text and shows **“Demo draft saved for this session.”** The screen explicitly states that saving does not mean configuration is ready for activation. Continue alone gates Step 3. Progress remains a navigation indicator, not server readiness.

All edits use the existing onboarding context/reducer via typed QUARRY_COMMAND actions. `src/features/onboarding/quarrySetup.ts` contains pure normalization, validation and command reduction. Commands apply against the latest reducer state so rapid additions allocate distinct IDs. The session counter is monotonic through removals and demo resets; primary/default content resets, but newly allocated site/pit identifiers are not recycled. Validation and trimming preserve existing identifiers. No second store, AsyncStorage or persistence is added.

Rejected commands preserve the entire draft and report an issue. Pit removal is blocked if a stockyard draft references it. Site removal is blocked by stockyard references (including nested pits) or invitation site assignments. No stockyard, invitation or other later-stage data is silently deleted or reassigned. These reference paths are tested with isolated in-memory fixtures because the later forms are not implemented. Future UI code should use these guarded commands for quarry edits rather than bypassing them through the foundational generic section updater.

Back, Continue and the existing demo entry preserve sites and pits for the current session. Reset Demo Draft returns to one blank primary quarry, Single mode and no pits, resets all other demo fields as before, and clears quarry issues. Reload/restart starts a fresh in-memory session. No server IDs, activation, archival, merging or transfers are implemented.

## Files

- Added `src/screens/QuarryConfiguration.tsx`, `src/features/onboarding/quarrySetup.ts` and `tests/onboarding/quarrySetup.test.cjs`.
- Updated `src/app/onboarding/quarry.tsx` to render the form.
- Updated `src/features/onboarding/model.ts` with quarry commands, a session ID counter and command issue state.
- Updated `scripts/verify-onboarding.cjs` to retain Business Registration/wizard regression checks and exercise quarry setup at 360px, 390px and 412px; evidence is written here without overwriting earlier milestones.
- Updated `docs/ONBOARDING_ARCHITECTURE.md` and added this verification report/results/screenshots.

## Validation

```text
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
npm run typecheck
npm run lint
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

The automated suite comprises 53 operational/domain tests, 10 onboarding foundation tests, 9 Business Registration tests and 16 quarry setup tests. It covers single defaults, required/primary integrity, code uniqueness/normalization, pit/bench editing and confirmed removal, duplicate names, multi-site enable/add/remove/disable resolution, stockyard/invitation dependency guards, stable/non-recycled IDs, Save/Resume/Back, reset, Step 3 readiness, Business Registration preservation and operational-store isolation. No database/authentication calls are used as fixtures.

Final executed results: **TypeScript PASS, ESLint PASS, 88 automated tests PASS (0 failures)**, formatting/whitespace checks PASS, web export PASS (73 static routes), and responsive browser checks PASS at **360px, 390px and 412px**. Browser checks retain the previous wizard/registration coverage and add default/partial quarry saves, Back retention, per-site requirements, duplicate codes/pit names, BENCH selection, Cancel/Confirm removal, blocked multi-mode disable, explicit resolution, stable IDs and Step 2→3 gating. Input/radio/button bounds and 48px touch targets were checked in single- and multi-quarry layouts and removal dialogs. The final run records zero page errors and zero observed mutation/Auth/database requests. Browser results do not establish physical Android behavior.

The first browser run found that the mode radio's composite accessibilityState did not expose checked status on React Native Web. Explicit aria-checked values fixed that cross-platform accessibility issue, and the rebuilt suite passed. The final confirmation also clarifies that removing a quarry removes its nested pits/benches. Nonblocking export notices concerned color-output environment variables; no dependency/configuration workaround was added.

See `validation-results.json`, `responsive-results.json`, [360px quarry form](quarry-360.png), [390px blocked mode change](multi-mode-blocked-390.png), [412px pits/actions](pits-actions-412.png) and [390px additional quarry](second-quarry-390.png). The 24 screenshots include both the new quarry scenarios and Business Registration/wizard regressions, all using synthetic browser data.

## Manual Android / Expo Go checks

1. Enter through More → Demo Business Setup. Verify Business Registration values survive Back/Continue and Step 2 reopens the same draft. Save an incomplete quarry, leave/reopen and verify the session-only acknowledgement without any activation claim.
2. Test the primary form, multiple pits/benches and multiple sites at 360px/390px/412px with large system fonts and Telugu names. Confirm input focus/keyboard scrolling and Continue/Save reachability, outdoor readability, header/status bar and bottom safe areas.
3. Test both removal cancellation and confirmation, Android hardware Back dismissing the dialog, and the PIT/BENCH selector. Confirm primary removal is unavailable and disabling Multiple with extras preserves every entry and displays the message.
4. Reset from Step 2, check single/blank defaults, and reload/restart to verify no persistence. Check Home/Production/Inventory remain unchanged.

Physical Android checks are pending. Deferred: Materials & Measurements form, editing dependency assignments in later forms, primary reassignment, site archival/transfers/merging, activation, Supabase Auth/persistence/server validation and durable ID mapping. No database migrations, RLS/grants, backend configuration, operational business logic or dependencies changed. Wait for Expo Go review before V0.4.3A.4; do not push automatically.
