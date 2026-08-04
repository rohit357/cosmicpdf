'use client';

import { useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { usePdfStore } from '@/store/pdfStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { getActiveCanvas } from '@/lib/canvas/canvasRegistry';
import { Trash2, Copy, Check } from 'lucide-react';

/**
 * Phone-only (<md) action bar shown while a fabric object is selected.
 * Fills the critical touch gap: without a keyboard there was no way to
 * delete a selected object. Docked above the bottom toolbar — no floating
 * positioning math, no collision with fabric handles.
 *
 * All actions run through the existing canvas helpers and the same
 * updateCanvasState + pushSnapshot save path used everywhere else.
 */
export default function SelectionContextBar() {
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex);
  const viewMode = useUIStore((s) => s.viewMode);

  const saveState = useCallback(() => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    usePdfStore.getState().updateCanvasState(currentPageIndex, json);
    useHistoryStore.getState().pushSnapshot(currentPageIndex, json);
  }, [currentPageIndex]);

  const handleDelete = useCallback(async () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const { deleteSelectedObject } = await import('@/lib/canvas/fabricManager');
    deleteSelectedObject(canvas);
    saveState();
  }, [saveState]);

  const handleDuplicate = useCallback(async () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const { duplicateSelectedObject } = await import('@/lib/canvas/fabricManager');
    const duplicated = await duplicateSelectedObject(canvas);
    if (duplicated) saveState();
  }, [saveState]);

  const handleDone = useCallback(() => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    // discardActiveObject fires selection:cleared → selectedElementId resets
  }, []);

  if (!selectedElementId || viewMode === 'scroll') return null;

  const actionClass = `
    flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0
    text-[#334155] active:text-[#0F172A] transition-colors
  `;

  return (
    <div
      aria-label="Selection actions"
      role="toolbar"
      className="md:hidden h-12 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-stretch shrink-0"
    >
      <button className={actionClass} onClick={handleDelete} aria-label="Delete selected object">
        <Trash2 className="w-4 h-4 text-[#DC2626]" />
        <span className="text-[10px] font-medium text-[#DC2626]">Delete</span>
      </button>
      <button className={actionClass} onClick={handleDuplicate} aria-label="Duplicate selected object">
        <Copy className="w-4 h-4" />
        <span className="text-[10px] font-medium">Duplicate</span>
      </button>
      {/* NOTE: no "Style" action yet — PropertiesPanel edits tool defaults, not
          the selected object (same on desktop). Adding live object styling is a
          feature, not a re-housing; deferred rather than shipping a dead button. */}
      <button className={actionClass} onClick={handleDone} aria-label="Deselect">
        <Check className="w-4 h-4" />
        <span className="text-[10px] font-medium">Done</span>
      </button>
    </div>
  );
}
