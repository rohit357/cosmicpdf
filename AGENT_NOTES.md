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

Mobile UX roadmap (approved plan: M0–M4). **Phase M1 (mobile chrome) COMPLETE**, awaiting user review/commit. M0 committed (`2f22cc6`).

# Completed

Phase M1 (mobile chrome) — bottom navigation + sheets, phone-only:
1. M1.1 `uiStore`: `activeSheet: 'draw' | 'shapes' | 'more' | null` + `setActiveSheet`. Single field → at most one sheet open; desktop ignores it.
2. M1.2 `BottomToolbar.tsx` (new, `md:hidden`): slots undo/redo | Select | Text | Draw | Shapes | More. Draw/Shapes/More open bottom sheets (existing `ui/sheet.tsx`, `side="bottom"`, controlled via `activeSheet`). Tool tap → `setActiveTool` + sheet close. Sheet grids 72px touch cells; safe-area padding on bar + sheets; hidden in scroll mode (read-only). Tool lists duplicated from Sidebar as presentation-only data (no behavior duplication — same `setActiveTool` path).
3. M1.3 Top toolbar slimmed on phones: undo/redo + zoom buttons + fit `hidden md:inline-flex` (kebab keeps zoom presets; pinch/double-tap cover zoom); zoom % indicator stays visible (tap = reset). Hamburger removed — bottom bar replaces sidebar as mobile tool surface (drawer unreachable by design; Sidebar component untouched for desktop). `editor/page.tsx` renders `<BottomToolbar onUndo onRedo/>` after canvas area. PageStrip safe-area padding now `md:`-only (BottomToolbar is bottom-most element on phones).

Design decisions (M1):
- Slots chosen: Select + Text top-level (most-used single tools), Draw/Shapes grouped in sheets, everything else in More — 90% actions ≤2 taps, all ≥44px.
- Sheets reuse base-ui Dialog-based `ui/sheet.tsx` — focus trap + backdrop free; no new dependency.
- BottomToolbar inside canvas-column flex (not fixed) → keeps canvas height math simple, no overlap with PageStrip.
- Chrome is presentation-only: zero store changes beyond `activeSheet`; fabric/canvas pipeline untouched → Phase 2/3 perf + M0 behavior hold.
- Sidebar mobile-drawer code left in place (dead on phones) — removing = desktop-risk churn for no gain; M2+ may delete.

