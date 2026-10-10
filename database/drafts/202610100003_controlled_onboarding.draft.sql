-- REVIEW DRAFT ONLY. Prototype server-side operations, not an app integration.
BEGIN;
CREATE FUNCTION quarry_private.require_admin(p_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT quarry_private.is_admin(p_org) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_org FOR UPDATE;
  IF NOT FOUND OR NOT quarry_private.is_admin(p_org) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION quarry_private.audit(p_org uuid, p_action text, p_details jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO quarry_private.audit_events(organization_id,actor_id,action,details)
  VALUES (p_org,auth.uid(),p_action,p_details);
END $$;
CREATE FUNCTION quarry_private.settings_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END $$;
CREATE TRIGGER settings_revision BEFORE UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION quarry_private.settings_revision();

CREATE FUNCTION quarry_private.guard_site_mode() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_multi boolean;
BEGIN
  PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id FOR UPDATE;
  SELECT multi_site_enabled INTO v_multi FROM public.organization_settings WHERE organization_id=NEW.organization_id;
  IF v_multi IS DISTINCT FROM true AND NEW.status <> 'ARCHIVED' AND EXISTS (
    SELECT 1 FROM public.quarry_sites WHERE organization_id=NEW.organization_id AND id<>NEW.id AND status<>'ARCHIVED'
  ) THEN RAISE EXCEPTION 'Enable multi-site before adding another site' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.id<>OLD.id) THEN
    RAISE EXCEPTION 'Site identity is immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.status='ARCHIVED' AND EXISTS (SELECT 1 FROM public.organization_settings
    WHERE organization_id=NEW.organization_id AND primary_site_id=NEW.id) THEN
    RAISE EXCEPTION 'Primary site cannot be archived' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_site_mode BEFORE INSERT OR UPDATE ON public.quarry_sites
FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_site_mode();
CREATE FUNCTION quarry_private.guard_single_site() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF NEW.primary_site_id IS NULL AND EXISTS (SELECT 1 FROM public.organizations WHERE id=NEW.organization_id AND lifecycle<>'DRAFT') THEN
    RAISE EXCEPTION 'Reviewed or active organization requires a primary site' USING ERRCODE='23514';
  END IF;
  IF NEW.primary_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quarry_sites
    WHERE organization_id=NEW.organization_id AND id=NEW.primary_site_id AND status<>'ARCHIVED') THEN
    RAISE EXCEPTION 'Primary site must be a non-archived site of this organization' USING ERRCODE='23514';
  END IF;
  IF NOT NEW.multi_site_enabled AND (
    (SELECT count(*) FROM public.quarry_sites WHERE organization_id=NEW.organization_id AND status<>'ARCHIVED') > 1
    OR EXISTS (SELECT 1 FROM public.granite_blocks WHERE organization_id=NEW.organization_id AND site_id IS DISTINCT FROM NEW.primary_site_id)
    OR EXISTS (SELECT 1 FROM public.site_memberships WHERE organization_id=NEW.organization_id AND site_id IS DISTINCT FROM NEW.primary_site_id)
  ) THEN RAISE EXCEPTION 'Multi-site cannot be disabled with additional sites, history or site grants' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_single_site BEFORE INSERT OR UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_single_site();

CREATE FUNCTION quarry_private.assert_ready(p_org uuid) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=p_org
    AND nullif(btrim(business_name),'') IS NOT NULL AND nullif(btrim(contact_phone),'') IS NOT NULL
    AND nullif(btrim(state_name),'') IS NOT NULL) THEN RAISE EXCEPTION 'Business name, phone and state are required' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=p_org AND role='OWNER' AND is_active) THEN
    RAISE EXCEPTION 'An active owner is required' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_settings s JOIN public.quarry_sites q
    ON q.organization_id=s.organization_id AND q.id=s.primary_site_id
    WHERE s.organization_id=p_org AND q.status<>'ARCHIVED') THEN
    RAISE EXCEPTION 'A primary site is required' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.quarry_sites q WHERE q.organization_id=p_org AND q.status<>'ARCHIVED' AND (
    nullif(btrim(q.state_name),'') IS NULL OR nullif(btrim(q.district),'') IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.quarry_pits p WHERE p.organization_id=p_org AND p.site_id=q.id AND p.is_active)
    OR NOT EXISTS (SELECT 1 FROM public.stockyards y WHERE y.organization_id=p_org AND y.site_id=q.id AND y.is_active)
  )) THEN RAISE EXCEPTION 'Each configured site needs state, district, a pit and a stockyard' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.materials WHERE organization_id=p_org AND is_active)
    OR (SELECT count(*) FROM public.granite_grades WHERE organization_id=p_org AND is_active) <> 3 THEN
    RAISE EXCEPTION 'Select materials and configure grades A/B/C' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_settings s JOIN pg_catalog.pg_timezone_names t
    ON t.name=s.timezone_name WHERE s.organization_id=p_org) THEN
    RAISE EXCEPTION 'Unknown organization timezone' USING ERRCODE='23514'; END IF;
