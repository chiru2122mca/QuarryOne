-- REVIEW DRAFT ONLY. Prototype server-side operations, not an app integration.
BEGIN;
DO $principal$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole
  ) THEN RAISE EXCEPTION 'Migrations require the stable non-superuser postgres principal with CREATEROLE' USING ERRCODE='42501'; END IF;
END $principal$;
SET LOCAL ROLE quarryone_executor;
CREATE FUNCTION quarry_private.require_admin(p_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT quarry_private.is_admin(p_org) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  -- Fresh READ COMMITTED membership lookup after waiting for the organization lock.
  IF NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=p_org AND user_id=quarry_private.request_user_id()
    AND is_active AND role IN ('OWNER','ADMIN')) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION quarry_private.audit(p_org uuid, p_action text, p_details jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO quarry_private.audit_events(organization_id,actor_id,action,details)
  VALUES (p_org,quarry_private.request_user_id(),p_action,p_details);
END $$;
CREATE FUNCTION quarry_private.settings_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END $$;
CREATE TRIGGER settings_revision BEFORE UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION quarry_private.settings_revision();

CREATE FUNCTION quarry_private.lock_tenant_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_org uuid;
BEGIN
  IF TG_OP='DELETE' THEN v_org:=OLD.organization_id; ELSE v_org:=NEW.organization_id; END IF;
  PERFORM 1 FROM public.organizations WHERE id=v_org FOR UPDATE;
  IF TG_OP='UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
      (to_jsonb(NEW)->'id') IS DISTINCT FROM (to_jsonb(OLD)->'id') OR
      (to_jsonb(NEW)->'site_id') IS DISTINCT FROM (to_jsonb(OLD)->'site_id') OR
      (to_jsonb(NEW)->'user_id') IS DISTINCT FROM (to_jsonb(OLD)->'user_id') THEN
      RAISE EXCEPTION 'Tenant, site and row identity are immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organization_settings','quarry_sites','quarry_pits','stockyards','organization_memberships',
    'site_memberships','materials','granite_grades','granite_blocks','production_entries','customers'] LOOP
    EXECUTE format('CREATE TRIGGER a_lock_tenant BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION quarry_private.lock_tenant_identity()',t);
  END LOOP;
END $$;