Phase M0 (mobile UX quick wins) — per approved plan:
1. M0.1 Safe areas: `export const viewport: Viewport` with `viewportFit: 'cover'` in `layout.tsx`; `pb-[env(safe-area-inset-bottom)]` on PageStrip container.
2. M0.2 Coarse-pointer targets (Tailwind 4 native `pointer-coarse:` variant, verified in dist): Sidebar tool rows `pointer-coarse:py-3`; PageStrip nav buttons `pointer-coarse:h-11 w-11`; PageStrip delete button always visible on touch (`pointer-coarse:opacity-100`) + larger (`pointer-coarse:w-7 h-7`). Top Toolbar sizing deferred to M1 (12 controls × 44px can't fit 375px — needs the M1 restructure).
3. M0.3 Drag-to-erase: eraser fires on `pointermove` while pressed (`e.isPrimary && e.buttons !== 0`) — intentional desktop change too (plan D6.4).
4. M0.4 Double-tap zoom: container pointerdown, touch-only, select-tool-only; 300 ms / 32 px window; toggles `setZoom(zoom < 1.25 ? 1.5 : 1)`; pinch start clears `lastTapRef` so pinch never triggers it.
5. M0.5 A11y sweep: `aria-label` on all icon-only buttons (Toolbar ×12 incl. kebab `aria-expanded`, PageStrip nav/delete, Sidebar close); home page wrapped in `<MotionConfig reducedMotion="user">`; contrast `text-white/40` → `/60` on body/label text.
6. M0.5 Home mobile pass: hero `text-4xl sm:text-6xl md:text-8xl` (was `text-6xl` base — overflowed ≤360px); blur orbs halved (300/250px, blur 60px) on <md, third orb hidden on <md (paint cost on low-end phones).

Design decisions (M0):
- `pointer-coarse:` (capability) over width breakpoints for target sizing — iPad gets desktop layout with finger targets (plan D1).
- Drag-to-erase changes desktop too, deliberately — plan D6.4 judged strictly better.
- Double-tap restricted to select tool: draw tools own single taps; any zoom-on-double-tap while drawing = data loss risk.
- Orb diet uses smaller size + weaker blur rather than removal on <md — keeps brand look, cuts paint area ~75%.

Phase 3 (touch + responsive) — all changes in Canvas.tsx + fabricManager.ts:
1. Pointer events (Task 1). Canvas draw/place/erase overlay converted from mouse events to pointer events (`onPointerDown/Move/Up/Cancel`). `getCanvasCoords` now takes a `{clientX, clientY}` shape (works for mouse, touch, pen). Overlay gets `touchAction: 'none'` so finger-drawing doesn't scroll the page; pointer capture keeps events flowing if the finger leaves the overlay. Only the primary pointer starts a draw (`e.isPrimary`) so a second finger can't hijack an in-progress op. Fabric's own object select/move already worked on touch via its internal handlers.
2. Pinch-zoom + one-finger pan (Task 2). Scroll container tracks touch pointers in a `Map`; when 2 land, captures a pinch baseline (finger distance + current zoom) and scales `editorStore` zoom by the distance ratio (store clamps 0.25–3). Container keeps `touchAction: 'pan-x pan-y'`, so single-finger scroll still pans the page naturally. Draw overlay only appears for draw tools, so pinch and draw don't conflict.
3. Touch targets + responsive (Task 3). Canvas padding `p-8` → `p-2 md:p-8` (more draw area on phones, desktop unchanged). Fabric object handles enlarged for fingers via `FabricObject.ownDefaults.cornerSize=16` + `touchCornerSize=40`.

Design decisions (Phase 3):
- Coordinate math unchanged (still divide by zoom) — pointer events share `clientX/Y` with mouse events, so the existing formula is correct; only the event source changed. Root cause of "no touch" was mouse-only listeners + missing touch-action, not the coord math.
- Eraser kept as press-only (not continuous drag-erase) to preserve exact desktop behavior — no scope creep.
- Pinch scales the existing CSS `transform: scale()` zoom rather than fabric's internal zoom → keeps one zoom source of truth, no change to export/coord paths.
- CSS `hidden` reused for scroll mode (from scroll-view feature) — untouched.

Scroll-view feature (user-requested, between Phase 2.1 and Phase 3). COMPLETE, committed.

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

- Mobile UX plan (approved; see `C:\Users\Admin\.claude\plans\anlayse-the-codebase-important-bubbly-treasure.md`):
  - M2 — selection context bar (fixes critical P1: no touch path to delete object) + properties bottom sheet
  - M3 — pinch focal anchoring, two-finger pan in select mode, keyboard/visualViewport text-editing handling, landscape slim chrome
  - M4 — page-grid virtualization (if needed), haptics, z-order buttons
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
- Canvas overlay touch: RESOLVED in Phase 3 (pointer events + touch-action + pinch-zoom)
- `compressPDF` / `pdf-to-img` still re-parse the doc per operation — independent one-shot flows, left as-is (low value, higher risk than editor render path)
- Home page mobile pass: RESOLVED in M0 (hero clamp, orb diet, reduced motion, contrast)

# Validation History

- Baseline (pre-Phase-1): build ✓ (12 static pages), eslint 0 errors / 42 warnings
- Post-Phase-1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings
- Post-Phase-2: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings
- Post-Phase-2.1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no hydration/destructure errors in dev log
- Post-scroll-view: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no errors in dev log
- Post-Phase-3: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no errors in dev log
- Post-M0: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no errors in dev log
- Post-M1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings; smoke test `/` + `/editor` → 200, no errors in dev log

# Next Session

M1 done, not yet committed. If resuming: check `git status` — uncommitted changes mean user hasn't committed; do NOT start M2 without explicit approval. Next work = **M2**: selection context bar (Delete/Duplicate/Style/Done on fabric `selection:created/updated`, docked above BottomToolbar — fixes critical P1) + PropertiesPanel/FileToolsPanel re-housed in bottom sheet on phones.
