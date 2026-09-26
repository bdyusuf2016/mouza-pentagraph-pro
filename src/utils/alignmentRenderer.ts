import { MouzaLayer, STAGE_WIDTH, STAGE_HEIGHT } from '../types';
import { solveTPS, evalTPS, layerLocalToStage } from './alignment';

export function stagePointForLayerLocal(u: number, v: number, layer: MouzaLayer): { x: number; y: number } {
  if (layer.affine) {
    return {
      x: STAGE_WIDTH / 2 + layer.affine.a * u + layer.affine.b * v + layer.affine.e,
      y: STAGE_HEIGHT / 2 + layer.affine.c * u + layer.affine.d * v + layer.affine.f,
    };
  }
  return layerLocalToStage(u, v, layer);
}

function drawTriangleWarp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  s0: { x: number; y: number },
  s1: { x: number; y: number },
  s2: { x: number; y: number },
  t0: { x: number; y: number },
  t1: { x: number; y: number },
  t2: { x: number; y: number }
) {
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (Math.abs(den) < 1e-8) return;

  const m11 = ((t1.x - t0.x) * (s2.y - s0.y) - (t2.x - t0.x) * (s1.y - s0.y)) / den;
  const m12 = ((t2.x - t0.x) * (s1.x - s0.x) - (t1.x - t0.x) * (s2.x - s0.x)) / den;
  const m21 = ((t1.y - t0.y) * (s2.y - s0.y) - (t2.y - t0.y) * (s1.y - s0.y)) / den;
  const m22 = ((t2.y - t0.y) * (s1.x - s0.x) - (t1.y - t0.y) * (s2.x - s0.x)) / den;
  const e = t0.x - m11 * s0.x - m12 * s0.y;
  const f = t0.y - m21 * s0.x - m22 * s0.y;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(m11, m21, m12, m22, e, f);
  ctx.drawImage(img, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  ctx.restore();
}

export function drawTPSMeshOnCanvas(canvas: HTMLCanvasElement, layer: MouzaLayer): Promise<HTMLCanvasElement> {
  return new Promise(resolve => {
    if (!layer.image || !layer.warp) {
      resolve(canvas);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(canvas);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = layer.filter || 'none';

      const source = layer.warp!.sourcePoints;
      const target = layer.warp!.targetPoints;
      const model = solveTPS(source, target);
      if (!model) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
        return;
      }

      const step = 80;
      const cols = Math.ceil(STAGE_WIDTH / step);
      const rows = Math.ceil(STAGE_HEIGHT / step);
      const pts: { x: number; y: number }[][] = [];

      for (let y = 0; y <= rows; y++) {
        const row = [];
        for (let x = 0; x <= cols; x++) {
          const sx = Math.min(STAGE_WIDTH, x * step);
          const sy = Math.min(STAGE_HEIGHT, y * step);
          row.push(evalTPS(model, { x: sx, y: sy }));
        }
        pts.push(row);
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const sx0 = x * step;
          const sy0 = y * step;
          const sx1 = Math.min(STAGE_WIDTH, (x + 1) * step);
          const sy1 = Math.min(STAGE_HEIGHT, (y + 1) * step);

          const t00 = pts[y][x];
          const t10 = pts[y][x + 1];
          const t01 = pts[y + 1][x];
          const t11 = pts[y + 1][x + 1];

          drawTriangleWarp(ctx, img, { x: sx0, y: sy0 }, { x: sx1, y: sy0 }, { x: sx1, y: sy1 }, t00, t10, t11);
          drawTriangleWarp(ctx, img, { x: sx0, y: sy0 }, { x: sx1, y: sy1 }, { x: sx0, y: sy1 }, t00, t11, t01);
        }
      }
      resolve(canvas);
    };
    img.onerror = () => resolve(canvas);
    img.src = layer.displayImage || layer.image;
  });
}