END $$;
CREATE FUNCTION quarry_private.guard_lifecycle() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.lifecycle<>'DRAFT' OR NEW.activated_at IS NOT NULL THEN
      RAISE EXCEPTION 'Organizations must start in DRAFT' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.lifecycle IS DISTINCT FROM OLD.lifecycle THEN
    IF NOT ((OLD.lifecycle='DRAFT' AND NEW.lifecycle='READY_FOR_REVIEW')
      OR (OLD.lifecycle='READY_FOR_REVIEW' AND NEW.lifecycle IN ('DRAFT','ACTIVE'))) THEN
      RAISE EXCEPTION 'Invalid lifecycle transition' USING ERRCODE='23514'; END IF;
    IF NEW.lifecycle IN ('READY_FOR_REVIEW','ACTIVE') THEN PERFORM quarry_private.assert_ready(NEW.id); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_lifecycle BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_lifecycle();
CREATE FUNCTION quarry_private.ensure_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_org uuid;
BEGIN
  IF TG_TABLE_NAME='organizations' THEN v_org:=NEW.id;
  ELSIF TG_OP='DELETE' THEN v_org:=OLD.organization_id;
  ELSE v_org:=NEW.organization_id; END IF;
  IF TG_TABLE_NAME='organization_memberships' THEN
    IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.user_id<>OLD.user_id) THEN
      RAISE EXCEPTION 'Membership identity is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id=v_org) AND NOT EXISTS (
    SELECT 1 FROM public.organization_memberships WHERE organization_id=v_org AND role='OWNER' AND is_active
  ) THEN RAISE EXCEPTION 'Organization must retain an active owner' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ensure_owner_org AFTER INSERT OR UPDATE ON public.organizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quarry_private.ensure_owner();
CREATE CONSTRAINT TRIGGER ensure_owner_members AFTER INSERT OR UPDATE OR DELETE ON public.organization_memberships
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quarry_private.ensure_owner();

CREATE FUNCTION quarry_private.guard_block() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE yard_pit uuid;
BEGIN
  IF TG_OP='INSERT' AND NEW.status NOT IN ('AVAILABLE','REJECTED') THEN
    RAISE EXCEPTION 'Initial status must be AVAILABLE or REJECTED' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (NEW.status<>OLD.status OR NEW.organization_id<>OLD.organization_id OR NEW.site_id<>OLD.site_id
    OR NEW.id<>OLD.id OR NEW.block_number<>OLD.block_number OR NEW.origin<>OLD.origin) THEN
    RAISE EXCEPTION 'Identity and status transitions require a future controlled module' USING ERRCODE='23514'; END IF;
  SELECT pit_id INTO yard_pit FROM public.stockyards WHERE organization_id=NEW.organization_id AND site_id=NEW.site_id AND id=NEW.stockyard_id;
  IF yard_pit IS NOT NULL AND yard_pit<>NEW.pit_id AND EXISTS (SELECT 1 FROM public.quarry_pits
    WHERE organization_id=NEW.organization_id AND site_id=NEW.site_id AND id=NEW.pit_id) THEN
    RAISE EXCEPTION 'Stockyard belongs to another pit' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_block BEFORE INSERT OR UPDATE ON public.granite_blocks FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_block();
