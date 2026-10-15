import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the acceptance criteria in the plan:
 * authentication, registration with duplicate detection, search and filters, both document
 * types, download and regeneration.
 *
 * Requirements to run:
 *   - a reachable application (npm run dev, or docker compose up)
 *   - a Supabase project with the migrations applied and one admin user created
 *   - E2E_EMAIL / E2E_PASSWORD for that user
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(
  !EMAIL || !PASSWORD,
  "E2E requires a live Supabase project: set E2E_EMAIL and E2E_PASSWORD (see docs/operations.md).",
);

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(EMAIL as string);
  // Address the input directly: the password visibility toggle's accessible name also
  // contains "รหัสผ่าน" ("แสดงรหัสผ่าน"), so getByLabel would resolve to two elements and
  // fail under strict mode. The assertion is unchanged — it still has to find and fill
  // the password field or the test fails.
  await page.locator("#password").fill(PASSWORD as string);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByRole("heading", { name: "ภาพรวมระบบ" })).toBeVisible();
}

async function createAsset(page: Page, code: string, name: string) {
  await page.goto("/assets/new");
  await page.getByLabel("รหัสครุภัณฑ์").fill(code);
  await page.getByLabel("ชื่อครุภัณฑ์").fill(name);
  await page.getByLabel("ประเภทครุภัณฑ์").selectOption({ index: 1 });
  await page.getByLabel("หมายเลขเครื่อง (Serial Number)").fill(`SN-${code}`);
  await page.getByLabel("แผนก / หน่วยงาน").fill("ฝ่ายเทคโนโลยีสารสนเทศ");
  await page.getByLabel("สถานที่ตั้ง").fill("ห้องเซิร์ฟเวอร์ ชั้น 3");
  await page.getByLabel("วันที่ได้มา").fill("2024-05-17");
  await page.getByRole("button", { name: "บันทึกครุภัณฑ์" }).click();
  await expect(page.getByText("บันทึกครุภัณฑ์เรียบร้อยแล้ว")).toBeVisible();
}

test("an unauthenticated visitor is redirected to the login page", async ({ page }) => {
  await page.goto("/assets");
  await expect(page).toHaveURL(/\/login$/);
});

test("dashboard, registration, duplicate detection, search and filters", async ({ page }) => {
  await signIn(page);

  // Dashboard reports totals (AC-A1).
  await expect(page.getByText("ครุภัณฑ์ทั้งหมด")).toBeVisible();

  const code = `E2E-${Date.now().toString().slice(-6)}`;
  await createAsset(page, code, "เครื่องทดสอบระบบ (E2E)");

  // Duplicate asset code is rejected inline and stores nothing (AC-B3).
  await page.goto("/assets/new");
  await page.getByLabel("รหัสครุภัณฑ์").fill(code);
  await page.getByLabel("ชื่อครุภัณฑ์").fill("เครื่องซ้ำ");
  await page.getByLabel("ประเภทครุภัณฑ์").selectOption({ index: 1 });
  await page.getByRole("button", { name: "บันทึกครุภัณฑ์" }).click();
  await expect(page.getByRole("alert").first()).toContainText("มีอยู่แล้ว");

  // Missing required fields are blocked with Thai messages (AC-B2).
  await page.goto("/assets/new");
  await page.getByRole("button", { name: "บันทึกครุภัณฑ์" }).click();
  await expect(page.getByText("กรุณากรอกรหัสครุภัณฑ์")).toBeVisible();

  // Search finds the asset by code (AC-C1) and the filters stay in the URL (AC-C3).
  await page.goto(`/assets?q=${code}`);
  await expect(page.getByRole("link", { name: new RegExp(code) })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`q=${code}`));

  await page.goto("/assets?status=active");
  await expect(page).toHaveURL(/status=active/);
});

test("individual document, consolidated register, download and regeneration", async ({ page }) => {
  await signIn(page);

  const suffix = Date.now().toString().slice(-6);
  const firstCode = `E2E-R1-${suffix}`;
  const secondCode = `E2E-R2-${suffix}`;

  await createAsset(page, firstCode, "เครื่องทดสอบทะเบียนรวม 1");
  await page.goto("/assets/new");

  // Individual document (AC-D1, AC-D2).
  await page.goto(`/assets?q=${firstCode}`);
  await page.getByRole("link", { name: new RegExp(firstCode) }).click();
  await page.getByRole("button", { name: /สร้างเอกสาร PDF/ }).click();
  await expect(page.getByRole("heading", { name: /เอกสาร ITA-/ })).toBeVisible();
  await expect(page.getByText("พร้อมใช้งาน").first()).toBeVisible();

  // Download returns a real PDF (AC-D5).
  const downloadResponse = await page.request.get(page.url().replace(/\/documents\//, "/api/documents/") + "/download");
  expect(downloadResponse.status()).toBeLessThan(400);
  expect(downloadResponse.headers()["content-type"] ?? "").toContain("pdf");
  expect((await downloadResponse.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // A second asset for the register.
  await createAsset(page, secondCode, "เครื่องทดสอบทะเบียนรวม 2");

  // Consolidated register from the selected rows (AC-E1, AC-E2, AC-E3).
  await page.goto(`/assets?q=E2E-R`);
  await page.getByRole("checkbox", { name: new RegExp(firstCode) }).check();
  await page.getByRole("checkbox", { name: new RegExp(secondCode) }).check();
  await page.getByRole("button", { name: "สร้างทะเบียนรวม PDF" }).click();

  await expect(page.getByRole("heading", { name: /เอกสาร REG-/ })).toBeVisible();
  await expect(page.getByText("รายการครุภัณฑ์ในเอกสาร", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: firstCode })).toBeVisible();
  await expect(page.getByRole("link", { name: secondCode })).toBeVisible();

  // Regeneration keeps the number, adds a revision and preserves the old file (AC-D3).
  await page.getByRole("button", { name: "สร้างเอกสารครั้งใหม่" }).click();
  await expect(page.getByText("ครั้งที่พิมพ์ 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "ครั้งที่ 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ครั้งที่ 2" })).toBeVisible();
});

test("asset types can be configured and become selectable (AC-B4)", async ({ page }) => {
  await signIn(page);

  const code = `TYPE${Date.now().toString().slice(-4)}`;
  await page.goto("/settings/asset-types");
  await page.getByLabel("รหัสประเภท").fill(code);
  await page.getByLabel("ชื่อประเภท").fill("ประเภททดสอบ (E2E)");
  await page.getByRole("button", { name: "เพิ่มประเภท" }).click();
  await expect(page.getByText("เพิ่มประเภทครุภัณฑ์เรียบร้อยแล้ว")).toBeVisible();

  await page.goto("/assets/new");
  await expect(page.getByLabel("ประเภทครุภัณฑ์")).toContainText("ประเภททดสอบ (E2E)");
});
