import type { DataPoint } from '../types/data.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogisticFitRow {
  n: number;
  x: number;
  y: number;
  yHat: number;
  residual: number;
  residual2: number;
}

export interface LogisticIterRow {
  iter: number;
  L: number;
  k: number;
  x0: number;
  sse: number;
  norm: number; // ||(ΔL, Δk, Δx0)||
}

export interface LogisticFitResult {
  L: number;    // carrying capacity
  k: number;    // growth rate
  x0: number;   // inflection point
  r: number;
  rSquared: number;
  equation: string;
  sse: number;
  n: number;
  converged: boolean;
  iterations: LogisticIterRow[];
  rows: LogisticFitRow[];
}

// ─── Model evaluation ─────────────────────────────────────────────────────────

function evalModel(x: number, L: number, k: number, x0: number) {
  const s  = Math.exp(-k * (x - x0));
  const d  = 1 + s;
  return {
    f:   L / d,
    JL:  1 / d,
    Jk:  L * s * (x - x0) / (d * d),
    Jx0: -L * k * s / (d * d),
  };
}

function computeSSE(pts: DataPoint[], L: number, k: number, x0: number): number {
  return pts.reduce((acc, p) => {
    const r = p.y - evalModel(p.x, L, k, x0).f;
    return acc + r * r;
  }, 0);
}

// ─── Initial parameter estimation ─────────────────────────────────────────────

function initialParams(pts: DataPoint[]): { L0: number; k0: number; x00: number } {
  const yMax  = Math.max(...pts.map(p => p.y));
  const yMin  = Math.min(...pts.map(p => p.y));
  const xMin  = Math.min(...pts.map(p => p.x));
  const xMax  = Math.max(...pts.map(p => p.x));
  const xRange = xMax - xMin || 1;

  const L0 = yMax * 1.1;

  // x₀ ≈ x where y is closest to L0/2
  const halfL = L0 / 2;
  const x00 = pts.reduce((best, p) =>
    Math.abs(p.y - halfL) < Math.abs(best.y - halfL) ? p : best
  , pts[0]).x;

  // k ≈ 4 * (yRange / xRange) / L0  (slope at inflection = kL/4)
  const k0 = Math.max(4 * (yMax - yMin) / (xRange * L0), 0.01);

  return { L0, k0, x00 };
}

// ─── Gauss-Newton (3-parameter) ───────────────────────────────────────────────

const MAX_ITER = 300;
const TOL      = 1e-10;

export const LogisticFitService = {
  /**
   * Fits y = L / (1 + e^{-k(x-x₀)}) using Gauss-Newton with
   * Levenberg-Marquardt damping for robust convergence.
   */
  compute(points: DataPoint[]): LogisticFitResult | null {
    const n = points.length;
    if (n < 3) return null;   // need ≥ 3 pts for 3 parameters

    let { L0: L, k0: k, x00: x0 } = initialParams(points);

    const iterations: LogisticIterRow[] = [];
    let converged = false;

    for (let iter = 1; iter <= MAX_ITER; iter++) {
      // Build 3×3 J^T J and 3×1 J^T r
      let A = [[0,0,0],[0,0,0],[0,0,0]];
      let g = [0, 0, 0];

      for (const p of points) {
        const { f, JL, Jk, Jx0 } = evalModel(p.x, L, k, x0);
        const r   = p.y - f;
        const J   = [JL, Jk, Jx0];

        for (let i = 0; i < 3; i++) {
          g[i] += J[i] * r;
          for (let j = 0; j < 3; j++) A[i][j] += J[i] * J[j];
        }
      }

      // Levenberg-Marquardt damping  λ = 1e-4 * trace(A)
      const lambda = 1e-4 * (A[0][0] + A[1][1] + A[2][2]);
      for (let i = 0; i < 3; i++) A[i][i] += lambda;

      // Solve 3×3 via Gaussian elimination
      const delta = solve3x3(A, g);
      if (!delta) break;

      L  += delta[0];
      k  += delta[1];
      x0 += delta[2];

      const sse  = computeSSE(points, L, k, x0);
      const norm = Math.sqrt(delta[0]**2 + delta[1]**2 + delta[2]**2);
      iterations.push({ iter, L, k, x0, sse, norm });

      if (norm < TOL) { converged = true; break; }
    }

    // Build result rows
    const yMean = points.reduce((s, p) => s + p.y, 0) / n;
    let ssTot = 0, ssRes = 0;
    const rows: LogisticFitRow[] = points.map((p, i) => {
      const yHat     = evalModel(p.x, L, k, x0).f;
      const residual = p.y - yHat;
      ssTot += (p.y - yMean) ** 2;
      ssRes += residual * residual;
      return { n: i + 1, x: p.x, y: p.y, yHat, residual, residual2: residual * residual };
    });

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Pearson r(y, ŷ)
    const yHats    = rows.map(r => r.yHat);
    const yHatMean = yHats.reduce((s, v) => s + v, 0) / n;
    let cov = 0, stdY = 0, stdYh = 0;
    for (let i = 0; i < n; i++) {
      cov   += (points[i].y - yMean)  * (yHats[i] - yHatMean);
      stdY  += (points[i].y - yMean)  ** 2;
      stdYh += (yHats[i]   - yHatMean) ** 2;
    }
    const r = (stdY > 0 && stdYh > 0) ? cov / Math.sqrt(stdY * stdYh) : 0;

    const equation = buildEquation(L, k, x0);

    return { L, k, x0, r, rSquared, equation, sse: ssRes, n, converged, iterations, rows };
  },

  getFitCurve(result: LogisticFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs   = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.10 || 1;
    const step = (xMax - xMin + 2 * pad) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const x = xMin - pad + i * step;
      return { x, y: evalModel(x, result.L, result.k, result.x0).f };
    });
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

function buildEquation(L: number, k: number, x0: number): string {
  const kAbs  = fmt(Math.abs(k));
  const kSign = k >= 0 ? '-' : '+';
  const x0fmt = fmt(Math.abs(x0));
  const x0Sign = x0 >= 0 ? '-' : '+';
  return `ŷ = ${fmt(L)} / (1 + e^(${kSign}${kAbs}·(x ${x0Sign} ${x0fmt})))`;
}

/** Solve Ax = b for a 3×3 system via Gaussian elimination with partial pivoting. */
function solve3x3(A: number[][], b: number[]): number[] | null {
  const n = 3;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-14) return null;

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }

  const x = [0, 0, 0];
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}
