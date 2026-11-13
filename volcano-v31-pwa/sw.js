const prefix = 'volcano-v31-';
const cacheName = prefix + '68acf9103da3';
const files = ['index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const url = name => new URL(name, self.registration.scope).href;

self.addEventListener('install', event => {
 event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
  files.map(name => new Request(url(name), {cache: 'reload'}))
 )));
});

self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(
  keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key))
 )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const scope = self.registration.scope;
 const address = event.request.url;
 const navigation = event.request.mode === 'navigate' &&
  (address === scope || address === url('index.html'));
 if (!navigation && !files.some(name => address === url(name))) return;
 event.respondWith(caches.open(cacheName).then(async cache => {
  const cached = await cache.match(navigation ? url('index.html') : address);
  return cached || fetch(event.request);
 }));
});
