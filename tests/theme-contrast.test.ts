import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../app/tokens.css", import.meta.url), "utf8");
function palette(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}
function luminance(hex: string) {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((x) => {
      const n = parseInt(x, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const light = palette(css.split(":root[data-theme=")[0]);
const dark = { ...light, ...palette(css.split(":root[data-theme=")[1]) };
for (const [name, p] of Object.entries({ light, dark })) {
  test(`${name} semantic text meets WCAG AA on reading surfaces`, () => {
    for (const text of ["text-primary", "text-secondary", "text-muted", "brand-accent", "danger"])
      for (const surface of ["surface-page", "surface-card", "surface-soft", "surface-input"])
        assert.ok(
          ratio(p[text], p[surface]) >= 4.5,
          `${text} on ${surface}: ${ratio(p[text], p[surface])}`,
        );
    assert.ok(ratio(p["on-brand"], p["brand-strong"]) >= 4.5);
  });
}
