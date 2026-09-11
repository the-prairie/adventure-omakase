/* Network-only shell. Never cache authenticated data or mix release assets.
 * Activation removes the previous edition's cache. Existing offline snapshots
 * are visibly unconfirmed sessionStorage views, not an offline commitment queue.
 */
self.addEventListener('install', (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('omakase-'))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
