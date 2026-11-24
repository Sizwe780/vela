import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
// Windows workspace sandboxes can reject webpack's concurrent creation of nested
// directories. Creating the route directories serially avoids those EPERM races.
if (process.platform === "win32") {
  function prepare(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const route = join(directory, entry.name);
      for (const target of [".next/server", ".next/types"]) mkdirSync(join(target, route), { recursive: true });
      prepare(route);
    }
  }
  prepare("app");
}
