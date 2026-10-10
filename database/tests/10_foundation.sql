\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000008',false);
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Unverified','User')$q$,'42501','unverified identity cannot bootstrap');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000009',false);
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Anonymous','User')$q$,'42501','anonymous Auth identity cannot bootstrap');
SELECT set_config('request.jwt.claim.sub','',false);
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Missing','User')$q$,'42501','missing identity cannot bootstrap');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Deccan Stone Business','Owner A') AS org_a \gset
SELECT quarry_test.ok(public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Deccan Stone Business','Owner A')=:'org_a'::uuid,'bootstrap retry returns same organization');
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Different Business','Owner A')$q$,'22023','bootstrap payload mismatch rejected');
SELECT quarry_test.ok((SELECT role='OWNER' AND access_scope='ALL_SITES' FROM public.organization_memberships WHERE organization_id=:'org_a'),'bootstrap fixed owner membership');
SELECT quarry_test.ok((SELECT NOT multi_site_enabled AND lifecycle='DRAFT' FROM public.organizations o JOIN public.organization_settings s ON s.organization_id=o.id WHERE o.id=:'org_a'),'default draft and single-site mode');
SELECT public.create_quarry_site(:'org_a','MAIN','Deccan Stone Quarry') AS site_a \gset
SELECT quarry_test.ok(public.create_quarry_site(:'org_a','MAIN','Deccan Stone Quarry')=:'site_a'::uuid,'site creation retry returns same site');
SELECT quarry_test.ok((SELECT primary_site_id=:'site_a'::uuid FROM public.organization_settings WHERE organization_id=:'org_a'),'first site becomes primary');
SELECT quarry_test.expect_error(format('SELECT public.create_quarry_site(%L,''SECOND'',''Second Quarry'')',:'org_a'),'23514','single-site blocks second site');
SELECT quarry_test.expect_error(format('SELECT public.transition_onboarding(%L,''ACTIVE'',1)',:'org_a'),'23514','cannot skip review');
SELECT quarry_test.expect_error(format('SELECT public.transition_onboarding(%L,''READY_FOR_REVIEW'',1)',:'org_a'),'23514','incomplete onboarding cannot reach review');
SELECT public.set_multi_site(:'org_a',true,(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_a'));
SELECT public.create_quarry_site(:'org_a','SECOND','Second Quarry') AS site_a2 \gset
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,false,(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_a',:'org_a'),'23514','cannot disable with second setup site');
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,true,0)',:'org_a'),'40001','stale settings revision rejected');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000002','Other Business','Owner B') AS org_b \gset
SELECT public.create_quarry_site(:'org_b','MAIN','Other Quarry') AS site_b \gset
SELECT quarry_test.ok((SELECT count(*) FROM public.organizations)=1,'owner cannot read other organization');
SELECT quarry_test.expect_error(format('SELECT public.create_quarry_site(%L,''ATTACK'',''Other Tenant'')',:'org_a'),'42501','cross-tenant controlled operation denied');
RESET ROLE;

-- Trusted fixtures simulate future accepted invitations and whitelisted stage saves.
INSERT INTO public.profiles(id,display_name) SELECT id,'Staff '||right(id::text,1) FROM auth.users WHERE right(id::text,1) IN ('3','4','5','6','7');
INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope) VALUES
  (:'org_a','00000000-0000-0000-0000-000000000003','PRODUCTION_SUPERVISOR','ASSIGNED_SITES'),
  (:'org_a','00000000-0000-0000-0000-000000000004','SALES_ACCOUNTANT','ASSIGNED_SITES'),
  (:'org_a','00000000-0000-0000-0000-000000000005','DISPATCH_GATE_OPERATOR','ASSIGNED_SITES'),
  (:'org_a','00000000-0000-0000-0000-000000000006','ADMIN','ALL_SITES'),
  (:'org_a','00000000-0000-0000-0000-000000000007','QUARRY_MANAGER','ASSIGNED_SITES');
UPDATE public.organizations SET contact_phone='9999999999',state_name='Telangana' WHERE id IN (:'org_a',:'org_b');
UPDATE public.quarry_sites SET state_name='Telangana',district='Karimnagar';
INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES (:'org_a',:'site_a','Pit A') RETURNING id AS pit_a \gset
INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES (:'org_a',:'site_a','Pit B') RETURNING id AS pit_a_other \gset
INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES (:'org_a',:'site_a2','Pit A') RETURNING id AS pit_a2 \gset
INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES (:'org_b',:'site_b','Pit A') RETURNING id AS pit_b \gset
INSERT INTO public.stockyards(organization_id,site_id,pit_id,name) VALUES (:'org_a',:'site_a',:'pit_a','Yard 1') RETURNING id AS yard_a \gset
INSERT INTO public.stockyards(organization_id,site_id,name) VALUES (:'org_a',:'site_a2','Yard 2') RETURNING id AS yard_a2 \gset
INSERT INTO public.stockyards(organization_id,site_id,name) VALUES (:'org_b',:'site_b','Yard 1') RETURNING id AS yard_b \gset
INSERT INTO public.materials(organization_id,name) VALUES (:'org_a','Black Granite') RETURNING id AS mat_a \gset
INSERT INTO public.materials(organization_id,name) VALUES (:'org_b','Black Granite') RETURNING id AS mat_b \gset
INSERT INTO public.granite_grades(organization_id,code) SELECT :'org_a'::uuid,v FROM unnest(ARRAY['A','B','C']) v;
INSERT INTO public.granite_grades(organization_id,code) SELECT :'org_b'::uuid,v FROM unnest(ARRAY['A','B','C']) v;
SELECT id AS grade_a FROM public.granite_grades WHERE organization_id=:'org_a' AND code='A' \gset
SELECT id AS grade_b FROM public.granite_grades WHERE organization_id=:'org_b' AND code='A' \gset
INSERT INTO public.customers(organization_id,customer_code,name) VALUES (:'org_a','C001','Customer A'),(:'org_b','C001','Customer B');

CREATE FUNCTION quarry_test.make_block(p_org uuid,p_site uuid,p_pit uuid,p_mat uuid,p_grade uuid,p_yard uuid,p_user uuid,p_number text,
  p_length numeric DEFAULT 10,p_width numeric DEFAULT 5,p_height numeric DEFAULT 4,p_unit text DEFAULT 'FT',
  p_status text DEFAULT 'AVAILABLE',p_origin text DEFAULT 'PRODUCTION',p_entry boolean DEFAULT true) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.granite_blocks(organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,
    block_number,production_date,length,width,height,dimension_unit,stockyard_location,supervisor_name,status,origin,opening_stock_as_of)
  VALUES(p_org,p_site,p_pit,p_mat,p_grade,p_yard,p_user,p_number,'2026-10-10',p_length,p_width,p_height,p_unit,'Yard bay 1','Ramesh',p_status,p_origin,
    CASE WHEN p_origin='OPENING_STOCK' THEN '2026-10-10'::date ELSE NULL END) RETURNING id INTO v_id;
  IF p_origin='PRODUCTION' AND p_entry THEN
    INSERT INTO public.production_entries(block_id,organization_id,site_id,recorded_by,source_request_id) VALUES(v_id,p_org,p_site,p_user,gen_random_uuid());
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION quarry_test.make_block(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,numeric,numeric,numeric,text,text,text,boolean) FROM PUBLIC;
SELECT quarry_test.make_block(:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001','BLK-2026-0001') AS block_a \gset
SELECT quarry_test.make_block(:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001','BLK-2026-0002',10,5,4,'FT','AVAILABLE','OPENING_STOCK') AS opening_a \gset
SELECT quarry_test.make_block(:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001','BLK-2026-0003',1.25,0.5,0.25,'M') AS decimal_a \gset
SELECT quarry_test.make_block(:'org_a',:'site_a2',:'pit_a2',:'mat_a',:'grade_a',:'yard_a2','00000000-0000-0000-0000-000000000001','BLK-2026-0004') AS block_a2 \gset
SELECT quarry_test.make_block(:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001','BLK-2026-0005',10,5,4,'FT','REJECTED');
SELECT quarry_test.make_block(:'org_b',:'site_b',:'pit_b',:'mat_b',:'grade_b',:'yard_b','00000000-0000-0000-0000-000000000002','BLK-2026-0001') AS block_b \gset
SELECT quarry_test.ok((SELECT volume_m3=5.6633693184 AND length=10 AND dimension_unit='FT' FROM public.granite_blocks WHERE id=:'block_a'),'exact FT calculation retains measurements');
SELECT quarry_test.ok((SELECT volume_m3/0.028316846592=200 FROM public.granite_blocks WHERE id=:'block_a'),'exact CFT conversion');
SELECT quarry_test.ok((SELECT volume_m3=0.15625 FROM public.granite_blocks WHERE id=:'decimal_a'),'unrounded metric decimal volume');
SELECT quarry_test.ok((SELECT round(volume_m3,2)=5.66 FROM public.granite_blocks WHERE id=:'block_a'),'rounding affects display only');
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks WHERE organization_id=:'org_a')=5,'historical inventory includes opening and rejected');
SELECT quarry_test.ok((SELECT sum(volume_m3) FROM public.granite_blocks WHERE organization_id=:'org_a' AND status='AVAILABLE')=3*5.6633693184+0.15625,'available volume excludes rejected');
SELECT quarry_test.ok((SELECT count(*) FROM public.production_entries WHERE organization_id=:'org_a')=4,'opening stock excluded from production capture');
SELECT quarry_test.expect_error(format('SELECT quarry_test.make_block(%L,%L,%L,%L,%L,%L,%L,''BLK-2026-0001'')',:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001'),'23505','duplicate block number prevented across organization');
SELECT quarry_test.expect_error(format('SELECT quarry_test.make_block(%L,%L,%L,%L,%L,%L,%L,''BLK-2025-0098'')',:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001'),'23514','block number year must match original production date');
SELECT quarry_test.expect_error(format('SELECT quarry_test.make_block(%L,%L,%L,%L,%L,%L,%L,''BLK-2026-0098'',10,5,4,''FT'',''AVAILABLE'',''PRODUCTION'',false)',:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001'),'23514','new produced block cannot omit capture entry');
SELECT quarry_test.expect_error(format('SELECT quarry_test.make_block(%L,%L,%L,%L,%L,%L,%L,''BLK-2026-0098'',10,5,4,''FT'',''RESERVED'')',:'org_a',:'site_a',:'pit_a',:'mat_a',:'grade_a',:'yard_a','00000000-0000-0000-0000-000000000001'),'23514','new blocks cannot fabricate reservations');
SELECT quarry_test.expect_error(format('UPDATE public.stockyards SET pit_id=%L WHERE id=%L',:'pit_a_other',:'yard_a'),'23514','stockyard reassignment cannot contradict existing block pit');
SELECT quarry_test.expect_error(format('UPDATE public.granite_blocks SET opening_stock_as_of=NULL WHERE id=%L',:'opening_a'),'23514','opening stock retains explicit as-of provenance');
SELECT quarry_test.expect_error(format('UPDATE public.granite_blocks SET volume_m3=1 WHERE id=%L',:'block_a'),'428C9','caller cannot replace generated volume');
SELECT quarry_test.expect_error(format('INSERT INTO public.production_entries(block_id,organization_id,site_id,recorded_by,source_request_id) VALUES(%L,%L,%L,%L,gen_random_uuid())',:'opening_a',:'org_a',:'site_a','00000000-0000-0000-0000-000000000001'),'23503','opening stock cannot get a production entry');
SELECT quarry_test.expect_error(format('DELETE FROM public.production_entries WHERE block_id=%L',:'block_a'),'23514','produced block cannot lose capture entry');
SELECT quarry_test.expect_error(format('UPDATE public.granite_blocks SET status=''DISPATCHED'' WHERE id=%L',:'block_a'),'23514','status transitions are not implemented');

-- Reuse a valid row to vary one constraint at a time; every failure is rolled back.
CREATE FUNCTION quarry_test.invalid_block(p_block uuid,p_column text,p_literal text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_sql text;
BEGIN
  v_sql := 'INSERT INTO public.granite_blocks(organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,block_number,production_date,length,width,height,dimension_unit,stockyard_location,supervisor_name,origin,opening_stock_as_of,status) SELECT organization_id,site_id,pit_id,material_id,grade_id,stockyard_id,created_by,''BLK-2026-0099'',production_date,length,width,height,dimension_unit,stockyard_location,supervisor_name,''OPENING_STOCK'',''2026-10-10''::date,status FROM public.granite_blocks WHERE id=$1';
  EXECUTE v_sql USING p_block;
  EXECUTE format('UPDATE public.granite_blocks SET %I=%s WHERE block_number=''BLK-2026-0099'' AND organization_id=(SELECT organization_id FROM public.granite_blocks WHERE id=$1)',p_column,p_literal) USING p_block;
END $$;
REVOKE ALL ON FUNCTION quarry_test.invalid_block(uuid,text,text) FROM PUBLIC;
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''length'',''0'')',:'block_a'),'23514','zero dimensions rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''width'',''-1'')',:'block_a'),'23514','negative dimensions rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''height'',%L)',:'block_a',quote_literal('NaN')),'23514','NaN dimensions rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''height'',%L)',:'block_a',quote_literal('Infinity')),'23514','infinite dimensions rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''dimension_unit'',%L)',:'block_a',quote_literal('CM')),'23514','unsupported dimension unit rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''material_id'',%L)',:'block_a',quote_literal(:'mat_b')),'23503','cross-tenant material rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''pit_id'',%L)',:'block_a',quote_literal(:'pit_a2')),'23503','cross-site pit rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''pit_id'',%L)',:'block_a',quote_literal(:'pit_a_other')),'23514','dedicated stockyard pit mismatch rejected');
SELECT quarry_test.expect_error(format('SELECT quarry_test.invalid_block(%L,''stockyard_id'',%L)',:'block_a',quote_literal(:'yard_b')),'23503','cross-tenant stockyard rejected');
SELECT quarry_test.expect_error(format('UPDATE public.granite_blocks SET block_number=''BLK-2026-0000'' WHERE id=%L',:'block_a'),'23514','block number zero or identity rewrite rejected');
SELECT quarry_test.expect_error(format('INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES(%L,%L,''Wrong tenant'')',:'org_a',:'site_b'),'23503','site FK carries tenant');
SELECT quarry_test.expect_error(format('INSERT INTO public.quarry_pits(organization_id,site_id,name) VALUES(%L,%L,'' pit a '')',:'org_a',:'site_a'),'23505','pit names unique ignoring case and whitespace');
SELECT quarry_test.expect_error(format('DELETE FROM public.quarry_sites WHERE id=%L',:'site_a'),'23503','site deletion preserves historical references');
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks WHERE organization_id=:'org_a')=5,'invalid operations leave inventory unchanged');
SELECT quarry_test.expect_error($q$INSERT INTO public.organizations(business_name,lifecycle,created_by,activated_at) VALUES('Skipped draft','ACTIVE','00000000-0000-0000-0000-000000000001',now())$q$,'23514','organizations cannot be inserted already active');
SELECT quarry_test.ok((SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity)=13,'RLS enabled on all 13 public tables');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE')),'no direct authenticated DML grants on any core table');
SELECT quarry_test.ok(NOT has_function_privilege('authenticated','quarry_private.allocate_block_number(uuid,integer)','EXECUTE'),'number allocator is private');
SELECT quarry_test.ok(quarry_private.allocate_block_number(:'org_a',2026)='BLK-2026-0006','number allocation follows imported identities');
SELECT quarry_test.ok(quarry_private.allocate_block_number(:'org_a',2026)='BLK-2026-0007','number allocator advances unique sequence');
SELECT quarry_test.ok(quarry_private.allocate_block_number(:'org_a',2027)='BLK-2027-0001','year counter has independent sequence');
UPDATE quarry_private.block_number_counters SET last_sequence=9999 WHERE organization_id=:'org_a' AND production_year=2027;
SELECT quarry_test.expect_error(format('SELECT quarry_private.allocate_block_number(%L,2027)',:'org_a'),'23514','four-digit capacity fails safely');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT public.set_site_member(:'org_a',:'site_a','00000000-0000-0000-0000-000000000003',true);
SELECT public.set_site_member(:'org_a',:'site_a','00000000-0000-0000-0000-000000000004',true);
SELECT public.set_site_member(:'org_a',:'site_a','00000000-0000-0000-0000-000000000005',true);
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''ADMIN'',''ALL_SITES'',true)',:'org_a','00000000-0000-0000-0000-000000000002'),'42501','new members require invitation acceptance');
SELECT quarry_test.expect_error(format('SELECT public.set_site_member(%L,%L,%L,true)',:'org_a',:'site_b','00000000-0000-0000-0000-000000000003'),'23514','cross-tenant site grant rejected');
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''QUARRY_MANAGER'',''ASSIGNED_SITES'',false)',:'org_a','00000000-0000-0000-0000-000000000001'),'23514','last active owner cannot be removed');
SELECT public.transition_onboarding(:'org_a','READY_FOR_REVIEW',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_a'));
SELECT quarry_test.expect_error(format('SELECT public.create_quarry_site(%L,''THIRD'',''Third Quarry'')',:'org_a'),'23514','reviewed configuration locked');
SELECT public.transition_onboarding(:'org_a','DRAFT',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_a'));
SELECT quarry_test.ok((SELECT lifecycle='DRAFT' FROM public.organizations WHERE id=:'org_a'),'review can return to draft');
SELECT public.transition_onboarding(:'org_a','READY_FOR_REVIEW',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_a'));
SELECT public.transition_onboarding(:'org_a','ACTIVE',(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_a'));
SELECT quarry_test.ok((SELECT activated_at IS NOT NULL AND lifecycle='ACTIVE' FROM public.organizations WHERE id=:'org_a'),'activation validated and timestamped');
SELECT quarry_test.ok((SELECT count(*) FROM public.quarry_sites WHERE organization_id=:'org_a' AND status='OPERATIONAL')=2,'activation marks configured sites operational');
SELECT quarry_test.expect_error(format('SELECT public.transition_onboarding(%L,''DRAFT'',(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_a',:'org_a'),'23514','active organization cannot revert to draft');
RESET ROLE;
UPDATE public.quarry_sites SET status='ARCHIVED' WHERE id=:'site_a2';
SELECT quarry_test.expect_error(format('UPDATE public.organization_settings SET primary_site_id=NULL WHERE organization_id=%L',:'org_a'),'23514','active organization cannot lose primary site');
SET ROLE authenticated;
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,false,(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_a',:'org_a'),'23514','archived secondary history still blocks disabling');
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks WHERE organization_id=:'org_a')=5,'site/mode/lifecycle changes preserve block history');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''ADMIN'',''ALL_SITES'',true)',:'org_a','00000000-0000-0000-0000-000000000003'),'42501','admin cannot promote another admin');
SELECT quarry_test.expect_error(format('SELECT public.set_organization_member(%L,%L,''QUARRY_MANAGER'',''ASSIGNED_SITES'',true)',:'org_a','00000000-0000-0000-0000-000000000001'),'42501','admin cannot demote owner');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
SELECT set_config('request.jwt.claims','{"role":"OWNER","user_metadata":{"role":"OWNER"}}',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks)=4,'assigned supervisor sees only own site blocks');
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks WHERE organization_id=:'org_b')=0,'cross-tenant block reads excluded');
SELECT quarry_test.ok((SELECT count(*) FROM public.quarry_sites)=1,'site assignment limits site list');
SELECT quarry_test.ok((SELECT count(*) FROM public.organization_memberships)=1,'member reads only own membership');
SELECT quarry_test.ok((SELECT count(*) FROM public.profiles)=1,'operational member reads only own profile');
SELECT quarry_test.ok((SELECT count(*) FROM public.customers)=0,'production role cannot read customer PII');
SELECT quarry_test.expect_error(format('UPDATE public.organization_settings SET multi_site_enabled=false WHERE organization_id=%L',:'org_a'),'42501','direct settings update denied');
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,false,0)',:'org_a'),'42501','forged role metadata does not grant admin');
SELECT quarry_test.expect_error(format('INSERT INTO public.site_memberships(organization_id,site_id,user_id) VALUES(%L,%L,%L)',:'org_a',:'site_a2','00000000-0000-0000-0000-000000000003'),'42501','self-granted site write denied');
SELECT quarry_test.expect_error('SELECT * FROM quarry_private.audit_events','42501','private audit table unreadable');
SELECT quarry_test.expect_error(format('SELECT quarry_private.allocate_block_number(%L,2026)',:'org_a'),'42501','client cannot allocate block numbers');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.customers)=1,'accountant reads own tenant customer master');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.customers)=0,'gate role does not read customer master');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks)=0,'unassigned manager has no implicit site access');
RESET ROLE;
UPDATE public.organization_memberships SET is_active=false WHERE organization_id=:'org_a' AND user_id='00000000-0000-0000-0000-000000000003';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks)=0 AND (SELECT count(*) FROM public.organizations)=0,'revoked org membership overrides lingering site grants');
RESET ROLE;
SET ROLE anon;
SELECT quarry_test.expect_error('SELECT * FROM public.organizations','42501','anonymous table reads denied');
SELECT quarry_test.expect_error($q$SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000001','Anon','Anon')$q$,'42501','anonymous RPC execute denied');
RESET ROLE;
SELECT quarry_test.ok((SELECT count(*) FROM quarry_private.audit_events WHERE action='ORGANIZATION_BOOTSTRAPPED')=2,'bootstrap retry creates one audit event per organization');
SELECT quarry_test.ok((SELECT count(*) FROM public.organizations)=2,'failed operations do not create stray tenants');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.set_multi_site(:'org_b',true,(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT public.create_quarry_site(:'org_b','EMPTY','Empty Setup Quarry') AS empty_b \gset
RESET ROLE;
UPDATE public.quarry_sites SET status='ARCHIVED' WHERE id=:'empty_b';
INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope)
  VALUES (:'org_b','00000000-0000-0000-0000-000000000003','PRODUCTION_SUPERVISOR','ASSIGNED_SITES');
SET ROLE authenticated;
SELECT public.set_multi_site(:'org_b',false,(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT quarry_test.ok((SELECT NOT multi_site_enabled FROM public.organization_settings WHERE organization_id=:'org_b'),'safe disable permits empty unassigned archived setup site');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
SELECT quarry_test.ok((SELECT count(*) FROM public.granite_blocks)=0,'single-site mode does not authorize an unassigned member');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.set_multi_site(:'org_b',true,(SELECT revision FROM public.organization_settings WHERE organization_id=:'org_b'));
SELECT public.set_site_member(:'org_b',:'empty_b','00000000-0000-0000-0000-000000000003',true);
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,false,(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_b',:'org_b'),'23514','secondary grants alone prevent ambiguous disable');
SELECT public.set_site_member(:'org_b',:'empty_b','00000000-0000-0000-0000-000000000003',false);
SELECT quarry_test.expect_error(format('SELECT public.set_multi_site(%L,false,(SELECT revision FROM public.organization_settings WHERE organization_id=%L))',:'org_b',:'org_b'),'23514','inactive secondary grants are not silently discarded');
RESET ROLE;
SELECT count(*) AS passing_local_sql_assertions FROM quarry_test.results;
