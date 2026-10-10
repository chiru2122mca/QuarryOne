// Local scratch cluster only. Never connects to an existing DB or Supabase project.
/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { randomUUID } = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "verification", "v041");
const scratch = path.join(os.tmpdir(), `quarryone-sql-${randomUUID()}`);
const bin =
  process.env.QUARRYONE_PG_BIN ??
  (process.platform === "win32"
    ? "C:\\Program Files\\PostgreSQL\\17\\bin"
    : "");
const executable = (name) =>
  bin
    ? path.join(bin, name + (process.platform === "win32" ? ".exe" : ""))
    : name;
let transcript = "";
let started = false;
let port;
const checks = [];
const run = (name, args, allowFailure = false) => {
  // Windows server descendants can retain pipe handles; pg_ctl uses file handles instead.
  const controlLog = path.join(scratch, "pg-control.log");
  const descriptor =
    name === "pg_ctl" ? fs.openSync(controlLog, "w") : undefined;
  const result = spawnSync(executable(name), args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
    ...(descriptor === undefined
      ? {}
      : { stdio: ["ignore", descriptor, descriptor] }),
  });
  if (descriptor !== undefined) {
    fs.closeSync(descriptor);
    result.stdout = fs.readFileSync(controlLog, "utf8");
  }
  transcript += `$ ${name} ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}\n`;
  if (!allowFailure && (result.error || result.status !== 0))
    throw new Error(
      `${name} failed: ${result.error?.message ?? result.stderr}`,
    );
  return result;
};
const connection = () => [
  "-X",
  "-h",
  "127.0.0.1",
  "-p",
  String(port),
  "-U",
  "quarry_test_superuser",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
];
const query = (sql) =>
  run("psql", [...connection(), "-At", "-c", sql]).stdout.trim();
const check = (condition, label) => {
  if (!condition) throw new Error(label);
  checks.push({ label, passed: true });
  console.log(`PASS: ${label}`);
};
const concurrent = (sql) =>
  new Promise((resolve) => {
    const child = spawn(
      executable("psql"),
      [...connection(), "-At", "-c", sql],
      { cwd: root, windowsHide: true },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) =>
      resolve({ code: -1, stdout, stderr: error.message }),
    );
    child.on("close", (code) => {
      transcript += `$ concurrent psql\n${stdout}${stderr}\n`;
      resolve({ code, stdout, stderr });
    });
  });
