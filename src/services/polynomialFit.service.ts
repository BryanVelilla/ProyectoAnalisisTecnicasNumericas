import type { DataPoint } from '../types/data.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PolynomialFitRow {
  n:         number;
  x:         number;
  y:         number;
  xPowers:   number[];   // [x¹, x², ..., xᵏ]
  xPowersY:  number[];   // [xy, x²y, ..., xᵏy]
  yHat:      number;
  residual:  number;
  residual2: number;
}

export interface PolynomialFitResult {
  degree:       number;
  coefficients: number[];   // [a₀, a₁, ..., aₖ]
  r:            number;
  rSquared:     number;
  equation:     string;
  n:            number;
  sse:          number;
  ssTot:        number;
  ecm:          number;
  xSums:        number[];   // [n, Σx, Σx², ..., Σx^(2k)]
  xySums:       number[];   // [Σy, Σxy, ..., Σxᵏy]
  XtX:          number[][];
  Xty:          number[];
  rows:         PolynomialFitRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}

function buildEquation(coeffs: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    if (Math.abs(c) < 1e-10 && i > 0) continue;
    if (i === 0) {
      parts.push(fmt(c));
    } else {
      const sign = c >= 0 ? ' + ' : ' − ';
      const absC = fmt(Math.abs(c));
      parts.push(`${sign}${absC}${i === 1 ? 'x' : `x\u{207}${i}`}`);
    }
  }
  // Replace unicode exponents with readable ones
  const raw = `ŷ = ${parts.join('')}`;
  const expMap: Record<string, string> = { '\u{207}2': '²', '\u{207}3': '³', '\u{207}4': '⁴', '\u{207}5': '⁵' };
  return raw.replace(/x\u{207}(\d)/gu, (_, d) => `x${expMap[`\u{207}${d}`] ?? `^${d}`}`);
}

// ─── Gaussian elimination with partial pivoting ────────────────────────────────

function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const sz = A.length;
  const m  = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < sz; col++) {
    let maxRow = col;
    for (let r = col + 1; r < sz; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[maxRow][col])) maxRow = r;
    }
    if (maxRow !== col) [m[col], m[maxRow]] = [m[maxRow], m[col]];
    if (Math.abs(m[col][col]) < 1e-14) return null;

    for (let r = col + 1; r < sz; r++) {
      const factor = m[r][col] / m[col][col];
      for (let k = col; k <= sz; k++) m[r][k] -= factor * m[col][k];
    }
  }

  const x = new Array(sz).fill(0);
  for (let i = sz - 1; i >= 0; i--) {
    x[i] = m[i][sz];
    for (let j = i + 1; j < sz; j++) x[i] -= m[i][j] * x[j];
    x[i] /= m[i][i];
  }
  return x;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PolynomialFitService = {
  compute(points: DataPoint[], degree: number): PolynomialFitResult | null {
    const n = points.length;
    const k = Math.max(1, Math.floor(degree));
    if (n < k + 1) return null;

    // xSums[j] = Σ xᵢʲ  (j = 0 … 2k)
    const xSums = new Array(2 * k + 1).fill(0) as number[];
    xSums[0] = n;
    for (const p of points) {
      let xi = 1;
      for (let j = 1; j <= 2 * k; j++) {
        xi *= p.x;
        xSums[j] += xi;
      }
    }

    // xySums[j] = Σ xᵢʲ · yᵢ  (j = 0 … k)
    const xySums = new Array(k + 1).fill(0) as number[];
    for (const p of points) {
      xySums[0] += p.y;
      let xi = 1;
      for (let j = 1; j <= k; j++) {
        xi *= p.x;
        xySums[j] += xi * p.y;
      }
    }

    // Build XᵀX (k+1 × k+1)
    const XtX: number[][] = [];
    for (let i = 0; i <= k; i++) {
      const row: number[] = [];
      for (let j = 0; j <= k; j++) row.push(xSums[i + j]);
      XtX.push(row);
    }
    const Xty: number[] = [...xySums];

    const coefficients = gaussianElimination(XtX.map(r => [...r]), [...Xty]);
    if (!coefficients) return null;

    const meanY = points.reduce((s, p) => s + p.y, 0) / n;

    const rows: PolynomialFitRow[] = points.map((p, idx) => {
      const xPowers:  number[] = [];
      const xPowersY: number[] = [];
      let xi = p.x;
      for (let j = 1; j <= k; j++) {
        xPowers.push(xi);
        xPowersY.push(xi * p.y);
        xi *= p.x;
      }

      let yHat = coefficients[0];
      let xj   = p.x;
      for (let j = 1; j <= k; j++) {
        yHat += coefficients[j] * xj;
        xj   *= p.x;
      }

      const residual = p.y - yHat;
      return { n: idx + 1, x: p.x, y: p.y, xPowers, xPowersY, yHat, residual, residual2: residual * residual };
    });

    const sse    = rows.reduce((s, r) => s + r.residual2, 0);
    const ssTot  = rows.reduce((s, r) => s + (r.y - meanY) ** 2, 0);
    const rSquared = ssTot > 0 ? Math.max(0, 1 - sse / ssTot) : 1;
    const r        = Math.sqrt(rSquared);

    const equation = buildEquation(coefficients);

    return { degree: k, coefficients, r, rSquared, equation, n, sse, ssTot, ecm: sse / n, xSums, xySums, XtX, Xty, rows };
  },

  /** Generate a smooth fit curve for chart display */
  getFitCurve(result: PolynomialFitResult, points: DataPoint[], count = 120): { x: number; y: number }[] {
    const xs   = points.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const pad  = (xMax - xMin) * 0.08 || 1;
    return Array.from({ length: count }, (_, i) => {
      const x = xMin - pad + (xMax - xMin + 2 * pad) * i / (count - 1);
      const y = result.coefficients.reduce((s, c, k) => s + c * Math.pow(x, k), 0);
      return { x, y };
    });
  },
};
