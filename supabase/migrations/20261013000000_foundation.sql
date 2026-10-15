-- REVIEWED SQL SOURCE. Promoted copy prepared locally; hosted deployment requires approval.
-- PostgreSQL 17+. auth.users is supplied by Supabase (stubbed only in local tests).
BEGIN;
DO $principal$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole
  ) THEN RAISE EXCEPTION 'Migrations require the stable non-superuser postgres principal with CREATEROLE' USING ERRCODE='42501'; END IF;
END $principal$;
CREATE SCHEMA quarry_private;
REVOKE ALL ON SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text,
  legal_name text,
  contact_phone text,
  state_name text,
  gstin text,
  lifecycle text NOT NULL DEFAULT 'DRAFT' CHECK (lifecycle IN ('DRAFT','READY_FOR_REVIEW','ACTIVE')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((lifecycle = 'ACTIVE') = (activated_at IS NOT NULL))
);
CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  multi_site_enabled boolean NOT NULL DEFAULT false,
  primary_site_id uuid,
  dimension_unit text NOT NULL DEFAULT 'FT' CHECK (dimension_unit IN ('FT','M')),
  volume_display_unit text NOT NULL DEFAULT 'CFT' CHECK (volume_display_unit IN ('CFT','M3')),
  cft_display_decimals smallint NOT NULL DEFAULT 2 CHECK (cft_display_decimals BETWEEN 0 AND 6),
  m3_display_decimals smallint NOT NULL DEFAULT 3 CHECK (m3_display_decimals BETWEEN 0 AND 6),
  currency_code text NOT NULL DEFAULT 'INR' CHECK (currency_code = 'INR'),
  timezone_name text NOT NULL DEFAULT 'Asia/Kolkata' CHECK (btrim(timezone_name) <> ''),
  onboarding_stage smallint NOT NULL DEFAULT 1 CHECK (onboarding_stage BETWEEN 1 AND 5),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  reviewed_revision bigint CHECK (reviewed_revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quarry_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text NOT NULL CHECK (code = upper(btrim(code)) AND code <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  state_name text,
  district text,
  address text,
  status text NOT NULL DEFAULT 'SETUP' CHECK (status IN ('SETUP','OPERATIONAL','ARCHIVED')),
  dimension_unit text CHECK (dimension_unit IN ('FT','M')),
  volume_display_unit text CHECK (volume_display_unit IN ('CFT','M3')),
  cft_display_decimals smallint CHECK (cft_display_decimals BETWEEN 0 AND 6),
  m3_display_decimals smallint CHECK (m3_display_decimals BETWEEN 0 AND 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);
ALTER TABLE public.organization_settings ADD CONSTRAINT primary_site_same_tenant
  FOREIGN KEY (organization_id, primary_site_id) REFERENCES public.quarry_sites(organization_id, id);
CREATE TABLE public.quarry_pits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  kind text NOT NULL DEFAULT 'PIT' CHECK (kind IN ('PIT','BENCH')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, site_id) REFERENCES public.quarry_sites(organization_id, id),
  UNIQUE (organization_id, site_id, id)
);
CREATE UNIQUE INDEX pit_name_per_site ON public.quarry_pits(organization_id, site_id, lower(btrim(name)));
CREATE TABLE public.stockyards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  pit_id uuid,
  name text NOT NULL CHECK (btrim(name) <> ''),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, site_id) REFERENCES public.quarry_sites(organization_id, id),
  FOREIGN KEY (organization_id, site_id, pit_id) REFERENCES public.quarry_pits(organization_id, site_id, id),
  UNIQUE (organization_id, site_id, id)
);
CREATE UNIQUE INDEX stockyard_name_per_site ON public.stockyards(organization_id, site_id, lower(btrim(name)));
CREATE TABLE public.organization_memberships (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL CHECK (role IN ('OWNER','ADMIN','QUARRY_MANAGER','PRODUCTION_SUPERVISOR','SALES_ACCOUNTANT','DISPATCH_GATE_OPERATOR')),
  access_scope text NOT NULL DEFAULT 'ASSIGNED_SITES' CHECK (access_scope IN ('ALL_SITES','ASSIGNED_SITES')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id),
  CHECK (role NOT IN ('OWNER','ADMIN') OR access_scope = 'ALL_SITES')
);
CREATE TABLE public.site_memberships (
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, site_id, user_id),
  FOREIGN KEY (organization_id, site_id) REFERENCES public.quarry_sites(organization_id, id),
  FOREIGN KEY (organization_id, user_id) REFERENCES public.organization_memberships(organization_id, user_id)
);
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (name IN ('Black Granite','Grey Granite','Tan Brown')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id), UNIQUE (organization_id, name)
);
CREATE TABLE public.granite_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text NOT NULL CHECK (code IN ('A','B','C')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id), UNIQUE (organization_id, code)
);
-- Reservations and tombstones survive inventory changes; not exposed through the API.
CREATE TABLE quarry_private.block_number_ledger (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  block_number text NOT NULL,
  numbering_year integer NOT NULL CHECK (numbering_year BETWEEN 1000 AND 9999),
  sequence integer NOT NULL CHECK (sequence BETWEEN 1 AND 999999),
  block_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  bound_at timestamptz,
  PRIMARY KEY (organization_id, block_number),
  UNIQUE (organization_id, numbering_year, sequence),
  UNIQUE (organization_id, block_number, block_id),
  CHECK (block_number = 'BLK-' || numbering_year::text || '-' || lpad(sequence::text,6,'0')),
  CHECK (block_number ~ '^BLK-[1-9][0-9]{3}-[0-9]{6}$')
);
CREATE TABLE public.granite_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  pit_id uuid NOT NULL,
  material_id uuid NOT NULL,
  grade_id uuid NOT NULL,
  stockyard_id uuid NOT NULL,
  block_number text NOT NULL CHECK (block_number ~ '^BLK-[1-9][0-9]{3}-[0-9]{6}$' AND right(block_number,6) <> '000000'),
  production_date date CHECK (isfinite(production_date) AND extract(year FROM production_date) BETWEEN 1000 AND 9999),
  length numeric NOT NULL CHECK (length > 0 AND length::text NOT IN ('NaN','Infinity','-Infinity')),
  width numeric NOT NULL CHECK (width > 0 AND width::text NOT IN ('NaN','Infinity','-Infinity')),
  height numeric NOT NULL CHECK (height > 0 AND height::text NOT IN ('NaN','Infinity','-Infinity')),
  dimension_unit text NOT NULL CHECK (dimension_unit IN ('FT','M')),
  volume_m3 numeric GENERATED ALWAYS AS
    (length * width * height * CASE dimension_unit WHEN 'FT' THEN 0.028316846592::numeric ELSE 1::numeric END) STORED,
  CONSTRAINT representable_positive_volume CHECK (volume_m3 > 0 AND volume_m3::text NOT IN ('NaN','Infinity','-Infinity')),
  stockyard_location text NOT NULL CHECK (btrim(stockyard_location) <> ''),
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','DISPATCHED','REJECTED')),
  origin text NOT NULL DEFAULT 'PRODUCTION' CHECK (origin IN ('PRODUCTION','OPENING_STOCK')),
  opening_stock_as_of date CHECK (isfinite(opening_stock_as_of) AND extract(year FROM opening_stock_as_of) BETWEEN 1000 AND 9999),
  numbering_year integer GENERATED ALWAYS AS (extract(year FROM CASE WHEN origin='PRODUCTION' THEN production_date ELSE opening_stock_as_of END)::integer) STORED,
  supervisor_user_id uuid,
  supervisor_name text NOT NULL CHECK (btrim(supervisor_name) <> ''),
  remarks text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, site_id) REFERENCES public.quarry_sites(organization_id, id),
  FOREIGN KEY (organization_id, site_id, pit_id) REFERENCES public.quarry_pits(organization_id, site_id, id),
  FOREIGN KEY (organization_id, site_id, stockyard_id) REFERENCES public.stockyards(organization_id, site_id, id),
  FOREIGN KEY (organization_id, material_id) REFERENCES public.materials(organization_id, id),
  FOREIGN KEY (organization_id, grade_id) REFERENCES public.granite_grades(organization_id, id),
  FOREIGN KEY (organization_id, supervisor_user_id) REFERENCES public.organization_memberships(organization_id, user_id),
  FOREIGN KEY (organization_id, created_by) REFERENCES public.organization_memberships(organization_id, user_id),
  FOREIGN KEY (organization_id, block_number, id) REFERENCES quarry_private.block_number_ledger(organization_id, block_number, block_id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, site_id, id, origin),
  UNIQUE (organization_id, block_number),
  CHECK (substring(block_number FROM 5 FOR 4)::integer = numbering_year),
  CHECK (origin <> 'PRODUCTION' OR production_date IS NOT NULL),
  CHECK ((origin = 'OPENING_STOCK') = (opening_stock_as_of IS NOT NULL)),
  CHECK (opening_stock_as_of IS NULL OR opening_stock_as_of >= production_date)
);
CREATE TABLE public.production_entries (
  block_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  origin text NOT NULL DEFAULT 'PRODUCTION' CHECK (origin = 'PRODUCTION'),
  recorded_by uuid NOT NULL,
  source_request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, site_id, block_id, origin) REFERENCES public.granite_blocks(organization_id, site_id, id, origin),
  FOREIGN KEY (organization_id, recorded_by) REFERENCES public.organization_memberships(organization_id, user_id),
  UNIQUE (organization_id, source_request_id)
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  customer_code text NOT NULL CHECK (customer_code = upper(btrim(customer_code)) AND customer_code <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  phone text,
  billing_address text,
  gstin text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id), UNIQUE (organization_id, customer_code)
);

