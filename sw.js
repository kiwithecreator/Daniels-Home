const CACHE = 'exptrack-v4';
const FILES = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/firebase.js',
  './js/auth.js',
  './js/tabs.js',
  './js/features/expenses.js',
  './js/features/grocery.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
