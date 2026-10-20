const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

// Serve the existing static web export on an ephemeral loopback port.
async function localPreview() {
  const root = path.resolve("dist");
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".ttf": "font/ttf",
      ".ico": "image/x-icon",
    };
    response.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

// Run after Expo web export; optionally target an existing QUARRYONE_PREVIEW_URL.
(async () => {
  const preview = process.env.QUARRYONE_PREVIEW_URL
    ? null
    : await localPreview();
  const base = process.env.QUARRYONE_PREVIEW_URL || preview.url;
  const directory = "verification/v043a1";
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const requests = [];
  const results = [];
  try {
    for (const width of [360, 390, 412]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          request.method() !== "GET" ||
          /supabase|\/auth\/v1|\/rest\/v1/.test(request.url())
        ) {
          requests.push({ method: request.method(), url: request.url() });
        }
      });
      const button = (name) =>
        page
          .getByRole("button", { name, exact: true })
          .filter({ visible: true })
          .first();
      const title = (name) =>
        page
          .getByRole("heading", { name, exact: true })
          .filter({ visible: true })
          .first();
      const saved = () =>
        page
          .getByText("Demo draft saved for this session.", { exact: true })
          .filter({ visible: true });
      const layout = async () => {
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width}: horizontal overflow`,
        );
        const header = await page
          .getByTestId("onboarding-header")
          .filter({ visible: true })
          .boundingBox();
        assert(header && header.x >= 0 && header.x + header.width <= width + 1);
        assert.equal(header.height, 56);
        for (const name of [
          "Continue",
          "Save Draft",
          "Back",
          "Reset demo draft",
          "Go back",
        ]) {
          const bounds = await button(name).boundingBox();
          assert(
            bounds && bounds.height >= 48,
            `${width}: ${name} touch target`,
          );
        }
      };
      await page.goto(`${base}/more`);
      assert.equal(await page.getByRole("tab").count(), 5);
      await page.getByRole("button", { name: /Demo Business Setup/ }).click();
      await title("Business Registration").waitFor();
      await page
        .getByText("Single quarry · FT / CFT", { exact: true })
        .waitFor();
      await page.getByText("INR · Asia/Kolkata", { exact: true }).waitFor();
      await layout();
      await button("Save Draft").click();
      await saved().waitFor();
      await page.screenshot({
        path: `${directory}/business-${width}.png`,
        fullPage: true,
      });
      const stages = [
        "Quarry Configuration",
        "Materials & Measurements",
        "Users & Roles",
        "Review & Activate",
      ];
      for (let i = 0; i < stages.length; i++) {
        await button("Continue").click();
        await title(stages[i]).waitFor();
        await saved().waitFor();
        const progress = page
          .getByRole("progressbar")
          .filter({ visible: true });
        assert.equal(
          await progress.getAttribute("aria-valuenow"),
          String(i + 2),
        );
        await layout();
      }
      assert.equal(await button("Continue").isDisabled(), true);
      await page.screenshot({
        path: `${directory}/review-${width}.png`,
        fullPage: true,
      });
      for (const stage of [
        "Users & Roles",
        "Materials & Measurements",
        "Quarry Configuration",
        "Business Registration",
      ]) {
        await button("Back").click();
        await title(stage).waitFor();
      }
      await button("Continue").click();
      await title("Quarry Configuration").waitFor();
      // Browser history changes the root route without reloading the React provider.
      await page.goBack();
      await page.getByRole("button", { name: /Demo Business Setup/ }).waitFor();
      await page.getByRole("button", { name: /Demo Business Setup/ }).click();
      await title("Quarry Configuration").waitFor();
      await saved().waitFor();
      await button("Reset demo draft").click();
      await title("Business Registration").waitFor();
      assert.equal(await saved().count(), 0);
      await button("Go back").click();
      await page.getByRole("button", { name: /Demo Business Setup/ }).waitFor();
      assert.equal(await page.getByRole("tab").count(), 5);
      // Query parameters are not navigation destinations.
      await page.goto(`${base}/onboarding?step=/sales`);
      await title("Business Registration").waitFor();
      await button("Save Draft").click();
      await saved().waitFor();
      await page.reload();
      await title("Business Registration").waitFor();
      assert.equal(
        await saved().count(),
        0,
        "Reload starts a fresh session draft",
      );
      results.push({
        width,
        result: "PASS",
        forward_back: true,
        session_save_resume_reset: true,
        route_allowlist: true,
        no_horizontal_overflow: true,
        minimum_touch_targets: 48,
      });
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(
      requests,
      [],
      "No mutation/Auth/database network requests from wizard",
    );
    fs.writeFileSync(
      `${directory}/responsive-results.json`,
      JSON.stringify(
        {
          results,
          page_errors: errors,
          mutation_or_backend_requests: requests,
          physical_android: "PENDING MANUAL CHECK",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    if (preview) await new Promise((resolve) => preview.server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
