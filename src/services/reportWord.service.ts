import type { DataPoint } from '../types/data.types';
import { LinearFitService }      from './linearFit.service';
import { ExponentialFitService } from './exponentialFit.service';
import { GeometricFitService }   from './geometricFit.service';
import { HyperbolicFitService }  from './hyperbolicFit.service';
import { AsymptoticFitService }  from './asymptoticFit.service';
import { LogisticFitService }    from './logisticFit.service';
import { LogarithmicFitService } from './logarithmicFit.service';
import { PowerFitService }        from './powerFit.service';
import { PolynomialFitService }  from './polynomialFit.service';
import { ComparisonService }     from './comparison.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function f(v: number | null | undefined, d = 5): string {
  if (v === null || v === undefined || !isFinite(v) || isNaN(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 0.001 && abs < 1_000_000) return parseFloat(v.toPrecision(d + 1)).toString();
  return v.toExponential(d - 1);
}

function pct(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return `${(v * 100).toFixed(4)} %`;
}

function qual(r2: number): string {
  if (!isFinite(r2)) return 'N/A';
  if (r2 >= 0.99) return 'Excelente';
  if (r2 >= 0.95) return 'Muy bueno';
  if (r2 >= 0.90) return 'Bueno';
  if (r2 >= 0.75) return 'Moderado';
  return 'Débil';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── HTML building ────────────────────────────────────────────────────────────

const CSS = `
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; color: #1a1a2e; }
h1   { font-size: 20pt; color: #2B124C; border-bottom: 3px solid #854F6C; padding-bottom: 6px; }
h2   { font-size: 14pt; color: #ffffff; background: #522B5B; padding: 6px 12px;
       margin-top: 24px; border-radius: 4px; }
h3   { font-size: 11pt; color: #522B5B; margin: 16px 0 6px; border-bottom: 1px solid #DFB6B2; }
p    { font-size: 10pt; color: #444; }
.info { background: #FBE4D8; padding: 8px 12px; border-left: 4px solid #854F6C;
        margin: 8px 0; font-size: 10pt; }
table { border-collapse: collapse; width: 100%; margin: 10px 0 16px; }
th { background: #2B124C; color: #fff; padding: 6px 10px; font-size: 9pt;
     text-align: center; }
td { border: 1px solid #DFB6B2; padding: 4px 8px; font-size: 9pt; }
tr:nth-child(even) td { background: #FBE4D8; }
.lbl { background: #DFB6B2 !important; font-weight: bold; color: #522B5B; }
.sum { background: #BDD7EE !important; font-weight: bold; color: #0A3060; }
.hdr { background: #FFD700 !important; font-weight: bold; color: #1a1a2e; text-align: center; }
.prm-lbl { background: #DFB6B2 !important; font-weight: bold; color: #522B5B; width: 40%; }
.prm-val { background: #FBE4D8 !important; text-align: right; }
.sse { background: #DFB6B2 !important; font-weight: bold; }
.na  { background: #fee2e2 !important; color: #b91c1c; font-weight: bold; }
`;

function section(title: string, formula: string, content: string): string {
  return `<h2>${esc(title)}   —   ${esc(formula)}</h2>\n${content}`;
}

function calcTableHtml(
  vars: Array<{ label: string; values: number[]; sum: number }>,
  n: number,
): string {
  const headers = ['<th class="lbl"></th>',
    ...Array.from({ length: n }, (_, i) => `<th class="hdr">N° ${i + 1}</th>`),
    '<th class="sum">SUMATORIA</th>',
  ].join('');

  const rows = vars.map(v => {
    const cells = v.values.map(x => `<td style="text-align:right">${f(x)}</td>`).join('');
    return `<tr><td class="lbl">${esc(v.label)}</td>${cells}<td class="sum">${f(v.sum)}</td></tr>`;
  }).join('\n');

  return `<h3>Tabla de Cálculo</h3><table><tr>${headers}</tr>${rows}</table>`;
}

function paramsTableHtml(rows: [string, string][]): string {
  const cells = rows.map(([l, v]) =>
    `<tr><td class="prm-lbl">${esc(l)}</td><td class="prm-val">${esc(v)}</td></tr>`
  ).join('\n');
  return `<h3>Parámetros del Ajuste</h3><table>${cells}</table>`;
}

function fittedTableHtml(
  rows: Array<{ n: number; x: number; y: number; yHat: number; residual: number; residual2: number }>,
  sse: number,
  ecm: number,
): string {
  const dataRows = rows.map(r =>
    `<tr>
      <td style="text-align:center">${r.n}</td>
      <td style="text-align:right">${f(r.x)}</td>
      <td style="text-align:right">${f(r.y)}</td>
      <td style="text-align:right">${f(r.yHat)}</td>
      <td style="text-align:right">${f(r.residual)}</td>
      <td style="text-align:right">${f(r.residual2)}</td>
    </tr>`
  ).join('\n');

  const totRow = `<tr>
    <td class="sse" colspan="4" style="text-align:right">SSE =</td>
    <td class="sse" style="text-align:right">${f(sse)}</td>
    <td class="sse" style="text-align:right">${f(sse)}</td>
  </tr>
  <tr>
    <td class="sse" colspan="4" style="text-align:right">ECM = SSE/n =</td>
    <td class="sse" colspan="2" style="text-align:right">${f(ecm)}</td>
  </tr>`;

  return `<h3>Valores Ajustados y Residuos</h3>
<table>
  <tr>
    <th>N°</th><th>x</th><th>y</th>
    <th>ŷ (ajustado)</th><th>y − ŷ (residual)</th><th>(y − ŷ)²</th>
  </tr>
  ${dataRows}
  ${totRow}
</table>`;
}

function naSection(title: string, formula: string, reason: string): string {
  return `<h2>${esc(title)}   —   ${esc(formula)}</h2>
<p class="na">⚠ No aplicable: ${esc(reason)}</p>`;
}

// ─── Build full HTML document ─────────────────────────────────────────────────

function buildHtml(points: DataPoint[]): string {
  const comp = ComparisonService.compute(points);
  const date = new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sections: string[] = [];

  // Summary table
  if (comp) {
    const summaryRows = comp.ranked.map(m =>
      `<tr>
        <td style="text-align:center">${m.rank}</td>
        <td>${esc(m.name)}</td>
        <td><code>${esc(m.formula)}</code></td>
        <td style="text-align:right">${m.valid ? f(m.rSquared) : '—'}</td>
        <td style="text-align:right">${m.valid ? f(m.r)        : '—'}</td>
        <td style="text-align:right">${m.valid ? f(m.ecm)      : '—'}</td>
        <td>${m.valid ? qual(m.rSquared) : 'N/A'}</td>
        <td><small>${esc(m.valid ? m.equation : m.invalidReason ?? 'No aplicable')}</small></td>
      </tr>`
    ).join('\n');
    sections.push(`<h2>COMPARACIÓN Y RANKING DE MÉTODOS</h2>
<table>
  <tr><th>#</th><th>Método</th><th>Modelo</th><th>R²</th><th>r</th><th>ECM</th><th>Calidad</th><th>Ecuación</th></tr>
  ${summaryRows}
</table>`);
  }

  // Raw data
  const dataRows = points.map((p, i) =>
    `<tr><td style="text-align:center">${i + 1}</td><td>${f(p.x)}</td><td>${f(p.y)}</td></tr>`
  ).join('\n');
  sections.push(`<h2>DATOS DE ENTRADA</h2>
<table><tr><th>N°</th><th>x</th><th>y</th></tr>${dataRows}</table>`);

  // ── Linear ──────────────────────────────────────────────────────────────────
  const lr = LinearFitService.compute(points);
  if (lr) {
    const fitted = lr.rows.map(r => {
      const yHat = lr.a + lr.b * r.x;
      return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
    });
    const sse = fitted.reduce((s, r) => s + r.residual2, 0);
    sections.push(section('AJUSTE LINEAL', 'y = a + bx',
      calcTableHtml([
        { label: 'x',  values: lr.rows.map(r => r.x),  sum: lr.sumX  },
        { label: 'y',  values: lr.rows.map(r => r.y),  sum: lr.sumY  },
        { label: 'x²', values: lr.rows.map(r => r.x2), sum: lr.sumX2 },
        { label: 'xy', values: lr.rows.map(r => r.xy), sum: lr.sumXY },
      ], lr.n) +
      paramsTableHtml([
        ['a (intercepto)', f(lr.a)], ['b (pendiente)', f(lr.b)],
        ['Ecuación', lr.equation], ['r', f(lr.r)],
        ['R²', f(lr.rSquared)], ['R² (%)', pct(lr.rSquared)], ['Calidad', qual(lr.rSquared)],
      ]) +
      fittedTableHtml(fitted, sse, sse / lr.n)
    ));
  }

  // ── Exponential ──────────────────────────────────────────────────────────────
  const er = ExponentialFitService.compute(points);
  if (er) {
    if (er.hasNegativeY) {
      sections.push(naSection('AJUSTE EXPONENCIAL', 'y = a·e^(bx)', 'yi ≤ 0 — logaritmo indefinido'));
    } else {
      const fitted = er.rows.map(r => {
        const yHat = er.a * Math.exp(er.b * r.x);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      sections.push(section('AJUSTE EXPONENCIAL', 'y = a·e^(bx)',
        calcTableHtml([
          { label: 'x',       values: er.rows.map(r => r.x),    sum: er.sumX    },
          { label: 'y',       values: er.rows.map(r => r.y),    sum: er.sumY    },
          { label: 'ln(y)',   values: er.rows.map(r => r.lnY),  sum: er.sumLnY  },
          { label: 'x²',      values: er.rows.map(r => r.x2),   sum: er.sumX2   },
          { label: 'x·ln(y)', values: er.rows.map(r => r.xLnY), sum: er.sumXLnY },
        ], er.n) +
        paramsTableHtml([
          ['a', f(er.a)], ['b', f(er.b)], ['Ecuación', er.equation],
          ['r', f(er.r)], ['R²', f(er.rSquared)], ['R² (%)', pct(er.rSquared)], ['Calidad', qual(er.rSquared)],
        ]) +
        fittedTableHtml(fitted, sse, sse / er.n)
      ));
    }
  }

  // ── Geometric ────────────────────────────────────────────────────────────────
  const gr = GeometricFitService.compute(points);
  if (gr) {
    if (gr.invalidPoints) {
      sections.push(naSection('AJUSTE GEOMÉTRICO', 'y = a·x^b', 'xi ≤ 0 o yi ≤ 0'));
    } else {
      const fitted = gr.rows.map(r => {
        const yHat = gr.a * Math.pow(r.x, gr.b);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      sections.push(section('AJUSTE GEOMÉTRICO', 'y = a·x^b',
        calcTableHtml([
          { label: 'ln(x)',       values: gr.rows.map(r => r.lnX),    sum: gr.sumLnX    },
          { label: 'ln(y)',       values: gr.rows.map(r => r.lnY),    sum: gr.sumLnY    },
          { label: 'ln²(x)',      values: gr.rows.map(r => r.lnX2),   sum: gr.sumLnX2   },
          { label: 'ln(x)·ln(y)', values: gr.rows.map(r => r.lnXlnY),sum: gr.sumLnXlnY },
        ], gr.n) +
        paramsTableHtml([
          ['a', f(gr.a)], ['b', f(gr.b)], ['Ecuación', gr.equation],
          ['r', f(gr.r)], ['R²', f(gr.rSquared)], ['R² (%)', pct(gr.rSquared)], ['Calidad', qual(gr.rSquared)],
        ]) +
        fittedTableHtml(fitted, sse, sse / gr.n)
      ));
    }
  }

  // ── Hyperbolic ───────────────────────────────────────────────────────────────
  const hr = HyperbolicFitService.compute(points);
  if (hr) {
    if (hr.hasZeroY) {
      sections.push(naSection('AJUSTE HIPERBÓLICO', 'y = 1/(a+bx)', 'yi = 0 — inversa indefinida'));
    } else {
      const fitted = hr.rows.map(r => {
        const d = hr.a + hr.b * r.x;
        const yHat = d !== 0 ? 1 / d : 0;
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      sections.push(section('AJUSTE HIPERBÓLICO', 'y = 1/(a+bx)',
        calcTableHtml([
          { label: 'x',       values: hr.rows.map(r => r.x),     sum: hr.sumX     },
          { label: '1/y',     values: hr.rows.map(r => r.invY),  sum: hr.sumInvY  },
          { label: 'x²',      values: hr.rows.map(r => r.x2),    sum: hr.sumX2    },
          { label: 'x·(1/y)', values: hr.rows.map(r => r.xInvY), sum: hr.sumXInvY },
        ], hr.n) +
        paramsTableHtml([
          ['a', f(hr.a)], ['b', f(hr.b)], ['Ecuación', hr.equation],
          ['r', f(hr.r)], ['R²', f(hr.rSquared)], ['R² (%)', pct(hr.rSquared)], ['Calidad', qual(hr.rSquared)],
        ]) +
        fittedTableHtml(fitted, sse, sse / hr.n)
      ));
    }
  }

  // ── Asymptotic ───────────────────────────────────────────────────────────────
  const ar = AsymptoticFitService.compute(points);
  if (ar) {
    const fittedAr = ar.rows.map(r => ({
      n: r.n, x: r.x, y: r.y, yHat: r.yHat, residual: r.residual, residual2: r.residual2,
    }));
    sections.push(section('EXP. ASINTÓTICO', 'y = a·(1−e^(−bx))',
      paramsTableHtml([
        ['a (límite asintótico)', f(ar.a)], ['b (tasa)', f(ar.b)],
        ['Ecuación', ar.equation], ['r', f(ar.r)],
        ['R²', f(ar.rSquared)], ['R² (%)', pct(ar.rSquared)],
        ['SSE', f(ar.sse)], ['ECM', f(ar.sse / ar.n)],
        ['Convergencia', ar.converged ? `Sí, ${ar.iterations.length} iteraciones` : `No (${ar.iterations.length} iter. máx.)`],
        ['Calidad', qual(ar.rSquared)],
      ]) +
      fittedTableHtml(fittedAr, ar.sse, ar.sse / ar.n)
    ));
  }

  // ── Logistic ─────────────────────────────────────────────────────────────────
  const lgr = LogisticFitService.compute(points);
  if (lgr) {
    const fittedLg = lgr.rows.map(r => ({
      n: r.n, x: r.x, y: r.y, yHat: r.yHat, residual: r.residual, residual2: r.residual2,
    }));
    sections.push(section('AJUSTE LOGÍSTICO', 'y = L/(1+e^(−k(x−x₀)))',
      paramsTableHtml([
        ['L (capacidad)', f(lgr.L)], ['k (tasa)', f(lgr.k)], ['x₀ (inflexión)', f(lgr.x0)],
        ['Ecuación', lgr.equation], ['r', f(lgr.r)],
        ['R²', f(lgr.rSquared)], ['R² (%)', pct(lgr.rSquared)],
        ['SSE', f(lgr.sse)], ['ECM', f(lgr.sse / lgr.n)],
        ['Convergencia', lgr.converged ? `Sí, ${lgr.iterations.length} iteraciones` : `No (${lgr.iterations.length} iter. máx.)`],
        ['Calidad', qual(lgr.rSquared)],
      ]) +
      fittedTableHtml(fittedLg, lgr.sse, lgr.sse / lgr.n)
    ));
  }

  // ── Logarithmic ──────────────────────────────────────────────────────────────
  const lor = LogarithmicFitService.compute(points);
  if (lor) {
    if (lor.hasNonPositiveX) {
      sections.push(naSection('AJUSTE LOGARÍTMICO', 'y = a+b·ln(x)', 'xi ≤ 0 — ln indefinido'));
    } else {
      const fitted = lor.rows.map(r => {
        const yHat = lor.a + lor.b * Math.log(r.x);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      sections.push(section('AJUSTE LOGARÍTMICO', 'y = a + b·ln(x)',
        calcTableHtml([
          { label: 'y',       values: lor.rows.map(r => r.y),    sum: lor.sumY    },
          { label: 'ln(x)',   values: lor.rows.map(r => r.lnX),  sum: lor.sumLnX  },
          { label: 'ln²(x)',  values: lor.rows.map(r => r.lnX2), sum: lor.sumLnX2 },
          { label: 'y·ln(x)', values: lor.rows.map(r => r.yLnX), sum: lor.sumYLnX },
        ], lor.n) +
        paramsTableHtml([
          ['a', f(lor.a)], ['b', f(lor.b)], ['Ecuación', lor.equation],
          ['r', f(lor.r)], ['R²', f(lor.rSquared)], ['R² (%)', pct(lor.rSquared)], ['Calidad', qual(lor.rSquared)],
        ]) +
        fittedTableHtml(fitted, sse, sse / lor.n)
      ));
    }
  }

  // ── Power ────────────────────────────────────────────────────────────────────
  const pwr = PowerFitService.compute(points);
  if (pwr) {
    if (pwr.invalidPoints) {
      sections.push(naSection('AJUSTE POTENCIAL', 'y = a·x^b', 'xi ≤ 0 o yi ≤ 0'));
    } else {
      const fitted = pwr.rows.map(r => {
        const yHat = pwr.a * Math.pow(r.x, pwr.b);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      sections.push(section('AJUSTE POTENCIAL', 'y = a·x^b',
        calcTableHtml([
          { label: 'ln(x)',       values: pwr.rows.map(r => r.lnX),    sum: pwr.sumLnX    },
          { label: 'ln(y)',       values: pwr.rows.map(r => r.lnY),    sum: pwr.sumLnY    },
          { label: 'ln²(x)',      values: pwr.rows.map(r => r.lnX2),   sum: pwr.sumLnX2   },
          { label: 'ln(x)·ln(y)', values: pwr.rows.map(r => r.lnXlnY),sum: pwr.sumLnXlnY },
        ], pwr.n) +
        paramsTableHtml([
          ['a', f(pwr.a)], ['b', f(pwr.b)], ['Ecuación', pwr.equation],
          ['r', f(pwr.r)], ['R²', f(pwr.rSquared)], ['R² (%)', pct(pwr.rSquared)], ['Calidad', qual(pwr.rSquared)],
        ]) +
        fittedTableHtml(fitted, sse, sse / pwr.n)
      ));
    }
  }

  // ── Polynomial ───────────────────────────────────────────────────────────────
  if (points.length >= 3) {
    const poly = PolynomialFitService.compute(points, 2);
    if (poly) {
      const SUPS = ['', '', '²', '³', '⁴', '⁵'];
      const fittedPoly = poly.rows.map(r => ({
        n: r.n, x: r.x, y: r.y, yHat: r.yHat, residual: r.residual, residual2: r.residual2,
      }));
      const polyParamRows: [string, string][] = [
        ...poly.coefficients.map((c, i) => [
          `a${i}${i === 0 ? ' (independiente)' : i === 1 ? ' (lineal)' : ` (x${i <= 5 ? SUPS[i] : `^${i}`})`}`,
          f(c),
        ] as [string, string]),
        ['Ecuación', poly.equation],
        ['r', f(poly.r)],
        ['R²', f(poly.rSquared)],
        ['R² (%)', pct(poly.rSquared)],
        ['SSE', f(poly.sse)],
        ['ECM', f(poly.ecm)],
        ['Calidad', qual(poly.rSquared)],
      ];
      sections.push(section('AJUSTE POLINOMIAL (Grado 2)', 'y = a₀ + a₁x + a₂x²',
        calcTableHtml([
          { label: 'x',   values: poly.rows.map(r => r.x),                sum: poly.xSums[1]  },
          { label: 'y',   values: poly.rows.map(r => r.y),                sum: poly.xySums[0] },
          { label: 'x²',  values: poly.rows.map(r => Math.pow(r.x, 2)),   sum: poly.xSums[2]  },
          { label: 'x³',  values: poly.rows.map(r => Math.pow(r.x, 3)),   sum: poly.xSums[3]  },
          { label: 'x⁴',  values: poly.rows.map(r => Math.pow(r.x, 4)),   sum: poly.xSums[4]  },
          { label: 'xy',  values: poly.rows.map(r => r.x * r.y),          sum: poly.xySums[1] },
          { label: 'x²y', values: poly.rows.map(r => Math.pow(r.x, 2) * r.y), sum: poly.xySums[2] },
        ], poly.n) +
        paramsTableHtml(polyParamRows) +
        fittedTableHtml(fittedPoly, poly.sse, poly.ecm)
      ));
    }
  }

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>CurveAnalysis — Reporte de Ajuste de Curvas</title>
  <style>${CSS}</style>
</head>
<body>
  <h1>CurveAnalysis — Reporte de Ajuste de Curvas</h1>
  <div class="info">
    <strong>Fecha:</strong> ${date} &nbsp;&nbsp;
    <strong>Dataset:</strong> ${points.length} punto(s) &nbsp;&nbsp;
    <strong>Métodos válidos:</strong> ${comp?.validCount ?? 0} / 9
  </div>
  ${sections.join('\n')}
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const ReportWordService = {
  generate(points: DataPoint[]): void {
    const html = buildHtml(points);
    const blob = new Blob([html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `CurveAnalysis_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
