/**
 * Universal safe document reader (PDF, GeoTIFF, and Standard raster images)
 */
import * as pdfjsLib from 'pdfjs-dist';
import * as GeoTIFF from 'geotiff';

// Configure pdf.js worker URL to null or unpkg bundle safely without throwing in browser sandbox
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export async function readBufferAsync(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parsePdfDocument(file: File) {
  const arrayBuffer = await readBufferAsync(file);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableRange: true,
    disableStream: true,
  });
  return await loadingTask.promise;
}

export async function renderPdfPageToDataUrl(pdfDoc: any, pageNum: number): Promise<{ dataUrl: string; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const unscaled = page.getViewport({ scale: 1.0 });
  const maxDim = Math.max(unscaled.width, unscaled.height);

  let renderScale = 1.0;
  if (maxDim > 3500) {
    renderScale = 2800 / maxDim;
  } else if (maxDim < 1200) {
    renderScale = Math.min(3.0, 2400 / maxDim);
  } else {
    renderScale = Math.min(2.0, 2800 / maxDim);
  }

  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create 2d canvas context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    intent: 'display',
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  return { dataUrl, width: canvas.width, height: canvas.height };
}

export async function parseTiffDocument(file: File) {
  const arrayBuffer = await readBufferAsync(file);
  return await GeoTIFF.fromArrayBuffer(arrayBuffer);
}

export async function renderTiffPageToDataUrl(tiffDoc: any, pageNum: number): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await tiffDoc.getImage(pageNum - 1);
  const width = img.getWidth();
  const height = img.getHeight();

  let rgb: Uint8Array;
  try {
    const rawRGB = await img.readRGB({ interleave: true });
    rgb = new Uint8Array(rawRGB.buffer);
  } catch {
    const ras = await img.readRasters({ interleave: true });
    const numPixels = width * height;
    rgb = new Uint8Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      const val = (ras as any)[i] || 0;
      rgb[i * 3] = (ras as any)[i * 3] ?? val;
      rgb[i * 3 + 1] = (ras as any)[i * 3 + 1] ?? (ras as any)[i * 3] ?? val;
      rgb[i * 3 + 2] = (ras as any)[i * 3 + 2] ?? (ras as any)[i * 3] ?? val;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const imgData = ctx.createImageData(width, height);
  const d = imgData.data;

  let s = 0;
  let t = 0;
  const total = width * height;
  for (let i = 0; i < total; i++) {
    d[t] = rgb[s];
    d[t + 1] = rgb[s + 1];
    d[t + 2] = rgb[s + 2];
    d[t + 3] = 255;
    s += 3;
    t += 4;
  }
  ctx.putImageData(imgData, 0, 0);

  const maxDim = Math.max(width, height);
  let finalCanvas = canvas;
  if (maxDim > 3200) {
    const scale = 2800 / maxDim;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = Math.floor(width * scale);
    sCanvas.height = Math.floor(height * scale);
    const sCtx = sCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#ffffff';
      sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);
      sCtx.drawImage(canvas, 0, 0, sCanvas.width, sCanvas.height);
      finalCanvas = sCanvas;
    }
  }

  const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
  return { dataUrl, width: finalCanvas.width, height: finalCanvas.height };
}

export async function renderRasterImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
      let cw = img.naturalWidth;
      let ch = img.naturalHeight;

      if (maxDim > 3600) {
        const scale = 3200 / maxDim;
        cw = Math.floor(img.naturalWidth * scale);
        ch = Math.floor(img.naturalHeight * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas context failure'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(objectUrl);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve({ dataUrl, width: cw, height: ch });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decode failure'));
    };

    img.src = objectUrl;
  });
}
