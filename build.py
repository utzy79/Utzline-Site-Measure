#!/usr/bin/env python3
"""
Rebuilds /home/claude/redline-pwa/index.html from the canonical Artifact
source at /home/claude/redline/source.html.

The Artifact source is a bare fragment (title/link/script/style/body --
no doctype/html/head/body) meant to be dropped into claude.ai's own page
shell, and it loads three libraries straight from CDNs plus a Google
Fonts stylesheet. A self-hosted, installable, offline-capable PWA can't
rely on any of that reaching the browser, so this script:

  1. Rewrites the three CDN <script src> URLs to the local vendored
     copies already sitting next to this script (jspdf, svg2pdf, pdf.js).
  2. Drops the Google Fonts <link> and instead points the *same two*
     custom fonts (IBM Plex Sans/Mono, weight 500 -- the only weight the
     app ever draws with) at local woff2 files via @font-face, so the
     app still looks right with zero network access.
  3. Inserts the PWA-specific <head> tags (manifest link, theme-color,
     touch icons, apple-mobile-web-app-* tags) right after <title>.
  4. Wraps the whole thing in a real <!DOCTYPE html><html lang="en">...
     </html> document, since the fragment has none.
  5. Appends the service-worker registration script at the very end.

Run this every time source.html changes, then bump service-worker.js's
CACHE_NAME (with a comment saying what changed) so installed copies
actually pick up the update instead of serving a stale cached shell.
"""

import re
import sys
from pathlib import Path

SRC = Path("/home/claude/redline/source.html")
OUT = Path(__file__).parent / "index.html"

CDN_REPLACEMENTS = [
    (
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js",
        "./jspdf.umd.min.js",
    ),
    (
        "https://cdn.jsdelivr.net/npm/svg2pdf.js@2.8.1/dist/svg2pdf.umd.min.js",
        "./svg2pdf.umd.min.js",
    ),
    (
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js",
        "./pdf.min.js",
    ),
]

GOOGLE_FONTS_LINK_RE = re.compile(
    r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?family=IBM\+Plex[^"]*">\n?'
)

LOCAL_FONT_FACE_BLOCK = (
    "<style>\n"
    "@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500;"
    "src:url('./mono.woff2') format('woff2');}\n"
    "@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:500;"
    "src:url('./sans.woff2') format('woff2');}\n"
    "</style>\n"
)

PWA_HEAD_TAGS = (
    '<link rel="manifest" href="./manifest.json">\n'
    '<meta name="theme-color" content="#1b2224">\n'
    '<link rel="icon" type="image/png" sizes="512x512" href="./icons/icon-512.png">\n'
    '<link rel="apple-touch-icon" href="./icons/icon-192.png">\n'
    '<meta name="mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
    '<meta name="apple-mobile-web-app-title" content="UTZLINE Site Measure">\n'
)

SERVICE_WORKER_SCRIPT = (
    "\n\n<script>\n"
    'if ("serviceWorker" in navigator) {\n'
    '  window.addEventListener("load", function () {\n'
    '    navigator.serviceWorker.register("./service-worker.js").catch(function (err) {\n'
    '      console.warn("UTZLINE Site Measure: service worker registration failed", err);\n'
    "    });\n"
    "  });\n"
    "}\n"
    "</script>\n"
)


def build():
    if not SRC.exists():
        sys.exit(f"Source not found: {SRC}")
    html = SRC.read_text(encoding="utf-8")

    if not html.lstrip().startswith("<title>"):
        sys.exit(
            "source.html doesn't start with <title> as expected -- "
            "the fragment shape may have changed; check this script's "
            "assumptions before proceeding."
        )

    # 1. Vendor the CDN script URLs to local relative paths.
    for remote, local in CDN_REPLACEMENTS:
        if remote not in html:
            sys.exit(f"Expected CDN URL not found in source.html: {remote}")
        html = html.replace(remote, local)

    # 2. Swap the Google Fonts <link> for local @font-face rules.
    if not GOOGLE_FONTS_LINK_RE.search(html):
        sys.exit("Expected Google Fonts <link> not found in source.html")
    html = GOOGLE_FONTS_LINK_RE.sub(LOCAL_FONT_FACE_BLOCK, html, count=1)

    # 3. Insert the PWA head tags right after the <title> line.
    title_line_end = html.index("\n", html.index("<title>")) + 1
    html = html[:title_line_end] + PWA_HEAD_TAGS + html[title_line_end:]

    # 4. Wrap in a full document.
    html = '<!DOCTYPE html>\n<html lang="en">\n' + html + "\n</html>\n"

    # 5. Append the service worker registration, before the closing </html>.
    html = html.rstrip()
    assert html.endswith("</html>")
    html = html[: -len("</html>")] + SERVICE_WORKER_SCRIPT + "</html>\n"

    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT} ({len(html)} bytes)")


if __name__ == "__main__":
    build()
