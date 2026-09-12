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
// (v10: the auto-backup "choose a folder" button was showing up on an
// actual Android phone -- Chrome for Android has started exposing the
// underlying showDirectoryPicker API on at least some devices, even though
// this feature was always meant to be desktop-only (its own tooltip has
// always said "Chrome/Edge desktop only") and picking a folder through it
// on Android -- especially a cloud-storage app's folder via Android's
// document-provider system -- is exactly what produced the earlier 0-byte-
// write bug report. It's now hidden on anything that looks like a mobile
// device regardless of what the API itself claims to support.)
// (v11: selecting an inserted photo/image showed a "Color" picker in the
// side panel that silently did nothing when clicked -- images were always
// designed to have no color to tint (the border is a fixed white/black
// halo, same as everything else's outline underneath its actual color),
// but the panel had no gate keeping that picker from showing up for images
// anyway. It's now hidden for images specifically; every other object type
// is unaffected.)
// (v12: two changes -- (1) added an Exit button, shown only when running
// as an installed app on a phone/tablet, since Android gives installed
// apps no built-in way to fully close themselves; (2) the v10 fix for the
// auto-backup folder button showing up on Android wasn't reliable -- it
// trusted navigator.userAgentData.mobile as the deciding vote, but that
// flag reflects Chrome's phone-vs-tablet form-factor guess and can come
// back false on an Android device that isn't a phone, letting the button
// reappear. The user-agent string itself is now checked first: any
// Android/iOS user agent is treated as mobile outright, regardless of
// what the form-factor flag says.)
// (v13: saved project files now use the .utzline.json extension (was
// .redline.json), matching the app's current name -- Open project still
// accepts old .redline.json files saved before the rename, so nobody's
// existing saves are stranded by this.)
// (v14: added a Share button that hands the finished plan (the same
// flattened PDF Save produces) straight to the device's own share sheet --
// Messages, WhatsApp, email, whatever's installed -- instead of a
// save-then-attach round trip. Only shows up where the browser actually
// supports sharing files this way (Android Chrome/TWA, and some desktop
// browsers); stays hidden everywhere else rather than appearing and then
// failing.)
var CACHE_NAME = "redline-cache-v14";

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
