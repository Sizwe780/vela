/* Cache only public offline assets. Never cache authenticated HTML or APIs. */
const CACHE="vela-public-shell-v1";
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/offline.html","/icon.svg"])));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("vela-public-shell-")&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]));});
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(event.request.method!=="GET"||url.origin!==self.location.origin)return;if(event.request.mode==="navigate")event.respondWith(fetch(event.request).catch(async()=>await caches.match("/offline.html")||Response.error()));});
