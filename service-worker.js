// UTZLINE Site Measure offline service worker.
// Cache-first app shell: everything the app needs is a small, fixed set of
// local files (no CDN calls once installed), so a simple versioned cache
// with a network-falling-back-to-cache strategy is all this needs.
//
// Bump CACHE_NAME whenever index.html or any vendored asset changes, so
// installed copies pick up the update instead of serving stale files forever.
// (v2: rebuilt after the rename to UTZLINE Site Measure, the PDF export
// DPI fix, and the save-location picker.)
// (v3: fixed a regression from the v2 DPI fix -- reopening one of this
// app's own exported PDFs came back blurry because the PDF-import render
// scale hadn't been recalibrated to match the new export DPI.)
// (v4: Save PDF/Save project now verify a picker-based write actually
// landed on disk before reporting success, falling back to a plain
// download if it silently came back empty -- a real Windows setup was
// seen producing a 0-byte project file with no error. Also added: an
// optional folder for auto-backup to save straight into, no download
// prompts, via the File System Access API on Chrome/Edge desktop.)
var CACHE_NAME = "redline-cache-v4";

var PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./jspdf.umd.min.js",
  "./svg2pdf.umd.min.js",
  "./pdf.min.js",
  "./pdf.worker.min.js",
  "./sans.woff2",
  "./mono.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if (response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){
        return cached;
      });
      // Cache-first for instant offline loads; refresh the cache in the
      // background whenever the network is available.
      return cached || networkFetch;
    })
  );
});
