# QuarryOne V0.3.1 — Granite block domain foundation

Foundation only. No existing screen, navigation, form behavior, legacy mock fixture or visible app version was changed. No backend, persistence, synchronization, reservations, sales, dispatch or collections modules were introduced.

## Created files

| File                                     | Responsibility                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/domain/blocks/types.ts`             | Immutable block, dimension, grade, material, status and reference types; add-input contract |
| `src/domain/blocks/volume.ts`            | Pure CFT/m³ calculations, conversion, positive-dimension validation and display formatting  |
| `src/domain/blocks/block.ts`             | Block construction, ISO calendar-date/metadata validation and block-number formatting       |
| `src/domain/blocks/operationsReducer.ts` | Pure add/reset transitions, catalog validation and collision prevention                     |
| `src/data/blocks/referenceData.ts`       | One quarry, two pits, four customer references                                              |
| `src/data/blocks/mockBlocks.ts`          | Sole deterministic seed source for 18 individual blocks                                     |
| `src/stores/mockOperationsStore.ts`      | Shared in-memory inventory plus isolated store factory for testing                          |
| `src/stores/useMockOperations.ts`        | Opt-in React subscription adapter, not mounted in the existing app                          |
| `tests/register-typescript.cjs`          | Test-process-only loader using the already-installed TypeScript compiler                    |
| `tests/blocks/volume.test.cjs`           | Calculation, conversion, precision, formatting and invalid-value tests                      |
| `tests/blocks/operations.test.cjs`       | Inventory, identity, reset, immutability, subscription and reducer tests                    |
| `docs/granite-block-foundation.md`       | This architectural/validation record                                                        |

Only `package.json` was modified among existing files, adding `test:domain`. Dependency declarations and the lockfile are unchanged. No libraries were installed or upgraded.

## Domain and measurement decisions

`GraniteBlock` carries an independent ID, unique `BLK-YYYY-NNNN` block number, ISO production date, quarry/pit foreign IDs, material, A/B/C grade, original length/width/height/unit, canonical `volumeM3`, stockyard location, status, supervisor and remarks. Quarry/pit names live in normalized reference records instead of being repeated on each block.

Dimensions support FT and M. Canonical volume is always unrounded m³, with `1 CFT = 0.028316846592 m³` (the international foot is 0.3048m). Calculations preserve original entered dimension values and units. JavaScript number precision is retained; no rounding is applied to inventory records. Display defaults are 2 decimal places for CFT and 3 for m³; callers can request 0–6 places. Invalid/nonfinite/nonpositive dimensions and nonrepresentable results are rejected. Zero is permitted for standalone conversion/formatting of empty inventory totals.

`calculateCubicFeet` and `calculateCubicMetres` accept either entry unit and return their named output unit. `formatVolume` always receives canonical m³, converts if needed, and appends the display unit. Financial/pricing arithmetic is deliberately absent.

## Deterministic shared data

- Quarry: Deccan Stone Quarry (`quarry-deccan`).
- Pits: Pit A and Pit B.
- 18 blocks: 15 AVAILABLE and 3 REJECTED, numbered `BLK-2026-0001` through `BLK-2026-0018`.
- Grades A/B/C; Black Granite, Grey Granite and Tan Brown; mixed FT/M entry examples.
- Fixed production dates from 19–24 September 2026; no randomness or current-time dependence.
- Four customer names reused from existing `mockCustomers` through a read-only identity projection. Existing customer account records are not mutated or copied into a new accounting ledger.

The new fixture is a reset seed, not a second live store. Runtime consumers must read inventory from the operations store. Legacy tonnes-based screen summaries remain independent during this phase, as required; no invented tonnes↔volume conversion or reconciliation was added.

The complete status union includes AVAILABLE, RESERVED, DISPATCHED and REJECTED for future domain work. Foundation creation/seed loading accepts only AVAILABLE or REJECTED; reservations/dispatch history and status-transition operations do not yet exist.

## Store and identity decisions

`mockOperationsStore` is the shared in-memory instance. `createMockOperationsStore()` creates isolated demo instances for tests. The store supports `getInventory`, `getBlockById`, `addBlock`, `resetDemoData`, `subscribe` and the stable initial snapshot needed for server rendering.

The core reducer/volume/model code has no React or React Native dependency. `useMockOperations` uses existing React `useSyncExternalStore` to subscribe to immutable, stable inventory snapshots. It is intentionally not imported by any current screen or root layout. Consumers can opt in later without changing the domain.

Adds recompute volume and validate date, grade/material/status, required metadata, quarry/pit membership and both identities before changing state. Invalid commands leave the previous inventory and ID sequence intact. Records, dimensions, catalogs and snapshot arrays are frozen to prevent consumers mutating canonical data behind the store.

IDs default to `block-YYYY-NNNN`; block numbers default to `BLK-YYYY-NNNN`, based on the entered production year and a deterministic session sequence. Explicit IDs/numbers are accepted after validation. Issued IDs and numbers remain remembered across reset. Reset restores the original records but does not recycle any identity issued during the session, including custom IDs. Higher explicit numbers advance the sequence and future explicit-ID collisions are skipped. The four-digit sequence fails clearly at capacity instead of issuing malformed numbers. A fresh store instance/restarted app begins a fresh demo session; these IDs are not global production IDs.

For later Supabase work, keep the domain types/calculations and introduce a repository adapter for remote I/O and identity assignment. Async loading, authentication, persistence, row schemas and sync policy are intentionally not implemented here. The mock API is synchronous because all current data is in memory.

## Validation

```powershell
npm run typecheck
npm run lint
npm run test:domain
```

- TypeScript: **passed**.
- ESLint: **passed**, no errors or warnings.
- Automated tests: **26 passed, 0 failed** using Node's built-in test runner and the existing TypeScript compiler; no new test dependencies.
- Coverage includes both dimension units, known conversions, fractional precision/round trips, display rounding, invalid dimensions/units/numeric range, duplicate prevention, adding/retrieving records, reset identity safety, invalid metadata/catalog/seed, immutable snapshots, subscriptions, reentrant observers and numbering capacity.
- Git diff confirms existing UI/navigation, mock screen fixtures, app configuration and dependency lock unchanged. The domain test command is the only existing-file change.

No UI or physical-device checks were required for this disconnected foundation. The store currently has no real persistence; demo changes disappear when its instance/app is recreated.
