'use client';

import { useEditorStore } from '@/store/editorStore';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline, Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import FileToolsPanel from './FileToolsPanel';

const fontFamilies = [
  'Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Open Sans',
  'Lato', 'Poppins', 'Raleway', 'Merriweather', 'Source Sans Pro',
];

const presetColors = [
  '#0F172A', '#DC2626', '#2563EB', '#16A34A', '#D97706',
  '#7C3AED', '#0891B2', '#DB2777', '#64748B', '#FFFFFF',
];

export default function PropertiesPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const textOptions = useEditorStore((s) => s.textOptions);
  const drawingOptions = useEditorStore((s) => s.drawingOptions);
  const shapeOptions = useEditorStore((s) => s.shapeOptions);
  const setTextOptions = useEditorStore((s) => s.setTextOptions);
  const setDrawingOptions = useEditorStore((s) => s.setDrawingOptions);
  const setShapeOptions = useEditorStore((s) => s.setShapeOptions);

  const renderTextProperties = () => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Font Family
        </label>
        <select
          value={textOptions.fontFamily}
          onChange={(e) => setTextOptions({ fontFamily: e.target.value })}
          className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
        >
          {fontFamilies.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Font Size: {textOptions.fontSize}px
        </label>
        <Slider
          value={[textOptions.fontSize]}
          onValueChange={(val) => setTextOptions({ fontSize: Array.isArray(val) ? val[0] : val })}
          min={8}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Style
        </label>
        <div className="flex gap-1">
          <Button
            variant={textOptions.fontWeight === 'bold' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${textOptions.fontWeight === 'bold' ? 'bg-[#DC2626] text-white' : 'text-[#94A3B8] hover:text-white'}`}
            onClick={() =>
              setTextOptions({
                fontWeight: textOptions.fontWeight === 'bold' ? 'normal' : 'bold',
              })
            }
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={textOptions.fontStyle === 'italic' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${textOptions.fontStyle === 'italic' ? 'bg-[#DC2626] text-white' : 'text-[#94A3B8] hover:text-white'}`}
            onClick={() =>
              setTextOptions({
                fontStyle: textOptions.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={textOptions.underline ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${textOptions.underline ? 'bg-[#DC2626] text-white' : 'text-[#94A3B8] hover:text-white'}`}
            onClick={() => setTextOptions({ underline: !textOptions.underline })}
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Color
        </label>
        <div className="grid grid-cols-5 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => setTextOptions({ fill: color })}
              className={`w-7 h-7 rounded-md border-2 transition-all ${textOptions.fill === color
                  ? 'border-[#DC2626] scale-110'
                  : 'border-white/10 hover:border-white/30'
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="color"
            value={textOptions.fill}
            onChange={(e) => setTextOptions({ fill: e.target.value })}
            className="w-8 h-6 cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs text-[#64748B]">{textOptions.fill}</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Opacity: {Math.round(textOptions.opacity * 100)}%
        </label>
        <Slider
          value={[textOptions.opacity * 100]}
          onValueChange={(val) => setTextOptions({ opacity: (Array.isArray(val) ? val[0] : val) / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );

  const renderDrawingProperties = () => (
    <div className="space-y-5">
      {/* Brush Type Selector */}
      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Brush Type
        </label>
        <div className="flex gap-1">
          {([
            { type: 'pencil' as const, label: 'Pencil', icon: '✏️' },
            { type: 'spray' as const, label: 'Spray', icon: '🎨' },
            { type: 'circle' as const, label: 'Circle', icon: '⭕' },
          ]).map((brush) => (
            <button
              key={brush.type}
              onClick={() => setDrawingOptions({ brushType: brush.type })}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs transition-all ${
                drawingOptions.brushType === brush.type
                  ? 'bg-[#DC2626]/20 text-[#DC2626] ring-1 ring-[#DC2626]/50'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{brush.icon}</span>
              <span>{brush.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Brush Preview */}
      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Preview
        </label>
        <div className="flex items-center justify-center h-12 bg-[#0F172A] rounded-lg border border-white/5">
          <div
            className="rounded-full transition-all duration-150"
            style={{
              width: drawingOptions.width,
              height: drawingOptions.width,
              backgroundColor: drawingOptions.color,
              opacity: drawingOptions.opacity,
              boxShadow: drawingOptions.brushType === 'spray'
                ? `0 0 ${drawingOptions.width * 2}px ${drawingOptions.color}`
                : 'none',
            }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Color
        </label>
        <div className="grid grid-cols-5 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => setDrawingOptions({ color })}
              className={`w-7 h-7 rounded-md border-2 transition-all ${drawingOptions.color === color
                  ? 'border-[#DC2626] scale-110'
                  : 'border-white/10 hover:border-white/30'
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-[#64748B]" />
          <input
            type="color"
            value={drawingOptions.color}
            onChange={(e) => setDrawingOptions({ color: e.target.value })}
            className="w-8 h-6 cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs text-[#64748B]">{drawingOptions.color}</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Brush Width: {drawingOptions.width}px
        </label>
        <Slider
          value={[drawingOptions.width]}
          onValueChange={(val) => setDrawingOptions({ width: Array.isArray(val) ? val[0] : val })}
          min={1}
          max={30}
          step={1}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Opacity: {Math.round(drawingOptions.opacity * 100)}%
        </label>
        <Slider
          value={[drawingOptions.opacity * 100]}
          onValueChange={(val) => setDrawingOptions({ opacity: (Array.isArray(val) ? val[0] : val) / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );

  const renderShapeProperties = () => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Fill Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shapeOptions.fill === 'transparent' ? '#ffffff' : shapeOptions.fill}
            onChange={(e) => setShapeOptions({ fill: e.target.value })}
            className="w-8 h-6 cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs text-[#64748B]">{shapeOptions.fill}</span>
          <Button
            variant="ghost"
            className="h-6 px-2 text-xs text-[#94A3B8] hover:text-white"
            onClick={() => setShapeOptions({ fill: 'transparent' })}
          >
            No Fill
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Stroke Color
        </label>
        <div className="grid grid-cols-5 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => setShapeOptions({ stroke: color })}
              className={`w-7 h-7 rounded-md border-2 transition-all ${shapeOptions.stroke === color
                  ? 'border-[#DC2626] scale-110'
                  : 'border-white/10 hover:border-white/30'
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Stroke Style Selector */}
      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Stroke Style
        </label>
        <div className="flex gap-1">
          {([
            { type: 'solid' as const, label: 'Solid' },
            { type: 'dashed' as const, label: 'Dashed' },
            { type: 'dotted' as const, label: 'Dotted' },
          ]).map((style) => (
            <button
              key={style.type}
              onClick={() => setShapeOptions({ strokeDash: style.type })}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-xs transition-all ${
                shapeOptions.strokeDash === style.type
                  ? 'bg-[#DC2626]/20 text-[#DC2626] ring-1 ring-[#DC2626]/50'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Visual line preview */}
              <svg width="40" height="6" viewBox="0 0 40 6" className="overflow-visible">
                <line
                  x1="0" y1="3" x2="40" y2="3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={
                    style.type === 'dashed' ? '8,6'
                    : style.type === 'dotted' ? '2,4'
                    : undefined
                  }
                />
              </svg>
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Stroke Width: {shapeOptions.strokeWidth}px
        </label>
        <Slider
          value={[shapeOptions.strokeWidth]}
          onValueChange={(val) => setShapeOptions({ strokeWidth: Array.isArray(val) ? val[0] : val })}
          min={1}
          max={20}
          step={1}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2 block">
          Opacity: {Math.round(shapeOptions.opacity * 100)}%
        </label>
        <Slider
          value={[shapeOptions.opacity * 100]}
          onValueChange={(val) => setShapeOptions({ opacity: (Array.isArray(val) ? val[0] : val) / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );

  const renderRedactProperties = () => (
    <div className="space-y-4">
      <div className="p-4 bg-[#0F172A] rounded-lg border border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
            <span className="text-lg">🔒</span>
          </div>
          <span className="text-sm font-medium text-white">Redact Content</span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Click anywhere on the PDF to place a black redaction box. Resize and position it to cover sensitive content. The redacted area will be permanently blacked out on export.
        </p>
      </div>
      <div className="text-xs text-[#475569] text-center">
        Tip: Use <kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded text-[#94A3B8] border border-white/10">Select</kbd> tool to resize after placing
      </div>
    </div>
  );

  const getToolTitle = () => {
    switch (activeTool) {
      case 'text': return 'Text Properties';
      case 'highlight': return 'Highlight';
      case 'pen': return 'Pen Tool';
      case 'eraser': return 'Eraser';
      case 'rectangle': case 'circle': case 'ellipse': case 'line': case 'arrow': return 'Shape Properties';
      case 'redact': return 'Redact Tool';
      case 'signature-draw': case 'signature-type': case 'signature-upload': return 'Signature';
      case 'image-stamp': return 'Image Stamp';
      case 'bg-remove': return 'Background Removal';
      case 'merge': return 'Merge PDF';
      case 'split': return 'Split PDF';
      case 'rotate': return 'Rotate Pages';
      case 'reorder': return 'Reorder Pages';
      case 'delete-pages': return 'Delete Pages';
      case 'compress': return 'Compress PDF';
      case 'inflate': return 'Increase Size';
      case 'watermark': return 'Watermark PDF';
      case 'img-to-pdf': return 'Image to PDF';
      case 'pdf-to-img': return 'PDF to Images';
      default: return 'Properties';
    }
  };

  const renderContent = () => {
    switch (activeTool) {
      case 'text':
      case 'highlight':
        return renderTextProperties();
      case 'pen':
        return renderDrawingProperties();
      case 'redact':
        return renderRedactProperties();
      case 'eraser':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-[#0F172A] rounded-lg border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🧹</span>
                </div>
                <span className="text-sm font-medium text-white">Click to Erase</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Click on any object on the canvas to remove it. Works on shapes, text, drawings, images, and signatures.
              </p>
            </div>
            <div className="text-xs text-[#475569] text-center">
              Tip: You can also select an object and press <kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded text-[#94A3B8] border border-white/10">Delete</kbd>
            </div>
          </div>
        );
      case 'rectangle':
      case 'circle':
      case 'ellipse':
      case 'line':
      case 'arrow':
        return renderShapeProperties();
      // Signature & Image tools are handled by editor page's right panel
      case 'signature-draw':
      case 'signature-type':
      case 'signature-upload':
      case 'image-stamp':
      case 'bg-remove':
        return null; // Editor page renders SignaturePad/ImageStamp directly
      case 'merge':
      case 'split':
      case 'rotate':
      case 'reorder':
      case 'delete-pages':
      case 'compress':
      case 'inflate':
      case 'watermark':
      case 'img-to-pdf':
      case 'pdf-to-img':
        return <FileToolsPanel />;
      default:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-[#0F172A] rounded-lg border border-white/5">
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Select a tool from the sidebar to see its properties and options here.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Keyboard Shortcuts</p>
              <div className="space-y-1.5 text-xs text-[#94A3B8]">
                <div className="flex justify-between"><span>Undo</span><kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded border border-white/10">Ctrl+Z</kbd></div>
                <div className="flex justify-between"><span>Redo</span><kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded border border-white/10">Ctrl+Y</kbd></div>
                <div className="flex justify-between"><span>Export PDF</span><kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded border border-white/10">Ctrl+S</kbd></div>
                <div className="flex justify-between"><span>Delete Object</span><kbd className="px-1.5 py-0.5 bg-[#0F172A] rounded border border-white/10">Del</kbd></div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Don't render this panel if signature/image tools are active (editor page handles those)
  const isHandledByEditorPanel = ['signature-draw', 'signature-type', 'signature-upload', 'image-stamp', 'bg-remove'].includes(activeTool);
  if (isHandledByEditorPanel) return null;

  return (
    <aside className="w-[250px] bg-[#1E293B] h-full overflow-y-auto shrink-0 border-l border-white/5">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-1">{getToolTitle()}</h3>
        <Separator className="bg-white/10 mb-4" />
        {renderContent()}
      </div>
    </aside>
  );
}