CREATE FUNCTION quarry_private.claim_block_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_bound uuid; v_bound_at timestamptz; v_year integer; v_sequence integer;
BEGIN
  PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF NEW.block_number !~ '^BLK-[1-9][0-9]{3}-[0-9]{6}$' OR right(NEW.block_number,6)='000000' THEN
    RAISE EXCEPTION 'Block number must be BLK-YYYY-NNNNNN with positive sequence' USING ERRCODE='23514'; END IF;
  v_year:=substring(NEW.block_number FROM 5 FOR 4)::integer; v_sequence:=right(NEW.block_number,6)::integer;
  SELECT block_id,bound_at INTO v_bound,v_bound_at FROM quarry_private.block_number_ledger WHERE organization_id=NEW.organization_id AND block_number=NEW.block_number;
  IF FOUND THEN
    IF v_bound_at IS NOT NULL OR v_bound<>NEW.id THEN RAISE EXCEPTION 'Block number issued or reserved for another identity; cannot reuse' USING ERRCODE='23505'; END IF;
    UPDATE quarry_private.block_number_ledger SET bound_at=now()
      WHERE organization_id=NEW.organization_id AND block_number=NEW.block_number;
  ELSE
    INSERT INTO quarry_private.block_number_ledger(organization_id,block_number,numbering_year,sequence,block_id,bound_at)
      VALUES(NEW.organization_id,NEW.block_number,v_year,v_sequence,NEW.id,now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER block_number_claim BEFORE INSERT ON public.granite_blocks FOR EACH ROW EXECUTE FUNCTION quarry_private.claim_block_number();
CREATE FUNCTION quarry_private.guard_number_retention() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Issued number history cannot be deleted' USING ERRCODE='23514'; END IF;
  IF NEW.organization_id<>OLD.organization_id OR NEW.numbering_year<>OLD.numbering_year THEN
    RAISE EXCEPTION 'Number scope is immutable' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='block_number_counters' THEN
    IF NEW.last_sequence<OLD.last_sequence THEN RAISE EXCEPTION 'Number counter cannot rewind' USING ERRCODE='23514'; END IF;
  ELSE
    IF NEW.block_number<>OLD.block_number OR NEW.sequence<>OLD.sequence OR NEW.created_at<>OLD.created_at
      OR NEW.block_id IS DISTINCT FROM OLD.block_id OR (OLD.bound_at IS NOT NULL AND NEW.bound_at IS DISTINCT FROM OLD.bound_at) THEN
      RAISE EXCEPTION 'Issued number identity is immutable' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_number_retention BEFORE UPDATE OR DELETE ON quarry_private.block_number_ledger FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_number_retention();
CREATE TRIGGER guard_number_retention BEFORE UPDATE OR DELETE ON quarry_private.block_number_counters FOR EACH ROW EXECUTE FUNCTION quarry_private.guard_number_retention();

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
    IF NEW.lifecycle='ACTIVE' AND NOT EXISTS (SELECT 1 FROM public.organization_settings WHERE organization_id=NEW.id
      AND reviewed_revision=revision) THEN RAISE EXCEPTION 'Reviewed configuration changed; return to DRAFT and review again' USING ERRCODE='23514'; END IF;
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
    OR NEW.id<>OLD.id OR NEW.block_number<>OLD.block_number OR NEW.origin<>OLD.origin
    OR NEW.production_date IS DISTINCT FROM OLD.production_date OR NEW.opening_stock_as_of IS DISTINCT FROM OLD.opening_stock_as_of) THEN
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
DECLARE v_user uuid:=quarry_private.require_verified_request_user(); v_org uuid; v_name text:=btrim(p_business_name); v_existing text; v_display text;
BEGIN
  IF p_request IS NULL OR nullif(v_name,'') IS NULL OR nullif(btrim(p_display_name),'') IS NULL THEN
    RAISE EXCEPTION 'Request ID, business name and owner display name are required' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || p_request::text,0));
  SELECT organization_id,business_name,owner_display_name INTO v_org,v_existing,v_display FROM quarry_private.bootstrap_requests WHERE user_id=v_user AND request_id=p_request;
  IF FOUND THEN
    IF v_existing<>v_name OR v_display<>btrim(p_display_name) THEN RAISE EXCEPTION 'Idempotency key payload mismatch' USING ERRCODE='22023'; END IF;
    IF NOT quarry_private.is_member(v_org) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
    RETURN v_org;
  END IF;
  INSERT INTO public.profiles(id,display_name) VALUES (v_user,btrim(p_display_name)) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.organizations(business_name,created_by) VALUES (v_name,v_user) RETURNING id INTO v_org;
  INSERT INTO public.organization_settings(organization_id) VALUES (v_org);
  -- Role and scope are fixed server-side; no role/owner ID input exists.
  INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope) VALUES (v_org,v_user,'OWNER','ALL_SITES');
  INSERT INTO quarry_private.bootstrap_requests(user_id,request_id,organization_id,business_name,owner_display_name) VALUES (v_user,p_request,v_org,v_name,btrim(p_display_name));
  PERFORM quarry_private.audit(v_org,'ORGANIZATION_BOOTSTRAPPED',jsonb_build_object('owner_id',v_user,'role','OWNER','scope','ALL_SITES'));
  RETURN v_org;
END $$;

