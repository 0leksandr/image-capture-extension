# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome Manifest V3 browser extension (no build step, no bundler, no package manager) that adds
right-click context-menu actions for manipulating images on any web page: invert, hide, open in a
new tab, force-reload (cache-bust), and save as PNG.

## Development workflow

There is no build/lint/test tooling in this repo — it's plain, unbundled JS loaded directly by
Chrome.

- **Load/reload the extension**: `chrome://extensions` → enable Developer Mode → "Load unpacked" →
  select this directory. After editing `script.js` (the service worker), click the reload icon on
  the extension card. After editing `content_script.js`, also refresh any target tab, since content
  scripts are injected once per page load.
- **Debugging**: `script.js` logs to the service worker's own DevTools console (inspect via the
  "service worker" link on the extension card). `content_script.js` logs to the target page's
  regular DevTools console.
- **Sanity-check syntax** before considering an edit done: `node -c content_script.js` /
  `node -c script.js` (there's no other automated check in this repo).

## Architecture

Two-file message-passing architecture typical of MV3 extensions:

- **`script.js`** (background service worker): registers one `chrome.contextMenus` entry per
  action in the `actions` object (emoji label → action name), and on click relays the action name
  to the active tab via `chrome.tabs.sendMessage`. Adding a new action starts here.
- **`content_script.js`** (injected into every page, `matches: ["*://*/*"]`): receives the action
  name over `chrome.runtime.onMessage` and dispatches it through a plain object lookup
  (`{actionName1, actionName2, ...}[request.action]()`) at the bottom of the file. Every action
  name used in `script.js`'s `actions` map must have a matching function in this dispatch object.

### Image resolution

Right-click target tracking: a capturing-phase `mousedown` listener records `clickedElement`
*before* the context menu opens, since by the time the menu action fires, `event.target` from the
original click is no longer available any other way.

`getImageElement()` resolves the actual image to act on from `clickedElement`, trying in order:
1. `clickedElement` itself or any `<img>` descendant, matched against `ImgSrcsetElement` (has a
   `srcset` attribute) then `ImgElement` (plain `src`).
2. Walking up the ancestor chain looking for a CSS `background-image` (`BackgroundImageElement`).

Each image "kind" is a subclass of the abstract `ImageElement` base
(`locateImage()` / `updateUrl(url)` / `canHandle(element)` static), so adding support for a new way
images appear in the DOM means adding another `ImageElement` subclass and including it in the
`getImageElement()` search order — the four top-level actions (`invertImage`, `hideImage`,
`openImage`, `reloadImage`, `saveImageAsPng`) are written against the base class only.

### Save-as-PNG specifics

`saveImageAsPng()` decodes the located image via an off-screen `<canvas>` (so it works for any
source format, including WebP) and triggers a download via a synthetic `<a download>` click — no
`chrome.downloads` permission needed since content scripts can't call that API directly. This only
works for same-origin images or images served with permissive CORS headers; cross-origin images
without CORS taint the canvas and `toBlob` throws, which is caught and logged rather than silently
failing.

## File encoding note

`content_script.js` has **mixed line endings** (mostly CRLF, with a few pre-existing stray LF-only
lines) inherited from its edit history. When editing this file:
- Never let an edit tool normalize untouched lines to a different line-ending style as a side
  effect — verify with `git diff -U0 | grep '^-'` that no unintended lines were changed/deleted.
- New lines must match the line-ending style of their immediate neighbors at the insertion point
  (check the line directly above/below with `cat -A`/`grep -c $'\r'`), not a blanket LF-or-CRLF
  rule — this file mixes both, so the right ending depends on exactly where you're inserting.
- If a diff shows unintended line-ending flips, redo the edit as a byte-level patch (e.g. a small
  Python script operating on the original bytes) that touches only the actual inserted/changed
  bytes, rather than relying on the Edit tool for that hunk.

## Verification preferences

Don't launch automated-browser verification (searching for Chrome/Chromium binaries, driving via
CDP/Playwright, the `verify` skill's browser-probing path) without asking first, even for routine
manifest/script changes. Ask how the user wants to verify (manual load via `chrome://extensions`,
skip verification, or explicit opt-in to automated browser driving) — enumerating installed
browsers is treated as invasive here even for small changes. This likely generalizes to other
local-environment-probing steps too.
