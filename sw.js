const CACHE_NAME = "ata-pwa-v44";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./avatar.png",
    "./kilit_bg.png",
    "./logo.png",
    "./manifest.json"
];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
    );
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const url = e.request.url;

    // CRITICAL FOR IOS SAFARI: Never intercept media (.mp4) or Range requests!
    // iOS Safari WebKit AVPlayer fails completely when byte-range requests are piped through ServiceWorker fetch().
    if (url.includes(".mp4") || e.request.headers.get("range")) {
        return;
    }

    if (url.includes(".html") || url.includes(".js") || url.includes(".css") || url.endsWith("/")) {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
