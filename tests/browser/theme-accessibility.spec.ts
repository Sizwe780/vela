import { test, expect } from "@playwright/test";
test("light default, explicit dark choice, persistence, skip navigation and page metadata", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/study/demo");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle(/MAT1512.*Vela/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /MAT1512.*Vela/,
  );
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  for (const theme of ["dark", "light", "dark"]) {
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "More tools", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", String(theme === "light"));
    await toggle.click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (info.project.name === "mobile") {
    await expect(
      page.getByRole("region", { name: "Learning companion", exact: true }),
    ).toBeHidden();
    await page.getByRole("button", { name: "Learning companion", exact: true }).click();
    await expect(page.getByRole("region", { name: "Study material", exact: true })).toBeHidden();
    await expect(page.getByLabel("Ask your learning companion")).toBeVisible();
    await page.getByRole("button", { name: "Study material", exact: true }).click();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const failures = await page.evaluate(() => {
    const luminance = (rgb: number[]) => {
      const c = rgb.slice(0, 3).map((v) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const parse = (v: string) => v.match(/[\d.]+/g)!.map(Number);
    return [
      ...document.querySelectorAll<HTMLElement>(
        ".unit-description,.breadcrumb,.mode-toggle button,.tutor-disclaimer,.workspace-actions select",
      ),
    ]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .flatMap((el) => {
        let ancestor: HTMLElement | null = el;
        let bg: number[] = [255, 255, 255];
        while (ancestor) {
          const c = parse(getComputedStyle(ancestor).backgroundColor);
          if (c.length === 3 || c[3] === 1) {
            bg = c;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        const fg = parse(getComputedStyle(el).color),
          a = luminance(fg),
          b = luminance(bg),
          ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        return ratio < 4.5 ? [`${el.className || el.tagName}: ${ratio.toFixed(2)}`] : [];
      });
  });
  expect(failures).toEqual([]);
  await page.screenshot({ path: info.outputPath("theme-dark.png"), fullPage: true });
  await page.goto("/study/demo/quiz");
  await expect(page).toHaveTitle(/Practice.*Vela/);
  await expect(page.locator("#main-content")).toBeVisible();
});
