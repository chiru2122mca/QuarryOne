\set ON_ERROR_STOP on
SELECT id AS org_a FROM public.organizations WHERE business_name='Deccan Stone Business' \gset
SELECT id AS org_b FROM public.organizations WHERE business_name='Other Business' \gset
SELECT primary_site_id AS site_a FROM public.organization_settings WHERE organization_id=:'org_a' \gset
SELECT primary_site_id AS site_b FROM public.organization_settings WHERE organization_id=:'org_b' \gset
SELECT id AS block_a FROM public.granite_blocks WHERE organization_id=:'org_a' AND block_number='BLK-2026-000001' \gset

CREATE FUNCTION quarry_test.opening(p_number text,p_original date DEFAULT NULL,p_reference date DEFAULT '2030-04-01',p_origin text DEFAULT 'OPENING_STOCK',p_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.granite_blocks(id,organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,
    block_number,production_date,length,width,height,dimension_unit,stockyard_location,supervisor_name,origin,opening_stock_as_of)
  SELECT coalesce(p_id,gen_random_uuid()),organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,
    p_number,p_original,10,5,4,'FT','Opening bay 1','Recorded by owner',p_origin,p_reference
  FROM public.granite_blocks WHERE block_number='BLK-2026-000001' AND organization_id=(SELECT id FROM public.organizations WHERE business_name='Deccan Stone Business')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION quarry_test.opening(text,date,date,text,uuid) FROM PUBLIC;
SELECT quarry_test.opening('BLK-2030-000001') AS unknown_opening \gset
SELECT quarry_test.opening('BLK-2030-000002','2024-02-02') AS known_opening \gset
SELECT quarry_test.ok((SELECT production_date IS NULL AND opening_stock_as_of='2030-04-01' AND numbering_year=2030 AND volume_m3=5.6633693184
  FROM public.granite_blocks WHERE id=:'unknown_opening'),'unknown-date opening stock preserves reference date and canonical volume');
SELECT quarry_test.ok((SELECT production_date='2024-02-02' AND numbering_year=2030 FROM public.granite_blocks WHERE id=:'known_opening'),'known opening date retained; identifier year uses opening reference');
SELECT quarry_test.ok((SELECT count(*) FROM public.production_entries WHERE organization_id=:'org_a')=4,'opening stock never inflates newly produced records');
SELECT quarry_test.ok((SELECT sum(b.volume_m3) FROM public.granite_blocks b JOIN public.production_entries e ON e.block_id=b.id WHERE b.organization_id=:'org_a')=3*5.6633693184+0.15625,'opening stock never inflates newly produced volume');
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks WHERE organization_id=:'org_a')=7,'inventory includes both unknown and known-date opening stock');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000003',NULL,NULL)$q$,'23514','opening stock requires reference date');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000003',NULL,NULL,'PRODUCTION')$q$,'23514','production requires real production date');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000003','2031-01-01')$q$,'23514','opening production date cannot follow reference date');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2029-000003')$q$,'23514','number year must match opening reference');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-00003')$q$,'23514','five-digit number rejected');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000000')$q$,'23514','six-digit zero sequence rejected');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000001')$q$,'23505','issued opening block number cannot be reused');
SELECT quarry_test.expect_error(format('UPDATE public.granite_blocks SET production_date=''2024-01-01'' WHERE id=%L',:'unknown_opening'),'23514','unknown production date cannot be silently rewritten');
SELECT quarry_test.expect_error(format('DELETE FROM public.granite_blocks WHERE id=%L',:'unknown_opening'),'23514','opening block history cannot be deleted');
SELECT quarry_test.ok(quarry_private.allocate_block_number(:'org_a',2030)='BLK-2030-000003','allocator skips imported ledger identities');
SELECT quarry_test.ok(quarry_private.allocate_block_number(:'org_a',2030)='BLK-2030-000004','committed unbound reservation is not reused');
SELECT quarry_test.expect_error($q$SELECT quarry_test.opening('BLK-2030-000003')$q$,'23505','an import cannot steal another block UUID reservation');
SELECT quarry_test.ok(quarry_private.reserve_block_number(:'org_a',2041,'20410000-0000-0000-0000-000000000001')='BLK-2041-000001','future save reserves number against server block identity');
SELECT quarry_test.opening('BLK-2041-000001',NULL,'2041-01-01','OPENING_STOCK','20410000-0000-0000-0000-000000000001');
SELECT quarry_test.ok((SELECT bound_at IS NOT NULL FROM quarry_private.block_number_ledger WHERE organization_id=:'org_a' AND block_number='BLK-2041-000001'),'matching UUID consumes exactly its reserved number');
SELECT quarry_test.expect_error(format('DELETE FROM quarry_private.block_number_ledger WHERE organization_id=%L AND block_number=''BLK-2030-000004''',:'org_a'),'23514','reserved number tombstone cannot be deleted');
SELECT quarry_test.expect_error(format('UPDATE quarry_private.block_number_counters SET last_sequence=1 WHERE organization_id=%L AND numbering_year=2030',:'org_a'),'23514','counter cannot rewind');
SELECT quarry_test.expect_error(format('DELETE FROM quarry_private.block_number_counters WHERE organization_id=%L AND numbering_year=2030',:'org_a'),'23514','counter cannot be removed');
SELECT quarry_test.expect_error(format('UPDATE quarry_private.block_number_ledger SET block_id=NULL,bound_at=NULL WHERE organization_id=%L AND block_number=''BLK-2030-000001''',:'org_a'),'23514','issued number cannot be unbound');
INSERT INTO quarry_private.block_number_counters(organization_id,numbering_year,last_sequence) VALUES(:'org_a',2031,999999);
SELECT quarry_test.expect_error(format('SELECT quarry_private.allocate_block_number(%L,2031)',:'org_a'),'2200H','capacity exhaustion has explicit SQLSTATE');
SELECT quarry_test.ok((SELECT last_sequence FROM quarry_private.block_number_counters WHERE organization_id=:'org_a' AND numbering_year=2031)=999999,'capacity failure retains counter and creates no duplicate');
SELECT quarry_test.expect_error(format('UPDATE quarry_private.audit_events SET action=''TAMPERED'' WHERE organization_id=%L',:'org_a'),'23514','audit entries cannot be rewritten');
SELECT quarry_test.expect_error(format('DELETE FROM quarry_private.audit_events WHERE organization_id=%L',:'org_a'),'23514','audit entries cannot be erased');
SELECT quarry_test.ok((SELECT NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole FROM pg_roles WHERE rolname='quarryone_executor'),'executor owner has no login, superuser or global bypass privileges');
SELECT quarry_test.ok(NOT pg_has_role('authenticated','quarryone_executor','MEMBER') AND NOT pg_has_role('anon','quarryone_executor','MEMBER'),'clients cannot inherit executor role');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE (n.nspname='quarry_private' OR (n.nspname='public' AND p.prosecdef)) AND p.proowner<>(SELECT oid FROM pg_roles WHERE rolname='quarryone_executor')),'all controlled/helper functions have explicit restricted ownership');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prosecdef AND n.nspname IN ('public','quarry_private') AND NOT p.proconfig @> ARRAY['search_path=""']),'all SECURITY DEFINER functions pin empty search path');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='quarry_private' AND has_function_privilege('authenticated',p.oid,'EXECUTE') AND p.proname NOT IN
  ('is_member','is_admin','can_access_site','can_view_profile','can_read_customers')),'authenticated private execution is exactly the policy-helper allowlist');
