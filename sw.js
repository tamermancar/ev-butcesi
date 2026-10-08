/* Ev Bütçesi — çevrimdışı açılış için basit önbellek.
   Her açılışta önce internetteki güncel dosya denenir; bu yüzden güncellemeler hemen gelir. */
const ONBELLEK = 'evb-v7';
const DOSYALAR = ['./', 'index.html', 'ortak.js?v=3.7', 'manifest.webmanifest', 'ikon-192.png', 'ikon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== ONBELLEK).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const istek = e.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== location.origin) return;
  e.respondWith(
    fetch(istek, { cache: 'no-cache' }).then(cevap => { // tarayıcı önbelleğini atla, her açılışta güncel dosyayı iste
      const kopya = cevap.clone();
      caches.open(ONBELLEK).then(c => c.put(istek, kopya));
      return cevap;
    }).catch(() => caches.match(istek).then(r => r || caches.match('index.html')))
  );
});
