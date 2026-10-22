const assert = require("node:assert/strict");
const { expect } = require("@playwright/test");

exports.verifyUsersScenarios = async ({
  page,
  button,
  title,
  saved,
  layout,
  width,
  directory,
  ownerName,
  ownerPhone,
}) => {
  const members = () =>
    page.locator('[data-testid^="invitation-"]').filter({ visible: true });
  const field = (card, name) =>
    card.getByRole("textbox", { name, exact: true });
  const owner = () =>
    page.getByTestId("primary-owner").filter({ visible: true });
  const skip = () => button("Skip for Now — I'll add team members later.");
  const choose = async (card, label, id) => {
    await card.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
    await page
      .getByTestId(`reference-option-${id}`)
      .filter({ visible: true })
      .click();
    await button("Cancel").waitFor({ state: "hidden" });
  };
  const contactMethod = async (card, value) => {
    await card.getByRole("button", { name: /^Contact Method:/ }).click();
    await page
      .getByRole("button", { name: new RegExp(`^${value}(?:\\s*✓)?$`) })
      .filter({ visible: true })
      .click();
    await button("Cancel").waitFor({ state: "hidden" });
  };
  const checkbox = (card, name) =>
    card.getByRole("checkbox", { name: new RegExp(name) });
  const confirm = async (name) => {
    await button(name).click();
    await button("Confirm removal").waitFor({ state: "hidden" });
  };
  const checkLayout = async () => {
    await layout();
    for (const role of ["textbox", "checkbox", "button"])
      for (const rect of await page
        .getByRole(role)
        .filter({ visible: true })
        .evaluateAll((elements) =>
          elements.map((element) => {
            const r = element.getBoundingClientRect();
            return { x: r.x, width: r.width, height: r.height };
          }),
        ))
        assert(
          rect.height >= 48 && rect.x >= 0 && rect.x + rect.width <= width + 1,
          `${width} Users ${role} bounds/touch targets`,
        );
  };
  await expect(owner()).toContainText(ownerName);
  await expect(owner()).toContainText(ownerPhone);
  await expect(owner()).toContainText("OWNER");
  await expect(owner()).toContainText("ALL_SITES");
  assert.equal(await owner().getByRole("button").count(), 0);
  assert.equal(await members().count(), 0);
  await title("Users & Roles").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/owner-only-${width}.png`,
    fullPage: true,
  });
  await skip().click();
  await title("Review & Activate").waitFor();
  assert.equal(await button("Continue").isDisabled(), true);
  await button("Back").click();
  await title("Users & Roles").waitFor();
  await button("Add Team Member").click();
  const firstId = await members().first().getAttribute("data-testid");
  await button("Continue").click();
  await title("Users & Roles").waitFor();
  assert.equal(
    await field(members().first(), "Team Member Name").getAttribute(
      "aria-invalid",
    ),
    "true",
  );
  assert.equal(
    await field(members().first(), "Email Address").getAttribute(
      "aria-invalid",
    ),
    "true",
  );
  await button("Save Draft").click();
  await saved().waitFor();
  await button("Back").click();
  await title("Materials & Measurements").waitFor();
  await button("Continue").click();
  await title("Users & Roles").waitFor();
  assert.equal(await members().first().getAttribute("data-testid"), firstId);
  assert.equal(
    await field(members().first(), "Team Member Name").inputValue(),
    "",
  );
  await field(members().first(), "Team Member Name").fill(" Supervisor ");
  await field(members().first(), "Email Address").fill(
    " TEAM@Example.invalid ",
  );
  await field(members().first(), "Remarks").fill(" Day shift ");
  // Multi-site drafts start without an implicit assignment.
  assert.equal(
    await checkbox(members().first(), "Demo Quarry").getAttribute(
      "aria-checked",
    ),
    "false",
  );
  await checkbox(members().first(), "Demo Quarry").click();
  await checkbox(members().first(), "Second Quarry").click();
  await choose(members().first(), "Quarry Access", "ALL_SITES");
  assert.equal(await members().first().getByRole("checkbox").count(), 0);
  await choose(members().first(), "Intended Role", "ADMIN");
  await expect(members().first()).toContainText(
    "Quarry Access: All Sites (required for Admin)",
  );
  assert.equal(
    await members()
      .first()
      .getByRole("button", { name: /^Quarry Access:/ })
      .count(),
    0,
  );
  await choose(members().first(), "Intended Role", "SALES_ACCOUNTANT");
  assert.equal(
    await checkbox(members().first(), "Demo Quarry").getAttribute(
      "aria-checked",
    ),
    "false",
  );
  await checkbox(members().first(), "Second Quarry").click();
  await choose(members().first(), "Intended Role", "PRODUCTION_SUPERVISOR");
  assert.equal(
    await checkbox(members().first(), "Second Quarry").getAttribute(
      "aria-checked",
    ),
    "true",
  );
  await checkLayout();
  await members().first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/team-roles-${width}.png`,
    fullPage: true,
  });
  await button("Add Team Member").click();
  assert.equal(await skip().isDisabled(), true);
  await field(members().nth(1), "Team Member Name").fill("Gate Operator");
  await field(members().nth(1), "Email Address").fill("team@example.INVALID");
  await choose(members().nth(1), "Intended Role", "DISPATCH_GATE_OPERATOR");
  await checkbox(members().nth(1), "Demo Quarry").click();
  await button("Continue").click();
  await title("Users & Roles").waitFor();
  assert.equal(
    await field(members().nth(1), "Email Address").getAttribute("aria-invalid"),
    "true",
  );
  await contactMethod(members().nth(1), "Mobile number");
  await field(members().nth(1), "Mobile Number").fill("9876543210");
  await button("Continue").click();
  await title("Users & Roles").waitFor();
  assert.equal(
    await field(members().nth(1), "Mobile Number").getAttribute("aria-invalid"),
    "true",
  );
  await field(members().nth(1), "Mobile Number").fill("+91 91234-56780");
  await button("Save Draft").click();
  await saved().waitFor();
  assert.equal(
    await field(members().nth(1), "Mobile Number").inputValue(),
    "+919123456780",
  );
  assert.equal(
    await field(members().first(), "Email Address").inputValue(),
    "team@example.invalid",
  );
  assert.equal(
    await field(members().first(), "Team Member Name").inputValue(),
    "Supervisor",
  );
  await members()
    .nth(1)
    .getByRole("button", { name: "Remove Team Member", exact: true })
    .click();
  await confirm("Cancel");
  assert.equal(await members().count(), 2);
  await members()
    .nth(1)
    .getByRole("button", { name: "Remove Team Member", exact: true })
    .click();
  await confirm("Confirm removal");
  assert.equal(await members().count(), 1);
  assert.equal(await members().first().getAttribute("data-testid"), firstId);
  await button("Save Draft").click();
  await saved().waitFor();
  await checkLayout();
  await field(members().first(), "Remarks").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/team-actions-${width}.png`,
    fullPage: true,
  });
  await page.goBack();
  await page.getByRole("button", { name: /Demo Business Setup/ }).click();
  await title("Users & Roles").waitFor();
  await saved().waitFor();
  assert.equal(await members().first().getAttribute("data-testid"), firstId);
  assert.equal(
    await field(members().first(), "Remarks").inputValue(),
    "Day shift",
  );
  assert.equal(
    await checkbox(members().first(), "Second Quarry").getAttribute(
      "aria-checked",
    ),
    "true",
  );
  // Step 1 edits flow only to the primary Owner. Restore the original fixture for later assertions.
  for (const stage of [
    "Materials & Measurements",
    "Quarry Configuration",
    "Business Registration",
  ]) {
    await button("Back").click();
    await title(stage).waitFor();
  }
  const ownerInput = () =>
    page
      .getByRole("textbox", { name: "Owner Display Name", exact: true })
      .filter({ visible: true })
      .first();
  await ownerInput().fill("Updated Demo Owner");
  for (const stage of [
    "Quarry Configuration",
    "Materials & Measurements",
    "Users & Roles",
  ]) {
    await button("Continue").click();
    await title(stage).waitFor();
  }
  await expect(owner()).toContainText("Updated Demo Owner");
  assert.equal(
    await field(members().first(), "Team Member Name").inputValue(),
    "Supervisor",
  );
  for (const stage of [
    "Materials & Measurements",
    "Quarry Configuration",
    "Business Registration",
  ]) {
    await button("Back").click();
    await title(stage).waitFor();
  }
  await ownerInput().fill(ownerName);
  for (const stage of [
    "Quarry Configuration",
    "Materials & Measurements",
    "Users & Roles",
  ]) {
    await button("Continue").click();
    await title(stage).waitFor();
  }
  await expect(owner()).toContainText(ownerName);
  await button("Save Draft").click();
  await saved().waitFor();
};

exports.verifySingleUsersScenarios = async ({
  page,
  button,
  title,
  saved,
  layout,
  width,
  directory,
  base,
}) => {
  const input = (name) =>
    page
      .getByRole("textbox", { name, exact: true })
      .filter({ visible: true })
      .first();
  await page.goto(`${base}/onboarding/business`);
  await title("Business Registration").waitFor();
  for (const [name, value] of [
    ["Business Name", "Single Quarry Demo"],
    ["Business Contact Number", "9876543210"],
    ["State", "Telangana"],
    ["District", "District"],
    ["Owner Display Name", "Single Owner"],
  ])
    await input(name).fill(value);
  await button("Continue").click();
  await title("Quarry Configuration").waitFor();
  await button("Add Pit / Bench").click();
  await input("Pit / Bench Name").fill("Pit A");
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await page
    .getByRole("checkbox", { name: "Black Granite", exact: true })
    .click();
  await button("Add Stockyard").click();
  await input("Stockyard Name").fill("Yard A");
  await button("Continue").click();
  await title("Users & Roles").waitFor();
  await button("Add Team Member").click();
  await input("Team Member Name").fill("Single Supervisor");
  await input("Email Address").fill("single@example.invalid");
  await page
    .getByText(/Assigned Quarry: Single Quarry Demo/)
    .filter({ visible: true })
    .waitFor();
  assert.equal(
    await page.getByRole("checkbox").filter({ visible: true }).count(),
    0,
  );
  await button("Save Draft").click();
  await saved().waitFor();
  await layout();
  await input("Team Member Name").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/team-single-quarry-${width}.png`,
    fullPage: true,
  });
  await button("Continue").click();
  await title("Review & Activate").waitFor();
  await button("Back").click();
  await title("Users & Roles").waitFor();
  assert.equal(
    await input("Email Address").inputValue(),
    "single@example.invalid",
  );
  await button("Reset demo draft").click();
  await title("Business Registration").waitFor();
  assert.equal(await input("Owner Display Name").inputValue(), "");
  assert.equal(await saved().count(), 0);
};