CREATE FUNCTION public.create_quarry_site(p_org uuid, p_code text, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_site uuid; v_name text; v_state text; v_site_status text;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  SELECT lifecycle INTO v_state FROM public.organizations WHERE id=p_org;
  IF v_state='READY_FOR_REVIEW' THEN RAISE EXCEPTION 'Return to DRAFT before editing reviewed configuration' USING ERRCODE='23514'; END IF;
  IF nullif(btrim(p_code),'') IS NULL OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Site code and name required' USING ERRCODE='22023'; END IF;
  SELECT id,name,status INTO v_site,v_name,v_site_status FROM public.quarry_sites WHERE organization_id=p_org AND code=upper(btrim(p_code));
  IF FOUND THEN
    IF v_name<>btrim(p_name) THEN RAISE EXCEPTION 'Site code already exists with different data' USING ERRCODE='22023'; END IF;
    IF v_site_status='ARCHIVED' THEN RAISE EXCEPTION 'Archived site requires a future explicit restore operation' USING ERRCODE='23514'; END IF;
    RETURN v_site;
  END IF;
  INSERT INTO public.quarry_sites(organization_id,code,name) VALUES (p_org,upper(btrim(p_code)),btrim(p_name)) RETURNING id INTO v_site;
  UPDATE public.organization_settings SET primary_site_id=coalesce(primary_site_id,v_site) WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'SITE_CREATED',jsonb_build_object('site_id',v_site));
  RETURN v_site;
END $$;
CREATE FUNCTION public.set_multi_site(p_org uuid, p_enabled boolean, p_expected_revision bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_revision bigint; v_previous boolean;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  IF p_enabled IS NULL OR p_expected_revision IS NULL THEN RAISE EXCEPTION 'Mode and revision required' USING ERRCODE='22023'; END IF;
  IF (SELECT lifecycle FROM public.organizations WHERE id=p_org)='READY_FOR_REVIEW' THEN
    RAISE EXCEPTION 'Return to DRAFT before editing reviewed configuration' USING ERRCODE='23514'; END IF;
  SELECT revision,multi_site_enabled INTO v_revision,v_previous FROM public.organization_settings WHERE organization_id=p_org;
  IF v_revision<>p_expected_revision THEN RAISE EXCEPTION 'Configuration changed; refresh before saving' USING ERRCODE='40001'; END IF;
  UPDATE public.organization_settings SET multi_site_enabled=p_enabled WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'MULTI_SITE_CHANGED',jsonb_build_object('before',v_previous,'after',p_enabled,'revision_before',v_revision,'revision_after',v_revision+1));
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
    IF NOT EXISTS (SELECT 1 FROM public.organization_settings WHERE organization_id=p_org AND reviewed_revision=v_revision) THEN
      RAISE EXCEPTION 'Reviewed configuration changed; return to DRAFT and review again' USING ERRCODE='23514'; END IF;
    PERFORM quarry_private.assert_ready(p_org);
    UPDATE public.quarry_sites SET status='OPERATIONAL' WHERE organization_id=p_org AND status='SETUP';
  END IF;
  UPDATE public.organizations SET lifecycle=p_target, activated_at=CASE WHEN p_target='ACTIVE' THEN now() ELSE NULL END WHERE id=p_org;
  UPDATE public.organization_settings SET onboarding_stage=CASE WHEN p_target='DRAFT' THEN onboarding_stage ELSE 5 END,
    reviewed_revision=CASE WHEN p_target='READY_FOR_REVIEW' THEN v_revision+1 WHEN p_target='DRAFT' THEN NULL ELSE reviewed_revision END WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'ONBOARDING_TRANSITION',jsonb_build_object('from',v_current,'to',p_target,'revision_before',v_revision,'revision_after',v_revision+1));
END $$;
CREATE FUNCTION public.set_organization_member(p_org uuid,p_user uuid,p_role text,p_scope text,p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor_role text; v_previous_role text; v_before jsonb;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  SELECT role INTO v_actor_role FROM public.organization_memberships WHERE organization_id=p_org AND user_id=quarry_private.request_user_id();
  SELECT role INTO v_previous_role FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'New memberships require the future verified invitation acceptance operation' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('role',role,'scope',access_scope,'active',is_active) INTO v_before FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user;
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
  UPDATE public.organization_settings SET revision=revision WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'MEMBERSHIP_CHANGED',jsonb_build_object('user_id',p_user,'before',v_before,'after',jsonb_build_object('role',p_role,'scope',p_scope,'active',p_active)));
END $$;

