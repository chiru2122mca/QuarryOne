# QuarryOne V0.4.2 — Stage A local preparation

This directory contains an unlinked local configuration only. `project_id = "quarryone-dev"` is a local CLI identifier, not a cloud project reference or evidence that a hosted project exists. No Supabase services, hosted resources, users or credentials have been created for this milestone. The Android prototype continues using its existing mock store.

CLI baseline: **2.120.0**, executed through `npm exec --yes --package=supabase@2.120.0 -- supabase …` without adding an application dependency. Node 24.21.0 and PostgreSQL 17.11 are available. Docker executable is present; container-runtime health and the full Supabase stack have not been tested. The CLI-generated template was inspected in a separate temporary directory, not initialized over the repository.

Config requests public-only Data API exposure, explicit grants, PostgreSQL 17, no schema paths/seeds, disabled migration execution and disabled self-signup/anonymous Auth. Optional services are disabled. `quarry_private` is excluded from API/search-path settings. The local Auth URL is a placeholder, not an Expo redirect. TOML parsing and comparison with CLI-template keys/types are local checks; effective runtime/hosted settings remain unverified.

No `migrations/` directory, migration SQL, seed data, roles.sql, test Auth stub, linking metadata, credentials or app client have been added here. Never put `database/tests/00_auth_stub.sql` into Supabase migrations: a real Supabase stack already supplies Auth and its roles.

Stage A executes only CLI version/help and temporary local init. No login, link, start, reset, migration promotion, db push, remote configuration, remote SQL or user creation. Disabling migrations in config is a defensive setting, not a deployment authorization boundary. Future commands can still have side effects and require Stage B approval.

The detailed compatibility matrix, promotion mapping, future CLI commands, live Auth/RLS test matrix and rollback gates are maintained in [the rollout plan](../docs/SUPABASE_ROLLOUT_PLAN.md). Stage A validation evidence is in [verification/v042a](../verification/v042a/README.md). Keep credentials in approved local/CI secret storage; never place service-role or privileged keys in Expo public environment variables or the mobile app.
