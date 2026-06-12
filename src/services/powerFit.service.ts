import type { DataPoint } from '../types/data.types';

export interface PowerFitRow {
  n: number;
  x: number;
  y: number;
  lnX: number;
  lnY: number;
  lnX2: number;
  lnXlnY: number;
}

export interface PowerFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  n: number;
  sumLnX: number;
  sumLnY: number;
  sumLnX2: number;
  sumLnY2: number;
  sumLnXlnY: number;
  rows: PowerFitRow[];
  invalidPoints: boolean;
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

export const PowerFitService = {
  /**
   * Fits y = a·x^b (power law) by linearising: ln(y) = ln(a) + b·ln(x)
   * Regresses (ln(xi), ln(yi)) — requires xi > 0 and yi > 0 for all points.
   */
  compute(points: DataPoint[]): PowerFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    const invalidPoints = points.some(p => p.x <= 0 || p.y <= 0);

    let sumLnX = 0, sumLnY = 0, sumLnX2 = 0, sumLnY2 = 0, sumLnXlnY = 0;
    const rows: PowerFitRow[] = points.map((p, i) => {
      const lnX = p.x > 0 ? Math.log(p.x) : NaN;
      const lnY = p.y > 0 ? Math.log(p.y) : NaN;
      sumLnX    += lnX;
      sumLnY    += lnY;
      sumLnX2   += lnX * lnX;
      sumLnY2   += lnY * lnY;
      sumLnXlnY += lnX * lnY;
      return { n: i + 1, x: p.x, y: p.y, lnX, lnY, lnX2: lnX * lnX, lnXlnY: lnX * lnY };
    });

    if (invalidPoints) {
      return {
        a: NaN, b: NaN, r: NaN, rSquared: NaN,
        equation: 'No aplicable (Xi ≤ 0 o Yi ≤ 0)',
        n, sumLnX, sumLnY, sumLnX2, sumLnY2, sumLnXlnY,
        rows, invalidPoints: true,
      };
    }

    const denom = n * sumLnX2 - sumLnX * sumLnX;
    if (denom === 0) return null;

    const b = (n * sumLnXlnY - sumLnX * sumLnY) / denom;
    const A = (sumLnY - b * sumLnX) / n;
    const a = Math.exp(A);

    const rNum = n * sumLnXlnY - sumLnX * sumLnY;
    const rDen = Math.sqrt(
      (n * sumLnX2 - sumLnX * sumLnX) * (n * sumLnY2 - sumLnY * sumLnY)
    );
    const r = rDen === 0 ? 0 : rNum / rDen;

    const bSign = b >= 0 ? '' : '-';
    const equation = `ŷ = ${fmt(a)} · x^(${bSign}${fmt(Math.abs(b))})`;

    return {
      a, b, r, rSquared: r * r, equation,
      n, sumLnX, sumLnY, sumLnX2, sumLnY2, sumLnXlnY,
      rows, invalidPoints: false,
    };
  },

  /** Generate smooth power-law curve for the chart */
  getFitCurve(result: PowerFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs   = points.map(p => p.x).filter(x => x > 0);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.08 || 1;
    const x0   = Math.max(xMin - pad, 1e-6);
    const step = (xMax + pad - x0) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = x0 + i * step;
      return { x, y: result.a * Math.pow(x, result.b) };
    });
  },
};
