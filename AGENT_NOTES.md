# Project

CosmicPDF (`cosmic-pdf`) — fully client-side PDF editor. Next.js 16.2.3 (webpack mode, NOT turbopack), React 19, fabric.js 7, pdfjs-dist 4, pdf-lib, zustand, Tailwind 4. No server processing; all PDF work in browser.

Note: `node_modules/next/dist/docs/` is the authoritative Next.js reference per AGENTS.md (version differs from common training data).

# Architecture

- `src/app/page.tsx` — landing page, file upload → `/editor`
- `src/app/editor/page.tsx` — editor shell; dynamic-imports all editor components (SSR off)
- `src/app/tools/*` — standalone tool pages (merge, split, compress, rotate, watermark, img-to-pdf, pdf-to-img)
- `src/components/editor/` — Canvas (fabric.js host + draw/place/erase handlers), Toolbar, Sidebar, PageStrip, PropertiesPanel, FileToolsPanel
- `src/lib/pdf/renderer.ts` — pdfjs raster (scale 2, exported as `DEFAULT_RENDER_SCALE`); worker at `/public/pdf.worker.min.mjs`
- `src/lib/pdf/engine.ts` — all pdf-lib operations (merge/split/rotate/compress/watermark/inflate/export)
- `src/lib/canvas/fabricManager.ts` — fabric lifecycle helpers; `src/lib/canvas/canvasRegistry.ts` — active canvas ref (module-scoped)
- `src/store/` — zustand: pdfStore (bytes, rendered pages, per-page fabric JSON), editorStore (tool/options/zoom), historyStore (undo/redo stacks), uiStore (panels, toasts)

Data flow: upload → bytes in pdfStore → pdfjs renders all pages to PNG data URLs (scale 2) → fabric canvas shows page image as background → annotations stored as fabric JSON per page → export composites each page to PNG → pdf-lib rebuilds PDF.

# Current Phase

Scroll-view feature (user-requested, between Phase 2.1 and Phase 3). COMPLETE, awaiting user review/commit.

# Completed

Scroll-view feature (continuous vertical PDF preview) — fully additive, no existing logic modified:
- `uiStore`: added `viewMode: 'edit' | 'scroll'` + `setViewMode` (default 'edit').
- `lib/canvas/composite.ts` (new): `compositePage(page, json)` flattens page image + saved fabric annotations to a PNG blob URL via an offscreen `StaticCanvas` (never touches live editor canvas). Returns plain page URL when a page has no annotations (no work/memory).
- `components/editor/ScrollView.tsx` (new): read-only vertical stack of all pages. Un-annotated pages use native `<img loading="lazy">`; annotated pages composited on mount, cached in state, blob URLs revoked on unmount/re-run. Click page (or Edit link) → `setCurrentPage(i)` + `setViewMode('edit')`. Auto-scrolls current page into view on mount.
- `Toolbar.tsx`: added Edit/Scroll toggle button (ScrollText/Pencil icon) after zoom cluster.
- `editor/page.tsx`: dynamic-imports ScrollView (ssr:false). Edit canvas stays MOUNTED (CSS-hidden) in scroll mode to preserve fabric state; ScrollView renders over it. Right panel hidden in scroll mode. Progressive render / blob URLs / all prior work untouched.

Design decisions:
- Chose "scroll preview mode" (read-only) over full scroll+edit — user picked it; avoids rewriting single-canvas editor (zero regression risk to Phase 1/2/2.1).
- Edit canvas hidden via `hidden` class, not unmounted → no fabric dispose/re-init cost or lost state when toggling.
- Composite uses StaticCanvas offscreen → live editor canvas + canvasRegistry untouched.

