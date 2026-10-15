-- REVIEW DRAFT ONLY. Fail-closed read policies; no client table mutation grants.
BEGIN;
DO $principal$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole
  ) THEN RAISE EXCEPTION 'Migrations require the stable non-superuser postgres principal with CREATEROLE' USING ERRCODE='42501'; END IF;
END $principal$;
-- Dedicated table/function owner: not a login, superuser, or global RLS-bypass role.
-- Ownership bypass is restricted to these tables; clients cannot inherit/SET ROLE to it.
CREATE ROLE quarryone_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT quarryone_executor TO postgres WITH SET TRUE, INHERIT FALSE;
DO $membership$
BEGIN
  IF NOT pg_catalog.pg_has_role('postgres','quarryone_executor','SET') OR
     pg_catalog.pg_has_role('postgres','quarryone_executor','USAGE') THEN
    RAISE EXCEPTION 'Explicit SET-only executor membership required' USING ERRCODE='42501';
  END IF;
END $membership$;
GRANT USAGE,CREATE ON SCHEMA public,quarry_private TO quarryone_executor;
-- Claim precedence mirrors the inspected hosted auth.uid(); malformed claims fail closed.
CREATE FUNCTION quarry_private.request_user_id() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RETURN coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),''),
    (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')
  )::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;
-- The sole trusted Auth read boundary. Never resolve identity through executor-owned code.
CREATE FUNCTION quarry_private.require_verified_request_user() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_verified uuid;
BEGIN
  BEGIN v_user := auth.uid();
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'A verified, non-anonymous authenticated user is required' USING ERRCODE='42501';
  END;
  SELECT u.id INTO v_verified FROM auth.users AS u WHERE u.id=v_user AND u.is_anonymous IS FALSE
    AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL);
  IF v_verified IS NULL THEN
    RAISE EXCEPTION 'A verified, non-anonymous authenticated user is required' USING ERRCODE='42501';
  END IF;
  RETURN v_verified;
END $$;
REVOKE ALL ON FUNCTION quarry_private.request_user_id(),quarry_private.require_verified_request_user()
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION quarry_private.require_verified_request_user() TO quarryone_executor;
CREATE FUNCTION quarry_private.is_member(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT quarry_private.request_user_id()) AND m.is_active)
$$;
CREATE FUNCTION quarry_private.is_admin(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT quarry_private.request_user_id())
      AND m.is_active AND m.role IN ('OWNER','ADMIN'))
$$;
CREATE FUNCTION quarry_private.can_access_site(p_org uuid, p_site uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    JOIN public.quarry_sites q ON q.organization_id = m.organization_id AND q.id = p_site
    WHERE m.organization_id = p_org AND m.user_id = (SELECT quarry_private.request_user_id()) AND m.is_active
      AND (m.access_scope = 'ALL_SITES' OR EXISTS (
        SELECT 1 FROM public.site_memberships s WHERE s.organization_id = p_org AND s.site_id = p_site
          AND s.user_id = m.user_id AND s.is_active)))
$$;
CREATE FUNCTION quarry_private.can_view_profile(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user = (SELECT quarry_private.request_user_id()) OR EXISTS (
    SELECT 1 FROM public.organization_memberships mine
    JOIN public.organization_memberships theirs ON theirs.organization_id = mine.organization_id
    WHERE mine.user_id = (SELECT quarry_private.request_user_id()) AND mine.is_active AND mine.role IN ('OWNER','ADMIN')
      AND theirs.user_id = p_user AND theirs.is_active)
$$;
CREATE FUNCTION quarry_private.can_read_customers(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT quarry_private.request_user_id()) AND m.is_active
      AND m.role IN ('OWNER','ADMIN','QUARRY_MANAGER','SALES_ACCOUNTANT'))
$$;
-- Functions inspect authoritative membership rows, avoiding recursive membership RLS.
-- Owned by the non-login table owner, never by a client or superuser role.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, quarry_private TO authenticated;
GRANT EXECUTE ON FUNCTION quarry_private.request_user_id(), quarry_private.is_member(uuid), quarry_private.is_admin(uuid),
  quarry_private.can_access_site(uuid,uuid), quarry_private.can_view_profile(uuid),
  quarry_private.can_read_customers(uuid) TO authenticated;

CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated
  USING (quarry_private.can_view_profile(id));
CREATE POLICY organization_read ON public.organizations FOR SELECT TO authenticated
  USING (quarry_private.is_member(id));
CREATE POLICY settings_read ON public.organization_settings FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id));
CREATE POLICY membership_read ON public.organization_memberships FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id) AND (user_id = (SELECT quarry_private.request_user_id()) OR quarry_private.is_admin(organization_id)));
CREATE POLICY site_membership_read ON public.site_memberships FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id) AND (user_id = (SELECT quarry_private.request_user_id()) OR quarry_private.is_admin(organization_id)));
CREATE POLICY customer_read ON public.customers FOR SELECT TO authenticated
  USING (quarry_private.can_read_customers(organization_id));
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['quarry_sites','quarry_pits','stockyards','granite_blocks','production_entries'] LOOP
    EXECUTE format('CREATE POLICY site_read ON public.%I FOR SELECT TO authenticated USING (quarry_private.can_access_site(organization_id, %I))', t,
      CASE WHEN t = 'quarry_sites' THEN 'id' ELSE 'site_id' END);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['materials','granite_grades'] LOOP
    EXECUTE format('CREATE POLICY catalog_read ON public.%I FOR SELECT TO authenticated USING (quarry_private.is_member(organization_id))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['profiles','organizations','organization_settings','quarry_sites','quarry_pits','stockyards',
    'organization_memberships','site_memberships','materials','granite_grades','granite_blocks','production_entries','customers'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname,n.nspname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname='public' AND c.relname IN ('profiles','organizations','organization_settings','quarry_sites','quarry_pits','stockyards',
      'organization_memberships','site_memberships','materials','granite_grades','granite_blocks','production_entries','customers'))
      OR (n.nspname='quarry_private' AND c.relkind='r') LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO quarryone_executor',r.nspname,r.relname);
  END LOOP;
