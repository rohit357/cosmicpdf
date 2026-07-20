'use client';

import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ActiveTool } from '@/types';
import {
  MousePointer2, Type, Highlighter, PenTool, Signature,
  ImagePlus, Square, Circle, Minus, MoveRight,
  EyeOff, Merge, Scissors, RotateCw, ArrowUpDown,
  Trash2, FileImage, Image, FileDown, Maximize, Stamp,
  ChevronDown, Eraser, X
} from 'lucide-react';
import { useState } from 'react';

interface ToolItem {
  id: ActiveTool;
  label: string;
  icon: React.ElementType;
}

interface ToolGroup {
  category: string;
  items: ToolItem[];
}

const toolGroups: ToolGroup[] = [
  {
    category: 'Select',
    items: [
      { id: 'select', label: 'Select', icon: MousePointer2 },
    ],
  },
  {
    category: 'Annotate',
    items: [
      { id: 'text', label: 'Text Box', icon: Type },
      { id: 'highlight', label: 'Highlight', icon: Highlighter },
    ],
  },
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
    category: 'Draw',
    items: [
      { id: 'pen', label: 'Pen', icon: PenTool },
      { id: 'eraser', label: 'Eraser', icon: Eraser },
      { id: 'rectangle', label: 'Rectangle', icon: Square },
      { id: 'circle', label: 'Circle', icon: Circle },
      { id: 'ellipse', label: 'Ellipse', icon: Circle },
      { id: 'line', label: 'Line', icon: Minus },
      { id: 'arrow', label: 'Arrow', icon: MoveRight },
      { id: 'redact', label: 'Redact', icon: EyeOff },
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
    category: 'Convert',
    items: [
      { id: 'img-to-pdf', label: 'Image to PDF', icon: FileImage },
      { id: 'pdf-to-img', label: 'PDF to Image', icon: Image },
    ],
  },
  {
    category: 'Optimize',
    items: [
      { id: 'compress', label: 'Compress', icon: FileDown },
      { id: 'inflate', label: 'Increase Size', icon: Maximize },
      { id: 'watermark', label: 'Watermark', icon: Stamp },
    ],
  },
];

export default function Sidebar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Select': true,
    'Annotate': true,
    'Sign': true,
    'Image': true,
    'Draw': true,
    'File Tools': false,
    'Convert': false,
    'Optimize': false,
  });

  const toggleGroup = (category: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleToolSelect = (toolId: ActiveTool) => {
    setActiveTool(toolId);
    // Auto-close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 md:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="
        fixed md:relative z-40 md:z-auto
        w-[240px] md:w-[220px] h-full
        bg-[#0F172A] flex flex-col overflow-hidden shrink-0
        left-0 top-0
      ">
        {/* Header with close on mobile */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
              <PenTool className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CosmicPDF</span>
          </div>
          <button
            className="md:hidden text-white/50 hover:text-white p-1"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tool Groups */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {toolGroups.map((group) => (
            <div key={group.category} className="mb-0.5">
              {/* Category Header */}
              <button
                onClick={() => toggleGroup(group.category)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] hover:text-[#94A3B8] transition-colors"
              >
                {group.category}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    expandedGroups[group.category] ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {/* Tool Items */}
              {expandedGroups[group.category] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {group.items.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                      <Tooltip key={tool.id}>
                        <TooltipTrigger
                            onClick={() => handleToolSelect(tool.id)}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2 pointer-coarse:py-3 text-sm transition-all duration-150
                              ${isActive
                                ? 'text-white bg-[rgba(220,38,38,0.1)] border-l-2 border-l-[#DC2626]'
                                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B] border-l-2 border-l-transparent'
                              }
                            `}
                          >
                            <tool.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#DC2626]' : ''}`} />
                            <span className="truncate">{tool.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#0F172A] text-white border-[#1E293B]">
                          {tool.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[10px] text-[#475569] text-center">
            Free. Private. Powerful.
          </p>
        </div>
      </aside>
    </>
  );
}
