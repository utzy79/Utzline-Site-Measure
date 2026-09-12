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
// (v5: the folder-based auto-backup now saves BOTH a flattened PNG and
// the actual reopenable project file (.redline.json), not just a
// picture -- a "successful" backup couldn't previously be recovered
// into an editable plan. Also: the fine-grained IndexedDB autosave that
// runs after every edit used to fail completely silently; it now shows
// a one-time warning toast if it can't save, so a broken/unavailable
// IndexedDB is never an invisible loss of the local safety net.)
// (v6: locking the auto-backup settings now also locks the backup-folder
// button -- previously it stayed clickable even when locked, so someone
// could still switch or clear the backup destination by accident.)
// (v7: the toolbar now reflows for phone-width screens -- instead of
// wrapping into cramped, hard-to-tap rows it stays one full-size row that
// scrolls sideways, with bigger touch targets throughout. Tablet layout is
// unchanged.)
// (v8: Save project and Save PDF are now one "Save" button that does both
// in a single tap -- each half keeps its existing verified-write/fallback
// behavior unchanged, just triggered together instead of two separate
// taps.)
// (v9: two real bugs found on the phone app after v8 shipped --
// (1) the merged Save button could silently skip the PDF half entirely if
// the PDF libraries (loaded from CDN) hadn't finished loading yet at the
// moment of the tap, which got more likely once Save fires immediately
// instead of waiting for a separate later click -- it now waits a few
// seconds for them before giving up; (2) auto-backup required either the
// claude.ai downloads bridge or a chosen folder (desktop-only) to do
// ANYTHING, so it was a complete silent no-op on every mobile browser
// despite the toggle looking like a working feature -- it now falls back
// to a plain download of both files, same as Save's own fallback.)
var CACHE_NAME = "redline-cache-v9";

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
