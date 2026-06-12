import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// ─── Color palette (RGB arrays for jsPDF) ────────────────────────────────────

const PURPLE   = [43,  18,  76]  as [number, number, number];
const PURPLE_M = [82,  43,  91]  as [number, number, number];
const ROSE     = [223, 182, 178] as [number, number, number];
const CREAM    = [251, 228, 216] as [number, number, number];
const YELLOW   = [255, 215, 0  ] as [number, number, number];
const BLUE_L   = [189, 215, 238] as [number, number, number];
const GRAY     = [226, 226, 226] as [number, number, number];
const WHITE    = [255, 255, 255] as [number, number, number];

// ─── Page header/footer ───────────────────────────────────────────────────────

function addPageHeaderFooter(doc: jsPDF, title: string) {
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Header bar
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CurveAnalysis', 10, 8);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 210 / 2, 8, { align: 'center' });
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pág. ${i} / ${pageCount}`, 200, 290, { align: 'right' });
    doc.text('Generado por CurveAnalysis v1.0', 10, 290);
    doc.setTextColor(0, 0, 0);
  }
}

// ─── Section title ────────────────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFillColor(...PURPLE_M);
  doc.rect(10, y, 190, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(text, 14, y + 5.5);
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

// ─── Small 2-column info block ────────────────────────────────────────────────

function infoBlock(doc: jsPDF, rows: [string, string][], y: number): number {
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PURPLE_M);
    doc.text(label + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value, 60, y);
    y += 5.5;
  });
  return y + 2;
}

// ─── Calc table ───────────────────────────────────────────────────────────────

interface CalcRowPdf {
  label: string;
  values: number[];
  sum: number;
}

function calcTable(doc: jsPDF, vars: CalcRowPdf[], points: DataPoint[], startY: number): number {
  const head  = ['Variable', ...points.map((_, i) => `N°${i + 1}`), 'SUMATORIA'];
  const body  = vars.map(v => [
    v.label,
    ...v.values.map(x => f(x)),
    f(v.sum),
  ]);
  autoTable(doc, {
    head: [head],
    body,
    startY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: YELLOW, textColor: [26, 26, 46], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fillColor: GRAY, fontStyle: 'bold', halign: 'left', minCellWidth: 28 },
      [head.length - 1]: { fillColor: BLUE_L, fontStyle: 'bold', halign: 'right' },
    },
    alternateRowStyles: { fillColor: [255, 252, 232] },
    margin: { left: 10, right: 10 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
}

// ─── Parameters table ─────────────────────────────────────────────────────────

function paramsTable(doc: jsPDF, rows: [string, string][], startY: number): number {
  autoTable(doc, {
    body: rows,
    startY,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fillColor: ROSE, fontStyle: 'bold', textColor: PURPLE_M, halign: 'left', cellWidth: 80 },
      1: { fillColor: CREAM, halign: 'right' },
    },
    margin: { left: 10, right: 10 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
}

// ─── Fitted values table ──────────────────────────────────────────────────────

interface FittedRowPdf {
  n: number; x: number; y: number; yHat: number; residual: number; residual2: number;
}

function fittedTable(doc: jsPDF, rows: FittedRowPdf[], sse: number, ecm: number, startY: number): number {
  const body = rows.map(r => [r.n, f(r.x), f(r.y), f(r.yHat), f(r.residual), f(r.residual2)]);
  body.push(['Σ', '', '', '', 'SSE =', f(sse)]);
  body.push(['ECM', '', '', '', '= SSE/n =', f(ecm)]);

  autoTable(doc, {
    head: [['N°', 'x', 'y', 'ŷ (ajustado)', 'y − ŷ (residual)', '(y − ŷ)²']],
    body,
    startY,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
    headStyles: { fillColor: [133, 79, 108], textColor: WHITE, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { halign: 'center' } },
    didParseCell(data) {
      if (data.row.index >= rows.length) {
        data.cell.styles.fillColor = ROSE;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 10, right: 10 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

// ─── checkY helper ────────────────────────────────────────────────────────────

function checkNewPage(doc: jsPDF, y: number, needed = 40): number {
  if (y + needed > 278) { doc.addPage(); return 18; }
  return y;
}

// ─── Build a linearizable method section ─────────────────────────────────────

interface LinearizableSection {
  title: string;
  formula: string;
  calcVars: CalcRowPdf[];
  paramRows: [string, string][];
  fittedRows: FittedRowPdf[];
  sse: number;
  ecm: number;
}

function addMethodSection(doc: jsPDF, s: LinearizableSection, points: DataPoint[], y: number): number {
  y = checkNewPage(doc, y, 60);
  y = sectionTitle(doc, `${s.title}   —   ${s.formula}`, y);
  y = calcTable(doc, s.calcVars, points, y);
  y = checkNewPage(doc, y, 40);
  y = paramsTable(doc, s.paramRows, y);
  y = checkNewPage(doc, y, 40);
  y = fittedTable(doc, s.fittedRows, s.sse, s.ecm, y);
  return y;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const ReportPdfService = {
  generate(points: DataPoint[]): void {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const comp = ComparisonService.compute(points);
    const date = new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Cover ──────────────────────────────────────────────────────────────────
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CurveAnalysis', 105, 20, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Reporte de Ajuste de Curvas', 105, 30, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Fecha: ${date}   |   Dataset: ${points.length} punto(s)   |   Métodos válidos: ${comp?.validCount ?? 0}/9`, 105, 40, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    let y = 58;

    // ── Summary ranking table ──────────────────────────────────────────────────
    y = sectionTitle(doc, 'COMPARACIÓN Y RANKING DE MÉTODOS', y);
    if (comp) {
      autoTable(doc, {
        head: [['#', 'Método', 'R²', 'r', 'ECM', 'Calidad', 'Ecuación']],
        body: comp.ranked.map(m => [
          m.rank,
          m.name,
          m.valid ? f(m.rSquared) : '—',
          m.valid ? f(m.r)        : '—',
          m.valid ? f(m.ecm)      : '—',
          m.valid ? qual(m.rSquared) : 'N/A',
          m.valid ? m.equation    : m.invalidReason ?? 'No aplicable',
        ]),
        startY: y,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 6: { cellWidth: 55 } },
        alternateRowStyles: { fillColor: [255, 252, 232] },
        margin: { left: 10, right: 10 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // ── Raw data ───────────────────────────────────────────────────────────────
    y = checkNewPage(doc, y, 40);
    y = sectionTitle(doc, 'DATOS DE ENTRADA', y);
    autoTable(doc, {
      head: [['N°', 'x', 'y']],
      body: points.map((p, i) => [i + 1, f(p.x), f(p.y)]),
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2.5, halign: 'right' },
      headStyles: { fillColor: YELLOW, textColor: [26, 26, 46], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 15 } },
      margin: { left: 10, right: 10 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // ── Linear ────────────────────────────────────────────────────────────────
    const lr = LinearFitService.compute(points);
    if (lr && !isNaN(lr.a)) {
      const fitted = lr.rows.map(r => {
        const yHat = lr.a + lr.b * r.x;
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE LINEAL', formula: 'y = a + bx',
        calcVars: [
          { label: 'x',  values: lr.rows.map(r => r.x),  sum: lr.sumX  },
          { label: 'y',  values: lr.rows.map(r => r.y),  sum: lr.sumY  },
          { label: 'x²', values: lr.rows.map(r => r.x2), sum: lr.sumX2 },
          { label: 'xy', values: lr.rows.map(r => r.xy), sum: lr.sumXY },
        ],
        paramRows: [
          ['a (intercepto)', f(lr.a)],
          ['b (pendiente)',  f(lr.b)],
          ['Ecuación',       lr.equation],
          ['r',              f(lr.r)],
          ['R²',             f(lr.rSquared)],
          ['R² (%)',         pct(lr.rSquared)],
          ['Calidad',        qual(lr.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / lr.n,
      }, points, y);
    }

    // ── Exponential ───────────────────────────────────────────────────────────
    const er = ExponentialFitService.compute(points);
    if (er && !er.hasNegativeY) {
      const fitted = er.rows.map(r => {
        const yHat = er.a * Math.exp(er.b * r.x);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE EXPONENCIAL', formula: 'y = a·e^(bx)',
        calcVars: [
          { label: 'x',       values: er.rows.map(r => r.x),    sum: er.sumX    },
          { label: 'y',       values: er.rows.map(r => r.y),    sum: er.sumY    },
          { label: 'ln(y)',   values: er.rows.map(r => r.lnY),  sum: er.sumLnY  },
          { label: 'x²',      values: er.rows.map(r => r.x2),   sum: er.sumX2   },
          { label: 'x·ln(y)', values: er.rows.map(r => r.xLnY), sum: er.sumXLnY },
        ],
        paramRows: [
          ['a', f(er.a)], ['b', f(er.b)],
          ['Ecuación', er.equation], ['r', f(er.r)],
          ['R²', f(er.rSquared)], ['R² (%)', pct(er.rSquared)], ['Calidad', qual(er.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / er.n,
      }, points, y);
    }

    // ── Geometric ─────────────────────────────────────────────────────────────
    const gr = GeometricFitService.compute(points);
    if (gr && !gr.invalidPoints) {
      const fitted = gr.rows.map(r => {
        const yHat = gr.a * Math.pow(r.x, gr.b);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE GEOMÉTRICO', formula: 'y = a·x^b',
        calcVars: [
          { label: 'ln(x)',       values: gr.rows.map(r => r.lnX),    sum: gr.sumLnX      },
          { label: 'ln(y)',       values: gr.rows.map(r => r.lnY),    sum: gr.sumLnY      },
          { label: 'ln²(x)',      values: gr.rows.map(r => r.lnX2),   sum: gr.sumLnX2     },
          { label: 'ln(x)·ln(y)', values: gr.rows.map(r => r.lnXlnY),sum: gr.sumLnXlnY   },
        ],
        paramRows: [
          ['a', f(gr.a)], ['b', f(gr.b)],
          ['Ecuación', gr.equation], ['r', f(gr.r)],
          ['R²', f(gr.rSquared)], ['R² (%)', pct(gr.rSquared)], ['Calidad', qual(gr.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / gr.n,
      }, points, y);
    }

    // ── Hyperbolic ────────────────────────────────────────────────────────────
    const hr = HyperbolicFitService.compute(points);
    if (hr && !hr.hasZeroY) {
      const fitted = hr.rows.map(r => {
        const d = hr.a + hr.b * r.x;
        const yHat = d !== 0 ? 1 / d : 0;
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE HIPERBÓLICO', formula: 'y = 1/(a+bx)',
        calcVars: [
          { label: 'x',       values: hr.rows.map(r => r.x),     sum: hr.sumX    },
          { label: '1/y',     values: hr.rows.map(r => r.invY),  sum: hr.sumInvY },
          { label: 'x²',      values: hr.rows.map(r => r.x2),    sum: hr.sumX2   },
          { label: 'x·(1/y)', values: hr.rows.map(r => r.xInvY), sum: hr.sumXInvY },
        ],
        paramRows: [
          ['a', f(hr.a)], ['b', f(hr.b)],
          ['Ecuación', hr.equation], ['r', f(hr.r)],
          ['R²', f(hr.rSquared)], ['R² (%)', pct(hr.rSquared)], ['Calidad', qual(hr.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / hr.n,
      }, points, y);
    }

    // ── Asymptotic ────────────────────────────────────────────────────────────
    const ar = AsymptoticFitService.compute(points);
    if (ar) {
      y = checkNewPage(doc, y, 60);
      y = sectionTitle(doc, 'EXP. ASINTÓTICO   —   y = a·(1 − e^(−bx))', y);
      y = infoBlock(doc, [
        ['Parámetro a', f(ar.a)],
        ['Parámetro b', f(ar.b)],
        ['Ecuación', ar.equation],
        ['r', f(ar.r)],
        ['R²', `${f(ar.rSquared)}   (${pct(ar.rSquared)})`],
        ['SSE', f(ar.sse)],
        ['ECM', f(ar.sse / ar.n)],
        ['Convergencia', ar.converged ? `Sí, ${ar.iterations.length} iter.` : `No (${ar.iterations.length} iter. máx.)`],
        ['Calidad', qual(ar.rSquared)],
      ], y);
      const fittedAr = ar.rows.map(r => ({
        n: r.n, x: r.x, y: r.y, yHat: r.yHat, residual: r.residual, residual2: r.residual2,
      }));
      y = fittedTable(doc, fittedAr, ar.sse, ar.sse / ar.n, y);
    }

    // ── Logistic ──────────────────────────────────────────────────────────────
    const lgr = LogisticFitService.compute(points);
    if (lgr) {
      y = checkNewPage(doc, y, 60);
      y = sectionTitle(doc, 'AJUSTE LOGÍSTICO   —   y = L/(1+e^(−k(x−x₀)))', y);
      y = infoBlock(doc, [
        ['L (capacidad)', f(lgr.L)],
        ['k (tasa)',      f(lgr.k)],
        ['x₀ (inflexión)',f(lgr.x0)],
        ['Ecuación',      lgr.equation],
        ['r',             f(lgr.r)],
        ['R²',            `${f(lgr.rSquared)}   (${pct(lgr.rSquared)})`],
        ['SSE',           f(lgr.sse)],
        ['ECM',           f(lgr.sse / lgr.n)],
        ['Convergencia',  lgr.converged ? `Sí, ${lgr.iterations.length} iter.` : `No (${lgr.iterations.length} iter. máx.)`],
        ['Calidad',       qual(lgr.rSquared)],
      ], y);
      const fittedLg = lgr.rows.map(r => ({
        n: r.n, x: r.x, y: r.y, yHat: r.yHat, residual: r.residual, residual2: r.residual2,
      }));
      y = fittedTable(doc, fittedLg, lgr.sse, lgr.sse / lgr.n, y);
    }

    // ── Logarithmic ───────────────────────────────────────────────────────────
    const lor = LogarithmicFitService.compute(points);
    if (lor && !lor.hasNonPositiveX) {
      const fitted = lor.rows.map(r => {
        const yHat = lor.a + lor.b * Math.log(r.x);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE LOGARÍTMICO', formula: 'y = a + b·ln(x)',
        calcVars: [
          { label: 'y',       values: lor.rows.map(r => r.y),    sum: lor.sumY    },
          { label: 'ln(x)',   values: lor.rows.map(r => r.lnX),  sum: lor.sumLnX  },
          { label: 'ln²(x)',  values: lor.rows.map(r => r.lnX2), sum: lor.sumLnX2 },
          { label: 'y·ln(x)', values: lor.rows.map(r => r.yLnX), sum: lor.sumYLnX },
        ],
        paramRows: [
          ['a', f(lor.a)], ['b', f(lor.b)],
          ['Ecuación', lor.equation], ['r', f(lor.r)],
          ['R²', f(lor.rSquared)], ['R² (%)', pct(lor.rSquared)], ['Calidad', qual(lor.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / lor.n,
      }, points, y);
    }

    // ── Power ─────────────────────────────────────────────────────────────────
    const pr = PowerFitService.compute(points);
    if (pr && !pr.invalidPoints) {
      const fitted = pr.rows.map(r => {
        const yHat = pr.a * Math.pow(r.x, pr.b);
        return { n: r.n, x: r.x, y: r.y, yHat, residual: r.y - yHat, residual2: Math.pow(r.y - yHat, 2) };
      });
      const sse = fitted.reduce((s, r) => s + r.residual2, 0);
      y = addMethodSection(doc, {
        title: 'AJUSTE POTENCIAL', formula: 'y = a·x^b',
        calcVars: [
          { label: 'ln(x)',       values: pr.rows.map(r => r.lnX),    sum: pr.sumLnX      },
          { label: 'ln(y)',       values: pr.rows.map(r => r.lnY),    sum: pr.sumLnY      },
          { label: 'ln²(x)',      values: pr.rows.map(r => r.lnX2),   sum: pr.sumLnX2     },
          { label: 'ln(x)·ln(y)', values: pr.rows.map(r => r.lnXlnY),sum: pr.sumLnXlnY   },
        ],
        paramRows: [
          ['a', f(pr.a)], ['b', f(pr.b)],
          ['Ecuación', pr.equation], ['r', f(pr.r)],
          ['R²', f(pr.rSquared)], ['R² (%)', pct(pr.rSquared)], ['Calidad', qual(pr.rSquared)],
        ],
        fittedRows: fitted, sse, ecm: sse / pr.n,
      }, points, y);
    }

    // ── Polynomial ────────────────────────────────────────────────────────────
    if (points.length >= 3) {
      const poly = PolynomialFitService.compute(points, 2);
      if (poly) {
        const SUPS = ['', '', '²', '³', '⁴', '⁵'];
        const fittedPoly = poly.rows.map(r => ({
          n: r.n, x: r.x, y: r.y, yHat: r.yHat,
          residual: r.residual, residual2: r.residual2,
        }));
        // Build calc vars: x, y, x², x³, x⁴, xy, x²y
        const polyVars: CalcRowPdf[] = [
          { label: 'x',   values: poly.rows.map(r => r.x),   sum: poly.xSums[1]  },
          { label: 'y',   values: poly.rows.map(r => r.y),   sum: poly.xySums[0] },
          { label: 'x²',  values: poly.rows.map(r => Math.pow(r.x, 2)), sum: poly.xSums[2]  },
          { label: 'x³',  values: poly.rows.map(r => Math.pow(r.x, 3)), sum: poly.xSums[3]  },
          { label: 'x⁴',  values: poly.rows.map(r => Math.pow(r.x, 4)), sum: poly.xSums[4]  },
          { label: 'xy',  values: poly.rows.map(r => r.x * r.y),        sum: poly.xySums[1] },
          { label: 'x²y', values: poly.rows.map(r => Math.pow(r.x, 2) * r.y), sum: poly.xySums[2] },
        ];
        const paramRows: [string, string][] = [
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
        y = checkNewPage(doc, y, 60);
        y = sectionTitle(doc, 'AJUSTE POLINOMIAL (Grado 2)   —   y = a₀ + a₁x + a₂x²', y);
        y = calcTable(doc, polyVars, points, y);
        y = checkNewPage(doc, y, 40);
        y = paramsTable(doc, paramRows, y);
        y = checkNewPage(doc, y, 40);
        y = fittedTable(doc, fittedPoly, poly.sse, poly.ecm, y);
      }
    }

    // ── Apply header/footer and save ───────────────────────────────────────────
    addPageHeaderFooter(doc, 'Reporte de Ajuste de Curvas');
    doc.save(`CurveAnalysis_${new Date().toISOString().slice(0, 10)}.pdf`);
  },
};