SELECT quarry_test.ok(NOT has_schema_privilege('authenticated','public','CREATE') AND NOT has_schema_privilege('authenticated','quarry_private','CREATE'),'client schema object creation denied');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='quarry_private' AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE'))),'permissive function defaults do not expose private functions');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='quarry_private' AND c.relkind='r'
  AND (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE'))),'permissive table defaults do not expose internal bookkeeping');
SELECT quarry_test.ok(NOT has_function_privilege('service_role','public.bootstrap_organization(uuid,text,text)','EXECUTE'),'service credential cannot bypass authenticated bootstrap contract');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
  AND has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE')),'service default grants do not create a direct-table onboarding bypass');
SELECT quarry_test.ok((SELECT volume_m3>0 FROM public.granite_blocks WHERE id=:'unknown_opening'),'stored canonical volume must remain representable and positive');
DO $$
DECLARE rejected boolean:=false;
BEGIN
  BEGIN
    PERFORM quarry_test.make_block(organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,
      'BLK-2026-999000',1e-6000,1e-6000,1e-6000,'M') FROM public.granite_blocks WHERE block_number='BLK-2026-000001'
      AND organization_id=(SELECT id FROM public.organizations WHERE business_name='Deccan Stone Business');
  EXCEPTION WHEN check_violation OR numeric_value_out_of_range THEN rejected:=true;
  END;
  PERFORM quarry_test.ok(rejected,'numeric underflow cannot commit a zero canonical volume');
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''OWNER'',''ALL_SITES'',true)',:'org_a','00000000-0000-0000-0000-000000000006'),'42501','admin cannot self-promote to owner');
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''QUARRY_MANAGER'',''ALL_SITES'',true)',:'org_b','00000000-0000-0000-0000-000000000003'),'42501','admin cannot change another tenant membership');
SELECT quarry_test.expect_error(format('SELECT public.set_site_member(%L,%L,%L,true)',:'org_a',:'site_a','00000000-0000-0000-0000-000000000003'),'23514','revoked organization member cannot receive new site grant');
SELECT public.set_site_member(:'org_a',:'site_a','00000000-0000-0000-0000-000000000003',false);
SELECT quarry_test.ok((SELECT NOT is_active FROM public.site_memberships WHERE organization_id=:'org_a' AND site_id=:'site_a' AND user_id='00000000-0000-0000-0000-000000000003'),'admin can clean up site grant after parent revocation');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',false);
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''ADMIN'',''ALL_SITES'',true)',:'org_a','00000000-0000-0000-0000-000000000007'),'42501','operational role cannot self-escalate');
SELECT quarry_test.expect_error(format('SELECT public.transition_onboarding(%L,''ACTIVE'',0)',:'org_b'),'42501','operational role cannot activate another tenant');
SELECT quarry_test.expect_error('SELECT quarry_private.require_admin(NULL)','42501','internal authorization helper is not directly executable');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Deccan Stone Business','Different Owner Name')$q$,'22023','bootstrap retry validates full semantic payload');
SELECT quarry_test.expect_error(format('SELECT public.create_quarry_site(%L,''SECOND'',''Second Quarry'')',:'org_a'),'23514','archived site cannot be returned as newly created');
RESET ROLE;
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM quarry_private.audit_events WHERE action IN ('MEMBERSHIP_CHANGED','SITE_MEMBERSHIP_CHANGED','MULTI_SITE_CHANGED')
  AND NOT (details ? 'before' AND details ? 'after')),'sensitive changes record before and after state');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.transition_onboarding(:'org_b','READY_FOR_REVIEW',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT quarry_test.ok((SELECT reviewed_revision=revision FROM public.organization_settings WHERE organization_id=:'org_b'),'review records exact configuration revision');
SELECT public.set_site_member(:'org_b',:'site_b','00000000-0000-0000-0000-000000000003',true);
SELECT quarry_test.expect_error(format('SELECT public.transition_onboarding(%L,''ACTIVE'',(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_b',:'org_b'),'23514','membership changes invalidate reviewed snapshot even with fresh revision');
SELECT public.transition_onboarding(:'org_b','DRAFT',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT public.transition_onboarding(:'org_b','READY_FOR_REVIEW',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT public.transition_onboarding(:'org_b','ACTIVE',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT quarry_test.ok((SELECT lifecycle='ACTIVE' FROM public.organizations WHERE id=:'org_b'),'updated configuration must be reviewed before activation');
SELECT revision AS before_site_revision FROM public.organization_settings WHERE organization_id=:'org_b' \gset
SELECT public.create_quarry_site(:'org_b','LATER','Later Setup Quarry');
SELECT quarry_test.ok((SELECT revision=(:'before_site_revision'::bigint)+1 FROM public.organization_settings WHERE organization_id=:'org_b'),'additional site creation advances configuration revision');
RESET ROLE;
