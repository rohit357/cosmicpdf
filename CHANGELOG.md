# Changelog

All notable changes to CosmicPDF are documented here.

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
