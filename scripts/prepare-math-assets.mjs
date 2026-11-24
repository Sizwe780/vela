import { cp, mkdir } from "node:fs/promises";
await mkdir("public/mathlive/fonts", { recursive: true });
await cp("node_modules/mathlive/fonts", "public/mathlive/fonts", { recursive: true });
await cp("node_modules/mathlive/LICENSE.txt", "public/mathlive/LICENSE");

await cp("node_modules/nerdamer/LICENSE.md", "public/mathlive/NERDAMER-LICENSE.md");
