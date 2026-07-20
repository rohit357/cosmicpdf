'use client';

import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore, type ActiveSheet } from '@/store/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ActiveTool } from '@/types';
import {
  MousePointer2, Type, PenTool, Shapes, MoreHorizontal,
  Undo2, Redo2, Highlighter, Eraser, Square, Circle, Minus,
  MoveRight, EyeOff, Signature, ImagePlus, Image, FileImage,
  Merge, Scissors, RotateCw, ArrowUpDown, Trash2, FileDown,
  Maximize, Stamp,
} from 'lucide-react';

interface ToolItem {
  id: ActiveTool;
  label: string;
  icon: React.ElementType;
}

const drawTools: ToolItem[] = [
  { id: 'pen', label: 'Pen', icon: PenTool },
  { id: 'highlight', label: 'Highlight', icon: Highlighter },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

const shapeTools: ToolItem[] = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'arrow', label: 'Arrow', icon: MoveRight },
  { id: 'redact', label: 'Redact', icon: EyeOff },
];

const moreGroups: { category: string; items: ToolItem[] }[] = [
  {
    category: 'Sign',
    items: [
      { id: 'signature-draw', label: 'Draw Signature', icon: Signature },
      { id: 'signature-type', label: 'Type Signature', icon: PenTool },
      { id: 'signature-upload', label: 'Upload Signature', icon: ImagePlus },
    ],
  },
  {
    category: 'Image',
    items: [
      { id: 'image-stamp', label: 'Image Stamp', icon: Image },
      { id: 'bg-remove', label: 'Remove BG', icon: FileImage },
    ],
  },
  {
    category: 'File Tools',
    items: [
      { id: 'merge', label: 'Merge', icon: Merge },
      { id: 'split', label: 'Split', icon: Scissors },
      { id: 'rotate', label: 'Rotate', icon: RotateCw },
      { id: 'reorder', label: 'Reorder', icon: ArrowUpDown },
      { id: 'delete-pages', label: 'Delete Pages', icon: Trash2 },
    ],
  },
  {
    category: 'Convert & Optimize',
    items: [
      { id: 'img-to-pdf', label: 'Image to PDF', icon: FileImage },
      { id: 'pdf-to-img', label: 'PDF to Image', icon: Image },
      { id: 'compress', label: 'Compress', icon: FileDown },
      { id: 'inflate', label: 'Increase Size', icon: Maximize },
      { id: 'watermark', label: 'Watermark', icon: Stamp },
    ],
  },
];

const drawIds = drawTools.map((t) => t.id);
const shapeIds = shapeTools.map((t) => t.id);
const moreIds = moreGroups.flatMap((g) => g.items.map((t) => t.id));

interface BottomToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Phone-only (<md) bottom navigation: thumb-reach access to the core tools,
 * with the long tail in bottom sheets. Desktop keeps the Sidebar untouched.
 * Sheets are driven by uiStore.activeSheet — a single field, so at most one
 * sheet can ever be open.
 */
export default function BottomToolbar({ onUndo, onRedo }: BottomToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const activeSheet = useUIStore((s) => s.activeSheet);
  const setActiveSheet = useUIStore((s) => s.setActiveSheet);
  const viewMode = useUIStore((s) => s.viewMode);
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);

  // Scroll mode is a read-only preview — no tools apply.
  if (viewMode === 'scroll') return null;

  const selectTool = (id: ActiveTool) => {
    setActiveTool(id);
    setActiveSheet(null);
  };

  const slotClass = (active: boolean) => `
    flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0
    transition-colors
    ${active ? 'text-[#DC2626]' : 'text-[#64748B] active:text-[#0F172A]'}
  `;

  const sheetToolClass = (active: boolean) => `
    flex flex-col items-center justify-center gap-1.5 h-[72px] rounded-xl border text-xs font-medium
    transition-colors
    ${active
      ? 'border-[#DC2626] bg-[#DC2626]/5 text-[#DC2626]'
      : 'border-[#E2E8F0] text-[#334155] active:bg-[#F1F5F9]'
    }
  `;

  const renderSheet = (sheet: Exclude<ActiveSheet, null>, title: string, children: React.ReactNode) => (
    <Sheet open={activeSheet === sheet} onOpenChange={(open) => setActiveSheet(open ? sheet : null)}>
      <SheetContent
        side="bottom"
        className="md:hidden rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] max-h-[70dvh] overflow-y-auto"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-[#0F172A]">{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <nav
        aria-label="Editor tools"
        className="md:hidden h-14 bg-white border-t border-[#E2E8F0] flex items-stretch shrink-0 pb-[env(safe-area-inset-bottom)]"
      >
        <button className={slotClass(false)} onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 className={`w-5 h-5 ${!canUndo ? 'opacity-30' : ''}`} />
        </button>
        <button className={slotClass(false)} onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          <Redo2 className={`w-5 h-5 ${!canRedo ? 'opacity-30' : ''}`} />
        </button>

        <div className="w-px bg-[#E2E8F0] my-2.5" />

        <button className={slotClass(activeTool === 'select')} onClick={() => selectTool('select')} aria-label="Select tool">
          <MousePointer2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Select</span>
        </button>
        <button className={slotClass(activeTool === 'text')} onClick={() => selectTool('text')} aria-label="Text tool">
          <Type className="w-5 h-5" />
          <span className="text-[10px] font-medium">Text</span>
        </button>
        <button
          className={slotClass(drawIds.includes(activeTool))}
          onClick={() => setActiveSheet('draw')}
          aria-label="Drawing tools"
        >
          <PenTool className="w-5 h-5" />
          <span className="text-[10px] font-medium">Draw</span>
        </button>
        <button
          className={slotClass(shapeIds.includes(activeTool))}
          onClick={() => setActiveSheet('shapes')}
          aria-label="Shape tools"
        >
          <Shapes className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shapes</span>
        </button>
        <button
          className={slotClass(moreIds.includes(activeTool))}
          onClick={() => setActiveSheet('more')}
          aria-label="More tools"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {renderSheet('draw', 'Draw', (
        <div className="grid grid-cols-3 gap-2 px-4">
          {drawTools.map((tool) => (
            <button key={tool.id} className={sheetToolClass(activeTool === tool.id)} onClick={() => selectTool(tool.id)}>
              <tool.icon className="w-5 h-5" />
              {tool.label}
            </button>
          ))}
        </div>
      ))}

      {renderSheet('shapes', 'Shapes', (
        <div className="grid grid-cols-3 gap-2 px-4">
          {shapeTools.map((tool) => (
            <button key={tool.id} className={sheetToolClass(activeTool === tool.id)} onClick={() => selectTool(tool.id)}>
              <tool.icon className="w-5 h-5" />
              {tool.label}
            </button>
          ))}
        </div>
      ))}

      {renderSheet('more', 'More tools', (
        <div className="px-4 space-y-4">
          {moreGroups.map((group) => (
            <div key={group.category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                {group.category}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((tool) => (
                  <button key={tool.id} className={sheetToolClass(activeTool === tool.id)} onClick={() => selectTool(tool.id)}>
                    <tool.icon className="w-5 h-5" />
                    <span className="text-center leading-tight">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
