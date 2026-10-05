// Service worker of INTGETION JOB LIST (D244). Deliberately small: pages
// and API answers are never cached — they hold personal data and change
// often. Only the offline page and the app icons are kept, so a dropped
// connection shows a clear page instead of the browser's error.
const CACHE = "intgetion-offline-v1";
const OFFLINE = "/offline.html";
const ASSETS = [OFFLINE, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only full page loads; everything else goes to the network untouched.
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE).then((page) => page || Response.error()),
    ),
  );
});
