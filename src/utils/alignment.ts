import { STAGE_WIDTH, STAGE_HEIGHT, MouzaLayer, ControlPoint } from '../types';

/**
 * Solve linear system M * x = b via Gaussian elimination with partial pivoting
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const d = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map(r => r[n]);
}

/**
 * Least-squares fit (X^T X) * p = X^T y
 */
export function leastSquares(design: number[][], values: number[]): number[] | null {
  const m = design[0].length;
  const A = Array.from({ length: m }, () => Array(m).fill(0));
  const b = Array(m).fill(0);
  for (let i = 0; i < design.length; i++) {
    for (let j = 0; j < m; j++) {
      b[j] += design[i][j] * values[i];
      for (let k = 0; k < m; k++) {
        A[j][k] += design[i][j] * design[i][k];
      }
    }
  }
  return solveLinearSystem(A, b);
}

export function calcResidualMetrics(residuals: number[]) {
  if (!residuals.length) return { rmsError: 0, meanError: 0, maxError: 0, maxIndex: -1 };
  const meanError = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const rmsError = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / residuals.length);
  let maxError = -1;
  let maxIndex = -1;
  residuals.forEach((v, i) => {
    if (v > maxError) {
      maxError = v;
      maxIndex = i;
    }
  });
  return { rmsError, meanError, maxError, maxIndex };
}

/**
 * Solves Similarity transform (uniform scale, rotation, translation)
 */
export function solveSimilarityTransform(
  refTargetPts: { x: number; y: number }[],
  cmpLocalPts: { u: number; v: number }[]
) {
  const N = Math.min(refTargetPts.length, cmpLocalPts.length);
  if (N < 2) return null;
  let sx = 0, sy = 0, su = 0, sv = 0;
  for (let i = 0; i < N; i++) {
    sx += refTargetPts[i].x;
    sy += refTargetPts[i].y;
    su += cmpLocalPts[i].u;
    sv += cmpLocalPts[i].v;
  }
  const mx = sx / N, my = sy / N, mu = su / N, mv = sv / N;
  let A = 0, B = 0, D = 0;
  for (let i = 0; i < N; i++) {
    const u = cmpLocalPts[i].u - mu;
    const v = cmpLocalPts[i].v - mv;
    const X = refTargetPts[i].x - mx;
    const Y = refTargetPts[i].y - my;
    A += u * X + v * Y;
    B += u * Y - v * X;
    D += u * u + v * v;
  }
  if (D < 1e-10) return null;
  const scale = Math.hypot(A, B) / D;
  const angle = Math.atan2(B, A);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tx = mx - scale * (mu * c - mv * s);
  const ty = my - scale * (mu * s + mv * c);
  const residuals = refTargetPts.map((p, i) => {
    const q = cmpLocalPts[i];
    const x = tx + scale * (q.u * c - q.v * s);
    const y = ty + scale * (q.u * s + q.v * c);
    return Math.hypot(x - p.x, y - p.y);
  });
  return {
    type: 'similarity' as const,
    scale,
    rotation: (angle * 180) / Math.PI,
    x: tx - STAGE_WIDTH / 2,
    y: ty - STAGE_HEIGHT / 2,
    residuals,
    ...calcResidualMetrics(residuals),
  };
}

/**
 * Solves 2D Affine transform (different x/y scale, shear, rotation, translation)
 */
export function solveAffineTransform(
  refTargetPts: { x: number; y: number }[],
  cmpLocalPts: { u: number; v: number }[]
) {
  const N = Math.min(refTargetPts.length, cmpLocalPts.length);
  if (N < 3) return null;
  const X = cmpLocalPts.map(p => [p.u, p.v, 1]);
  const vx = refTargetPts.map(p => p.x);
  const vy = refTargetPts.map(p => p.y);
  const px = leastSquares(X, vx);
  const py = leastSquares(X, vy);
  if (!px || !py) return null;
  const residuals: number[] = [];
  for (let i = 0; i < N; i++) {
    const q = cmpLocalPts[i];
    const x = px[0] * q.u + px[1] * q.v + px[2];
    const y = py[0] * q.u + py[1] * q.v + py[2];
    residuals.push(Math.hypot(x - refTargetPts[i].x, y - refTargetPts[i].y));
  }
  const a = px[0], b = px[1], c = py[0], d = py[1], tx = px[2], ty = py[2];
  return {
    type: 'affine' as const,
    a,
    b,
    c,
    d,
    e: tx - STAGE_WIDTH / 2,
    f: ty - STAGE_HEIGHT / 2,
    residuals,
    scaleX: Math.hypot(a, c),
    scaleY: Math.hypot(b, d),
    rotation: (Math.atan2(c, a) * 180) / Math.PI,
    ...calcResidualMetrics(residuals),
  };
}

/**
 * Thin Plate Spline (TPS) Kernel
 */
export function tpsKernel(r: number): number {
  if (r < 1e-9) return 0;
  return r * r * Math.log(r * r + 1e-12);
}

export function solveTPS(points: { x: number; y: number }[], targets: { x: number; y: number }[]) {
  const n = points.length;
  const m = n + 3;
  if (n < 3) return null;
  const A = Array.from({ length: m }, () => Array(m).fill(0));
  const bx = Array(m).fill(0);
  const by = Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      A[i][j] = tpsKernel(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
    A[i][n] = 1;
    A[i][n + 1] = points[i].x;
    A[i][n + 2] = points[i].y;
    A[n][i] = 1;
    A[n + 1][i] = points[i].x;
    A[n + 2][i] = points[i].y;
    bx[i] = targets[i].x;
    by[i] = targets[i].y;
  }
  const wx = solveLinearSystem(A, bx);
  const wy = solveLinearSystem(A, by);
  if (!wx || !wy) return null;
  return { points, wx, wy };
}

