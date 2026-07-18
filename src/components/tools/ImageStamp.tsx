'use client';
/* eslint-disable @next/next/no-img-element -- previews are local data URLs; next/image not applicable */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Sparkles, ImagePlus, Loader2 } from 'lucide-react';
import { useToastStore } from '@/components/ui/ToastProvider';

interface ImageStampProps {
  onPlace: (dataUrl: string) => void;
}

export default function ImageStamp({ onPlace }: ImageStampProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgMessage, setBgMessage] = useState('');
  const [opacity, setOpacity] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 100 * 1024 * 1024) {
        addToast({ type: 'error', message: 'File too large. Maximum is 100MB.' });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => setImageDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    },
    [addToast]
  );

  const handleRemoveBg = useCallback(async () => {
    if (!imageDataUrl) return;

    setIsRemovingBg(true);
    setBgProgress(0);
    setBgMessage('Loading AI model...');

    try {
      const { removeBackground, blobToDataURL } = await import('@/lib/bg-removal/remover');

      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const resultBlob = await removeBackground(blob, (progress, message) => {
        setBgProgress(progress);
        setBgMessage(message);
      });

      const resultDataUrl = await blobToDataURL(resultBlob);
      setImageDataUrl(resultDataUrl);
      addToast({ type: 'success', message: 'Background removed!' });
    } catch (error) {
      console.error('BG removal failed:', error);
      addToast({ type: 'error', message: 'Background removal failed.' });
    } finally {
      setIsRemovingBg(false);
    }
  }, [imageDataUrl, addToast]);

  const handlePlace = () => {
    if (imageDataUrl) {
      onPlace(imageDataUrl);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-1">Image Stamp</h3>
      <Separator className="bg-white/10 mb-4" />

      {/* Upload area */}
      {!imageDataUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#DC2626]/30 transition-colors cursor-pointer"
        >
          <ImagePlus className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
          <p className="text-sm text-[#94A3B8] mb-1">Upload an image</p>
          <p className="text-xs text-[#475569]">PNG, JPG, WEBP up to 100MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0F172A]">
            <div
              className="checkerboard p-2"
              style={{
                backgroundImage: `linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)`,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            >
              <img
                src={imageDataUrl}
                alt="Preview"
                className="w-full h-auto max-h-[200px] object-contain"
                style={{ opacity }}
              />
            </div>
          </div>

          {/* BG Removal */}
          <Button
            onClick={handleRemoveBg}
            disabled={isRemovingBg}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#DC2626] hover:opacity-90 text-white"
          >
            {isRemovingBg ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {bgMessage}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Remove Background
              </>
            )}
          </Button>

          {isRemovingBg && (
            <div className="w-full bg-[#0F172A] rounded-full h-1.5">
              <div
                className="bg-[#DC2626] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${bgProgress}%` }}
              />
            </div>
          )}

          {/* Opacity */}
          <div>
            <label className="text-xs font-medium text-[#94A3B8] mb-2 block">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <Slider
              value={[opacity * 100]}
              onValueChange={(val) => setOpacity((Array.isArray(val) ? val[0] : val) / 100)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setImageDataUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-[#94A3B8] hover:text-white"
            >
              Change
            </Button>
            <Button
              onClick={handlePlace}
              className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              Place on PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
