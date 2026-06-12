import type { DataPoint } from '../types/data.types';

export interface LogarithmicFitRow {
  n: number;
  x: number;
  y: number;
  lnX: number;
  lnX2: number;
  yLnX: number;
}

export interface LogarithmicFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  n: number;
  sumLnX: number;
  sumY: number;
  sumLnX2: number;
  sumY2: number;
  sumYLnX: number;
  rows: LogarithmicFitRow[];
  hasNonPositiveX: boolean;
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

export const LogarithmicFitService = {
  /**
   * Fits y = a + b·ln(x) by substituting X = ln(x),
   * then applying linear regression on (X, y).
   * Requires xi > 0 for all points.
   */
  compute(points: DataPoint[]): LogarithmicFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    const hasNonPositiveX = points.some(p => p.x <= 0);

    let sumLnX = 0, sumY = 0, sumLnX2 = 0, sumY2 = 0, sumYLnX = 0;
    const rows: LogarithmicFitRow[] = points.map((p, i) => {
      const lnX = p.x > 0 ? Math.log(p.x) : NaN;
      sumLnX  += lnX;
      sumY    += p.y;
      sumLnX2 += lnX * lnX;
      sumY2   += p.y * p.y;
      sumYLnX += p.y * lnX;
      return { n: i + 1, x: p.x, y: p.y, lnX, lnX2: lnX * lnX, yLnX: p.y * lnX };
    });

    if (hasNonPositiveX) {
      return {
        a: NaN, b: NaN, r: NaN, rSquared: NaN,
        equation: 'No aplicable (Xi ≤ 0)',
        n, sumLnX, sumY, sumLnX2, sumY2, sumYLnX,
        rows, hasNonPositiveX: true,
      };
    }

    const denom = n * sumLnX2 - sumLnX * sumLnX;
    if (denom === 0) return null;

    const b = (n * sumYLnX - sumLnX * sumY) / denom;
    const a = (sumY - b * sumLnX) / n;

    const rNum = n * sumYLnX - sumLnX * sumY;
    const rDen = Math.sqrt(
      (n * sumLnX2 - sumLnX * sumLnX) * (n * sumY2 - sumY * sumY)
    );
    const r = rDen === 0 ? 0 : rNum / rDen;

    const bSign = b >= 0 ? ' + ' : ' − ';
    const equation = `ŷ = ${fmt(a)}${bSign}${fmt(Math.abs(b))} · ln(x)`;

    return {
      a, b, r, rSquared: r * r, equation,
      n, sumLnX, sumY, sumLnX2, sumY2, sumYLnX,
      rows, hasNonPositiveX: false,
    };
  },

  /** Generate smooth logarithmic curve for the chart */
  getFitCurve(result: LogarithmicFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs   = points.map(p => p.x).filter(x => x > 0);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.08 || 1;
    const x0   = Math.max(xMin - pad, 1e-6);
    const step = (xMax + pad - x0) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = x0 + i * step;
      return { x, y: result.a + result.b * Math.log(x) };
    });
  },
};
