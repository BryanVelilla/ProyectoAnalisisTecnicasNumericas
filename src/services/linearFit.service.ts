import type { DataPoint } from '../types/data.types';

export interface LinearFitRow {
  n: number;
  x: number;
  y: number;
  x2: number;
  xy: number;
}

export interface LinearFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  n: number;
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  rows: LinearFitRow[];
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

export const LinearFitService = {
  compute(points: DataPoint[]): LinearFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const rows: LinearFitRow[] = points.map((p, i) => {
      sumX  += p.x;
      sumY  += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
      sumY2 += p.y * p.y;
      return { n: i + 1, x: p.x, y: p.y, x2: p.x * p.x, xy: p.x * p.y };
    });

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const b = (n * sumXY - sumX * sumY) / denom;
    const a = (sumY - b * sumX) / n;

    const rNum = n * sumXY - sumX * sumY;
    const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = rDen === 0 ? 0 : rNum / rDen;

    const sign = b >= 0 ? ' + ' : ' - ';
    const equation = `ŷ = ${fmt(a)}${sign}${fmt(Math.abs(b))}x`;

    return { a, b, r, rSquared: r * r, equation, n, sumX, sumY, sumX2, sumY2, sumXY, rows };
  },

  /** Generate n points spanning [xMin-pad, xMax+pad] for the fitted line */
  getFitLine(result: LinearFitResult, points: DataPoint[], count = 80): { x: number; y: number }[] {
    const xs = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad = (xMax - xMin) * 0.08 || 1;
    const step = (xMax - xMin + 2 * pad) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = xMin - pad + i * step;
      return { x, y: result.a + result.b * x };
    });
  },
};
