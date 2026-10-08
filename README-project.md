# QuarryOne — V0.1

Static React Native / Expo SDK 57 / TypeScript / Expo Router mobile prototype. No backend services or Supabase resources.

## Run

```powershell
cd C:\Users\Chiru\Documents\ChatGPT\QuarryOne
npm install
npm start
```

Open compatible Expo Go on Android and scan the terminal QR code. Phone and PC should share a network. If LAN discovery fails, run `npx expo start --tunnel` (internet and Expo tunnel dependency required). `npm run android` opens a configured emulator; `npm run web` opens browser review.

This is phone-testable through Expo Go. A standalone APK was not built; Android build/signing is a separate workflow.

## Files and architecture

| Location                                                                             | Purpose                                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `src/app/`                                                                           | Route files, root Stack and five-tab navigator                        |
| `src/screens/`                                                                       | Home dashboard, filtered lists, entry forms and More menu             |
| `src/components/ui.tsx`                                                              | Reusable visuals and safe-area/keyboard wrapper                       |
| `src/config/theme.ts`                                                                | Palette, central branding and common workspace copy                   |
| `src/data/types.ts`                                                                  | Production, Sale, Dispatch, Expense, Customer, Stock and Status types |
| `src/data/mock*.ts`                                                                  | Six independent typed business datasets                               |
| `src/data/overview.ts`                                                               | Summary fixtures, report names and Indian currency formatting         |
| `src/data/forms.ts`                                                                  | Form schema, labels and local dropdown choices                        |
| `assets/images/quarryone.png`                                                        | Temporary industrial Q mark                                           |
| `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js` | Expo configuration and tooling                                        |
| `scripts/preview.cjs`, `scripts/verify-prototype.cjs`                                | Local static preview and browser verification                         |
| `verification/`                                                                      | Width screenshots, test results and dependency audit                  |

Brand uses one asset reference in theme.ts; native splash/icon configuration points to the same asset file. Replace that file to update all surfaces. The starter also supplied .gitignore, .vscode and AGENTS.md.

Business objects are independent of React Native. Replace mock imports with repository hooks later while retaining UI props and domain types. Strings live in presentation/config/schema files rather than domain logic, ready to extract for English/Telugu localization. No localization or chart library added.

## Routes and completed screens

```text
/                         Branded splash / welcome
/login                    Static login
/(tabs)/home              Operational dashboard
/(tabs)/production        Production records + date/pit filters
/(tabs)/dispatch          Dispatch records + status filter
/(tabs)/sales             Sales records + status filter
/(tabs)/more              More menu
/add-production           Production form
/new-sale                 Sale form + live quantity × rate
/new-dispatch             Dispatch form + simulated challan
/expenses                 Expense list + category filter
/add-expense              Expense form + bill/photo placeholder
/stock                    Stock overview + proportional indicators
/customers                Sales, receipts and outstanding per customer
/reports                  Seven report destinations
/report/[id]              Static report placeholder
/profile                  Static manager profile
/settings                 Static language/connection information
```

Tab screens also have public URLs /home, /production, /dispatch, /sales, /more.

## Reusable components

Screen, Brand, AppHeader, KpiCard, StatusChip, QuickActionCard, SectionHeader, EmptyState, FormField, SelectField, PrimaryButton, ListCard and DemoNote.

Inputs and primary actions have minimum 54px heights. Content scrolls, safe areas are applied, bottom tabs participate in layout and account for bottom insets. Android uses keyboard resize; forms use KeyboardAvoidingView and keyboard-aware ScrollView.

## Assumptions / behavior

- Reference business date: 24 September 2026, matching September examples rather than device date.
- Login opens Home without credential validation. OTP/recovery explain placeholder status.
- Positive numeric entries and nonempty required text are validated locally; remarks optional.
- Saves show success dialogs and return to lists. Entries are not persisted or appended.
- Generate Challan shows fixed DC-2026-00124. Customer/order choices are independent demo selections without accounting reconciliation.
- Dashboard/month figures are supplied summary fixtures. Stock/customer totals derive from mock arrays.
- Splash has Get started so stakeholders can review branding; native launch splash uses the same mark.

## Verification

```powershell
npm run typecheck
npm run lint
npx expo export --platform android --output-dir dist-android
npx expo export --platform web
```

Repeat browser checks: run `node scripts/preview.cjs` in one terminal, then `node scripts/verify-prototype.cjs` in another. Installed Chrome is required. Checks cover 17 routes at 360×844, 390×844 and 412×844, plus key navigation/form interactions.

Native safe areas/keyboard resize are implemented and source-reviewed. No real Android device/emulator was available; on-device keyboard, gesture-navigation and cutout checks remain required before stakeholder distribution.

npm reports 30 transitive dependency advisories (19 high, 11 moderate); see verification/sdk57/audit.json. Suggested forced fixes change Expo/React Native major versions, so were not applied. Reassess before production.

## Deferred

Supabase, migrations, databases, real authentication/payments, GST, weighbridge, GPS, WhatsApp, push, camera/storage, cloud, AI, offline synchronization. Reports remain placeholders with no accounting engine. Telugu, demo profile editing and APK signing are deferred. Settings reserves a future Synced / Waiting to Sync / Offline presentation location without claiming actual connectivity.

