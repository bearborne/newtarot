// Keeps a copy of the app on the phone so it works offline.
// It always tries the internet first, so your changes show up,
// and falls back to the saved copy when there is no connection.

const CACHE = "tarot-v10";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Ask the server for a fresh copy instead of a stale one from the browser.
  // (A page load can't take options directly, so it's asked for by its address.)
  const fresh = e.request.mode === "navigate"
    ? fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
    : fetch(e.request, { cache: "no-cache" });
  e.respondWith(
    fresh
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
