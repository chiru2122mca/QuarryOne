# QuarryOne V0.4.1.1 — PostgreSQL foundation

Review draft, PostgreSQL 17-compatible. Files are in `database/drafts/`, outside automatic Supabase migration discovery. No live project, schema or policy has been deployed. The existing application remains backed by the shared in-memory store.

## Schema inventory

All 13 requested public tables have primary keys, audit timestamps, enabled RLS and no direct authenticated mutation grants. Parent-child tenant references include organization and site keys; a UUID alone is never sufficient to authorize or link tenant data. Foreign-key deletes default to RESTRICT/NO ACTION to preserve operating history.

| Table                    | Key and significant columns                                                                                                                            | Constraints / relationships                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| organizations            | UUID id; business/legal name, phone, state, GSTIN; lifecycle; created_by; activated_at                                                                 | Creator profile; DRAFT/READY_FOR_REVIEW/ACTIVE; active timestamp consistency; active-owner deferred invariant       |
| organization_settings    | organization_id PK; primary_site_id; multi_site_enabled false; units/precision, INR, timezone; stage, revision                                         | 1:1 organization; same-tenant primary site; guarded mode transitions; optimistic save revision                      |
| quarry_sites             | UUID id; organization_id, uppercase code, name, state/district/address; status; nullable preference overrides                                          | Unique org/code and org/id; SETUP/OPERATIONAL/ARCHIVED; organization-locking multi-site guard                       |
| quarry_pits              | UUID id; organization_id/site_id, name, PIT/BENCH, is_active                                                                                           | Same-tenant site FK; case-insensitive name unique per site; unique org/site/id for child FKs                        |
| stockyards               | UUID id; organization_id/site_id; optional pit_id; name; is_active                                                                                     | Same-site pit and site FKs; case-insensitive name unique per site; dedicated-yard pit must match block pit          |
| profiles                 | Auth user UUID PK, display_name                                                                                                                        | FK auth.users(id); no role or tenant in profile; private Auth email/phone remain in Auth                            |
| organization_memberships | (organization_id,user_id) PK; role, access_scope, is_active                                                                                            | Profile/org FKs; Owner/Admin require ALL_SITES; controlled role changes; last active owner retained                 |
| site_memberships         | (organization_id,site_id,user_id) PK; is_active                                                                                                        | Same-org site FK and same-org membership FK; effective only with active org membership                              |
| materials                | UUID id; org, name, is_active                                                                                                                          | Unique org/name; currently Black Granite/Grey Granite/Tan Brown to match existing domain                            |
| granite_grades           | UUID id; org, code, description, is_active                                                                                                             | Unique org/code; A/B/C, matching existing domain                                                                    |
| granite_blocks           | UUID id; org/site/pit/catalog/yard IDs; block_number/date; dimensions/unit; generated volume_m3; origin/status; location, supervisor, remarks, creator | All references tenant scoped; org/block_number unique; identity/status guard; original unit and dimensions retained |
| production_entries       | block_id PK; org/site; fixed PRODUCTION origin; recorded_by; source_request_id                                                                         | 1:1 production capture; composite block FK; org/request UUID unique; no duplicate dimensions/volume/date            |
| customers                | UUID id; org, uppercase customer_code, name, optional phone/address/GSTIN, is_active                                                                   | Unique org/code; names may repeat; tenant-level customer catalog, restricted-role read access                       |

Four internal `quarry_private` tables support bootstrap idempotency, organization/year block number counters, retained issued-number/UUID reservations and append-only controlled-operation audit events. Clients have no table access to them. Bootstrap and audit rows are append-only and have created_at; mutable counters have updated_at. Audit events record actor, action and minimal change details without tokens or credentials.

## Existing domain mapping

Reviewed `src/domain/blocks/types.ts`, `block.ts`, `volume.ts`, `operationsReducer.ts`, fixtures and the shared store. No source was changed.

| Existing field                      | Proposed database mapping                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| id / blockNumber                    | UUID id / organization-unique block_number; mock opaque IDs require an explicit future import mapping                                |
| productionDate                      | Calendar `date`; required for PRODUCTION, nullable for OPENING_STOCK; generated numbering_year uses the appropriate origin reference |
| quarryId / pitId                    | site_id / pit_id, plus organization_id as tenant context                                                                             |
| material / grade                    | Catalog IDs resolved back to current supported names and A/B/C                                                                       |
| dimensions.length/width/height/unit | Untyped-precision `numeric` columns and FT/M; no unit conversion overwrites entries                                                  |
| volumeM3                            | Generated, unrounded numeric volume_m3; cannot accept caller-supplied volume                                                         |
| stockyardLocation                   | stockyard_id plus entered location text (e.g. bay/row); do not infer master data by raw string alone                                 |
| supervisor                          | supervisor_name snapshot; optional same-org supervisor_user_id for future staff linkage                                              |
| status / remarks                    | Same four statuses and remarks text                                                                                                  |

Database decimals use exact numeric arithmetic without a scale typemod. The conversion constant is the existing `0.028316846592` m³/CFT. FT volume is length×width×height×constant; M volume is the dimension product. Display CFT is volume_m3/constant. Round only for presentation, normally CFT 2 and m³ 3 decimals. Reject zero/negative/NaN/infinite dimensions and unsupported units; examples: 10×5×4 FT → 200 CFT / 5.6633693184 m³, 1.25×0.5×0.25 M → 0.15625 m³.

A later adapter should accept database numeric values as decimal strings, validate representability when producing the current JS-number domain, and test rounding/precision parity. SQL numeric is exact; JavaScript uses binary floating point. This milestone adds no adapter or arbitrary-precision production dependency. Unknown materials/grades remain prohibited until an intentional domain/catalog expansion is reviewed.

