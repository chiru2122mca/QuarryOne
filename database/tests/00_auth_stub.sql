-- Isolated local PostgreSQL only. Never apply this synthetic Auth schema to Supabase.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  is_anonymous boolean NOT NULL DEFAULT false
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
INSERT INTO auth.users(id,email_confirmed_at) SELECT
  ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, now() FROM generate_series(1,7) n;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000008',NULL,NULL,false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000009',now(),NULL,true);

CREATE SCHEMA quarry_test;
CREATE TABLE quarry_test.results (label text PRIMARY KEY, passed boolean NOT NULL);
CREATE FUNCTION quarry_test.ok(p_condition boolean,p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_condition IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',p_label; END IF;
  INSERT INTO quarry_test.results VALUES (p_label,true);
  RAISE NOTICE 'PASS: %',p_label;
END $$;
CREATE FUNCTION quarry_test.expect_error(p_statement text,p_state text,p_label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text;
BEGIN
  BEGIN
    EXECUTE p_statement;
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'Expected operation to fail';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
  END;
  PERFORM quarry_test.ok(v_state=p_state,p_label || ' [' || coalesce(v_state,'none') || ']');
END $$;
GRANT USAGE ON SCHEMA quarry_test TO anon, authenticated;
GRANT INSERT,SELECT ON quarry_test.results TO anon,authenticated;
GRANT EXECUTE ON FUNCTION quarry_test.ok(boolean,text),quarry_test.expect_error(text,text,text) TO anon,authenticated;