export function evalTPS(model: { points: { x: number; y: number }[]; wx: number[]; wy: number[] }, p: { x: number; y: number }) {
  const n = model.points.length;
  let x = model.wx[n] + model.wx[n + 1] * p.x + model.wx[n + 2] * p.y;
  let y = model.wy[n] + model.wy[n + 1] * p.x + model.wy[n + 2] * p.y;
  for (let i = 0; i < n; i++) {
    const k = tpsKernel(Math.hypot(p.x - model.points[i].x, p.y - model.points[i].y));
    x += model.wx[i] * k;
    y += model.wy[i] * k;
  }
  return { x, y };
}

/**
 * Coordinate mapping helpers between canvas stage and individual layers
 */
export function layerLocalToStage(u: number, v: number, layer: MouzaLayer): { x: number; y: number } {
  if (layer.affine) {
    return {
      x: STAGE_WIDTH / 2 + layer.affine.a * u + layer.affine.b * v + layer.affine.e,
      y: STAGE_HEIGHT / 2 + layer.affine.c * u + layer.affine.d * v + layer.affine.f,
    };
  }
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const scaledU = u * layer.scale;
  const scaledV = v * layer.scale;

  const stageX = STAGE_WIDTH / 2 + layer.x + (scaledU * cos - scaledV * sin);
  const stageY = STAGE_HEIGHT / 2 + layer.y + (scaledU * sin + scaledV * cos);

  return { x: stageX, y: stageY };
}

export function stageToLayerLocal(stageX: number, stageY: number, layer: MouzaLayer): { u: number; v: number } {
  if (layer.affine) {
    const { a, b, c, d, e, f } = layer.affine;
    const det = a * d - b * c;
    if (Math.abs(det) > 1e-12) {
      const X = stageX - STAGE_WIDTH / 2 - e;
      const Y = stageY - STAGE_HEIGHT / 2 - f;
      return {
        u: (d * X - b * Y) / det,
        v: (-c * X + a * Y) / det,
      };
    }
  }
  const centerX = STAGE_WIDTH / 2 + layer.x;
  const centerY = STAGE_HEIGHT / 2 + layer.y;
  const dx = stageX - centerX;
  const dy = stageY - centerY;

  const rad = (-layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const u = (dx * cos - dy * sin) / (layer.scale || 1);
  const v = (dx * sin + dy * cos) / (layer.scale || 1);

  return { u, v };
}

export function collectMatchedControlPoints(refLayer: MouzaLayer, cmpLayer: MouzaLayer) {
  const refMap = new Map(refLayer.points.map(p => [p.label, p]));
  const pairs: { label: string; ref: { x: number; y: number }; cmp: { u: number; v: number } }[] = [];
  for (const cp of cmpLayer.points) {
    const rp = refMap.get(cp.label);
    if (!rp) continue;
    pairs.push({
      label: cp.label,
      ref: layerLocalToStage(rp.u, rp.v, refLayer),
      cmp: { u: cp.u, v: cp.v },
    });
  }
  return pairs;
}

/**
 * Aligns/levels an active layer to a target angle (e.g. 0° Horizontal or 90° Vertical)
 * based on a dimension line, pivoting smoothly around the midpoint of that line.
 */
export function alignLayerToDimensionAngle(
  layer: MouzaLayer,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  targetAngleDeg: number = 0
): { rotation: number; x: number; y: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const currentLineAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const deltaRot = targetAngleDeg - currentLineAngle;
  let newRot = (layer.rotation + deltaRot) % 360;
  if (newRot > 180) newRot -= 360;
  if (newRot < -180) newRot += 360;

  // Keep the midpoint of the dimension line pinned at its current stage coordinates
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const localMid = stageToLayerLocal(midX, midY, layer);

  // With newRot, calculate where the layer origin (x, y) needs to be
  const rad = (newRot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const scale = layer.scale || 1;

  const newLayerX = midX - STAGE_WIDTH / 2 - (localMid.u * scale * cos - localMid.v * scale * sin);
  const newLayerY = midY - STAGE_HEIGHT / 2 - (localMid.u * scale * sin + localMid.v * scale * cos);

  return {
    rotation: Number(newRot.toFixed(2)),
    x: Math.round(newLayerX),
    y: Math.round(newLayerY),
  };
}

/**
 * Superimposes/aligns comparison layer to reference layer using two dimension lines
 * (2-point Helmert similarity transform: uniform scale, rotation, and translation).
 */
export function alignLayerByTwoDimensionLines(
  refLine: { p1: { x: number; y: number }; p2: { x: number; y: number } },
  cmpLine: { p1: { x: number; y: number }; p2: { x: number; y: number } },
  cmpLayer: MouzaLayer
) {
  const u1 = stageToLayerLocal(cmpLine.p1.x, cmpLine.p1.y, cmpLayer);
  const u2 = stageToLayerLocal(cmpLine.p2.x, cmpLine.p2.y, cmpLayer);

  const sol = solveSimilarityTransform(
    [refLine.p1, refLine.p2],
    [u1, u2]
  );
  return sol;
}

