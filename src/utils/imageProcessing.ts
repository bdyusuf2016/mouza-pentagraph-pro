import { MouzaLayer, MapExtractionConfig } from '../types';

export function hexToRgb(hex: string) {
  const h = (hex || '#ef4444').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

export function mapStyleKey(layer: MouzaLayer): string {
  const s = layer.mapExtraction || ({} as MapExtractionConfig);
  return [layer.image, s.mode, s.color, s.threshold, s.strength, s.smooth, s.preserveColor].join('|');
}

/**
 * Clean line & white background extractor.
 * Converts paper / off-white scans into transparent overlays with high-contrast lines.
 */
export async function extractMapImage(layer: MouzaLayer): Promise<string | null> {
  if (!layer.image || !layer.mapExtraction || layer.mapExtraction.mode === 'original') {
    return layer.image;
  }
  const key = mapStyleKey(layer);
  if (layer.displayImage && layer.displayImageKey === key) {
    return layer.displayImage;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(layer.image);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      const t = layer.mapExtraction.threshold !== undefined && layer.mapExtraction.threshold !== null
        ? Number(layer.mapExtraction.threshold)
        : 235;
      const strength = layer.mapExtraction.strength !== undefined && layer.mapExtraction.strength !== null
        ? Number(layer.mapExtraction.strength)
        : 1.2;
      const smooth = layer.mapExtraction.smooth !== undefined && layer.mapExtraction.smooth !== null
        ? Number(layer.mapExtraction.smooth)
        : 1.0;
      const col = hexToRgb(layer.mapExtraction.color || layer.color || '#ef4444');
      const preserve = !!layer.mapExtraction.preserveColor;
      const isTransparentMode = layer.mapExtraction.mode === 'transparent';

      // Standard ITU-R BT.601 / Rec. 709 luminance weights
      const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

      // Smooth anti-aliased edge transition window (scaled by smooth factor)
      // When t is small/0, window adapts; for normal paper thresholds, window is ~12-24 luminance levels
      const edgeWindow = Math.max(2, Math.min(30, Math.round((t * 0.08 + 6) * smooth)));

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const a = px[i + 3];
        if (a === 0) continue;

        const L = lum(r, g, b);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max - min;

        // Foreground opacity calculation (0 = transparent background, 1 = solid crisp line)
        let fg = 0;

        if (L >= t) {
          // Paper background - make transparent
          fg = 0;
        } else if (L <= t - edgeWindow) {
          // Line core - fully solid, crisp, high-contrast
          fg = 1;
        } else {
          // Smooth anti-aliased border edge: Cubic Hermite / Smoothstep transition
          const u = (t - L) / edgeWindow;
          fg = u * u * (3 - 2 * u);
        }

        // Paper grain / noise suppression near background threshold if saturation is low
        if (L > t - (edgeWindow * 0.45) && sat < 22) {
          fg *= 0.4;
        }

        // Apply strength factor for line density & sharpness
        if (fg > 0 && strength !== 1) {
          fg = Math.pow(fg, 1 / Math.max(0.2, strength));
        }

        const targetAlpha = Math.round(a * Math.min(1, Math.max(0, fg)));
        px[i + 3] = targetAlpha;

        if (targetAlpha === 0) continue;

        if (isTransparentMode && preserve) {
          // Preserve original colors while enhancing line depth and contrast
          // De-haze faded ink so dag numbers and boundaries are sharp and dark
          if (t > 0) {
            const contrastRatio = Math.min(1, Math.max(0, L / t));
            const darken = 0.65 + 0.35 * Math.pow(contrastRatio, 0.6);
            px[i] = Math.round(r * darken);
            px[i + 1] = Math.round(g * darken);
            px[i + 2] = Math.round(b * darken);
          }
        } else {
          // Colorized line (Clean single color)
          px[i] = col.r;
          px[i + 1] = col.g;
          px[i + 2] = col.b;
        }
      }

      ctx.putImageData(d, 0, 0);
      const dataUrl = c.toDataURL('image/png');
      resolve(dataUrl);
    };
    img.onerror = () => resolve(layer.image);
    img.src = layer.image!;
  });
}