CREATE FUNCTION quarry_private.guard_stockyard_pit() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.pit_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.granite_blocks
    WHERE organization_id=NEW.organization_id AND site_id=NEW.site_id AND stockyard_id=NEW.id AND pit_id<>NEW.pit_id) THEN
    RAISE EXCEPTION 'Stockyard reassignment would conflict with block history' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_stockyard_pit BEFORE UPDATE ON public.stockyards FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_stockyard_pit();
CREATE FUNCTION quarry_private.ensure_production_entry() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_block uuid;
BEGIN
  IF TG_TABLE_NAME='granite_blocks' THEN v_block:=NEW.id;
  ELSIF TG_OP='DELETE' THEN v_block:=OLD.block_id;
  ELSE v_block:=NEW.block_id; END IF;
  IF TG_TABLE_NAME='production_entries' THEN
    IF TG_OP='UPDATE' AND NEW.block_id<>OLD.block_id AND EXISTS (
      SELECT 1 FROM public.granite_blocks b WHERE b.id=OLD.block_id AND b.origin='PRODUCTION'
        AND NOT EXISTS (SELECT 1 FROM public.production_entries e WHERE e.block_id=b.id)
    ) THEN RAISE EXCEPTION 'Cannot orphan the original production block' USING ERRCODE='23514'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.granite_blocks b WHERE b.id=v_block AND b.origin='PRODUCTION'
    AND NOT EXISTS (SELECT 1 FROM public.production_entries e WHERE e.block_id=b.id)) THEN
    RAISE EXCEPTION 'Produced block requires exactly one production entry' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER production_block_complete AFTER INSERT OR UPDATE ON public.granite_blocks
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quarry_private.ensure_production_entry();
CREATE CONSTRAINT TRIGGER production_entry_complete AFTER INSERT OR UPDATE OR DELETE ON public.production_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quarry_private.ensure_production_entry();

CREATE FUNCTION public.bootstrap_organization(p_request uuid, p_business_name text, p_display_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid:=auth.uid(); v_org uuid; v_name text:=btrim(p_business_name); v_existing text;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=v_user AND NOT coalesce(is_anonymous,false)
    AND (email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'A verified, non-anonymous authenticated user is required' USING ERRCODE='42501'; END IF;
  IF p_request IS NULL OR nullif(v_name,'') IS NULL OR nullif(btrim(p_display_name),'') IS NULL THEN
    RAISE EXCEPTION 'Request ID, business name and owner display name are required' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || p_request::text,0));
  SELECT organization_id,business_name INTO v_org,v_existing FROM quarry_private.bootstrap_requests WHERE user_id=v_user AND request_id=p_request;
  IF FOUND THEN
    IF v_existing<>v_name THEN RAISE EXCEPTION 'Idempotency key payload mismatch' USING ERRCODE='22023'; END IF;
    IF NOT quarry_private.is_member(v_org) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
    RETURN v_org;
  END IF;
  INSERT INTO public.profiles(id,display_name) VALUES (v_user,btrim(p_display_name)) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.organizations(business_name,created_by) VALUES (v_name,v_user) RETURNING id INTO v_org;
  INSERT INTO public.organization_settings(organization_id) VALUES (v_org);
  -- Role and scope are fixed server-side; no role/owner ID input exists.
  INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope) VALUES (v_org,v_user,'OWNER','ALL_SITES');
  INSERT INTO quarry_private.bootstrap_requests(user_id,request_id,organization_id,business_name) VALUES (v_user,p_request,v_org,v_name);
  PERFORM quarry_private.audit(v_org,'ORGANIZATION_BOOTSTRAPPED');
  RETURN v_org;
END $$;