END $$;
-- No anon policies; no INSERT/UPDATE/DELETE policies or grants, including for admins.
-- The mode flag never appears in an authorization predicate.
-- Reviewed exact signatures: fail on missing functions or unexpected private overloads.
DO $owners$
DECLARE r record; v_oid oid; v_expected oid[] := ARRAY[]::oid[];
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('quarry_private.touch_updated_at()','quarryone_executor',false,'v'),
    ('quarry_private.request_user_id()','quarryone_executor',false,'s'),
    ('quarry_private.require_verified_request_user()','postgres',true,'s'),
    ('quarry_private.is_member(uuid)','quarryone_executor',true,'s'),
    ('quarry_private.is_admin(uuid)','quarryone_executor',true,'s'),
    ('quarry_private.can_access_site(uuid,uuid)','quarryone_executor',true,'s'),
    ('quarry_private.can_view_profile(uuid)','quarryone_executor',true,'s'),
    ('quarry_private.can_read_customers(uuid)','quarryone_executor',true,'s')
  ) AS m(signature,owner_name,is_definer,volatility) LOOP
    v_oid := pg_catalog.to_regprocedure(r.signature);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'Missing reviewed function: %',r.signature; END IF;
    v_expected := array_append(v_expected,v_oid);
    IF r.owner_name='quarryone_executor' THEN
      EXECUTE format('ALTER FUNCTION %s OWNER TO quarryone_executor',v_oid::regprocedure);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=v_oid
      AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=r.owner_name)
      AND p.prosecdef=r.is_definer AND p.provolatile::text=r.volatility
      AND p.proconfig=ARRAY['search_path=""']::text[]) THEN
      RAISE EXCEPTION 'Unsafe owner/security/config for %',r.signature; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE (n.nspname='quarry_private' OR (n.nspname='public' AND p.proname IN ('bootstrap_organization','create_quarry_site','set_multi_site','transition_onboarding','set_organization_member','set_site_member'))) AND NOT p.oid=ANY(v_expected)) THEN
    RAISE EXCEPTION 'Unexpected private function outside reviewed ownership manifest'; END IF;
END $owners$;
DO $acl$
DECLARE r record; v_allowed oid[] := ARRAY['quarry_private.request_user_id()'::regprocedure::oid,'quarry_private.is_member(uuid)'::regprocedure::oid,'quarry_private.is_admin(uuid)'::regprocedure::oid,'quarry_private.can_access_site(uuid,uuid)'::regprocedure::oid,'quarry_private.can_view_profile(uuid)'::regprocedure::oid,'quarry_private.can_read_customers(uuid)'::regprocedure::oid];
BEGIN
  FOR r IN SELECT p.oid FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='quarry_private' OR p.oid=ANY(v_allowed) LOOP
    IF pg_catalog.has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.oid=ANY(v_allowed))
      OR pg_catalog.has_function_privilege('anon',r.oid,'EXECUTE')
      OR pg_catalog.has_function_privilege('service_role',r.oid,'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected client function execution privilege: %',r.oid::regprocedure; END IF;
  END LOOP;
  IF NOT pg_catalog.has_function_privilege('quarryone_executor','quarry_private.require_verified_request_user()','EXECUTE')
    OR pg_catalog.has_schema_privilege('quarryone_executor','auth','USAGE')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid='auth.users'::regclass
      AND a.attname IN ('id','email_confirmed_at','phone_confirmed_at','is_anonymous')
      AND pg_catalog.has_column_privilege('quarryone_executor',a.attrelid,a.attnum,'SELECT')) THEN
    RAISE EXCEPTION 'Executor Auth boundary invalid'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    WHERE p.oid='quarry_private.require_verified_request_user()'::regprocedure
    AND a.grantee NOT IN (SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN ('postgres','quarryone_executor'))) THEN
    RAISE EXCEPTION 'Verification bridge execution exceeds owner/executor allowlist'; END IF;
  IF pg_catalog.has_schema_privilege('authenticated','quarry_private','CREATE')
    OR pg_catalog.has_schema_privilege('anon','quarry_private','USAGE')
    OR pg_catalog.has_schema_privilege('service_role','quarry_private','USAGE') THEN
    RAISE EXCEPTION 'Unsafe private schema privilege'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role')
    AND pg_catalog.pg_has_role(oid,'quarryone_executor','MEMBER')) THEN
    RAISE EXCEPTION 'API role may not assume executor'; END IF;
END $acl$;
COMMIT;
