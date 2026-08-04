# Changelog

All notable changes to CosmicPDF are documented here.

## Phase M2.5 — Correctness & UX consistency (2026-08-04)

### Fixed

- **The pen's opacity slider now works.** It (and its live preview) had no effect on the actual stroke — the value never reached the brush.
- **The highlight tool showed the wrong options entirely**: font family, size, bold/italic/underline, none of which changed anything. Highlight now has its own colour and opacity controls, with a marker-pen palette, and they apply to the highlight you place.
- **Undo no longer does nothing after a stray Delete press.** Pressing Delete with nothing selected recorded a duplicate history entry, so the next undo silently consumed it.
- Switching from Select to a drawing or placement tool now clears the selection, so the phone selection bar can't act on an object whose handles are gone.
- The tool-properties button no longer appears in scroll view, where its panel cannot open; switching views also closes any open sheet, which previously reappeared on returning to edit mode.
- Signature and image tools can no longer open an empty properties sheet — the sheet, its button and the panel now agree on which tools have options, from one shared list.

### Improved

- Honest labels: the reorder panel said "drag pages" though only arrow buttons exist, and the page thumbnail's red button is now described as what it does — download a copy without that page, leaving the open document unchanged.
- Touch-appropriate wording in the mobile sheet ("tap" instead of "click", selection-bar instead of Delete-key tips, no keyboard-shortcut table, no reference to a sidebar that phones don't have). Desktop copy is unchanged.
- Accessibility on the controls this phase touched: every colour swatch and colour picker now has a name and a pressed state for screen readers, page reorder arrows and page-selection cells are labelled, and the reorder arrows plus top-bar buttons meet touch-target size on touch devices.

### Notes

- Audit-driven correctness pass, not a feature phase: no redesign, no new UI. Desktop behavior is unchanged apart from the two dead controls now working (pen opacity, highlight options), which is the point of the fix. Object duplication was verified against a real fabric canvas, including multi-selection. Build passes; lint clean.

## Phase M2 — Mobile selection actions & properties sheet (2026-07-20)

### Added

- **Selection context bar** (phones only): selecting any object on the canvas shows a Delete · Duplicate · Done bar above the bottom navigation. This closes the most critical touch gap — previously a selected object could only be deleted with a hardware keyboard.
- **Duplicate**: one tap clones the selected object (or multi-selection) with a small offset.
- **Properties bottom sheet** (phones only): tool properties and the file-tools panel (merge, split, rotate, reorder, delete pages, convert, compress, watermark) now open in a bottom sheet. Picking a file tool from the More menu opens its panel directly — previously the tap changed state with nothing visible.

### Improved

- Selection state now tracks `selection:updated` (switching between objects) and resets on page re-initialization, so selection-dependent UI never goes stale.
- The top-bar properties button on phones opens the new sheet (the old toggle only affected a panel that is hidden on phones).

### Notes

- Desktop UI byte-identical at `md` and up: PropertiesPanel gained a `variant` prop, desktop markup unchanged. All actions route through the existing canvas helpers and the same save/undo path. A "Style" action for live object styling was deliberately deferred: the properties panel edits tool defaults (same as desktop), and live styling is a new feature, not a re-housing. Build passes; lint clean.

## Phase M1 — Mobile chrome: bottom navigation & tool sheets (2026-07-20)

### Added

- **Bottom navigation bar** (phones only): undo/redo plus five thumb-reach slots — Select, Text, Draw, Shapes, More — replacing the sidebar drawer as the mobile tool surface. Core tools are now one tap away instead of two.
- **Bottom sheets** for tool groups: Draw (pen/highlight/eraser), Shapes (rect/circle/ellipse/line/arrow/redact), and More (sign, image, file tools, convert, optimize) open as native-style bottom sheets with large touch targets. Only one sheet can be open at a time (single `activeSheet` state).

### Improved

- **Slimmer mobile top bar**: undo/redo and zoom buttons moved out of the top toolbar on phones (undo/redo → bottom bar; zoom → pinch, double-tap, and kebab presets; the zoom % indicator remains, tap to reset). Hamburger removed.
- Safe-area padding applied to the bottom bar and sheets (iPhone home indicator).

### Notes

- Desktop UI is untouched: sidebar, toolbar layout, panels and all behavior are identical at `md` and up. The new chrome is presentation-only — tools route through the same store actions; canvas/fabric pipeline unchanged, so Phase 2/3 performance and M0 behavior are preserved. Build passes; lint clean.

## Phase M0 — Mobile UX quick wins (2026-07-19)

### Added

- **Drag-to-erase**: the eraser now erases continuously while dragging (finger, stylus, or mouse), instead of tap-by-tap.
- **Double-tap to zoom**: double-tapping the page (touch, select tool) toggles between 100% and 150% zoom — a standard mobile idiom. Pinch-zoom is unaffected.
- **Safe-area support**: `viewport-fit=cover` plus `env(safe-area-inset-bottom)` padding so bottom controls clear the iPhone home indicator and notches.

### Improved

- **Touch target sizes** via the `pointer-coarse` media variant (applies to any touch device, including tablets in desktop layout): larger sidebar tool rows, 44px page-navigation buttons, and a larger, **always-visible** page-delete button (was hover-only — unreachable on touch).
- **Accessibility**: `aria-label` on every icon-only button in the editor chrome (toolbar, page strip, sidebar close); home-page animations now respect `prefers-reduced-motion`; low-contrast `text-white/40` body text raised to `/60`.
- **Home page on small screens**: hero headline no longer overflows narrow viewports (`text-4xl` base, scaling up at `sm`/`md`); background blur orbs are halved in size and blur radius on phones (one hidden entirely) to cut paint cost on low-end devices.

### Notes

- First phase of the approved Mobile UX roadmap (M0–M4). Desktop behavior unchanged except drag-to-erase (deliberate — strictly better and matches every editor). Top-toolbar 44px sizing deferred to M1's chrome restructure (12 controls × 44px cannot fit a 375px row). Build passes; lint clean.

## Phase 3 — Touch support & mobile responsiveness (2026-07-19)

### Added

- **Touch drawing**: the draw/place/erase overlay now uses Pointer Events, so shapes, text, highlights, redaction, and the eraser all work with a finger or stylus, not just a mouse.
- **Pinch-to-zoom**: two-finger pinch on the page area zooms in and out; single-finger drag still scrolls/pans. A back button (added separately) returns to the home page.

### Improved

- Larger fabric selection/resize handles on touch (`touchCornerSize`) so objects can be grabbed and resized with a finger.
- Reduced canvas padding on small screens (`p-2` vs `p-8`) for more usable drawing area; desktop spacing unchanged.

### Notes

- Desktop behavior preserved (Pointer Events are a superset of mouse events; coordinate math unchanged). Eraser stays press-to-erase. Blob URLs, progressive rendering, and scroll view are untouched. Home page marketing layout mobile pass was out of scope (editor-focused). Build passes; lint clean.

## Scroll preview mode (2026-07-19)

### Added

- **Continuous scroll view**: a toolbar toggle switches the editor between single-page editing and a read-only vertical stack of all pages (like a traditional PDF reader). Clicking a page returns to edit mode focused on it. Annotated pages are shown flattened; images lazy-load on scroll.

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
