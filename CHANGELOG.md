# Changelog

All notable changes to CosmicPDF are documented here.

## Phase 2 — Performance: rendering & memory (2026-07-18)

### Improved

- **Progressive page rendering**: the editor now shows the first page as soon as it is rasterized and renders the remaining pages in the background, instead of blocking on the whole document. A non-blocking progress indicator shows `done/total`.
- **Blob URLs instead of base64 data URLs**: rendered page and thumbnail images are stored as `blob:` object URLs (`canvas.toBlob` + `URL.createObjectURL`) rather than base64 `data:` strings, cutting the in-memory image footprint (~33% smaller, binary vs base64).
- **Explicit pdf.js document lifecycle**: `renderPDFProgressive` opens the document once per render pass and destroys it when finished, releasing worker resources.

### Fixed

- Potential memory leak: page/thumbnail blob URLs are now revoked when the document is replaced (`setPages`) or reset, so repeated document loads no longer accumulate orphaned object URLs.

### Notes

- Behavior- and UI-preserving: same visual output and page fidelity (scale-2 PNG raster retained). `loadAndRenderPDF` kept as a thin wrapper over the new progressive renderer for existing callers. Build passes; lint clean (0 errors / 0 warnings).

## Phase 1 — Code hygiene & stability (2026-07-18)

### Fixed

- All 42 ESLint warnings (unused pdf-lib destructures in `engine.ts`, unused imports/params across tool pages and components; documented per-file suppressions for local data-URL `<img>` previews).
- Stale `splitEnd` / `pageOrder` / `selectedForDelete` state in `FileToolsPanel` when the PDF loads after mount or the document changes — now resynced whenever `pageCount` changes.
- Exported PDFs from the editor had oversized page dimensions (pixel size at 2× render scale instead of PDF points). `exportAnnotatedPDF` now accepts per-page point dimensions and the editor passes them.

### Improved

- Replaced the `window.__cosmicPdfCanvas` global with a typed module-scoped canvas registry (`src/lib/canvas/canvasRegistry.ts`) with mount/unmount lifecycle.
- `DEFAULT_RENDER_SCALE` exported from `renderer.ts` as the single source of truth for pixel↔point conversion.

### Notes

- Behavior-preserving phase: no feature changes, no visual changes. Build passes; lint clean (0 errors / 0 warnings).