Preferences resolve site override → organization default. Preferences change display and future entry defaults only; they never rewrite stored dimensions, volume or historical labels. The current mock UI continues using its existing defaults. Future business calendar dates use the configured timezone; current device-aware greeting/date behavior is unchanged.

## Block identity and provenance

Use `BLK-YYYY-NNNNNN`, sequence 000001–999999, unique across an organization for each numbering year and across all its sites. PRODUCTION uses the real production date year. Every OPENING_STOCK record uses its required opening_stock_as_of reference year, even if an older production date is known. The prefix is an identification namespace, not a claim that opening stock was produced that year. UUID identity is globally unique.

The mobile mock allocator and four-digit validation remain unchanged. A future database adapter must support six-digit parsing and origin-aware nullable dates; it cannot plug directly into the current GraniteBlock type. Future import needs an explicit source-ID/legacy-label mapping, never an automatic import of demo fixtures. Once real migrations are deployed, preserve applied versions and use a separately reviewed upgrade/data reconciliation migration. These un-deployed drafts are revised in place only.

`origin=PRODUCTION`: production_date is mandatory and exactly one production_entries record is required at commit. `origin=OPENING_STOCK`: opening_stock_as_of is mandatory; production_date can be null (unknown) or a known date no later than the reference. No production entry can reference opening stock. Dates and origin are immutable under the current guard; later documentary corrections need a separately approved auditable workflow. Inventory includes opening stock; newly produced count/volume must join production_entries or filter origin=PRODUCTION. No fake date or production event is created. Opening imports initially use AVAILABLE/REJECTED only, with source-row idempotency and provenance/audit required in a future import operation.

Inventory totals include all statuses; saleable available count/volume include AVAILABLE only; RESERVED is held; DISPATCHED is historical and excluded from on-hand; REJECTED is traceable and excluded from saleable/usable stock. Currently new records are AVAILABLE or REJECTED and status transitions are blocked by the draft guard. Future controlled reservation/dispatch operations must replace that guard intentionally. Opening stock counts in inventory but not newly produced reporting. Current mock fixtures are all production-origin in the proposed mapping, so existing app totals are unchanged.

## Future module relationships — no module tables implemented

The issued-number ledger binds each reserved label to a server-generated block UUID, whether or not the block is committed yet. A different import cannot consume that reservation. `reserve_block_number(org,year,block_uuid)` serializes on the organization and reserves the next six-digit label; the future save inserts the matching UUID and consumes it atomically. The internal two-argument allocator is a convenience for abandoned-reservation tests, not a mobile save endpoint. A committed reservation is never recycled; allocation/insert failures roll back together and must not be exposed as an issued label before commit. Gaps are acceptable. Counter rewind/deletion, ledger deletion/rebinding and block deletion are blocked. Capacity 999,999 per organization/year raises SQLSTATE 2200H rather than truncating or wrapping. No direct number/import/production-write API is added.

Generated numeric volume must also remain finite and strictly positive. PostgreSQL arithmetic limits must reject an unrepresentable result rather than commit a zero volume; ordinary fractional measurements remain unrounded. The future JS adapter additionally checks binary-number representability.

| Module       | Relationship and authorization contract to retain                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sales        | Org/site order header references same-org customer; line references same-org/site block, negotiated unit/price and immutable volume/price snapshots; no price belongs in Production |
| Reservations | Controlled sales transaction locks AVAILABLE block; unique active allocation; no competing orders; preserve separate reservation audit/event history                                |
| Dispatch     | Org/site header, vehicle/challan and lines referencing allocated blocks/sale lines; controlled RESERVED→DISPATCHED only after authorized validation                                 |
| Collections  | Org customer receipts and sale allocations; INR money precision and atomic reconciliation; distinguish payments from sales and site attribution                                     |
| Expenses     | Org/site expense, category/date/amount/vendor, optional pit/machine; site authorization and audit; no dependency on blocks for general operating costs                              |

Extend every tenant FK, policy, mode-disable guard and history retention test when introducing these tables. Cross-site sales/dispatch should be explicitly prohibited until transfer/consolidation semantics are reviewed. No transactions, balances, weighbridge, offline sync or other new operational feature exists in this milestone.

## Draft migrations and indexes

1. `202610100001_foundation.draft.sql`: 13 tables, 4 private support tables, keys, checks, indexes, timestamps, RLS enabled and client privileges revoked.
2. `202610100002_access.draft.sql`: membership-derived read RLS and private predicate helpers. No anonymous access or direct client writes.
3. `202610100003_controlled_onboarding.draft.sql`: bootstrap/site/config/lifecycle/existing-member/site-grant prototypes, audit, mode guards, ownership invariants and numbering helper.

Each version is an explicit BEGIN/COMMIT transaction, meant for one-time application by a future versioned migration ledger after review. They fail rather than silently overwrite an existing schema. Bootstrap/site creation are retry-safe; changing configuration uses expected revisions. Do not copy into `supabase/migrations` or configure Supabase before architecture review.

Indexes cover active membership lookup, site-scoped newest block lists with deterministic secondary order, AVAILABLE volume scans, combined inventory filters, production capture history and audit history. Existing PK/unique indexes cover parent FK joins and catalog lookups. Future deployments should add child FK indexes based on measured plans; no performance claims are made without production data. Block-number partial search may need an approved trigram index later; no extension/dependency is added now.

Use active flags/archive states rather than destructive deletes. Profile/Auth deletion is restricted while references exist; anonymization, legal retention and erasure workflows require a separate decision. No cascades may erase financial/production history.

SQL rationale references: [PostgreSQL constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [generated columns](https://www.postgresql.org/docs/17/ddl-generated-columns.html), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). The proposed schema and business choices above are QuarryOne design decisions.
