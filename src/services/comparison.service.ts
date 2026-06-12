import type { DataPoint } from '../types/data.types';
import { LinearFitService }      from './linearFit.service';
import { ExponentialFitService } from './exponentialFit.service';
import { GeometricFitService }   from './geometricFit.service';
import { HyperbolicFitService }  from './hyperbolicFit.service';
import { AsymptoticFitService }  from './asymptoticFit.service';
import { LogisticFitService }    from './logisticFit.service';
import { LogarithmicFitService } from './logarithmicFit.service';
import { PowerFitService }       from './powerFit.service';
import { PolynomialFitService }  from './polynomialFit.service';

// ─── Visual styles (color + dash) per method ──────────────────────────────────

export const METHOD_STYLES: Record<string, { color: string; dash: string }> = {
  linear:      { color: '#3b82f6', dash: '' },
  exponential: { color: '#7c3aed', dash: '7 3' },
  geometric:   { color: '#16a34a', dash: '4 4' },
  hyperbolic:  { color: '#d97706', dash: '2 2' },
  asymptotic:  { color: '#0891b2', dash: '8 2 2 2' },
  logistic:    { color: '#be185d', dash: '6 2' },
  logarithmic: { color: '#4f46e5', dash: '10 3' },
  power:       { color: '#ea580c', dash: '4 2 8 2' },
  polynomial:  { color: '#c026d3', dash: '5 3 1 3' },
};