const actor = (id) =>
  `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-${String(id).padStart(12, "0")}',false);`;
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(scratch, { recursive: true });
  let failure;
  let version;
  try {
    version = run("psql", ["--version"]).stdout.trim();
    port = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const value = server.address().port;
        server.close(() => resolve(value));
      });
    });
    run("initdb", [
      "-D",
      path.join(scratch, "cluster"),
      "-U",
      "quarry_test_superuser",
      "--auth=trust",
      "--no-locale",
      "--encoding=UTF8",
    ]);
    started = true;
    run("pg_ctl", [
      "-D",
      path.join(scratch, "cluster"),
      "-l",
      path.join(scratch, "server.log"),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "-w",
      "start",
    ]);
    run("psql", [...connection(), "-f", "database/tests/00_auth_stub.sql"]);
    for (const file of fs
      .readdirSync(path.join(root, "database", "drafts"))
      .filter((file) => file.endsWith(".draft.sql"))
      .sort()) {
      run("psql", [...connection(), "-f", `database/drafts/${file}`]);
      check(true, `transactional migration parses and applies: ${file}`);
    }
    run("psql", [...connection(), "-f", "database/tests/10_foundation.sql"]);
    const sqlAssertions = Number(
      query("SELECT count(*) FROM quarry_test.results WHERE passed"),
    );
    check(
      sqlAssertions > 50,
      `${sqlAssertions} local SQL constraint/authorization/workflow assertions`,
    );

    const duplicate = run(
      "psql",
      [
        ...connection(),
        "-f",
        "database/drafts/202610100001_foundation.draft.sql",
      ],
      true,
    );
    check(
      duplicate.status !== 0 &&
        query("SELECT count(*) FROM public.organizations") === "2",
      "duplicate migration fails safely without changing data",
    );
    const rollback = run(
      "psql",
      [
        ...connection(),
        "-c",
        "BEGIN; CREATE TABLE quarry_test.rollback_probe(id integer); SELECT 1/0; COMMIT;",
      ],
      true,
    );
    check(
      rollback.status !== 0 &&
        query("SELECT to_regclass('quarry_test.rollback_probe') IS NULL") ===
          "t",
      "failed migration transaction rolls back DDL",
    );

    const org = query(
      "SELECT id FROM public.organizations WHERE business_name='Deccan Stone Business'",
    );
    const numbers = await Promise.all([
      concurrent(
        `SELECT quarry_private.allocate_block_number(${quote(org)},2026)`,
      ),
      concurrent(
        `SELECT quarry_private.allocate_block_number(${quote(org)},2026)`,
      ),
    ]);
    check(
      numbers.every((r) => r.code === 0) &&
        new Set(numbers.map((r) => r.stdout.trim())).size === 2,
      "concurrent number allocation returns distinct numbers",
    );

    const bootstrapSql = `${actor(1)} SELECT public.bootstrap_organization('10000000-0000-0000-0000-000000000099','Concurrent Business','Owner A');`;
    const bootstraps = await Promise.all([
      concurrent(bootstrapSql),
      concurrent(bootstrapSql),
    ]);
    check(
      bootstraps.every((r) => r.code === 0) &&
        query(
          "SELECT count(*) FROM public.organizations WHERE business_name='Concurrent Business'",
        ) === "1",
      "concurrent bootstrap retries create one tenant",
    );
    const orgC = query(
      "SELECT id FROM public.organizations WHERE business_name='Concurrent Business'",
    );
    query(
      `INSERT INTO public.organization_memberships(organization_id,user_id,role,access_scope) VALUES(${quote(orgC)},'00000000-0000-0000-0000-000000000002','OWNER','ALL_SITES')`,
    );
    const removals = await Promise.all(
      [1, 2].map((id) =>
        concurrent(
          `${actor(id)} SELECT public.set_organization_member(${quote(orgC)},'00000000-0000-0000-0000-${String(id).padStart(12, "0")}','QUARRY_MANAGER','ASSIGNED_SITES',false)`,
        ),
      ),
    );
    check(
      removals.filter((r) => r.code === 0).length === 1 &&
        query(
          `SELECT count(*) FROM public.organization_memberships WHERE organization_id=${quote(orgC)} AND role='OWNER' AND is_active`,
        ) === "1",
      "concurrent owner removals retain exactly one active owner",
    );
    const remaining = Number(
      query(
        `SELECT right(user_id::text,1) FROM public.organization_memberships WHERE organization_id=${quote(orgC)} AND role='OWNER' AND is_active`,
      ),
    );
    const sites = await Promise.all(
      ["ONE", "TWO"].map((code) =>
        concurrent(
          `${actor(remaining)} SELECT public.create_quarry_site(${quote(orgC)},'${code}','${code} Quarry')`,
        ),
      ),
    );
    check(
      sites.filter((r) => r.code === 0).length === 1 &&
        query(
          `SELECT count(*) FROM public.quarry_sites WHERE organization_id=${quote(orgC)}`,
        ) === "1",
      "concurrent single-site creation cannot create two sites",
    );
    const revision = query(
      `SELECT revision FROM public.organization_settings WHERE organization_id=${quote(orgC)}`,
    );
    const modes = await Promise.all(
      ["true", "false"].map((enabled) =>
        concurrent(
          `${actor(remaining)} SELECT public.set_multi_site(${quote(orgC)},${enabled},${revision})`,
        ),
      ),
    );
    check(
      modes.filter((r) => r.code === 0).length === 1 &&
        query(
          `SELECT revision FROM public.organization_settings WHERE organization_id=${quote(orgC)}`,
        ) === String(Number(revision) + 1),
      "concurrent settings changes enforce expected revision",
    );
  } catch (error) {
    failure = error.message;
    console.error(failure);
    process.exitCode = 1;
  } finally {
    if (started) {
      const stop = run(
        "pg_ctl",
        ["-D", path.join(scratch, "cluster"), "-m", "fast", "-w", "stop"],
        true,
      );
      if (stop.status !== 0) {
        failure = [failure, "Scratch PostgreSQL shutdown failed"]
          .filter(Boolean)
          .join("; ");
        process.exitCode = 1;
      }
    }
    fs.writeFileSync(
      path.join(output, "database-test.log"),
      transcript
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .trimEnd() + "\n",
    );
    fs.writeFileSync(
      path.join(output, "database-results.json"),
      JSON.stringify(
        {
          version,
          passed: !failure,
          checks,
          failure: failure ?? null,
          scratchDirectory: scratch,
          scratchStopped: started && !failure?.includes("shutdown failed"),
          liveSupabase: "not created, connected or tested",
          limitations: [
            "Synthetic auth.users/auth.uid() and database roles; no signed JWT gateway or live Supabase verification",
            "Invitation delivery/acceptance, stage-save and operational-write integration remain future contracts",
          ],
        },
        null,
        2,
      ),
    );
  }
})();
