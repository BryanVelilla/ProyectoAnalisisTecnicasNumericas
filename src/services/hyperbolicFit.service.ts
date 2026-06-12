import type { DataPoint } from '../types/data.types';

export interface HyperbolicFitRow {
  n: number;
  x: number;
  y: number;
  invY: number;   // 1/yi
  x2: number;     // xi²
  xInvY: number;  // xi · (1/yi)
}

export interface HyperbolicFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  n: number;
  sumX: number;
  sumInvY: number;
  sumX2: number;
  sumInvY2: number;
  sumXInvY: number;
  rows: HyperbolicFitRow[];
  hasZeroY: boolean;
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

export const HyperbolicFitService = {
  /**
   * Fits y = 1/(a + bx) by linearising: 1/y = a + bx
   * Requires yi ≠ 0 for all points.
   */
  compute(points: DataPoint[]): HyperbolicFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    const hasZeroY = points.some(p => p.y === 0);

    let sumX = 0, sumInvY = 0, sumX2 = 0, sumInvY2 = 0, sumXInvY = 0;
    const rows: HyperbolicFitRow[] = points.map((p, i) => {
      const invY = p.y !== 0 ? 1 / p.y : NaN;
      sumX     += p.x;
      sumInvY  += invY;
      sumX2    += p.x * p.x;
      sumInvY2 += invY * invY;
      sumXInvY += p.x * invY;
      return { n: i + 1, x: p.x, y: p.y, invY, x2: p.x * p.x, xInvY: p.x * invY };
    });

    if (hasZeroY) {
      return {
        a: NaN, b: NaN, r: NaN, rSquared: NaN,
        equation: 'No aplicable (Yi = 0)',
        n, sumX, sumInvY, sumX2, sumInvY2, sumXInvY,
        rows, hasZeroY: true,
      };
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const b = (n * sumXInvY - sumX * sumInvY) / denom;
    const a = (sumInvY - b * sumX) / n;

    const rNum = n * sumXInvY - sumX * sumInvY;
    const rDen = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumInvY2 - sumInvY * sumInvY)
    );
    const r = rDen === 0 ? 0 : rNum / rDen;

    const bSign = b >= 0 ? ' + ' : ' - ';
    const equation = `ŷ = 1 / (${fmt(a)}${bSign}${fmt(Math.abs(b))}x)`;

    return {
      a, b, r, rSquared: r * r, equation,
      n, sumX, sumInvY, sumX2, sumInvY2, sumXInvY,
      rows, hasZeroY: false,
    };
  },

  /** Generate smooth hyperbolic curve, skipping the vertical asymptote at x = -a/b */
  getFitCurve(result: HyperbolicFitResult, points: DataPoint[], count = 200): { x: number; y: number }[] {
    const xs = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.08 || 1;

    // x-value of the vertical asymptote
    const xAsymptote = result.b !== 0 ? -result.a / result.b : Infinity;

    const step = (xMax - xMin + 2 * pad) / (count - 1);
    const curve: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      const x  = xMin - pad + i * step;
      const denom = result.a + result.b * x;
      // Skip points too close to the asymptote to avoid spikes
      if (Math.abs(x - xAsymptote) < (xMax - xMin) * 0.02) continue;
      if (Math.abs(denom) < 1e-10) continue;
      curve.push({ x, y: 1 / denom });
    }
    return curve;
  },
};
