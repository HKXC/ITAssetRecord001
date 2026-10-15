import { expect, test, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Login screen coverage that needs no Supabase account.
 *
 * asset-documents.spec.ts self-skips without E2E_EMAIL / E2E_PASSWORD, which means the
 * whole public surface would otherwise be untested whenever credentials are absent. Every
 * test below is runnable against a bare `npm run dev`.
 */

/** A missing favicon is not an application error. */
function isIgnorable(text: string) {
  return /favicon/i.test(text);
}

async function watchPage(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnorable(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (!isIgnorable(request.url())) failedRequests.push(`${request.method()} ${request.url()}`);
  });

  return { consoleErrors, pageErrors, failedRequests };
}

test("renders the dark login screen without console errors or failed requests", async ({ page }) => {
  const watcher = await watchPage(page);

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "ยินดีต้อนรับกลับมา" })).toBeVisible();
  await expect(page.getByLabel("อีเมล")).toBeVisible();
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.locator("canvas.auth-canvas")).toHaveCount(1);

  // Spec section 4: non-functional auth must never be rendered.
  await expect(page.getByRole("button", { name: /Google|GitHub/ })).toHaveCount(0);
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(page.getByText(/Signed In/i)).toHaveCount(0);

  // Exactly one h1, so the outline does not depend on the brand column being visible.
  await expect(page.locator("h1")).toHaveCount(1);

  expect(watcher.consoleErrors, watcher.consoleErrors.join(" | ")).toEqual([]);
  expect(watcher.pageErrors, watcher.pageErrors.join(" | ")).toEqual([]);
  expect(watcher.failedRequests, watcher.failedRequests.join(" | ")).toEqual([]);
});

test("shows Thai inline validation instead of dispatching an empty form", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await expect(page.getByText("กรุณากรอกอีเมล")).toBeVisible();
  await expect(page.getByText("กรุณากรอกรหัสผ่าน")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("rejects a malformed email with a Thai message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("อีเมล").fill("not-an-email");
  await page.locator("#password").fill("whatever-1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await expect(page.getByText("รูปแบบอีเมลไม่ถูกต้อง")).toBeVisible();
});

test("marks a field invalid and clears the error when it is focused again", async ({ page }) => {
  await page.goto("/login");

  const email = page.getByLabel("อีเมล");
  await email.fill("not-an-email");
  await email.blur();
  await expect(email).toHaveAttribute("aria-invalid", "true");

  await email.click();
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
});

test("toggles password visibility and keeps its accessible name in sync", async ({ page }) => {
  await page.goto("/login");

  // Address the input directly: the toggle's own accessible name also contains
  // "รหัสผ่าน", so getByLabel would resolve to two elements.
  const password = page.locator("#password");
  await password.fill("s3cret-value");

  await expect(password).toHaveAttribute("type", "password");

  const toggle = page.getByRole("button", { name: "แสดงรหัสผ่าน" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();

  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "ซ่อนรหัสผ่าน" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "ซ่อนรหัสผ่าน" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("drops the brand column below md and never scrolls horizontally", async ({ page }) => {
  // Desktop: two columns.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.locator(".auth-brand")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);

  // Tablet: still two columns, but the brand panel takes the narrower slice.
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(page.locator(".auth-brand")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);

  // Mobile: decorative branding hidden, form only.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".auth-brand")).toBeHidden();
  await expect(page.locator(".auth-form-logo")).toBeVisible();
  await expect(page.getByLabel("อีเมล")).toBeVisible();

  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll, "no horizontal overflow on mobile").toBeLessThanOrEqual(widths.client);
});

test("draws a single, capped animation loop rather than a runaway one", async ({ page }) => {
  await page.goto("/login");

  const frames = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const started = performance.now();
        const tick = () => {
          count += 1;
          if (performance.now() - started < 500) requestAnimationFrame(tick);
          else resolve(count);
        };
        requestAnimationFrame(tick);
      }),
  );

  // ~30 frames in 500ms at 60fps. A doubled loop (e.g. Strict Mode leaking a second
  // requestAnimationFrame) would land near 60, and an unbounded one far above it.
  expect(frames, `expected ~30 frames per 500ms, got ${frames}`).toBeGreaterThan(5);
  expect(frames, `expected ~30 frames per 500ms, got ${frames}`).toBeLessThan(45);
});

const opaquePixels = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector("canvas.auth-canvas") as HTMLCanvasElement | null;
    if (!canvas) return -1;
    const context = canvas.getContext("2d");
    if (!context) return -2;
    const { data } = context.getImageData(
      0,
      0,
      Math.min(canvas.width, 400),
      Math.min(canvas.height, 300),
    );
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opaque += 1;
    return opaque;
  });

test("renders one static frame, without animating, when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const watcher = await watchPage(page);

  await page.goto("/login");

  await expect(page.locator("canvas.auth-canvas")).toHaveCount(1);

  // The canvas is server-rendered at its default 300x150 and only paints once the effect
  // runs after hydration, so wait for the frame rather than sampling a blank canvas.
  await expect
    .poll(async () => opaquePixels(page), {
      timeout: 15_000,
      message: "the static background frame should paint pixels",
    })
    .toBeGreaterThan(0);

  // If any animation were left running, this number would drift between samples.
  const first = await opaquePixels(page);
  await page.waitForTimeout(500);
  const second = await opaquePixels(page);
  expect(second, "reduced motion must not keep animating").toBe(first);

  expect(watcher.pageErrors, watcher.pageErrors.join(" | ")).toEqual([]);
});

test("keeps protected routes behind the login screen", async ({ page }) => {
  // Without a configured Supabase URL, publicEnv() raises MissingEnvError and the page
  // reports the missing configuration instead of redirecting — so this assertion is only
  // meaningful against a configured application. Skips rather than reporting a false pass.
  test.skip(
    !SUPABASE_URL,
    "Guard requires NEXT_PUBLIC_SUPABASE_URL; without it the app reports missing configuration instead of redirecting.",
  );

  await page.goto("/assets");
  await expect(page).toHaveURL(/\/login$/);
});

test("recovery routes: request page renders, and guarded routes redirect", async ({ page }) => {
  const watcher = await watchPage(page);

  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "ลืมรหัสผ่าน?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" })).toBeVisible();
  await page.getByRole("link", { name: /กลับไปหน้าเข้าสู่ระบบ/ }).click();
  await expect(page).toHaveURL(/\/login$/);

  // No session: asking for a new password must bounce back to the request page.
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=session$/);

  // No code: the callback must bounce back rather than show a broken form.
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/forgot-password\?error=link$/);

  expect(watcher.pageErrors, watcher.pageErrors.join(" | ")).toEqual([]);
});
