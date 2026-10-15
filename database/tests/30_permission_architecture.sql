\set ON_ERROR_STOP on
-- Local simulated request settings, never signed JWT verification.
SELECT quarry_test.ok(pg_has_role('quarry_test_migrator','postgres','SET') AND NOT pg_has_role('quarry_test_migrator','postgres','USAGE')
  AND (SELECT NOT rolsuper AND NOT rolcreaterole AND NOT rolbypassrls FROM pg_roles WHERE rolname='quarry_test_migrator'), 'CLI transport modeled as restricted SET-only non-superuser login');
SELECT quarry_test.ok((SELECT NOT rolsuper AND NOT rolbypassrls AND rolcreaterole FROM pg_roles WHERE rolname='postgres'), 'migration principal is non-superuser without new RLS bypass');
SELECT quarry_test.ok(NOT has_schema_privilege('postgres','auth','USAGE WITH GRANT OPTION'), 'hosted Auth schema delegation limitation reproduced');
SELECT quarry_test.ok(NOT has_function_privilege('postgres','auth.uid()','EXECUTE WITH GRANT OPTION'), 'hosted uid delegation limitation reproduced');
SELECT quarry_test.ok(has_schema_privilege('postgres','auth','USAGE') AND has_column_privilege('postgres','auth.users','id','SELECT WITH GRANT OPTION'), 'trusted owner retains only prerequisite Auth reads');
SELECT quarry_test.ok(pg_has_role('postgres','quarryone_executor','SET') AND NOT pg_has_role('postgres','quarryone_executor','USAGE'), 'stable migration membership explicitly SET-only');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='quarry_private' AND p.proowner<>(SELECT oid FROM pg_roles WHERE rolname=CASE
    WHEN p.oid='quarry_private.require_verified_request_user()'::regprocedure THEN 'postgres' ELSE 'quarryone_executor' END)), 'exact owner exception survives every migration');
SELECT quarry_test.ok((SELECT NOT prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=""'] AND pronargs=0 AND prorettype='uuid'::regtype
  FROM pg_proc WHERE oid='quarry_private.request_user_id()'::regprocedure), 'identity helper is stable invoker fixed-path no-argument UUID');
SELECT quarry_test.ok((SELECT prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=""'] AND pronargs=0 AND prorettype='uuid'::regtype AND NOT proretset
  FROM pg_proc WHERE oid='quarry_private.require_verified_request_user()'::regprocedure), 'verified helper is stable fixed-path scalar UUID definer');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a
  WHERE p.oid='quarry_private.require_verified_request_user()'::regprocedure
  AND a.grantee NOT IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres','quarryone_executor'))), 'verified helper ACL contains only owner and executor');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='quarry_private'
  AND a.grantee=0), 'no private function retains PUBLIC execution');
SELECT quarry_test.ok((SELECT count(*)=6 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='quarry_private' AND has_function_privilege('authenticated',p.oid,'EXECUTE')), 'exactly six policy and identity helpers executable by authenticated');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='quarry_private' AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE'))), 'anon and service role cannot execute any private function');

-- Test scaffolding grants only; never copied into production migrations.
GRANT USAGE ON SCHEMA quarry_test TO quarryone_executor;
GRANT INSERT,SELECT ON quarry_test.results TO quarryone_executor;
GRANT EXECUTE ON FUNCTION quarry_test.ok(boolean,text),quarry_test.expect_error(text,text,text) TO quarryone_executor;
SET ROLE quarryone_executor;
SELECT quarry_test.expect_error('SELECT id FROM auth.users','42501','executor direct Auth table access denied');
SELECT quarry_test.expect_error('SELECT auth.uid()','42501','executor direct Auth identity access denied');
SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NULL,'missing identity has no role-name fallback');
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','missing verified identity rejected');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT quarry_test.ok(quarry_private.require_verified_request_user()='00000000-0000-0000-0000-000000000001'::uuid,'trusted owner can read verified user when caller cannot access Auth');
SELECT quarry_test.expect_error($q$SELECT quarry_private.require_verified_request_user('00000000-0000-0000-0000-000000000002'::uuid)$q$,'42883','helper has no impersonation parameter overload');
SELECT set_config('request.jwt.claim.sub','invalid-uuid',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NULL,'malformed scalar identity fails closed');
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','malformed scalar verified identity rejected');
SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{invalid-json',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NULL,'malformed claims JSON fails closed');
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','malformed JSON verified identity rejected');
SELECT set_config('request.jwt.claims','{"sub":""}',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NULL,'empty JSON subject fails closed');
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','empty JSON verified identity rejected');
SELECT set_config('request.jwt.claims','{}',false);
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','absent JSON subject rejected');
SELECT set_config('request.jwt.claims','',false),set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000008',false);
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','unverified email and phone rejected');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000009',false);
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','authenticated anonymous account rejected');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false);
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','nonexistent Auth account rejected');
RESET ROLE;

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000010',NULL,now(),false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000010',false);
SET ROLE quarryone_executor;
SELECT quarry_test.ok(quarry_private.require_verified_request_user()='00000000-0000-0000-0000-000000000010'::uuid,'verified phone account accepted');
RESET ROLE;
UPDATE auth.users SET phone_confirmed_at=NULL WHERE id='00000000-0000-0000-0000-000000000010';
SET ROLE quarryone_executor;
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','verification removal reflected without trusting old claim data');
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000010';
SET ROLE quarryone_executor;
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','deleted Auth account rejected');
RESET ROLE;

-- Compare valid/missing claim semantics with the hosted-definition Auth stub.
SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NOT DISTINCT FROM auth.uid(),'JSON fallback matches observed auth.uid');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT quarry_test.ok(quarry_private.request_user_id()=auth.uid() AND auth.uid()='00000000-0000-0000-0000-000000000002'::uuid,'scalar subject takes precedence over JSON subject');
SELECT set_config('request.jwt.claims','{invalid-json',false);
SELECT quarry_test.ok(quarry_private.request_user_id()=auth.uid(),'valid scalar short-circuits malformed JSON exactly as Auth');
SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','',false);
SELECT quarry_test.ok(quarry_private.request_user_id() IS NOT DISTINCT FROM auth.uid(),'missing subject matches Auth null semantics');
SET ROLE authenticated;
SELECT quarry_test.expect_error('SELECT quarry_private.require_verified_request_user()','42501','authenticated client cannot directly execute verification bridge');
SELECT quarry_test.ok((SELECT count(*)=0 FROM public.organizations),'missing identity cannot read tenant records');
RESET ROLE;
SELECT quarry_test.ok((SELECT count(*)>0 FROM quarry_private.audit_events WHERE actor_id='00000000-0000-0000-0000-000000000001'::uuid), 'audit retains real end user across definer boundaries');
SELECT quarry_test.ok(NOT EXISTS (SELECT 1 FROM quarry_private.audit_events WHERE actor_id IS NULL), 'existing workflows never audit a privileged role as missing actor');
-- Existing A/B tenant, site scope, revocation, bootstrap and last-owner tests remain in 10/20.

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT id AS actor_org FROM public.organizations WHERE business_name='Deccan Stone Business' \gset
SET ROLE quarryone_executor;
SELECT quarry_private.audit(:'actor_org','PERMISSION_ACTOR_PROBE','{}'::jsonb);
RESET ROLE;
SELECT quarry_test.ok((SELECT count(*)=1 AND bool_and(actor_id='00000000-0000-0000-0000-000000000001'::uuid)
  FROM quarry_private.audit_events WHERE action='PERMISSION_ACTOR_PROBE'),'new audit records request identity rather than definer owner');
