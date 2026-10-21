# QuarryOne V0.4.3A.3.1 — Editable quarry prefill and automatic code

Base: 3075fb4. Open **More → Demo Business Setup**, enter Business Registration and Continue to Quarry Configuration. The five-stage wizard, quarry/pit management, validation, reference guards and session-only state are reused. No Supabase objects, UUIDs, migrations, RLS, authentication or operational workflows are changed.

## One-time prefill

On the first Quarry Configuration mount, an idempotent INITIALIZE_PRIMARY command copies only Business Name → Quarry Name, State → State, District → District and Address → Address. Leading/trailing whitespace is trimmed. Owner name and business phone are not copied. A new session flag records that initialization has occurred, including an empty-business first visit. Existing nonempty quarry fields/code are preserved if the first initialization encounters an already edited/seeded draft.

The fields remain ordinary editable inputs. Business and Quarry are separate objects: quarry edits never modify Business Registration. Returning through Back/Continue, saving or resuming does not reinitialize. Later Step 1 changes are not synchronized automatically, even when a quarry field was deliberately cleared.

The primary card offers **Copy Business Details**. Its confirmation explains that four editable quarry fields will be replaced with the latest Step 1 values; Cancel preserves them, and Confirm copy is required before the command can apply. Code, local IDs, pits and benches are preserved. This is a deliberate one-time copy, not ongoing synchronization. If the copied business district is blank, the quarry's required-district validation still applies.

Reset Demo Draft clears both entities, the initialization flag and all prior content, returning to the existing blank Single Quarry defaults. First entering Step 2 again performs a fresh initialization. Reload/restart still loses this entire in-memory demo draft.

## Deterministic code rules

`src/features/onboarding/quarryCode.ts` is a pure generator:

1. Apply Unicode NFKD normalization, remove combining accent marks, uppercase, and extract ASCII A–Z/0–9 token runs. Original quarry names remain untouched; this is not Telugu/other-script transliteration.
2. With three or more tokens, take the first character of each of the first three tokens. With two tokens, take up to the first two characters of token one plus the first character of token two. With one token, take up to its first three characters. Empty/punctuation-only/non-ASCII-only names use **QRY**.
3. Append the first unused positive suffix beginning **01**, compared against all other current draft-site codes after trim/uppercase. Suffixes have a minimum width of two digits: 01…99, then 100, etc.; there is no truncation or forced 99-site limit. Selection is deterministic for the supplied name and current occupied-code set.

Examples: **Sri Lakshmi Granites → SLG01**, **Deccan Stone Quarry → DSQ01**, **ABC Granites → ABG01**, Granite → GRA01, AB → AB01, A → A01. Punctuation separates tokens; Café → CAF01. An occupied SLG01 makes the next suggestion SLG02. Gaps may be reused because this is current-draft uniqueness, not the durable granite-block numbering ledger.

The primary code is suggested during its first initialization if it has no existing code. Every additional empty quarry receives a unique fallback such as QRY01/QRY02 immediately on Add Quarry. Assigned codes remain stable when names change. After naming a new quarry, **Regenerate Code** explicitly derives a suggestion from its current name. The action excludes that site's own code from the occupied set, so regeneration with an unchanged name may retain the same code.

Users may edit or clear a code. No later name edit, navigation, resume or business copy automatically replaces a manual code or manual clearing. Regenerate Code is the explicit user-requested replacement operation. Existing required/duplicate-code validation is retained: clearing remains invalid for Continue until edited/regenerated. Save Draft can still retain incomplete or conflicting setup without claiming activation readiness. Only generated suggestions are guaranteed ASCII alphanumeric; existing manual-code validation behavior is preserved.

These are editable human-readable draft codes, not database UUIDs or durable counters. Single/multi behavior, exactly one primary, per-site pit validation, confirmed removals and stockyard/invitation reference guards are unchanged.

## Files

- Added `src/features/onboarding/quarryCode.ts` and `tests/onboarding/quarryPrefill.test.cjs`.
- Updated `src/features/onboarding/model.ts` (session initialization flag), `src/features/onboarding/quarrySetup.ts` (initialization/copy/regenerate commands and additional-site suggestions) and `src/screens/QuarryConfiguration.tsx` (one-time effect and existing confirmation dialog/actions).
- Updated `scripts/verify-onboarding.cjs` with new scenarios while retaining the previous wizard, registration and quarry regression checks. Earlier evidence directories are preserved.
- Updated `docs/ONBOARDING_ARCHITECTURE.md` and added this verification directory.

## Validation

```text
node --require ./tests/register-typescript.cjs --test tests/blocks/*.test.cjs tests/onboarding/*.test.cjs
npm run typecheck
npm run lint
node node_modules/expo/bin/cli export --platform web
node scripts/verify-onboarding.cjs
```

Executed results: **TypeScript PASS, ESLint PASS, 102 automated tests PASS (0 failures)**, formatting/whitespace checks PASS, web export PASS (73 static routes), and browser checks PASS at **360px, 390px and 412px**. The suite includes the prior 88 tests and 14 new prefill/code cases: initial mapping, independent edits, no business mutation, examples/edge names, collision suffixes (including beyond 99), stable manual/cleared codes, explicit regeneration, Back/Continue and Save/Resume, later Step 1 changes, confirmed copy, reset, additional-site uniqueness, and operational/network isolation.

The responsive run preserves prior registration/quarry/wizard regression coverage and adds editable initial prefill, later Business changes without automatic overwrite, Cancel/Confirm copy, manual code retention, explicit regeneration, new-site fallback codes and updated field validation. It records zero page errors and zero observed mutation/Auth/database requests. The 27 screenshots include new prefill views plus historical-scenario regressions with current code. See `validation-results.json`, `responsive-results.json`, [390px prefill](prefill-390.png) and [360px additional quarry with regenerated code](second-quarry-360.png).

Metro reported an unreadable file-map cache and automatically recovered using a full crawl; the export then completed successfully. Color-output environment warnings were also nonblocking. No dependency, source workaround or configuration change was required.

## Android review and deferred work

In Expo Go, verify initial prefill, edit all four quarry fields, navigate Back and confirm business values did not change. Change Step 1 and return: quarry edits/code must remain. Test Cancel/Confirm copy, Regenerate Code after naming an additional quarry, manual code preservation and duplicate errors. Save/reopen/reset and verify the expected session-only behavior. Check keyboard-open scrolling, 48px actions, safe areas, hardware Back dismissing the confirmation, TalkBack and larger fonts at 360/390/412px. Physical Android checks remain pending.

Non-Latin names intentionally use QRY when no ASCII tokens exist; automatic transliteration is deferred. Materials & Measurements, other remaining forms, Supabase persistence/Auth, server uniqueness enforcement, durable ID mapping and activation remain outside scope. Wait for Android review before V0.4.3A.4. Do not push automatically.