CREATE FUNCTION public.create_quarry_site(p_org uuid, p_code text, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_site uuid; v_name text; v_state text;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  SELECT lifecycle INTO v_state FROM public.organizations WHERE id=p_org;
  IF v_state='READY_FOR_REVIEW' THEN RAISE EXCEPTION 'Return to DRAFT before editing reviewed configuration' USING ERRCODE='23514'; END IF;
  IF nullif(btrim(p_code),'') IS NULL OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Site code and name required' USING ERRCODE='22023'; END IF;
  SELECT id,name INTO v_site,v_name FROM public.quarry_sites WHERE organization_id=p_org AND code=upper(btrim(p_code));
  IF FOUND THEN
    IF v_name<>btrim(p_name) THEN RAISE EXCEPTION 'Site code already exists with different data' USING ERRCODE='22023'; END IF;
    RETURN v_site;
  END IF;
  INSERT INTO public.quarry_sites(organization_id,code,name) VALUES (p_org,upper(btrim(p_code)),btrim(p_name)) RETURNING id INTO v_site;
  UPDATE public.organization_settings SET primary_site_id=v_site WHERE organization_id=p_org AND primary_site_id IS NULL;
  PERFORM quarry_private.audit(p_org,'SITE_CREATED',jsonb_build_object('site_id',v_site));
  RETURN v_site;
END $$;
CREATE FUNCTION public.set_multi_site(p_org uuid, p_enabled boolean, p_expected_revision bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_revision bigint;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  IF p_enabled IS NULL OR p_expected_revision IS NULL THEN RAISE EXCEPTION 'Mode and revision required' USING ERRCODE='22023'; END IF;
  IF (SELECT lifecycle FROM public.organizations WHERE id=p_org)='READY_FOR_REVIEW' THEN
    RAISE EXCEPTION 'Return to DRAFT before editing reviewed configuration' USING ERRCODE='23514'; END IF;
  SELECT revision INTO v_revision FROM public.organization_settings WHERE organization_id=p_org;
  IF v_revision<>p_expected_revision THEN RAISE EXCEPTION 'Configuration changed; refresh before saving' USING ERRCODE='40001'; END IF;
  UPDATE public.organization_settings SET multi_site_enabled=p_enabled WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'MULTI_SITE_CHANGED',jsonb_build_object('enabled',p_enabled));
END $$;
CREATE FUNCTION public.transition_onboarding(p_org uuid, p_target text, p_expected_revision bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_current text; v_revision bigint;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  IF p_target IS NULL OR p_target NOT IN ('DRAFT','READY_FOR_REVIEW','ACTIVE') OR p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Valid lifecycle and revision required' USING ERRCODE='22023'; END IF;
  SELECT lifecycle INTO v_current FROM public.organizations WHERE id=p_org;
  SELECT revision INTO v_revision FROM public.organization_settings WHERE organization_id=p_org;
  IF v_revision<>p_expected_revision THEN RAISE EXCEPTION 'Configuration changed; refresh before saving' USING ERRCODE='40001'; END IF;
  IF v_current=p_target THEN RETURN; END IF;
  IF p_target='ACTIVE' AND v_current='READY_FOR_REVIEW' THEN
    PERFORM quarry_private.assert_ready(p_org);
    UPDATE public.quarry_sites SET status='OPERATIONAL' WHERE organization_id=p_org AND status='SETUP';
  END IF;
  UPDATE public.organizations SET lifecycle=p_target, activated_at=CASE WHEN p_target='ACTIVE' THEN now() ELSE NULL END WHERE id=p_org;
  UPDATE public.organization_settings SET onboarding_stage=CASE WHEN p_target='DRAFT' THEN onboarding_stage ELSE 5 END WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'ONBOARDING_TRANSITION',jsonb_build_object('from',v_current,'to',p_target));
END $$;
CREATE FUNCTION public.set_organization_member(p_org uuid,p_user uuid,p_role text,p_scope text,p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor_role text; v_previous_role text;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  SELECT role INTO v_actor_role FROM public.organization_memberships WHERE organization_id=p_org AND user_id=auth.uid();
  SELECT role INTO v_previous_role FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'New memberships require the future verified invitation acceptance operation' USING ERRCODE='42501'; END IF;
  IF p_user IS NULL OR p_role IS NULL OR p_scope IS NULL OR p_active IS NULL
    OR p_role NOT IN ('OWNER','ADMIN','QUARRY_MANAGER','PRODUCTION_SUPERVISOR','SALES_ACCOUNTANT','DISPATCH_GATE_OPERATOR')
    OR p_scope NOT IN ('ALL_SITES','ASSIGNED_SITES') THEN RAISE EXCEPTION 'Invalid member input' USING ERRCODE='22023'; END IF;
  IF v_actor_role<>'OWNER' AND (p_role IN ('OWNER','ADMIN') OR v_previous_role IN ('OWNER','ADMIN')) THEN
    RAISE EXCEPTION 'Only an owner may manage owner/admin memberships' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user AND role='OWNER' AND is_active)
    AND (p_role<>'OWNER' OR NOT p_active) AND (SELECT count(*) FROM public.organization_memberships WHERE organization_id=p_org AND role='OWNER' AND is_active)<=1 THEN
    RAISE EXCEPTION 'Cannot remove the last active owner' USING ERRCODE='23514'; END IF;
  INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope,is_active)
  VALUES (p_org,p_user,p_role,p_scope,p_active) ON CONFLICT (organization_id,user_id)
  DO UPDATE SET role=excluded.role,access_scope=excluded.access_scope,is_active=excluded.is_active;
  PERFORM quarry_private.audit(p_org,'MEMBERSHIP_CHANGED',jsonb_build_object('user_id',p_user,'role',p_role,'scope',p_scope,'active',p_active));
