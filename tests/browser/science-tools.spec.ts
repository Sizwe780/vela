import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
test("converter and lesson calculator preserve working on desktop and narrow mobile", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const bundle = await build({
    stdin: {
      contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {QuantityCheck} from './components/practical/quantity-check';import ReferenceDrawer from './components/references/reference-drawer';function Fixture(){const[open,setOpen]=useState(false),[answer,setAnswer]=useState('My solution');return <><textarea aria-label="My working" value={answer} onChange={e=>setAnswer(e.target.value)}/><p>1 / 6 tried</p><button onClick={()=>setOpen(true)}>Open calculator</button><QuantityCheck/>{open&&<ReferenceDrawer initial="calculator" moduleCode="MAT1512" chemistry={false} physics={false} math={true} onClose={()=>setOpen(false)} onInsert={v=>setAnswer(a=>a+' '+v)}/>}</>};createRoot(document.getElementById('fixture')).render(<Fixture/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.setContent(
    '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>',
  );
  await page.addStyleTag({
    content:
      "*{box-sizing:border-box}body{margin:8px;font-family:sans-serif}button,input{font:inherit} [hidden]{display:none!important} .source-dialog{position:fixed;background:white;overflow:auto;z-index:100} " +
      (await readFile("app/learning-tools.css", "utf8")) +
      (await readFile("app/science-tools.css", "utf8")),
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole("textbox", { name: "Original value", exact: true }).fill("2.5");
  await page.getByRole("textbox", { name: "Original unit", exact: true }).fill("l");
  await page.getByRole("textbox", { name: "Target unit", exact: true }).fill("ml");
  await page.getByRole("button", { name: "Convert to target unit", exact: true }).click();
  await expect(page.locator(".science-result")).toContainText("2500");
  await expect(page.locator(".science-result")).toContainText("L³");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("textbox", { name: /Your converted value/ }).fill("2500");
  await page.getByRole("button", { name: "Check dimensions and magnitude" }).click();
  await expect(page.locator(".science-result")).toHaveAttribute("data-verdict", "equivalent");
  await page.getByRole("button", { name: "Open calculator" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "DEG", exact: true }).click();
  const expression = dialog.getByRole("textbox", { name: "Expression", exact: true });
  await expression.fill("sin(30)");
  await dialog.getByRole("button", { name: "Evaluate in DEG" }).click();
  await expect(dialog.getByLabel("Calculator result")).toHaveText("0.5");
  await dialog.getByRole("button", { name: "Formula sheet", exact: true }).click();
  await dialog.getByRole("button", { name: "Calculator", exact: true }).click();
  await expect(expression).toHaveValue("sin(30)");
  await dialog.getByRole("button", { name: "RAD", exact: true }).click();
  await expect(dialog.getByLabel("Calculator result")).toHaveText("Ready");
  await expression.fill("sqrt(81)");
  await expression.press("Enter");
  await expect(dialog.getByLabel("Calculator result")).toHaveText("9");
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 640 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expression.fill("");
  await dialog
    .getByRole("button", { name: "Reuse result 9 from sqrt(81) in RAD", exact: true })
    .click();
  await expect(expression).toHaveValue("(9)");
  await expression.press("Enter");
  await dialog.getByRole("button", { name: "Insert result into answer" }).click();
  await expect(page.getByRole("textbox", { name: "My working" })).toHaveValue("My solution 9");
  await expect(page.getByText("1 / 6 tried", { exact: true })).toBeVisible();
});
