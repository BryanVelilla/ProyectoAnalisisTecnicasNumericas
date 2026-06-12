import type { DataPoint } from '../types/data.types';

export interface ExponentialFitRow {
  n: number;
  x: number;
  y: number;
  lnY: number;
  x2: number;
  xLnY: number;
}

export interface ExponentialFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  n: number;
  sumX: number;
  sumY: number;
  sumLnY: number;
  sumX2: number;
  sumXLnY: number;
  sumLnY2: number;
  rows: ExponentialFitRow[];
  hasNegativeY: boolean;
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

export const ExponentialFitService = {
  /**
   * Fits y = a·e^(bx) by linearising: ln(y) = ln(a) + bx
   * Requires all yi > 0.
   */
  compute(points: DataPoint[]): ExponentialFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    const hasNegativeY = points.some(p => p.y <= 0);

    let sumX = 0, sumY = 0, sumLnY = 0, sumX2 = 0, sumXLnY = 0, sumLnY2 = 0;
    const rows: ExponentialFitRow[] = points.map((p, i) => {
      const lnY = p.y > 0 ? Math.log(p.y) : NaN;
      sumX    += p.x;
      sumY    += p.y;
      sumLnY  += lnY;
      sumX2   += p.x * p.x;
      sumXLnY += p.x * lnY;
      sumLnY2 += lnY * lnY;
      return { n: i + 1, x: p.x, y: p.y, lnY, x2: p.x * p.x, xLnY: p.x * lnY };
    });

    if (hasNegativeY) {
      return {
        a: NaN, b: NaN, r: NaN, rSquared: NaN,
        equation: 'No aplicable (Yi ≤ 0)',
        n, sumX, sumY, sumLnY, sumX2, sumXLnY, sumLnY2, rows,
        hasNegativeY: true,
      };
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const b = (n * sumXLnY - sumX * sumLnY) / denom;
    const A = (sumLnY - b * sumX) / n;
    const a = Math.exp(A);

    const rNum = n * sumXLnY - sumX * sumLnY;
    const rDen = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumLnY2 - sumLnY * sumLnY)
    );
    const r = rDen === 0 ? 0 : rNum / rDen;

    const sign = b >= 0 ? '+' : '-';
    const equation = `ŷ = ${fmt(a)} · e^(${b >= 0 ? '' : '-'}${fmt(Math.abs(b))}x)`;

    return {
      a, b, r, rSquared: r * r, equation,
      n, sumX, sumY, sumLnY, sumX2, sumXLnY, sumLnY2,
      rows, hasNegativeY: false,
    };
  },

  /** Generate smooth curve points for the chart */
  getFitCurve(result: ExponentialFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad = (xMax - xMin) * 0.08 || 1;
    const step = (xMax - xMin + 2 * pad) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = xMin - pad + i * step;
      const y = result.a * Math.exp(result.b * x);
      return { x, y };
    });
  },
};
