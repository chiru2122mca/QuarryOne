-- REVIEW DRAFT ONLY. Fail-closed read policies; no client table mutation grants.
BEGIN;
-- Dedicated table/function owner: not a login, superuser, or global RLS-bypass role.
-- Ownership bypass is restricted to these tables; clients cannot inherit/SET ROLE to it.
CREATE ROLE quarryone_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT quarryone_executor TO CURRENT_USER;
GRANT USAGE,CREATE ON SCHEMA public,quarry_private TO quarryone_executor;
GRANT USAGE ON SCHEMA auth TO quarryone_executor;
GRANT SELECT(id,email_confirmed_at,phone_confirmed_at,is_anonymous) ON auth.users TO quarryone_executor;
GRANT EXECUTE ON FUNCTION auth.uid() TO quarryone_executor;
CREATE FUNCTION quarry_private.is_member(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT auth.uid()) AND m.is_active)
$$;
CREATE FUNCTION quarry_private.is_admin(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT auth.uid())
      AND m.is_active AND m.role IN ('OWNER','ADMIN'))
$$;
CREATE FUNCTION quarry_private.can_access_site(p_org uuid, p_site uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    JOIN public.quarry_sites q ON q.organization_id = m.organization_id AND q.id = p_site
    WHERE m.organization_id = p_org AND m.user_id = (SELECT auth.uid()) AND m.is_active
      AND (m.access_scope = 'ALL_SITES' OR EXISTS (
        SELECT 1 FROM public.site_memberships s WHERE s.organization_id = p_org AND s.site_id = p_site
          AND s.user_id = m.user_id AND s.is_active)))
$$;
CREATE FUNCTION quarry_private.can_view_profile(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.organization_memberships mine
    JOIN public.organization_memberships theirs ON theirs.organization_id = mine.organization_id
    WHERE mine.user_id = (SELECT auth.uid()) AND mine.is_active AND mine.role IN ('OWNER','ADMIN')
      AND theirs.user_id = p_user AND theirs.is_active)
$$;
CREATE FUNCTION quarry_private.can_read_customers(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = p_org AND m.user_id = (SELECT auth.uid()) AND m.is_active
      AND m.role IN ('OWNER','ADMIN','QUARRY_MANAGER','SALES_ACCOUNTANT'))
$$;
-- Functions inspect authoritative membership rows, avoiding recursive membership RLS.
-- Owned by the non-login table owner, never by a client or superuser role.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quarry_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, quarry_private TO authenticated;
GRANT EXECUTE ON FUNCTION quarry_private.is_member(uuid), quarry_private.is_admin(uuid),
  quarry_private.can_access_site(uuid,uuid), quarry_private.can_view_profile(uuid),
  quarry_private.can_read_customers(uuid) TO authenticated;

CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated
  USING (quarry_private.can_view_profile(id));
CREATE POLICY organization_read ON public.organizations FOR SELECT TO authenticated
  USING (quarry_private.is_member(id));
CREATE POLICY settings_read ON public.organization_settings FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id));
CREATE POLICY membership_read ON public.organization_memberships FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id) AND (user_id = (SELECT auth.uid()) OR quarry_private.is_admin(organization_id)));
CREATE POLICY site_membership_read ON public.site_memberships FOR SELECT TO authenticated
  USING (quarry_private.is_member(organization_id) AND (user_id = (SELECT auth.uid()) OR quarry_private.is_admin(organization_id)));
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
  FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='quarry_private' LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO quarryone_executor',r.signature);
  END LOOP;
END $$;
-- No anon policies; no INSERT/UPDATE/DELETE policies or grants, including for admins.
-- The mode flag never appears in an authorization predicate.
COMMIT;
