// SpinSmith's service worker. The install pass follows the built index and stores its hashed app
// bundle, so the *next* launch works offline even if the app has not already been reloaded once.
const CACHE = 'spinsmith-v3';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './privacy.html',
  './fonts/Rajdhani-Bold.woff2',
  './fonts/Rajdhani-SemiBold.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

async function store(cache, url) {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`offline seed failed: ${response.status} ${url}`);
  await cache.put(url, response.clone());
  return response;
}

async function seed() {
  const cache = await caches.open(CACHE);
  const urls = CORE.map((path) => new URL(path, self.registration.scope).href);
  // The built HTML names Vite's content-hashed JavaScript and CSS. Store those too rather than
  // guessing their names here. The worker must not activate unless the complete app shell exists.
  const index = await store(cache, urls[0]);
  const html = await index.text();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.registration.scope);
    if (url.origin === self.location.origin) urls.push(url.href);
  }
  await Promise.all([...new Set(urls.slice(1))].map((url) => store(cache, url)));
}

self.addEventListener('install', (e) => e.waitUntil(seed().then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Navigation checks for an update, then falls back to the app shell. Hashed assets are safe to
    // serve cache-first and are still added at runtime if a lazy dependency appears later.
    if (req.mode === 'navigate') {
      try {
        const response = await fetch(req);
        if (response.ok) await cache.put(req, response.clone());
        return response;
      } catch {
        return (await cache.match(req)) ?? (await cache.match(new URL('./', self.registration.scope).href)) ?? Response.error();
      }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const response = await fetch(req);
      if (response.ok) await cache.put(req, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
