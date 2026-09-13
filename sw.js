// Naikkan angka versi ini setiap kali Anda deploy perubahan besar,
// supaya perangkat pengguna mengambil versi cache yang baru.
const SW_VERSION = 'v1';
const CACHE_NAME = 'kesiswaan-cq-' + SW_VERSION;

// File inti yang perlu tersedia offline. Sengaja dibuat minim
// supaya tidak ada risiko meng-cache sesuatu yang salah/hilang.
const CORE_ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* jangan gagalkan instalasi hanya karena satu aset gagal di-cache */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key.startsWith('kesiswaan-cq-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategi: network-first untuk dokumen HTML (supaya app selalu dapat versi
// terbaru saat online), fallback ke cache saat offline. Untuk aset lain,
// coba cache dulu baru network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
