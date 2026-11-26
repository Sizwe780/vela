/* Public app files only. Authenticated HTML, APIs and lesson bodies are never cached. */
const CACHE = "vela-offline-public-v2";
const allowed = (path) =>
  path === "/offline.html" ||
  path === "/offline-shell.html" ||
  path === "/vela-tab-v3-32.png" ||
  path.startsWith("/offline-assets/");
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/offline-shell.html", "/vela-tab-v3-32.png"])),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("vela-public-shell-"))
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch("/offline-assets/manifest.json", {
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) throw Error();
        const manifest = await response.json();
        if (!Array.isArray(manifest.assets) || manifest.assets.length > 200) throw Error();
        const assets = manifest.assets.map((path) => {
          const url = new URL(path, self.location.origin);
          if (
            url.origin !== self.location.origin ||
            !allowed(url.pathname) ||
            url.search ||
            url.hash
          )
            throw Error();
          return new Request(url.href, { credentials: "omit", cache: "reload" });
        });
        const cache = await caches.open(CACHE);
        const missing = [];
        for (const asset of assets) {
          if (new URL(asset.url).pathname === "/offline.html" || !(await cache.match(asset)))
            missing.push(asset);
        }
        await cache.addAll(missing);
        event.ports[0]?.postMessage({ ok: true });
      } catch {
        event.ports[0]?.postMessage({ ok: false });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match("/offline.html")) ||
          (await cache.match("/offline-shell.html")) ||
          Response.error()
        );
      }),
    );
    return;
  }
  if (allowed(url.pathname))
    event.respondWith(
      caches
        .open(CACHE)
        .then(async (cache) => (await cache.match(event.request)) || fetch(event.request)),
    );
});
