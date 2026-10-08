# QuarryOne: Expo SDK 55 → 57

The upgrade used Expo's resolver: `pnpm exec expo install expo@^57.0.0 --fix --pnpm`. The installed Expo CLI restarted under SDK 57 and ran its recommended dependency alignment with npm, because this project had both npm and pnpm lockfiles. React Native and related library versions were selected by Expo, not manually guessed.

## Changed files

- `package.json` and `package-lock.json`: 23 direct dependency ranges upgraded; all resolved changes recorded in `DEPENDENCIES.md` and `lockfile-changes.json`.
- `app.json`: Expo automatically registered config plugins for already-existing `expo-font`, `expo-image` and `expo-web-browser` dependencies. Branding, platform identifiers and all existing settings preserved.
- `eslint.config.js`: excludes generated `.expo/**` files, in addition to existing `dist/**` exclusion.
- `README.md`: SDK number and current advisory count/report path updated.
- Root `pnpm-lock.yaml` archived to `verification/sdk57/pnpm-lock.intermediate.yaml` after Doctor identified competing lockfiles. npm is the authoritative install workflow and lockfile. The archived lockfile reflects the intermediate Expo-only upgrade, not the completed dependency graph. `pnpm-workspace.yaml` was preserved.
- `verification/sdk57/`: before/after source hashes, pre-upgrade package manifest/npm lockfile, dependency report and post-upgrade npm audit.

## Compatibility issues encountered and resolved

1. Doctor initially passed 20/21 checks; the remaining failure was multiple root lockfiles. Archived the competing pnpm lockfile and retained the SDK 57 npm lockfile. Doctor subsequently passed 21/21 checks.
2. Lint initially warned about an unused disable directive in generated `.expo/types/router.d.ts`. Added `.expo/**` to tooling ignore patterns; did not edit generated files or app source. Lint subsequently passed without warnings.
3. Initial install showed transitional peer warnings while Expo itself had upgraded but the remaining packages were still on SDK 55. After Expo alignment, Doctor's peer, duplicate package and SDK version checks all passed.
4. npm reported deprecated ESLint/transitive packages and 30 security advisories (19 high, 11 moderate). The SDK-recommended lint config remains compatible with the existing ESLint 9 version. No unrelated forced major upgrades were applied. See `audit.json`.
5. Metro may emit a terminal `NO_COLOR`/`FORCE_COLOR` environment warning. This concerns log coloring, not app code or SDK compatibility.

QuarryOne imports navigation from Expo Router rather than directly from React Navigation, so the SDK 56/57 Router migration did not require source changes. No backend functionality or Supabase resources added.

## Checks

- `npx expo install --check`: **passed**, dependencies are up to date.
- `npx expo-doctor@latest --verbose` (Doctor 1.20.4): **21/21 passed**.
- `npm run typecheck`: **passed**, using TypeScript 6.0.3.
- `npm run lint`: **passed**, no warnings/errors after the generated-file exclusion.
- `npx expo export --platform android --output-dir .expo/sdk57-android`: **passed**, SDK 57 Android Hermes bundle generated.
- `source-before.json` vs `source-after.json`: all source files identical by SHA-256, including UI, routes, mock data and behavior.

Physical Expo Go/device testing was not performed. The dependency graph targets SDK 57; installed phone Expo Go must support SDK 57.

## Run

```powershell
npm install
npx expo start --clear
```

References: [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 57 release notes](https://expo.dev/changelog/sdk-57), [SDK 56 release notes](https://expo.dev/changelog/sdk-56).