CREATE FUNCTION public.set_site_member(p_org uuid,p_site uuid,p_user uuid,p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_before boolean;
BEGIN
  PERFORM quarry_private.require_admin(p_org);
  IF p_active IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=p_org AND user_id=p_user AND (is_active OR NOT p_active))
    OR NOT EXISTS (SELECT 1 FROM public.quarry_sites WHERE organization_id=p_org AND id=p_site) THEN
    RAISE EXCEPTION 'Active organization member and same-organization site required' USING ERRCODE='23514'; END IF;
  IF p_active AND EXISTS (SELECT 1 FROM public.organization_settings WHERE organization_id=p_org
    AND NOT multi_site_enabled AND primary_site_id IS DISTINCT FROM p_site) THEN
    RAISE EXCEPTION 'Enable multi-site before granting another site' USING ERRCODE='23514'; END IF;
  SELECT is_active INTO v_before FROM public.site_memberships WHERE organization_id=p_org AND site_id=p_site AND user_id=p_user;
  INSERT INTO public.site_memberships(organization_id,site_id,user_id,is_active) VALUES (p_org,p_site,p_user,p_active)
  ON CONFLICT (organization_id,site_id,user_id) DO UPDATE SET is_active=excluded.is_active;
  UPDATE public.organization_settings SET revision=revision WHERE organization_id=p_org;
  PERFORM quarry_private.audit(p_org,'SITE_MEMBERSHIP_CHANGED',jsonb_build_object('site_id',p_site,'user_id',p_user,'before',v_before,'after',p_active));
END $$;

CREATE FUNCTION quarry_private.reject_history_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Historical records cannot be deleted or rewritten' USING ERRCODE='23514'; END $$;
CREATE TRIGGER retain_block_history BEFORE DELETE ON public.granite_blocks FOR EACH ROW EXECUTE FUNCTION quarry_private.reject_history_mutation();
CREATE TRIGGER retain_audit_history BEFORE UPDATE OR DELETE ON quarry_private.audit_events FOR EACH ROW EXECUTE FUNCTION quarry_private.reject_history_mutation();

-- Called only by a future authorized block-save/import operation, not client-executable.
CREATE FUNCTION quarry_private.reserve_block_number(p_org uuid,p_year integer,p_block_id uuid) RETURNS text
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_sequence integer; v_existing integer;
BEGIN
  IF p_year IS NULL OR p_year NOT BETWEEN 1000 AND 9999 THEN RAISE EXCEPTION 'Invalid block year' USING ERRCODE='22023'; END IF;
  IF p_block_id IS NULL THEN RAISE EXCEPTION 'Server-generated block ID required' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_org FOR UPDATE;
  SELECT greatest(coalesce((SELECT max(sequence) FROM quarry_private.block_number_ledger WHERE organization_id=p_org AND numbering_year=p_year),0),
    coalesce((SELECT last_sequence FROM quarry_private.block_number_counters WHERE organization_id=p_org AND numbering_year=p_year),0)) INTO v_existing;
  IF v_existing>=999999 THEN RAISE EXCEPTION 'Block-number capacity exhausted for organization/year' USING ERRCODE='2200H'; END IF;
  INSERT INTO quarry_private.block_number_counters(organization_id,numbering_year,last_sequence)
  VALUES (p_org,p_year,v_existing+1) ON CONFLICT (organization_id,numbering_year)
  DO UPDATE SET last_sequence=v_existing+1,updated_at=now()
  RETURNING last_sequence INTO v_sequence;
  INSERT INTO quarry_private.block_number_ledger(organization_id,block_number,numbering_year,sequence,block_id)
    VALUES(p_org,'BLK-' || p_year::text || '-' || lpad(v_sequence::text,6,'0'),p_year,v_sequence,p_block_id);
  RETURN 'BLK-' || p_year::text || '-' || lpad(v_sequence::text,6,'0');
