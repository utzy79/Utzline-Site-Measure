# UTZLINE Site Measure — installable app

This folder is a complete, self-contained copy of UTZLINE Site Measure that can
be installed as a real app on Windows and Android, with full offline support.
Everything it needs (the PDF export/import libraries and fonts) is bundled
locally — nothing is loaded from the internet once it's running.

**Why a separate download?** The UTZLINE Site Measure link you already have
(on claude.ai) can't be turned into an installable app — that platform doesn't
allow a page to register the pieces (a "manifest" and a background "service
worker") that Windows/Android require before they'll offer an Install button.
This bundle is the same app, packaged so a real web host CAN offer that
Install button.

## What's in this folder

- `index.html` — the app itself
- `manifest.json`, `service-worker.js` — what makes it installable/offline
- `icons/` — app icons
- `jspdf.umd.min.js`, `svg2pdf.umd.min.js`, `pdf.min.js`, `pdf.worker.min.js`,
  `sans.woff2`, `mono.woff2` — bundled libraries and fonts (all local, no CDN)

## Step 1: Put it on a free host with HTTPS

Installing requires the app to be served over `https://` — you can't install
it straight from these files on your own computer. The easiest free option is
**GitHub Pages** (takes about 5 minutes, no coding):

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** in the top right → **New repository**. Name it anything,
   e.g. `utzline-app`. Keep it **Public**. Click **Create repository**.
3. On the new repo's page, click **uploading an existing file** (or drag files
   onto the page).
4. Drag in **every file and folder from this bundle** (`index.html`,
   `manifest.json`, `service-worker.js`, the `icons` folder, and the four
   library files + two font files). Click **Commit changes**.
5. Go to the repo's **Settings** tab → **Pages** (left sidebar) → under
   "Build and deployment", set **Source** to **Deploy from a branch**, branch
   **main**, folder **/(root)** → **Save**.
6. Wait about a minute, then refresh that Pages settings screen — it will
   show your live URL, something like:
   `https://your-username.github.io/utzline-app/`

That URL is your permanent link to the app. Open it once while online so it
caches itself for offline use, then install it (below).

*(Alternative hosts that work the same way: Netlify, Cloudflare Pages,
Vercel — any static host that serves plain HTML over HTTPS is fine.)*

## Step 2: Install it

**On Windows (Edge or Chrome):**
1. Open your hosted URL in Edge or Chrome.
2. Click the **install icon** in the address bar (a little monitor-with-arrow
   icon), or open the **⋮** menu → **Apps** → **Install this site as an app**.
3. Confirm. UTZLINE Site Measure now opens in its own window from the Start
   menu, with no browser bar, and works fully offline.

**On Android (Chrome):**
1. Open your hosted URL in Chrome.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Confirm. UTZLINE Site Measure now appears as a real app icon on your home
   screen and launches full-screen, no browser bar, and works fully offline.

## Updating it later

If you ever want changes made to the app, come back and ask — I'll rebuild
this bundle and you re-upload the changed files to the same host (just
overwrite them; GitHub Pages picks up the update automatically). I'll bump the
internal cache version each time so installed copies pick up the new version
instead of serving a stale cached one.
