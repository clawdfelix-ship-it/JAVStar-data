/**
 * 瀏覽器端圖片壓縮（純 Canvas API，零依賴）。
 *
 * 規格（見 docs/specs/2026-11-06-fan-photo-gallery.md §5）：
 * - 最長邊 > 2048 先等比縮細；統一輸出 JPEG
 * - 質量 0.9 起步遞減，目標 ≤ 3MB；再唔得縮到 1600 重試
 * - 兩輪都過唔到就 throw（表單層提示用戶揀第二張）
 * - HEIC 等 createImageBitmap 唔支援嘅格式會直接 throw，由表單提示轉存 JPEG/PNG
 */

export const FAN_PHOTO_TARGET_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_DIM = 2048;
const FALLBACK_DIM = 1600;
const QUALITIES = [0.9, 0.85, 0.8, 0.72, 0.65] as const;

export interface CompressedFanPhoto {
  blob: Blob;
  width: number;
  height: number;
  fileSize: number;
  originalSize: number;
  quality: number;
  maxDimUsed: number;
}

export class FanPhotoCompressError extends Error {
  constructor(
    message: string,
    public code: 'UNSUPPORTED_FORMAT' | 'TOO_LARGE' | 'INVALID_IMAGE'
  ) {
    super(message);
    this.name = 'FanPhotoCompressError';
  }
}

function drawToCanvas(
  bitmap: ImageBitmap,
  maxDim: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FanPhotoCompressError('無法建立 canvas', 'INVALID_IMAGE');
  // 白底色，避免 JPEG 壓縮透明區域變黑
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new FanPhotoCompressError('圖片編碼失敗', 'INVALID_IMAGE'))),
      'image/jpeg',
      quality
    );
  });
}

export async function compressFanPhoto(file: File): Promise<CompressedFanPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new FanPhotoCompressError(
      '唔支援呢個圖片格式（iPhone HEIC 請先轉存 JPEG/PNG）',
      'UNSUPPORTED_FORMAT'
    );
  }

  try {
    let lastBlob: Blob | null = null;
    let lastQuality: number = QUALITIES[0];
    for (const maxDim of [MAX_DIM, FALLBACK_DIM]) {
      const { canvas, width, height } = drawToCanvas(bitmap, maxDim);
      for (const quality of QUALITIES) {
        const blob = await canvasToJpeg(canvas, quality);
        lastBlob = blob;
        lastQuality = quality;
        if (blob.size <= FAN_PHOTO_TARGET_BYTES) {
          return {
            blob,
            width,
            height,
            fileSize: blob.size,
            originalSize: file.size,
            quality,
            maxDimUsed: maxDim,
          };
        }
      }
    }
    // 兩輪（2048→1600、質量降到 0.65）仍超標：理論上極罕見，交表單擋下
    void lastBlob;
    throw new FanPhotoCompressError('圖片過大，請揀另一張或較細嘅相', 'TOO_LARGE');
  } finally {
    bitmap.close?.();
  }
}

export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
