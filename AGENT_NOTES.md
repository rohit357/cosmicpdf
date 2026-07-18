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

Phase 1 — hygiene + quick bug fixes (behavior-preserving). COMPLETE, awaiting user review/commit.

# Completed

Phase 1 (all tasks):
1. All 42 ESLint warnings fixed (0 errors / 0 warnings now):
   - `engine.ts`: each function destructures only what it uses from pdf-lib (was `{ PDFDocument, rgb, StandardFonts, degrees }` everywhere)
   - Removed unused imports: `GripVertical` (img-to-pdf), `Upload` (ImageStamp), `useCallback`+`ImagePlus` (SignaturePad), unused `i` param (split page)
   - `no-img-element` suppressed per-file with justification comments (previews are local data URLs; next/image inapplicable)
2. FileToolsPanel stale state: `useEffect` on `pageCount` resyncs `splitEnd`, `pageOrder`, clears `selectedForDelete`
3. Export dimensions: `exportAnnotatedPDF(pageImages, pageDimensions?)` takes per-page point sizes; editor passes `page.width/height ÷ DEFAULT_RENDER_SCALE` → exported PDF pages now correct point size (was 2× oversized)
4. `window.__cosmicPdfCanvas` → `src/lib/canvas/canvasRegistry.ts` (`setActiveCanvas`/`getActiveCanvas`); Canvas registers + unregisters on unmount; Toolbar consumes via dynamic import

# Remaining

- Phase 2 — perf: progressive rendering, Blob URLs instead of data URLs, JPEG thumbs, reuse pdfjs doc
- Phase 3 — responsiveness: pointer events (touch), mobile editor layout, home page mobile pass
- Phase 4 — feature fixes: undo/redo off-by-one, PageStrip delete updates state (not download), inflatePDF rewrite, offscreen export canvas
- Phase 5 — additions: page-numbers tool, export quality option

# Engineering Decisions

- `exportAnnotatedPDF` signature changed from `(images, originalWidth?, originalHeight?)` to `(images, pageDimensions?)` — old scalar params were never passed by any caller (verified via grep), so no breakage; per-page array supports mixed page sizes
- `DEFAULT_RENDER_SCALE = 2` exported from renderer.ts as single source of truth for pixel↔point conversion
- canvasRegistry uses module-scoped variable, not zustand — non-serializable fabric instance, no reactivity needed
- Kept `/* eslint-disable @next/next/no-img-element */` pattern (already used in PageStrip/FileToolsPanel) rather than next/image: data-URL previews gain nothing from optimization
- `refactor.js` at repo root is a dev script, untouched

# Known Issues

(planned in later phases)
- Memory: all pages held as PNG data URLs at scale 2 in zustand — huge for big PDFs (Phase 2)
- `loadAndRenderPDF` renders all pages before editor shows (Phase 2)
- Export rasterizes pages → text layer lost, quality capped at render scale (accepted limitation of canvas-composite export design)
- Undo restores pushed snapshot, not prior state — first-edit undo broken (Phase 4)
- PageStrip per-thumbnail delete downloads new PDF instead of updating editor (Phase 4)
- `inflatePDF` padding approach unreliable (zeros after IEND) (Phase 4)
- Canvas overlay mouse-only — no touch (Phase 3)
- Editor mouse coords divide by zoom; fragile if zoom mechanism changes (Phase 3)

# Validation History

- Baseline (pre-Phase-1): build ✓ (12 static pages), eslint 0 errors / 42 warnings
- Post-Phase-1: build ✓ (12 static pages, TS pass), eslint 0 errors / 0 warnings

# Next Session

Phase 1 done, not yet committed. If resuming: check `git status` — if `src/` changes still uncommitted, user hasn't committed yet; do not start Phase 2 without explicit approval. Next work = Phase 2 (perf: progressive render + Blob URLs) after user approval.
