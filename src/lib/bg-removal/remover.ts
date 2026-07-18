// ==========================================
// COSMIC PDF - Background Removal Pipeline
// Uses @imgly/background-removal (ONNX ML model, client-side)
// ==========================================

let bgRemovalModule: typeof import('@imgly/background-removal') | null = null;
let modelLoaded = false;

/**
 * Lazily load the background removal module
 * Only called when user clicks the remove background button
 */
async function loadModule() {
  if (bgRemovalModule) return bgRemovalModule;
  bgRemovalModule = await import('@imgly/background-removal');
  return bgRemovalModule;
}

/**
 * Remove background from an image
 * @param imageSource - Can be a Blob, File, or image URL
 * @param onProgress - Optional progress callback
 * @returns Transparent PNG as a Blob
 */
export async function removeBackground(
  imageSource: Blob | string,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const imglyModule = await loadModule();

  if (!modelLoaded) {
    onProgress?.(0, 'Loading AI model (first time only)...');
  }

  const result = await imglyModule.removeBackground(imageSource, {
    progress: (key: string, current: number, total: number) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      onProgress?.(pct, `Processing: ${key}`);
    },
  });

  modelLoaded = true;
  return result;
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
