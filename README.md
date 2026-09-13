# UTZLINE Site Measure — installable app

This folder is the self-contained, installable version of UTZLINE Site
Measure — separate from the claude.ai link, and what the Windows install and
the Android app actually run. Everything it needs (PDF libraries, fonts) is
bundled locally; nothing loads from the internet once it's cached.

## How the pieces fit together

There are four things in play, and it's easy to mix them up:

1. **The claude.ai artifact** — the link in this chat. Handy for quickly
   trying changes, but it can't be installed as an app (claude.ai doesn't
   allow a page to register the manifest/service-worker that Windows and
   Android require first) and it still loads a couple of fonts/scripts from
   the internet. Not what your installed copies run.
2. **This bundle, hosted on GitHub Pages** — `Utzline-Site-Measure` repo,
   live at `https://utzy79.github.io/Utzline-Site-Measure/`. This is the
   real thing: fully offline-capable, and the actual content both the
   Windows install and the Android app load and run.
3. **The Windows (or Mac/Linux) install** — just Chrome/Edge's "Install this
   site as an app" pointed at the URL above. It's a thin shortcut to that
   same hosted site, nothing more.
4. **The Android app (the APK)** — also just a thin wrapper (a "Trusted Web
   Activity") around that same hosted URL. **The APK does not contain the
   app's code.** It's a shell that loads whatever is live at
   `Utzline-Site-Measure` right now, the same as opening that URL in a
   browser — which is exactly why updating the app is a matter of updating
   the *files*, never rebuilding or reinstalling the APK.
5. **A second, unrelated repo**: `utzy79.github.io` (the plain user-site
   repo, at the bare `https://utzy79.github.io/` root). This one only exists
   to host `.well-known/assetlinks.json` — the file that lets Android verify
   the APK is allowed to represent this domain, which is what makes the
   app's browser address bar disappear. It has nothing to do with the app
   itself; don't upload app files there, and don't touch it unless the
   address bar ever comes back.

## Updating the app (this is the main thing you'll do)

Whenever new files show up in chat as a zip:

1. Unzip it.
2. Go to the **`Utzline-Site-Measure`** repo on GitHub (not the other one) —
   `github.com/utzy79/Utzline-Site-Measure`.
3. Upload the files from the zip, overwriting the existing ones (drag them
   onto the repo page, or use **Add file → Upload files**). Commit.
4. Wait about a minute for GitHub Pages to redeploy, then check it actually
   took: open `https://utzy79.github.io/Utzline-Site-Measure/` directly in a
   normal browser tab and confirm the change is there.
5. Get each installed copy to pick it up:
   - **Windows/Mac install**: close and reopen it; a refresh is usually
     enough.
   - **Android app**: fully close it — swipe it away from your recent-apps
     list, don't just background it — then reopen. If it still looks old,
     do that twice, or go to Android Settings → Apps → UTZLINE → Storage &
     cache → **Clear cache** (not "Clear data" — that also wipes local
     autosave/settings) and reopen again.

No APK rebuild, no re-signing, nothing through PWABuilder — that's only ever
needed if the app's *identity* changes (its name, icon, or package ID), not
for ordinary fixes or features.

## Things worth knowing

- **Auto-backup and Save both fall back to plain downloads on Android** (and
  on any browser without Chrome/Edge desktop's folder-picker support) —
  there's no "choose a folder" option there, so files land in the normal
  Downloads location instead. The very first time auto-backup fires
  automatically, Chrome may show a one-time "this site wants to download
  multiple files" prompt — allow it and it won't ask again.
- **The auto-backup "choose a folder" button only ever appears on an actual
  desktop browser**, even if a phone's browser technically claims to support
  the underlying API — it's deliberately restricted, since that path proved
  unreliable on Android (a real bug: backups silently landing as 0-byte
  files when pointed at a cloud-storage folder).
- **Save PDF waits a few seconds for its libraries to finish loading** if
  you tap Save right after opening the app — this only matters on a slow
  connection, and it'll show a "Preparing PDF export…" message while it
  waits rather than skipping the PDF silently.
- **Share on Windows (Edge/Chrome) can fail with "Try that again — We
  couldn't show you all the ways you could share"** — this is a Windows/
  Edge issue, not the app: it showed up on a real machine even after setting
  a default email app, updating Edge, resetting Edge's settings, and
  clearing its cache, while the exact same file shared fine straight from
  File Explorer's own Share option on that same machine — confirming it's
  a bug in how Edge itself invokes Windows' share panel for files, with no
  fix available from the app's side. Since v23, Share no longer leaves you
  stuck on that error: if the share sheet fails (or Windows reports it
  isn't actually usable, even though the button showed up), it now
  automatically saves the exact file it was trying to send and tells you to
  open it from Downloads (or your Files app) and share it from there —
  which is the one path already confirmed to work. Worth trying first
  anyway, since it sometimes does clear the underlying error: **Settings →
  Apps → Default apps → Email → set one** (Outlook, Mail, whatever's
  installed), updating Edge, Edge **Settings → Reset settings**, or
  clearing Edge's cache (**Settings → Privacy, search, and services → Clear
  browsing data → Cached images and files**). Also worth knowing: **Share
  only shows up at all on an `https://` install** (this hosted site, or the
  artifact link) — opening `index.html` straight from a downloaded/unzipped
  folder (a `file://` address) never exposes it, no matter the browser.

## What's in this folder

- `index.html` — the app itself
- `manifest.json`, `service-worker.js` — what makes it installable/offline
  (the version comment at the top of `service-worker.js` is a running
  changelog of every fix that's shipped)
- `icons/` — app icons
- `jspdf.umd.min.js`, `svg2pdf.umd.min.js`, `pdf.min.js`, `pdf.worker.min.js`,
  `sans.woff2`, `mono.woff2` — bundled libraries and fonts (all local, no CDN)
- `build.py` — regenerates `index.html` from the canonical claude.ai source;
  only relevant if you're working on the code directly rather than through
  chat

## Setting this up fresh (e.g. on a new account/device)

You already have this running, so you shouldn't need this — but for
reference, in case it's ever needed again from scratch:

1. Create a **public** GitHub repo, upload every file from this bundle
   (keeping the `icons` folder structure).
2. Repo **Settings → Pages** → Source: **Deploy from a branch**, branch
   **main**, folder **/(root)** → Save. Wait ~1 minute for the live URL.
3. Open that URL once while online (to cache it for offline use), then
   install it: on Windows/Mac, the browser's install icon in the address
   bar; on Android, Chrome's **⋮ → Add to Home screen** (or build a proper
   APK via PWABuilder.com for a real installable app with no browser chrome
   at all, which is what this project actually did).
