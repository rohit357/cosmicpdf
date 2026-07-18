'use client';
/* eslint-disable @next/next/no-img-element -- previews are local data URLs; next/image not applicable */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { PenTool, Type, Upload, Trash2, Download, Loader2 } from 'lucide-react';

const cursiveFonts = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Satisfy', family: "'Satisfy', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
];

const penColors = ['#0F172A', '#DC2626', '#2563EB', '#16A34A', '#7C3AED'];

interface SignaturePadProps {
  onPlace: (dataUrl: string) => void;
}

export default function SignaturePad({ onPlace }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0F172A');
  const [penWidth, setPenWidth] = useState(2);
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(cursiveFonts[0]);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgMessage, setBgMessage] = useState('');
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 240;
    canvas.height = 120;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, 90);
    ctx.lineTo(230, 90);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x: number, y: number;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }

    lastPosRef.current = { x, y };
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x: number, y: number;
    if ('touches' in e) {
      e.preventDefault();
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, 90);
    ctx.lineTo(230, 90);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasDrawing(false);
  };

  const placeDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Create transparent version
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(canvas, 0, 0);

    // Make white pixels transparent
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
        data[i + 3] = 0;
      }
    }
    tempCtx.putImageData(imageData, 0, 0);
    onPlace(tempCanvas.toDataURL('image/png'));
  };

  const placeTypedSignature = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `36px ${selectedFont.family}`;
    ctx.fillStyle = penColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 20, 50);
    onPlace(canvas.toDataURL('image/png'));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsRemovingBg(true);
    setBgProgress(0);
    setBgMessage('Loading AI model...');

    // Small delay to allow React to flush the loader UI before CPU heavy WASM loads
    setTimeout(async () => {
      try {
        const { removeBackground, blobToDataURL } = await import('@/lib/bg-removal/remover');
        const bgRemovedBlob = await removeBackground(file, (progress, message) => {
          setBgProgress(progress);
          setBgMessage(message);
        });
        const dataUrl = await blobToDataURL(bgRemovedBlob);
        setUploadedSignature(dataUrl);
      } catch (error) {
        console.error('BG removal failed, falling back to original image', error);
        const reader = new FileReader();
        reader.onload = () => setUploadedSignature(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsRemovingBg(false);
        e.target.value = ''; // Reset input
      }
    }, 50);
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-1">Signature</h3>
      <Separator className="bg-white/10 mb-4" />

      <Tabs defaultValue="draw">
        <TabsList className="w-full bg-[#0F172A] mb-4">
          <TabsTrigger value="draw" className="flex-1 text-xs data-[state=active]:bg-[#DC2626] data-[state=active]:text-white">
            <PenTool className="w-3 h-3 mr-1" /> Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="flex-1 text-xs data-[state=active]:bg-[#DC2626] data-[state=active]:text-white">
            <Type className="w-3 h-3 mr-1" /> Type
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex-1 text-xs data-[state=active]:bg-[#DC2626] data-[state=active]:text-white">
            <Upload className="w-3 h-3 mr-1" /> Upload
          </TabsTrigger>
        </TabsList>

        {/* Draw Tab */}
        <TabsContent value="draw" className="space-y-4">
          <canvas
            ref={canvasRef}
            className="w-full aspect-[2/1] rounded-lg border border-white/10 cursor-crosshair bg-white touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          <div>
            <label className="text-xs font-medium text-[#94A3B8] mb-2 block">Pen Color</label>
            <div className="flex gap-2">
              {penColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === color ? 'border-[#DC2626] scale-110' : 'border-white/10'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#94A3B8] mb-2 block">
              Pen Width: {penWidth}px
            </label>
            <Slider
              value={[penWidth]}
              onValueChange={(val) => setPenWidth(Array.isArray(val) ? val[0] : val)}
              min={1}
              max={8}
              step={1}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              className="text-[#94A3B8] hover:text-white"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
            <Button
              size="sm"
              onClick={placeDrawnSignature}
              disabled={!hasDrawing}
              className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              Place Signature
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const a = document.createElement('a');
              a.href = canvas.toDataURL('image/png');
              a.download = 'signature.png';
              a.click();
            }}
            className="w-full text-[#94A3B8] hover:text-white text-xs"
          >
            <Download className="w-3 h-3 mr-1" /> Save as PNG
          </Button>
        </TabsContent>

        {/* Type Tab */}
        <TabsContent value="type" className="space-y-4">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your name"
            className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
          />

          <div className="space-y-2">
            {cursiveFonts.map((font) => (
              <button
                key={font.name}
                onClick={() => setSelectedFont(font)}
                className={`w-full text-left px-3 py-2 rounded-lg text-lg transition-all ${selectedFont.name === font.name
                    ? 'bg-[rgba(220,38,38,0.1)] border border-[#DC2626]/30 text-white'
                    : 'text-[#94A3B8] hover:bg-[#0F172A] hover:text-white'
                  }`}
                style={{ fontFamily: font.family }}
              >
                {typedName || font.name}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-[#94A3B8] mb-2 block">Color</label>
            <div className="flex gap-2">
              {penColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === color ? 'border-[#DC2626] scale-110' : 'border-white/10'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={placeTypedSignature}
            disabled={!typedName.trim()}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            Place Signature
          </Button>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          {!uploadedSignature && !isRemovingBg ? (
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#DC2626]/30 transition-colors">
              <Upload className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8] mb-2">Upload signature image</p>
              <p className="text-xs text-[#475569]">Auto-removes background</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUpload}
                className="hidden"
                id="sig-upload"
              />
              <label htmlFor="sig-upload">
                <span className="inline-flex items-center mt-3 text-sm text-[#DC2626] hover:text-[#B91C1C] cursor-pointer font-medium">
                  Choose File
                </span>
              </label>
            </div>
          ) : isRemovingBg ? (
            <div className="border-2 border-white/5 rounded-xl p-8 text-center bg-[#0F172A] space-y-4">
              <Loader2 className="w-8 h-8 text-[#DC2626] mx-auto animate-spin" />
              <p className="text-sm text-white">{bgMessage || 'Processing...'}</p>
              <div className="w-full bg-[#1E293B] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#DC2626] h-1.5 transition-all duration-300"
                  style={{ width: `${bgProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-white">
                <div className="p-4 flex items-center justify-center min-h-[120px]">
                  <img
                    src={uploadedSignature!}
                    alt="Preview"
                    className="max-h-[100px] w-auto mix-blend-multiply"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedSignature(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
                <Button
                  onClick={() => onPlace(uploadedSignature!)}
                  className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                >
                  Place Signature
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
