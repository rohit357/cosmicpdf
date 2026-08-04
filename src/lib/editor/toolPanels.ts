import type { ActiveTool } from '@/types';

/**
 * Which surface owns a tool's options UI.
 *
 * These lists were duplicated across PropertiesPanel, BottomToolbar and the
 * editor page, and drifted (a phone tap could open an empty properties sheet).
 * Single source of truth — no behavior of its own.
 */

/** Signature tools: options live in the SignaturePad overlay panel. */
export const SIGNATURE_TOOLS: ActiveTool[] = [
  'signature-draw',
  'signature-type',
  'signature-upload',
];

/** Image tools: options live in the ImageStamp overlay panel. */
export const IMAGE_TOOLS: ActiveTool[] = ['image-stamp', 'bg-remove'];

/** Tools rendered by the editor page's own overlay panels, not PropertiesPanel. */
export const OVERLAY_PANEL_TOOLS: ActiveTool[] = [...SIGNATURE_TOOLS, ...IMAGE_TOOLS];

/**
 * Tools whose entire UI is the FileToolsPanel inside PropertiesPanel. On phones
 * that panel lives in the 'properties' bottom sheet, so picking one of these
 * must open the sheet — otherwise the tap does nothing visible.
 */
export const FILE_PANEL_TOOLS: ActiveTool[] = [
  'merge',
  'split',
  'rotate',
  'reorder',
  'delete-pages',
  'img-to-pdf',
  'pdf-to-img',
  'compress',
  'inflate',
  'watermark',
];

/** False when PropertiesPanel renders nothing for the tool (overlay owns it). */
export function hasPropertiesContent(tool: ActiveTool): boolean {
  return !OVERLAY_PANEL_TOOLS.includes(tool);
}
