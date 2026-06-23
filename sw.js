const CACHE_NAME = 'bcn-app-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layouts.css',
  './css/components.css',
  './js/config.js',
  './js/main.js',
  './js/store/state.js',
  './js/utils/crypto.js',
  './js/utils/date.js',
  './js/utils/ui.js',
  './js/api/supabase.js',
  './js/components/dialog.js',
  './js/components/modal.js',
  './js/components/print.js',
  './js/components/nav.js',
  './js/screens/auth.js',
  './js/screens/home.js',
  './js/screens/ktvList.js',
  './js/screens/form.js',
  './js/screens/adminDash.js',
  './js/screens/adminList.js',
  './js/screens/bossDash.js',
  './js/screens/settings.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Non-blocking addAll with catch to avoid failing the whole cache
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(err => console.log('Cache failed for', url))));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Bypass Supabase API calls from caching
  if (e.request.url.includes('supabase.co')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    }).catch(() => {
      // Return offline fallback if needed
    })
  );
});