END $$;
-- Internal convenience for abandoned-reservation tests; production save must supply its block UUID.
CREATE FUNCTION quarry_private.allocate_block_number(p_org uuid,p_year integer) RETURNS text
LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT quarry_private.reserve_block_number(p_org,p_year,pg_catalog.gen_random_uuid())
$$;

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
    ('quarry_private.can_read_customers(uuid)','quarryone_executor',true,'s'),
    ('quarry_private.require_admin(uuid)','quarryone_executor',true,'v'),
    ('quarry_private.audit(uuid,text,jsonb)','quarryone_executor',false,'v'),
    ('quarry_private.settings_revision()','quarryone_executor',false,'v'),
    ('quarry_private.lock_tenant_identity()','quarryone_executor',false,'v'),
    ('quarry_private.claim_block_number()','quarryone_executor',true,'v'),
    ('quarry_private.guard_number_retention()','quarryone_executor',false,'v'),
    ('quarry_private.guard_site_mode()','quarryone_executor',false,'v'),
    ('quarry_private.guard_single_site()','quarryone_executor',false,'v'),
    ('quarry_private.assert_ready(uuid)','quarryone_executor',false,'v'),
    ('quarry_private.guard_lifecycle()','quarryone_executor',false,'v'),
    ('quarry_private.ensure_owner()','quarryone_executor',false,'v'),
    ('quarry_private.guard_block()','quarryone_executor',false,'v'),
    ('quarry_private.guard_stockyard_pit()','quarryone_executor',false,'v'),
    ('quarry_private.ensure_production_entry()','quarryone_executor',false,'v'),
    ('public.bootstrap_organization(uuid,text,text)','quarryone_executor',true,'v'),
    ('public.create_quarry_site(uuid,text,text)','quarryone_executor',true,'v'),
    ('public.set_multi_site(uuid,boolean,bigint)','quarryone_executor',true,'v'),
    ('public.transition_onboarding(uuid,text,bigint)','quarryone_executor',true,'v'),
    ('public.set_organization_member(uuid,uuid,text,text,boolean)','quarryone_executor',true,'v'),
    ('public.set_site_member(uuid,uuid,uuid,boolean)','quarryone_executor',true,'v'),
    ('quarry_private.reject_history_mutation()','quarryone_executor',false,'v'),
    ('quarry_private.reserve_block_number(uuid,integer,uuid)','quarryone_executor',false,'v'),
    ('quarry_private.allocate_block_number(uuid,integer)','quarryone_executor',false,'v')
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
DO $revoke$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='quarry_private' AND p.proowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='quarryone_executor') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
  END LOOP;
END $revoke$;
GRANT EXECUTE ON FUNCTION quarry_private.request_user_id(),quarry_private.is_member(uuid),quarry_private.is_admin(uuid),quarry_private.can_access_site(uuid,uuid),
  quarry_private.can_view_profile(uuid),quarry_private.can_read_customers(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_organization(uuid,text,text), public.create_quarry_site(uuid,text,text),
  public.set_multi_site(uuid,boolean,bigint), public.transition_onboarding(uuid,text,bigint),
  public.set_organization_member(uuid,uuid,text,text,boolean), public.set_site_member(uuid,uuid,uuid,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(uuid,text,text), public.create_quarry_site(uuid,text,text),
  public.set_multi_site(uuid,boolean,bigint), public.transition_onboarding(uuid,text,bigint),
  public.set_organization_member(uuid,uuid,text,text,boolean), public.set_site_member(uuid,uuid,uuid,boolean) TO authenticated;
SET LOCAL ROLE postgres;
DO $acl$
DECLARE r record; v_allowed oid[] := ARRAY['quarry_private.request_user_id()'::regprocedure::oid,'quarry_private.is_member(uuid)'::regprocedure::oid,'quarry_private.is_admin(uuid)'::regprocedure::oid,'quarry_private.can_access_site(uuid,uuid)'::regprocedure::oid,'quarry_private.can_view_profile(uuid)'::regprocedure::oid,'quarry_private.can_read_customers(uuid)'::regprocedure::oid,'public.bootstrap_organization(uuid,text,text)'::regprocedure::oid,'public.create_quarry_site(uuid,text,text)'::regprocedure::oid,'public.set_multi_site(uuid,boolean,bigint)'::regprocedure::oid,'public.transition_onboarding(uuid,text,bigint)'::regprocedure::oid,'public.set_organization_member(uuid,uuid,text,text,boolean)'::regprocedure::oid,'public.set_site_member(uuid,uuid,uuid,boolean)'::regprocedure::oid];
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