-- Internal bookkeeping; none of these tables is exposed through the Data API.
CREATE TABLE quarry_private.bootstrap_requests (
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  business_name text NOT NULL,
  owner_display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
CREATE TABLE quarry_private.block_number_counters (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  numbering_year integer NOT NULL CHECK (numbering_year BETWEEN 1000 AND 9999),
  last_sequence integer NOT NULL CHECK (last_sequence BETWEEN 1 AND 999999),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, numbering_year)
);
CREATE TABLE quarry_private.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memberships_by_user ON public.organization_memberships(user_id, organization_id) WHERE is_active;
CREATE INDEX site_memberships_by_user ON public.site_memberships(user_id, organization_id, site_id) WHERE is_active;
CREATE INDEX blocks_newest ON public.granite_blocks(organization_id, site_id, (coalesce(production_date, opening_stock_as_of)) DESC, block_number DESC, id);
CREATE INDEX blocks_available ON public.granite_blocks(organization_id, site_id, status) INCLUDE (volume_m3) WHERE status = 'AVAILABLE';
CREATE INDEX blocks_filter ON public.granite_blocks(organization_id, site_id, material_id, grade_id, pit_id, status);
CREATE INDEX production_by_site ON public.production_entries(organization_id, site_id, created_at DESC);
CREATE INDEX audit_by_org ON quarry_private.audit_events(organization_id, created_at DESC);

CREATE FUNCTION quarry_private.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','organizations','organization_settings','quarry_sites','quarry_pits','stockyards',
    'organization_memberships','site_memberships','materials','granite_grades','granite_blocks','production_entries','customers'] LOOP
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION quarry_private.touch_updated_at()', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', t);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
