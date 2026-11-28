import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

test("periodic weights, scientific notation, family filters and resized references stay coherent", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(15000);
  const bundle = await build({
    stdin: {
      contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import ReferenceDrawer from './components/references/reference-drawer';function Fixture(){const[open,setOpen]=useState(true);const[answer,setAnswer]=useState('My working');window.openReferences=()=>setOpen(true);return <><textarea aria-label="Exercise answer" value={answer} onChange={e=>setAnswer(e.target.value)}/>{open&&<ReferenceDrawer initial="periodic" moduleCode="CHE1501" institution="UNISA" chemistry={true} physics={false} math={false} onClose={()=>setOpen(false)} onInsert={text=>setAnswer(old=>old+' '+text)}/>}</>};createRoot(document.getElementById('reference-fixture')).render(<Fixture/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.goto("/privacy");
  await page.evaluate(() => {
    const root = document.createElement("div");
    root.id = "reference-fixture";
    document.body.appendChild(root);
  });
  await page.addStyleTag({ content: await readFile("app/learning-tools.css", "utf8") });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const dialog = page.getByRole("dialog", { name: "Learning references", exact: true });
  const tile = (symbol: string) =>
    page
      .locator(".periodic-grid button")
      .filter({ has: page.locator("strong", { hasText: new RegExp("^" + symbol + "$") }) });
  await expect(page.locator(".periodic-grid button")).toHaveCount(118);
  await expect(tile("Ar").locator("span")).toHaveText("39.95");
  await expect(tile("Zn").locator("span")).toHaveText("65.38");
  await expect(page.getByRole("region", { name: "Selected element" })).toContainText("1s¹");
  await expect(page.getByRole("region", { name: "Selected element" })).toContainText("¹H, ²H");
  await page.getByRole("combobox", { name: "Block", exact: true }).selectOption("s");
  await page.getByRole("combobox", { name: "Group", exact: true }).selectOption("1");
  await expect(tile("H")).toHaveAttribute("data-highlighted", "true");
  await expect(tile("H")).toHaveAttribute("data-category", "nonmetal");
  await expect(tile("Na")).toHaveAttribute("data-category", "alkali-metal");
  await expect(tile("He")).toHaveAttribute("data-highlighted", "false");
  await page.getByRole("combobox", { name: "Group", exact: true }).selectOption("18");
  await expect(tile("He")).toHaveAttribute("data-highlighted", "true");
  await page.getByRole("combobox", { name: "Block", exact: true }).selectOption("d");
  await page.getByRole("combobox", { name: "Group", exact: true }).selectOption("12");
  for (const name of ["Zn", "Cd", "Hg", "Cn"]) {
    await expect(tile(name)).toHaveAttribute("data-highlighted", "true");
    await expect(tile(name)).toHaveAttribute("data-category", "group-12-metal");
  }
  await expect(tile("Ga")).toHaveAttribute("data-highlighted", "false");
  await expect(tile("Ga")).toHaveAttribute("data-category", "post-transition-metal");
  await page.getByRole("combobox", { name: "Block", exact: true }).selectOption("");
  await page.getByRole("combobox", { name: "Group", exact: true }).selectOption("");
  await page.getByText("Category colour key", { exact: true }).click();
  for (const category of ["nonmetal", "alkali-metal", "group-12-metal", "post-transition-metal"]) {
    const colour = await page
      .locator(`.periodic-grid [data-category="${category}"]`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(
      await page
        .locator(`.reference-category-key span[data-category="${category}"]`)
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(colour);
  }
  for (const width of info.project.name === "desktop" ? [1000, 430, 360] : [360, 320]) {
    if (info.project.name === "mobile") await page.setViewportSize({ width, height: 640 });
    else
      await dialog.evaluate((el, w) => {
        el.style.width = w + "px";
        el.style.height = "600px";
      }, width);
    await page.getByLabel("Find an element", { exact: true }).scrollIntoViewIfNeeded();
    const fits = await page.locator(".reference-filters").evaluate((el) => {
      const bounds = el.getBoundingClientRect();
      const input = el.querySelector("input")!;
      const css = getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return {
        inside: [...el.querySelectorAll("input,select")].every((control) => {
          const r = control.getBoundingClientRect();
          return r.left >= bounds.left - 1 && r.right <= bounds.right + 1;
        }),
        text:
          ctx.measureText(input.placeholder).width <=
          input.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
      };
    });
    expect(fits.inside).toBe(true);
    expect(fits.text).toBe(true);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("filters-" + width + ".png") });
    for (const name of ["K", "Kr", "Og", "Lr"]) {
      await tile(name).scrollIntoViewIfNeeded();
      expect(
        await tile(name).evaluate((el) => {
          const a = el.getBoundingClientRect(),
            b = el.closest(".periodic-grid-scroll")!.getBoundingClientRect();
          const outer = el.closest("dialog")!.getBoundingClientRect();
          return (
            a.left >= Math.max(b.left, outer.left, 0) &&
            a.right <= Math.min(b.right, outer.right, innerWidth) &&
            a.top >= Math.max(b.top, outer.top, 0) &&
            a.bottom <= Math.min(b.bottom, outer.bottom, innerHeight)
          );
        }),
      ).toBe(true);
    }
    await page.screenshot({ path: info.outputPath("periodic-" + width + ".png") });
  }
  await page.getByLabel("Chemical formula", { exact: true }).fill("ZnO");
  await expect(page.locator(".molar-mass-calculator")).toContainText("81.379 g/mol");
  await page.getByRole("button", { name: "Insert molar mass into answer", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Exercise answer", exact: true })).toHaveValue(
    "My working 81.379 g/mol",
  );
});
