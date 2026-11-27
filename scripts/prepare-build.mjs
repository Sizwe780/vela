import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(process.cwd());
const standalone = resolve(root, ".next", "standalone");
if (standalone !== join(root, ".next", "standalone")) throw new Error("Unexpected standalone path");
rmSync(standalone, { recursive: true, force: true });
// A previous runtime route cache can override freshly prerendered HTML when
// Windows retains build directories. Build seeds must win on every release.
const routeCache = resolve(root, ".next", "server", "route-cache");
if (routeCache !== join(root, ".next", "server", "route-cache"))
  throw new Error("Unexpected production route-cache path");
rmSync(routeCache, { recursive: true, force: true });

// Windows workspace sandboxes can reject webpack's concurrent creation of nested
// directories. Creating the route directories serially avoids those EPERM races.
if (process.platform === "win32") {
  function prepare(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const route = join(directory, entry.name);
      for (const target of [".next/server", ".next/types"])
        mkdirSync(join(target, route), { recursive: true });
      prepare(route);
    }
  }
  prepare("app");
}