Phase 2.1 (stabilization) — 4 root-cause fixes:
1. Nested-button hydration error (PageStrip). `TooltipTrigger` renders a base-ui `<button>`; the hover delete `<button>` was nested inside it → invalid HTML → hydration error. Fixed: wrapper `<div class="relative group">` owns positioning; `TooltipTrigger` and delete button are now siblings.
2. Detached ArrayBuffer (bug 3). FileToolsPanel pdf-to-img passed store `pdfBytes` directly to `getDocument({ data: pdfBytes })`; pdf.js transfers the buffer to its worker and detaches it, corrupting the shared store bytes used by later compress/inflate/export. Fixed: `.slice()` the bytes (matches every other call site). NOTE: this was the actual detach source; `compressPDF`/`inflatePDF` themselves already sliced.
3. Canvas lifecycle crash "Cannot destructure property 'el' of 'this.lower'". Fabric v7 sets `this.disposed=true` on dispose; the `lowerCanvasEl` getter then destructures undefined `this.lower`. The `init`/`switchPage` async effects mutated the canvas after `await`s even if it had been disposed/recreated meanwhile (page switch disposes+recreates; blob-URL image `onload` is genuinely async, widening the race that progressive rendering's state churn exposes). Fixed: added `isCanvasDisposed(canvas)` helper in fabricManager; both effects now re-check `isCanvasDisposed(canvas) || canvas !== canvasRef.current` after every await; `init` also disposes the canvas if the effect was cleaned up during creation.
4. Progressive-rendering regression review: page-0 object identity stays stable across `addPage` spreads, so the init effect keys on `currentPage?.imageDataUrl` fire once (verified). No new issue found. Pre-existing (NOT Phase 2): opening a second PDF via the Toolbar doesn't clear `pages`/re-render — `setFile` never resets pages; unchanged by our work, left for a later phase.

Phase 2 (perf):
1. Blob URLs replace PNG data URLs. `renderer.ts` `canvasToObjectURL` uses `canvas.toBlob` + `URL.createObjectURL`. `pdfStore` `revokePageURLs` frees blob: URLs on `setPages`/`reset` to prevent leaks; new `addPage` action appends one page.
2. Progressive rendering. `renderPDFProgressive(bytes, { onPage })` opens the pdf.js doc once, renders page-by-page, calls `onPage(page, total)` after each, and `doc.destroy()` in `finally`. `loadAndRenderPDF` kept as a thin collector wrapper (unchanged signature) — `getPDFPageCount`/split page still work.
3. Editor wiring. `editor/page.tsx` streams pages via `addPage`; first page → auto-fit zoom + editor usable immediately; `renderStartedRef` guards effect re-entry (append mutates `pages.length` dep). Non-blocking bottom-right progress pill `Rendering pages… done/total`.
4. pdf.js doc reused within a render pass (was implicitly one doc already, now explicitly opened once and destroyed).

Phase 1 (all tasks):
1. All 42 ESLint warnings fixed (0 errors / 0 warnings now):
   - `engine.ts`: each function destructures only what it uses from pdf-lib (was `{ PDFDocument, rgb, StandardFonts, degrees }` everywhere)
   - Removed unused imports: `GripVertical` (img-to-pdf), `Upload` (ImageStamp), `useCallback`+`ImagePlus` (SignaturePad), unused `i` param (split page)
   - `no-img-element` suppressed per-file with justification comments (previews are local data URLs; next/image inapplicable)
2. FileToolsPanel stale state: `useEffect` on `pageCount` resyncs `splitEnd`, `pageOrder`, clears `selectedForDelete`
3. Export dimensions: `exportAnnotatedPDF(pageImages, pageDimensions?)` takes per-page point sizes; editor passes `page.width/height ÷ DEFAULT_RENDER_SCALE` → exported PDF pages now correct point size (was 2× oversized)
4. `window.__cosmicPdfCanvas` → `src/lib/canvas/canvasRegistry.ts` (`setActiveCanvas`/`getActiveCanvas`); Canvas registers + unregisters on unmount; Toolbar consumes via dynamic import

# Remaining

- Phase 3 — responsiveness: pointer events (touch), mobile editor layout, home page mobile pass
- Phase 4 — feature fixes: undo/redo off-by-one, PageStrip delete updates state (not download), inflatePDF rewrite, offscreen export canvas
- Phase 5 — additions: page-numbers tool, export quality option

# Engineering Decisions

- Phase 2: `PDFPageData` field names (`imageDataUrl`/`thumbnailDataUrl`) kept even though they now hold blob URLs — renaming touches ~10 files for no functional gain; documented instead. Both work identically as `<img src>` / `new Image().src`.
- Phase 2: blob URLs are same-origin, so `crossOrigin='anonymous'` background image does NOT taint the canvas — export `toDataURL` still works.
- Phase 2: `loadAndRenderPDF` retained (not deleted) as a wrapper — non-editor callers and future batch use; avoids a wider refactor.
- Phase 2: revoke only strings starting `blob:` — defensive against any residual data URLs; no double-free.
- Phase 2: kept scale-2 PNG raster (not JPEG thumbs) — JPEG thumb switch deferred; PNG→blob already removes the base64 bloat, and JPEG risks visible quality change (behavior-preserving rule).
- `exportAnnotatedPDF` signature changed from `(images, originalWidth?, originalHeight?)` to `(images, pageDimensions?)` — old scalar params were never passed by any caller (verified via grep), so no breakage; per-page array supports mixed page sizes
- `DEFAULT_RENDER_SCALE = 2` exported from renderer.ts as single source of truth for pixel↔point conversion
- canvasRegistry uses module-scoped variable, not zustand — non-serializable fabric instance, no reactivity needed
- Kept `/* eslint-disable @next/next/no-img-element */` pattern (already used in PageStrip/FileToolsPanel) rather than next/image: data-URL previews gain nothing from optimization
- `refactor.js` at repo root is a dev script, untouched

# Known Issues

(planned in later phases)
- Memory: pages still all held at scale-2 in zustand (now blob URLs, ~33% smaller than base64, but still full doc in memory) — true windowing/lazy eviction not done (would need bigger refactor; out of Phase 2 minimal scope)
- Export rasterizes pages → text layer lost, quality capped at render scale (accepted limitation of canvas-composite export design)
- Undo restores pushed snapshot, not prior state — first-edit undo broken (Phase 4)
- PageStrip per-thumbnail delete downloads new PDF instead of updating editor (Phase 4)
- `inflatePDF` padding approach unreliable (zeros after IEND) (Phase 4)
- Canvas overlay mouse-only — no touch (Phase 3)
- Editor mouse coords divide by zoom; fragile if zoom mechanism changes (Phase 3)
- `compressPDF` / `pdf-to-img` still re-parse the doc per operation — independent one-shot flows, left as-is (low value, higher risk than editor render path)

# Validation History

- Baseline (pre-Phase-1): build ✓ (12 static pages), eslint 0 errors / 42 warnings
- Post-Phase-1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings
- Post-Phase-2: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings
- Post-Phase-2.1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no hydration/destructure errors in dev log
- Post-scroll-view: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no errors in dev log

# Next Session

Phase 2 done, not yet committed. If resuming: check `git status` — uncommitted `src/` changes mean user hasn't committed yet; do not start Phase 3 without explicit approval. Next work = Phase 3 (responsiveness: pointer/touch events, mobile editor layout, home mobile pass) after user approval.