export const ROUTES_BY_ID: Record<string, string> = {
  linear:      '/metodos/lineal',
  exponential: '/metodos/exponencial',
  geometric:   '/metodos/geometrico',
  hyperbolic:  '/metodos/hiperbolico',
  asymptotic:  '/metodos/exponencial-asintotico',
  logistic:    '/metodos/logistico',
  logarithmic: '/metodos/logaritmico',
  power:       '/metodos/potencial',
  polynomial:  '/metodos/polinomial',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MethodCompResult {
  id: string;
  name: string;
  formula: string;
  color: string;
  dash: string;
  route: string;
  valid: boolean;
  invalidReason?: string;
  equation: string;
  params: string;
  r: number;
  rSquared: number;
  ecm: number;
  fitCurve: { x: number; y: number }[];
  rank: number;
}

export interface ComparisonResult {
  ranked: MethodCompResult[];
  dataPoints: { x: number; y: number }[];
  validCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ecm(pts: DataPoint[], predict: (x: number) => number): number {
  if (pts.length === 0) return 0;
  const sse = pts.reduce((s, p) => {
    const e = p.y - predict(p.x);
    return s + e * e;
  }, 0);
  return sse / pts.length;
}

function fmtN(v: number): string {
  if (isNaN(v) || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(5)).toString();
  return v.toExponential(3);
}

function invalid(
  id: string, name: string, formula: string, reason: string
): MethodCompResult {
  return {
    id, name, formula, route: ROUTES_BY_ID[id],
    ...METHOD_STYLES[id], valid: false, invalidReason: reason,
    equation: 'No aplicable', params: '—',
    r: NaN, rSquared: -Infinity, ecm: Infinity,
    fitCurve: [], rank: 0,
  };
}

// ─── Main service ─────────────────────────────────────────────────────────────

export const ComparisonService = {
  compute(points: DataPoint[]): ComparisonResult | null {
    if (points.length < 2) return null;

    const dataPoints = points.map(p => ({ x: p.x, y: p.y }));
    const raw: MethodCompResult[] = [];

    // ── 1. Linear ──────────────────────────────────────────────────────────
    const lr = LinearFitService.compute(points);
    if (lr) {
      raw.push({
        id: 'linear', name: 'Ajuste Lineal', formula: 'y = a + bx',
        route: ROUTES_BY_ID.linear, ...METHOD_STYLES.linear, valid: true,
        equation: lr.equation,
        params: `a = ${fmtN(lr.a)},  b = ${fmtN(lr.b)}`,
        r: lr.r, rSquared: lr.rSquared,
        ecm: ecm(points, x => lr.a + lr.b * x),
        fitCurve: LinearFitService.getFitLine(lr, points),
        rank: 0,
      });
    }

    // ── 2. Exponential ─────────────────────────────────────────────────────
    const er = ExponentialFitService.compute(points);
    if (er) {
      if (er.hasNegativeY) {
        raw.push(invalid('exponential', 'Ajuste Exponencial', 'y = ae^(bx)', 'Yi ≤ 0'));
      } else {
        raw.push({
          id: 'exponential', name: 'Ajuste Exponencial', formula: 'y = ae^(bx)',
          route: ROUTES_BY_ID.exponential, ...METHOD_STYLES.exponential, valid: true,
          equation: er.equation,
          params: `a = ${fmtN(er.a)},  b = ${fmtN(er.b)}`,
          r: er.r, rSquared: er.rSquared,
          ecm: ecm(points, x => er.a * Math.exp(er.b * x)),
          fitCurve: ExponentialFitService.getFitCurve(er, points),
          rank: 0,
        });
      }
    }

    // ── 3. Geometric ───────────────────────────────────────────────────────
    const gr = GeometricFitService.compute(points);
    if (gr) {
      if (gr.invalidPoints) {
        raw.push(invalid('geometric', 'Ajuste Geométrico', 'y = ax^b', 'Xi ≤ 0 o Yi ≤ 0'));
      } else {
        raw.push({
          id: 'geometric', name: 'Ajuste Geométrico', formula: 'y = ax^b',
          route: ROUTES_BY_ID.geometric, ...METHOD_STYLES.geometric, valid: true,
          equation: gr.equation,
          params: `a = ${fmtN(gr.a)},  b = ${fmtN(gr.b)}`,
          r: gr.r, rSquared: gr.rSquared,
          ecm: ecm(points.filter(p => p.x > 0), x => gr.a * Math.pow(x, gr.b)),
          fitCurve: GeometricFitService.getFitCurve(gr, points),
          rank: 0,
        });
      }
    }

    // ── 4. Hyperbolic ──────────────────────────────────────────────────────
    const hr = HyperbolicFitService.compute(points);
    if (hr) {
      if (hr.hasZeroY) {
        raw.push(invalid('hyperbolic', 'Ajuste Hiperbólico', 'y = 1/(a+bx)', 'Yi = 0'));
      } else {
        raw.push({
          id: 'hyperbolic', name: 'Ajuste Hiperbólico', formula: 'y = 1/(a+bx)',
          route: ROUTES_BY_ID.hyperbolic, ...METHOD_STYLES.hyperbolic, valid: true,
          equation: hr.equation,
          params: `a = ${fmtN(hr.a)},  b = ${fmtN(hr.b)}`,
          r: hr.r, rSquared: hr.rSquared,
          ecm: ecm(points, x => {
            const d = hr.a + hr.b * x;
            return d !== 0 ? 1 / d : 0;
          }),
          fitCurve: HyperbolicFitService.getFitCurve(hr, points),
          rank: 0,
        });
      }
    }

    // ── 5. Asymptotic ──────────────────────────────────────────────────────
    const ar = AsymptoticFitService.compute(points);
    if (ar) {
      raw.push({
        id: 'asymptotic', name: 'Exp. Asintótico', formula: 'y = a(1−e^(−bx))',
        route: ROUTES_BY_ID.asymptotic, ...METHOD_STYLES.asymptotic, valid: true,
        equation: ar.equation,
        params: `a = ${fmtN(ar.a)},  b = ${fmtN(ar.b)}`,
        r: ar.r, rSquared: ar.rSquared,
        ecm: ecm(points, x => ar.a * (1 - Math.exp(-ar.b * x))),
        fitCurve: AsymptoticFitService.getFitCurve(ar, points),
        rank: 0,
      });
    }

    // ── 6. Logistic (min 3 pts) ────────────────────────────────────────────
    const lgr = LogisticFitService.compute(points);
    if (lgr) {
      raw.push({
        id: 'logistic', name: 'Ajuste Logístico', formula: 'y = L/(1+e^(−k(x−x₀)))',
        route: ROUTES_BY_ID.logistic, ...METHOD_STYLES.logistic, valid: true,
        equation: lgr.equation,
        params: `L = ${fmtN(lgr.L)},  k = ${fmtN(lgr.k)},  x₀ = ${fmtN(lgr.x0)}`,
        r: lgr.r, rSquared: lgr.rSquared,
        ecm: ecm(points, x => lgr.L / (1 + Math.exp(-lgr.k * (x - lgr.x0)))),
        fitCurve: LogisticFitService.getFitCurve(lgr, points),
        rank: 0,
      });
    }

    // ── 7. Logarithmic ─────────────────────────────────────────────────────
    const lor = LogarithmicFitService.compute(points);
    if (lor) {
      if (lor.hasNonPositiveX) {
        raw.push(invalid('logarithmic', 'Ajuste Logarítmico', 'y = a+b·ln(x)', 'Xi ≤ 0'));
      } else {
        raw.push({
          id: 'logarithmic', name: 'Ajuste Logarítmico', formula: 'y = a+b·ln(x)',
          route: ROUTES_BY_ID.logarithmic, ...METHOD_STYLES.logarithmic, valid: true,
          equation: lor.equation,
          params: `a = ${fmtN(lor.a)},  b = ${fmtN(lor.b)}`,
          r: lor.r, rSquared: lor.rSquared,
          ecm: ecm(points.filter(p => p.x > 0), x => lor.a + lor.b * Math.log(x)),
          fitCurve: LogarithmicFitService.getFitCurve(lor, points),
          rank: 0,
        });
      }
    }

    // ── 8. Power ───────────────────────────────────────────────────────────
    const pr = PowerFitService.compute(points);
    if (pr) {
      if (pr.invalidPoints) {
        raw.push(invalid('power', 'Ajuste Potencial', 'y = ax^b', 'Xi ≤ 0 o Yi ≤ 0'));
      } else {
        raw.push({
          id: 'power', name: 'Ajuste Potencial', formula: 'y = ax^b',
          route: ROUTES_BY_ID.power, ...METHOD_STYLES.power, valid: true,
          equation: pr.equation,
          params: `a = ${fmtN(pr.a)},  b = ${fmtN(pr.b)}`,
          r: pr.r, rSquared: pr.rSquared,
          ecm: ecm(points.filter(p => p.x > 0), x => pr.a * Math.pow(x, pr.b)),
          fitCurve: PowerFitService.getFitCurve(pr, points),
          rank: 0,
        });
      }
    }

    // ── 9. Polynomial (degree 2 for comparison) ────────────────────────────
    if (points.length >= 3) {
      const poly = PolynomialFitService.compute(points, 2);
      if (poly) {
        const coeffs = poly.coefficients;
        raw.push({
          id: 'polynomial', name: 'Ajuste Polinomial', formula: 'y = a₀+a₁x+a₂x²',
          route: ROUTES_BY_ID.polynomial, ...METHOD_STYLES.polynomial, valid: true,
          equation: poly.equation,
          params: coeffs.map((c, i) => `a${i} = ${fmtN(c)}`).join(',  '),
          r: poly.r, rSquared: poly.rSquared,
          ecm: ecm(points, x => coeffs.reduce((s, c, i) => s + c * Math.pow(x, i), 0)),
          fitCurve: PolynomialFitService.getFitCurve(poly, points),
          rank: 0,
        });
      }
    }

    // Sort: valid by R² descending first, then invalid
    const valid   = raw.filter(m => m.valid).sort((a, b) => b.rSquared - a.rSquared);
    const invalid_ = raw.filter(m => !m.valid);
    const ranked  = [...valid, ...invalid_].map((m, i) => ({ ...m, rank: i + 1 }));

    return { ranked, dataPoints, validCount: valid.length };
  },
};