END $$;

CREATE FUNCTION public.set_site_member(p_org uuid,p_site uuid,p_user uuid,p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  IF p_active IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user AND is_active)
    OR NOT EXISTS (SELECT 1 FROM public.quarry_sites WHERE organization_id=p_org AND id=p_site) THEN
    RAISE EXCEPTION 'Active organization member and same-organization site required' USING ERRCODE='23514'; END IF;
  IF p_active AND EXISTS (SELECT 1 FROM public.organization_settings WHERE organization_id=p_org
    AND NOT multi_site_enabled AND primary_site_id IS DISTINCT FROM p_site) THEN
    RAISE EXCEPTION 'Enable multi-site before granting another site' USING ERRCODE='23514'; END IF;
  INSERT INTO public.site_memberships(organization_id,site_id,user_id,is_active) VALUES (p_org,p_site,p_user,p_active)
  ON CONFLICT (organization_id,site_id,user_id) DO UPDATE SET is_active=excluded.is_active;
  PERFORM quarry_private.audit(p_org,'SITE_MEMBERSHIP_CHANGED',jsonb_build_object('site_id',p_site,'user_id',p_user,'active',p_active));
END $$;

-- Called only by a future authorized block-save/import operation, not client-executable.
CREATE FUNCTION quarry_private.allocate_block_number(p_org uuid,p_year integer) RETURNS text
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_sequence integer; v_existing integer;
BEGIN
  IF p_year IS NULL OR p_year NOT BETWEEN 1000 AND 9999 THEN RAISE EXCEPTION 'Invalid block year' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_org FOR UPDATE;
  SELECT coalesce(max(right(block_number,4)::integer),0) INTO v_existing FROM public.granite_blocks
    WHERE organization_id=p_org AND extract(year FROM production_date)=p_year;
  INSERT INTO quarry_private.block_number_counters(organization_id,production_year,last_sequence)
  VALUES (p_org,p_year,v_existing+1) ON CONFLICT (organization_id,production_year)
  DO UPDATE SET last_sequence=greatest(quarry_private.block_number_counters.last_sequence+1,v_existing+1),updated_at=now()
  RETURNING last_sequence INTO v_sequence;
  RETURN 'BLK-' || p_year::text || '-' || lpad(v_sequence::text,4,'0');
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quarry_private FROM PUBLIC, anon;
-- Newly created private functions have no authenticated execute grant.
REVOKE ALL ON FUNCTION public.bootstrap_organization(uuid,text,text), public.create_quarry_site(uuid,text,text),
  public.set_multi_site(uuid,boolean,bigint), public.transition_onboarding(uuid,text,bigint),
  public.set_organization_member(uuid,uuid,text,text,boolean), public.set_site_member(uuid,uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(uuid,text,text), public.create_quarry_site(uuid,text,text),
  public.set_multi_site(uuid,boolean,bigint), public.transition_onboarding(uuid,text,bigint),
  public.set_organization_member(uuid,uuid,text,text,boolean), public.set_site_member(uuid,uuid,uuid,boolean) TO authenticated;
COMMIT;
