const CACHE = "scancar-v2";
const STATIC = ["/icon-192.png", "/icon-512.png", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  // Icons/manifest: cache first
  if (STATIC.some(s => url.pathname === s)) {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
    return;
  }
  // Everything else (HTML, JS, CSS): network first — never stale
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
