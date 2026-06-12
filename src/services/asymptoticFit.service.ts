import type { DataPoint } from '../types/data.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AsymptoticFitRow {
  n: number;
  x: number;
  y: number;
  yHat: number;
  residual: number;
  residual2: number;
}

export interface AsymptoticIterRow {
  iter: number;
  a: number;
  b: number;
  sse: number;
  da: number;
  db: number;
}

export interface AsymptoticFitResult {
  a: number;
  b: number;
  r: number;
  rSquared: number;
  equation: string;
  sse: number;
  n: number;
  converged: boolean;
  iterations: AsymptoticIterRow[];
  rows: AsymptoticFitRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

/** Evaluate the model and partial derivatives at a single point. */
function evalModel(x: number, a: number, b: number) {
  const eBx = Math.exp(-b * x);
  return {
    f:  a * (1 - eBx),    // y_hat
    Ja: 1 - eBx,           // ∂f/∂a
    Jb: a * x * eBx,       // ∂f/∂b
  };
}

/** Compute SSE for given a, b. */
function computeSSE(points: DataPoint[], a: number, b: number): number {
  return points.reduce((s, p) => {
    const r = p.y - evalModel(p.x, a, b).f;
    return s + r * r;
  }, 0);
}

// ─── Initial parameter estimation ─────────────────────────────────────────────

function initialParams(points: DataPoint[]): { a0: number; b0: number } {
  const yMax = Math.max(...points.map(p => p.y));
  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const xRange = xMax - xMin || 1;

  const a0 = yMax * 1.15;

  // Estimate b from the mid-range point using a ≈ a0
  const xMid = (xMin + xMax) / 2;
  const yMid = points.reduce((best, p) =>
    Math.abs(p.x - xMid) < Math.abs(best.x - xMid) ? p : best
  , points[0]);

  const ratio = 1 - yMid.y / a0;
  const b0 = ratio > 0 && ratio < 1 && xMid > 0
    ? -Math.log(ratio) / xMid
    : 2 / xRange;

  return { a0, b0: Math.max(b0, 0.001) };
}

// ─── Gauss-Newton solver ───────────────────────────────────────────────────────

const MAX_ITER = 200;
const TOL      = 1e-10;

export const AsymptoticFitService = {
  /**
   * Fits y = a(1 - e^{-bx}) using the Gauss-Newton iterative method.
   * Works for any xi, yi — no logarithmic transformation needed.
   */
  compute(points: DataPoint[]): AsymptoticFitResult | null {
    const n = points.length;
    if (n < 2) return null;

    let { a0: a, b0: b } = initialParams(points);

    const iterations: AsymptoticIterRow[] = [];
    let converged = false;

    for (let iter = 1; iter <= MAX_ITER; iter++) {
      // Accumulate J^T J and J^T r
      let JtJ00 = 0, JtJ01 = 0, JtJ11 = 0;
      let Jtr0  = 0, Jtr1  = 0;

      for (const p of points) {
        const { f, Ja, Jb } = evalModel(p.x, a, b);
        const r = p.y - f;
        JtJ00 += Ja * Ja;
        JtJ01 += Ja * Jb;
        JtJ11 += Jb * Jb;
        Jtr0  += Ja * r;
        Jtr1  += Jb * r;
      }

      // Add Levenberg-Marquardt damping for stability (λ = 1e-4 * trace)
      const lambda = 1e-4 * (JtJ00 + JtJ11);
      const A00 = JtJ00 + lambda;
      const A11 = JtJ11 + lambda;

      // Solve 2×2 system via Cramer's rule
      const det = A00 * A11 - JtJ01 * JtJ01;
      if (Math.abs(det) < 1e-14) break;

      const da = (A11 * Jtr0 - JtJ01 * Jtr1) / det;
      const db = (A00 * Jtr1 - JtJ01 * Jtr0) / det;

      a += da;
      b += db;

      const sse = computeSSE(points, a, b);
      iterations.push({ iter, a, b, sse, da, db });

      if (Math.sqrt(da * da + db * db) < TOL) {
        converged = true;
        break;
      }
    }

    // Build result rows
    const yMean = points.reduce((s, p) => s + p.y, 0) / n;
    let ssTot = 0, ssRes = 0;
    const rows: AsymptoticFitRow[] = points.map((p, i) => {
      const yHat = evalModel(p.x, a, b).f;
      const residual  = p.y - yHat;
      const residual2 = residual * residual;
      ssTot += (p.y - yMean) ** 2;
      ssRes += residual2;
      return { n: i + 1, x: p.x, y: p.y, yHat, residual, residual2 };
    });

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const sse      = ssRes;

    // Pearson r between y and ŷ
    const yHats   = rows.map(r => r.yHat);
    const yHatMean = yHats.reduce((s, v) => s + v, 0) / n;
    let cov = 0, stdY = 0, stdYh = 0;
    for (let i = 0; i < n; i++) {
      cov   += (points[i].y - yMean) * (yHats[i] - yHatMean);
      stdY  += (points[i].y - yMean) ** 2;
      stdYh += (yHats[i]   - yHatMean) ** 2;
    }
    const r = (stdY > 0 && stdYh > 0) ? cov / Math.sqrt(stdY * stdYh) : 0;

    const bSign = b >= 0 ? '' : '-';
    const equation = `ŷ = ${fmt(a)} · (1 − e^(${b >= 0 ? '-' : '+'}${fmt(Math.abs(b))}x))`;

    return { a, b, r, rSquared, equation, sse, n, converged, iterations, rows };
  },

  /** Generate smooth asymptotic curve for the chart */
  getFitCurve(result: AsymptoticFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs  = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.08 || 1;
    const step = (xMax - xMin + 2 * pad) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = xMin - pad + i * step;
      return { x, y: evalModel(x, result.a, result.b).f };
    });
  },
};
