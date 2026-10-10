# V0.4.1 validation record

Architecture-only changes. No app source, UI, routes, mock fixtures/store, dependencies or app configuration changed. Existing untracked design references remain untouched.

## Results

| Check                                           | Actual result                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                             | Passed                                                                                                 |
| `npm run lint`                                  | Passed                                                                                                 |
| `npm run test:domain`                           | 53 passed, 0 failed                                                                                    |
| PostgreSQL 17.11 migration application          | All 3 drafts parsed/applied in isolated cluster                                                        |
| Local SQL assertions                            | 91 passed, including real PostgreSQL roles/RLS with synthetic Auth identities                          |
| Migration safety                                | Duplicate version rejected without changing data; intentional failed DDL transaction fully rolled back |
| Concurrent bootstrap / number allocation        | One tenant for duplicate request; distinct block numbers                                               |
| Concurrent owner removal / single-site creation | One active owner retained; only one initial site created                                               |
| Concurrent settings changes                     | Expected revision permits one writer and rejects the stale writer                                      |
| Scratch server shutdown                         | Confirmed stopped by runner                                                                            |

See `database-results.json` and `database-test.log`. Expected errors in the transcript are intentional denial/constraint tests, not failed assertions. Tests use fresh local-only data and Auth stubs; there is no external project connection or credential use.

Initial environment issues were resolved: sandbox WAL rename restrictions required the local-process permission, and Windows inherited process handles required file-backed pg_ctl output. The failed scratch startup server was explicitly stopped; the final runner also shuts down in its cleanup path.

## Not run / not implemented

Real Supabase JWT validation, Auth signup/invitation channels, deployed RLS/Data API behavior, Supabase pgTAP testing, production performance and physical Android checks were not run. There is no onboarding UI, persistent app adapter, stage-save endpoint, invitation service or new operational module to test in this milestone. Their contracts and rollout gates are documented in the architecture files.

## Artifacts

- `docs/ONBOARDING_ARCHITECTURE.md`: five-stage workflow, mandatory/optional fields, UI specifications, safe single/multi transitions and acceptance criteria.
- `docs/DATABASE_SCHEMA.md`: 13 requested tables, private bookkeeping, current-domain mapping, measurement/provenance rules and future module relationships.
- `docs/ROLE_PERMISSION_MATRIX.md`: role/site permissions, tenant isolation and secure owner bootstrap.
- `docs/SUPABASE_ROLLOUT_PLAN.md`: local results, future staging/deployment gates and open architectural questions.
- `database/drafts/`: three versioned SQL review drafts.
- `database/tests/`: synthetic Auth fixture and executable SQL assertions.
- `scripts/verify-database-drafts.cjs`: dependency-free local PostgreSQL runner and concurrency tests.

Review questions include annual block-number capacity, extensible materials, unknown-date opening stock, shared/dedicated stockyards, per-site role variation, activation approval, verified invitation channels and history/account retention. No Supabase configuration or push is authorized by this milestone.
