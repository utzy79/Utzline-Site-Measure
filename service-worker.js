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
// (v15: two fixes -- (1) inserting/opening a PDF right after the app first
// loads could fail immediately with "still loading, try again" if pdf.js
// (a large CDN script) hadn't finished loading yet -- it now waits a few
// seconds for it first, same fix already applied to PDF export earlier;
// (2) a plain photo that got stuck decoding (or a file that just doesn't
// decode at all) used to be able to fail in total silence -- nothing
// happened, no error, nothing to explain "it doesn't work". Both paths now
// always end in either success or a real, visible message. Also added: a
// file-name button (next to Save) that lets you rename the current plan at
// any time -- Save, Save PDF, Share and auto-backup all pick up the name
// you set instead of only ever using whatever the source file was called.)
// (v16: found the real cause of the phone toolbar looking small/cramped in
// portrait -- this self-hosted build had no <meta name="viewport"> tag at
// all, so mobile browsers (Chrome on Android inside the installed app
// included) laid the page out at a virtual desktop width and zoomed the
// whole thing out to fit the real screen. Everything looked smaller, and
// worse, the CSS rule meant to keep the phone toolbar at full size in one
// scrolling row (added back in v7) never matched, since it's keyed to the
// real device width -- so portrait fell back to the cramped multi-row wrap
// layout instead. Landscape looked fine only because a landscape phone's
// width happens to be close to that assumed desktop width anyway, not
// because anything was actually working. Added the missing viewport tag;
// this didn't show up in the claude.ai Artifact preview because that
// platform inserts its own viewport tag automatically.)
// (v17: the quick-help tip that sits over the canvas ("Drag to draw...")
// used to only disappear once you drew your first object or switched
// tools -- on a freshly opened/loaded plan with nothing drawn yet, it just
// sat there over the middle of the photo with no way to close it early.
// It can now be dismissed early with a swipe or its new × button, and a
// new "?" button next to the layers icon brings it back on demand anytime,
// even once there's already work on the plan.)
// (v18: the phone toolbar was one long row you had to keep swiping sideways
// across to reach everything. Split it into its two natural halves --
// editing tools on top, file/plan actions below -- each its own full-size,
// independently side-scrolling row, so there's a lot less swiping to reach
// any one button. Tablet/desktop layout is untouched by this.)
// (v19: found a real quality bug by comparing a screenshot of the app
// against a screenshot of an exported PDF opened in a different PDF
// viewer -- every dimension/label/callout/text object in an exported PDF
// was coming out in a plain substitute font (Helvetica/Courier) instead of
// the app's actual IBM Plex Sans/Mono. svg2pdf.js can only use a font
// jsPDF already knows about, and jsPDF's built-in fonts don't include IBM
// Plex, so it silently substituted one -- confirmed directly by inspecting
// an exported PDF's fonts (none of the real ones were embedded at all).
// Now registers the genuine fonts (converted losslessly from the exact
// same files the app already uses on screen) with jsPDF, so exported/
// shared PDFs actually match what the app shows.)
// (v20: added a manual light/dark toggle (new "?"-adjacent button in the
// toolbar). Previously the app only ever mirrored the device/browser's own
// dark-mode setting with no way to override it -- some phones and browsers
// report that preference inconsistently, which is exactly what made the
// app look unexpectedly light on one such setup. Cycles system (matches
// your device, same as before) -> light -> dark -> back to system, and
// remembers the choice for next time.)
// (v21: Share now asks what to send instead of always sending the whole
// plan as a PDF -- "Current view" (a quick picture of exactly what's on
// screen right now, at the current pan/zoom) or "Full plan" (the same
// whole-plan PDF Share always sent before). "Current view" doesn't depend
// on the PDF export libraries at all, so it also works on a network where
// those can't load.)
// (v22: two additions -- (1) a new "zoom to rectangle" tool (magnifier
// icon, shortcut Z): drag a box around any area and the view zooms to fit
// exactly that box, instead of only being able to scroll/pinch-zoom around
// whatever's already on screen; (2) on the phone, the item-properties
// panel (color/weight/ends/etc) used to float directly over the canvas at
// its usual spot, which on a narrow screen meant it sat right on top of
// the photo -- it's now docked as its own strip directly under the
// toolbar instead, so it never covers the image. Tablet/desktop are
// unaffected by the second change.)
// (v23: on some Windows/Edge installs the in-app Share button reliably
// fails with Windows' own "Try that again — We couldn't show you all the
// ways you could share" error -- confirmed to be an Edge/Windows-side bug,
// not this app (the identical file shares fine from File Explorer's native
// Share on the same machine, and there is no app-side fix for it). Share
// no longer leaves you on that dead end: when the share sheet fails (or
// isn't actually usable despite being detected), it now automatically
// saves the exact file it was trying to send and tells you to share it
// from Downloads/your Files app instead -- the same path already confirmed
// to work. Cancelling the share sheet yourself is still not treated as a
// failure, exactly as before.)
// (v24: three changes -- (1) editing a dimension or angle's label now opens
// Android (and iOS) straight to the compact numeric keypad instead of the
// full keyboard, since that text is almost always a measurement -- callouts
// and plain text objects are unaffected, they still get the normal text
// keyboard; (2) a real bug found from a bug report: on the phone, selecting
// something for the first time opens the docked properties panel, which
// pushes the canvas down -- but that's a genuine layout change, and the very
// next drag movement was measuring itself against the canvas's NEW position
// while still anchored to where it started BEFORE the panel opened, so the
// object you'd just selected could suddenly leap a large, wrong distance the
// instant you tried to move it. Fixed by re-anchoring the drag the moment
// the panel finishes opening, so a tap-turned-drag right after selecting
// something now only moves it by exactly as far as your finger actually
// travelled; (3) added a version tag to the quick-help tip (open it anytime
// via the "?" button) so it's possible to confirm which build is actually
// running on any device without needing dev tools -- keep this number, the
// zip's filename, and this file's own CACHE_NAME all matching from now on.)
// (v25: v24's fix stopped the just-selected object's DATA from jumping
// during a drag, but on the phone, opening the docked properties panel
// still visibly shifted the object on screen even with no drag at all --
// the canvas itself moves down to make room for the panel, so whatever you
// just tapped could end up sitting behind the panel or scrolled out of the
// smaller leftover view, forcing a hunt to find it again (and a stray tap
// while hunting would deselect it). Selecting something for the first time
// now recenters the view on it -- panning only, never zooming -- into
// whatever room is actually left under the panel, so there's nothing to
// hunt for. Reselecting a different object while the panel's already open,
// and any selection on tablet/desktop (where the panel floats and never
// pushes the canvas around), are unaffected -- nothing reflows there, so
// nothing needs recentering.)
// (v26: on the phone, the item-properties panel (color/weight/ends/text
// size/hide/delete/edit) used to stack every applicable group one above
// another -- up to 38vh of stacked rows depending on what was selected.
// It's now a single row that scrolls sideways instead, the same pattern
// the toolbar already used -- always a short, fixed-height strip no matter
// how many groups the current object needs. Also enlarged every touch
// target inside it: color swatches and the weight/text-size +/- buttons
// went from 20px to 34px, the end-style dropdown got taller, and the
// Start/End checkboxes went from 13px to 20px -- all of them were sized
// for a mouse and were genuinely too small and close together for a
// fingertip, causing mis-taps on the wrong control. Tablet/desktop, where
// the panel floats rather than docking, are unaffected.)
// (v27: dropping a photo onto the canvas used to always fully replace
// whatever plan was already loaded -- wiping the custom file name AND every
// annotation on it -- no matter what, unlike the Open button (which asks
// first once there's something to lose) and unlike pasting an image (which
// already inserted rather than replaced). Dropping a photo/PDF onto an
// EXISTING plan now inserts it as a second image instead, matching paste;
// it still acts as Open, picking up the dropped file's own name, only when
// nothing is loaded yet, since there's nothing to lose in that case.)
// (v28: a deliberate audit of every other small drag handle for the same
// "sized for a mouse" problem the properties panel had in v26 -- object
// resize corners, the label rotate/resize grips, and the tap tolerance for
// grabbing a thin line/dimension/callout leader. All of these now enlarge
// together on any coarse (touch) pointer -- phone, tablet, or a touch-
// enabled Windows laptop/monitor, not just phones -- instead of waiting for
// each one to get reported individually. Mouse/trackpad sizing is
// unchanged.)
var CACHE_NAME = "redline-cache-v28";

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
