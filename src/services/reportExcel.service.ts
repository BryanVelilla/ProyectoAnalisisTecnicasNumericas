import ExcelJS from 'exceljs';
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

function fmt(v: number | null | undefined): number | string {
  if (v === null || v === undefined || !isFinite(v) || isNaN(v)) return '—';
  return v;
}

function fmtPct(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return `${(v * 100).toFixed(4)} %`;
}

function quality(r2: number): string {
  if (!isFinite(r2)) return 'N/A';
  if (r2 >= 0.99) return 'Excelente';
  if (r2 >= 0.95) return 'Muy bueno';
  if (r2 >= 0.90) return 'Bueno';
  if (r2 >= 0.75) return 'Moderado';
  return 'Débil';
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
  purple:       'FF2B124C',
  purpleMid:    'FF522B5B',
  purpleLight:  'FF854F6C',
  rose:         'FFDFB6B2',
  cream:        'FFFBE4D8',
  yellow:       'FFFFD700',
  yellowLight:  'FFFFFCE8',
  blue:         'FF0A3060',
  blueLight:    'FFBDD7EE',
  gray:         'FFE2E2E2',
  white:        'FFFFFFFF',
  dark:         'FF1A1A2E',
  green:        'FF15803D',
  greenBg:      'FFDCFCE7',
  red:          'FFB91C1C',
  redBg:        'FFFEE2E2',
};

type Fill   = ExcelJS.Fill;
type Font   = Partial<ExcelJS.Font>;
type Align  = Partial<ExcelJS.Alignment>;
type Border = ExcelJS.Borders;

function solidFill(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } } as Fill;
}

const THIN: Partial<ExcelJS.Border> = { style: 'thin' };
const MEDIUM: Partial<ExcelJS.Border> = { style: 'medium' };

function thinBorder(): Border {
  return { top: THIN, left: THIN, bottom: THIN, right: THIN } as Border;
}

function mediumBorder(): Border {
  return { top: MEDIUM, left: THIN, bottom: THIN, right: THIN } as Border;
}

function styleCell(
  cell: ExcelJS.Cell,
  bg: string,
  fontArgb: string,
  bold = false,
  align: 'left' | 'center' | 'right' = 'center',
  border = true,
  sz = 10,
) {
  cell.fill = solidFill(bg);
  cell.font = { bold, size: sz, color: { argb: fontArgb }, name: 'Calibri' } as Font;
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: false } as Align;
  if (border) cell.border = thinBorder();
}

function setRowHeight(row: ExcelJS.Row, h: number) {
  row.height = h;
}

// ─── Summary sheet ────────────────────────────────────────────────────────────

function buildSummarySheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const ws  = wb.addWorksheet('Resumen');
  const comp = ComparisonService.compute(points);
  const date = new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

  ws.columns = [
    { width: 6  },  // A - rank
    { width: 22 },  // B - method
    { width: 22 },  // C - formula
    { width: 12 },  // D - R²
    { width: 12 },  // E - r
    { width: 14 },  // F - ECM
    { width: 14 },  // G - quality
    { width: 38 },  // H - equation
  ];

  // Title
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'CurveAnalysis — Comparación de Métodos de Ajuste de Curvas';
  styleCell(titleCell, C.purple, C.white, true, 'center', false, 14);
  ws.getRow(1).height = 30;

  // Sub-info
  ws.mergeCells('A2:H2');
  const infoCell = ws.getCell('A2');
  infoCell.value = `Fecha: ${date}   |   Dataset: ${points.length} punto(s)   |   Métodos válidos: ${comp?.validCount ?? 0} / 9`;
  styleCell(infoCell, C.purpleMid, C.white, false, 'left', false, 10);
  ws.getRow(2).height = 18;

  ws.addRow([]);  // blank

  // Table header
  const hdr = ws.addRow(['#', 'Método', 'Modelo', 'R²', 'r', 'ECM', 'Calidad', 'Ecuación ajustada']);
  setRowHeight(hdr, 20);
  hdr.eachCell(cell => styleCell(cell, C.yellow, C.dark, true, 'center'));

  if (!comp) {
    ws.addRow(['—', 'Datos insuficientes (se necesitan ≥ 2 puntos)', '', '', '', '', '', '']);
    return;
  }

  comp.ranked.forEach((m, i) => {
    const bg  = i % 2 === 0 ? C.white : C.yellowLight;
    const row = ws.addRow([
      m.rank,
      m.name,
      m.formula,
      m.valid ? m.rSquared    : '—',
      m.valid ? m.r           : '—',
      m.valid ? m.ecm         : '—',
      m.valid ? quality(m.rSquared) : 'N/A',
      m.valid ? m.equation    : m.invalidReason ?? 'No aplicable',
    ]);
    setRowHeight(row, 18);
    row.eachCell((cell, col) => {
      const isNum = col >= 4 && col <= 6 && m.valid;
      styleCell(cell, bg, C.dark, false, col <= 3 ? 'left' : 'right');
      if (isNum && typeof cell.value === 'number') cell.numFmt = '0.000000';
    });
    if (!m.valid) row.eachCell(cell => { (cell.font as Font).color = { argb: 'FF999999' }; });
  });

  // Freeze header rows
  ws.views = [{ state: 'frozen', ySplit: 4 }];
}

// ─── Raw data sheet ───────────────────────────────────────────────────────────

function buildDataSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const ws = wb.addWorksheet('Datos');

  ws.columns = [{ width: 8 }, { width: 18 }, { width: 18 }];

  ws.mergeCells('A1:C1');
  const t = ws.getCell('A1');
  t.value = 'Datos de Entrada';
  styleCell(t, C.purple, C.white, true, 'center', false, 12);
  ws.getRow(1).height = 26;

  const hdr = ws.addRow(['N°', 'x', 'y']);
  setRowHeight(hdr, 18);
  hdr.eachCell(cell => styleCell(cell, C.yellow, C.dark, true, 'center'));

  points.forEach((p, i) => {
    const row = ws.addRow([i + 1, p.x, p.y]);
    setRowHeight(row, 16);
    const bg = i % 2 === 0 ? C.white : C.yellowLight;
    row.eachCell((cell, col) => {
      styleCell(cell, bg, C.dark, false, col === 1 ? 'center' : 'right');
      if (col > 1) cell.numFmt = '0.000000';
    });
  });
}

// ─── Helper to add a transposed calculation table ─────────────────────────────

interface CalcVar {
  label: string;
  values: number[];
  sum: number;
}

function addTransposedTable(
  ws: ExcelJS.Worksheet,
  vars: CalcVar[],
  n: number,
  startRow: number,
) {
  const totalCols = n + 2; // label col + n data cols + SUMATORIA col

  // Section header
  const secRow = ws.getRow(startRow);
  ws.mergeCells(startRow, 1, startRow, totalCols);
  const secCell = secRow.getCell(1);
  secCell.value = 'TABLA DE CÁLCULO';
  styleCell(secCell, C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(secRow, 20);
  startRow++;

  // Column header row: empty | N°1 | N°2 | ... | N°n | SUMATORIA
  const colHdrRow = ws.getRow(startRow);
  setRowHeight(colHdrRow, 18);
  colHdrRow.getCell(1).value = '';
  styleCell(colHdrRow.getCell(1), C.gray, C.dark, true, 'center');
  for (let i = 1; i <= n; i++) {
    const c = colHdrRow.getCell(i + 1);
    c.value = `N° ${i}`;
    styleCell(c, C.yellow, C.dark, true, 'center');
  }
  const sumaHdr = colHdrRow.getCell(n + 2);
  sumaHdr.value = 'SUMATORIA';
  styleCell(sumaHdr, C.blue, C.white, true, 'center');
  startRow++;

  // Data rows
  vars.forEach(v => {
    const row = ws.getRow(startRow);
    setRowHeight(row, 16);
    const labelCell = row.getCell(1);
    labelCell.value = v.label;
    styleCell(labelCell, C.gray, C.dark, true, 'left');
    for (let i = 0; i < n; i++) {
      const c = row.getCell(i + 2);
      c.value = fmt(v.values[i]);
      styleCell(c, C.yellowLight, C.dark, false, 'right');
      if (typeof c.value === 'number') c.numFmt = '0.000000';
    }
    const sumaCell = row.getCell(n + 2);
    sumaCell.value = fmt(v.sum);
    styleCell(sumaCell, C.blueLight, C.blue, true, 'right');
    if (typeof sumaCell.value === 'number') sumaCell.numFmt = '0.000000';
    startRow++;
  });

  return startRow;
}

// ─── Helper to add parameters section ────────────────────────────────────────

interface ParamDef {
  label: string;
  value: number | string;
  isEq?: boolean;
}

function addParametersSection(
  ws: ExcelJS.Worksheet,
  params: ParamDef[],
  startRow: number,
  totalCols: number,
) {
  ws.addRow([]);
  startRow++;

  const hdrRow = ws.getRow(startRow);
  ws.mergeCells(startRow, 1, startRow, totalCols);
  hdrRow.getCell(1).value = 'PARÁMETROS DEL AJUSTE';
  styleCell(hdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(hdrRow, 20);
  startRow++;

  params.forEach(p => {
    const row = ws.getRow(startRow);
    setRowHeight(row, 18);
    const lbl = row.getCell(1);
    const val = row.getCell(2);
    lbl.value = p.label;
    val.value = p.isEq ? p.value : fmt(typeof p.value === 'number' ? p.value : NaN);
    styleCell(lbl, C.rose, C.purpleMid, true, 'left');
    styleCell(val, C.cream, C.dark, false, 'right');
    if (typeof val.value === 'number') val.numFmt = '0.00000000';
    ws.mergeCells(startRow, 2, startRow, totalCols);
    startRow++;
  });

  return startRow;
}

// ─── Helper to add fitted-values table ───────────────────────────────────────

interface FittedRow {
  n: number;
  x: number;
  y: number;
  yHat: number;
  residual: number;
  residual2: number;
}

function addFittedTable(
  ws: ExcelJS.Worksheet,
  rows: FittedRow[],
  sse: number,
  ecm: number,
  startRow: number,
  totalCols: number,
) {
  ws.addRow([]);
  startRow++;

  const hdrRow = ws.getRow(startRow);
  ws.mergeCells(startRow, 1, startRow, totalCols);
  hdrRow.getCell(1).value = 'VALORES AJUSTADOS Y RESIDUOS';
  styleCell(hdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(hdrRow, 20);
  startRow++;

  const colHdr = ws.getRow(startRow);
  setRowHeight(colHdr, 18);
  ['N°', 'x', 'y', 'ŷ (ajustado)', 'y − ŷ (residual)', '(y − ŷ)²'].forEach((h, i) => {
    const c = colHdr.getCell(i + 1);
    c.value = h;
    styleCell(c, C.purpleLight, C.white, true, 'center');
  });
  startRow++;

  rows.forEach((r, i) => {
    const row = ws.getRow(startRow);
    setRowHeight(row, 16);
    const bg = i % 2 === 0 ? C.white : C.cream;
    [r.n, r.x, r.y, r.yHat, r.residual, r.residual2].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = fmt(typeof v === 'number' ? v : NaN);
      styleCell(cell, bg, C.dark, false, ci === 0 ? 'center' : 'right');
      if (ci > 0 && typeof cell.value === 'number') cell.numFmt = '0.000000';
    });
    startRow++;
  });

  // SSE row
  const sseRow = ws.getRow(startRow);
  setRowHeight(sseRow, 18);
  sseRow.getCell(1).value = 'TOTAL';
  styleCell(sseRow.getCell(1), C.rose, C.purpleMid, true, 'center');
  sseRow.border = mediumBorder();
  for (let c = 2; c <= 4; c++) {
    sseRow.getCell(c).value = '';
    styleCell(sseRow.getCell(c), C.rose, C.dark, false, 'right');
  }
  sseRow.getCell(5).value = 'SSE =';
  styleCell(sseRow.getCell(5), C.rose, C.purpleMid, true, 'right');
  sseRow.getCell(6).value = fmt(sse);
  styleCell(sseRow.getCell(6), C.rose, C.dark, true, 'right');
  if (typeof sseRow.getCell(6).value === 'number') sseRow.getCell(6).numFmt = '0.000000';
  startRow++;

  const ecmRow = ws.getRow(startRow);
  setRowHeight(ecmRow, 18);
  ecmRow.getCell(1).value = 'ECM = SSE / n';
  styleCell(ecmRow.getCell(1), C.cream, C.purpleMid, true, 'left');
  ecmRow.getCell(2).value = fmt(ecm);
  styleCell(ecmRow.getCell(2), C.cream, C.dark, false, 'right');
  if (typeof ecmRow.getCell(2).value === 'number') ecmRow.getCell(2).numFmt = '0.000000';
  ws.mergeCells(startRow, 2, startRow, totalCols);
  startRow++;

  return startRow;
}

// ─── "Not applicable" sheet ───────────────────────────────────────────────────

function buildUnavailableSheet(wb: ExcelJS.Workbook, name: string, title: string, reason: string) {
  const ws = wb.addWorksheet(name);
  ws.columns = [{ width: 60 }];
  ws.mergeCells('A1:A1');
  const t = ws.getCell('A1');
  t.value = title;
  styleCell(t, C.purple, C.white, true, 'left', false, 12);
  ws.getRow(1).height = 28;
  ws.addRow([]);
  const r = ws.addRow([`⚠ No aplicable: ${reason}`]);
  styleCell(r.getCell(1), C.redBg, C.red, true, 'left', false, 11);
  setRowHeight(r, 22);
}

// ─── Title helper ─────────────────────────────────────────────────────────────

function addSheetTitle(ws: ExcelJS.Worksheet, title: string, formula: string, totalCols: number) {
  ws.mergeCells(1, 1, 1, totalCols);
  const t = ws.getCell(1, 1);
  t.value = title;
  styleCell(t, C.purple, C.white, true, 'center', false, 13);
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, totalCols);
  const f = ws.getCell(2, 1);
  f.value = `Modelo: ${formula}`;
  styleCell(f, C.purpleMid, C.white, false, 'left', false, 10);
  ws.getRow(2).height = 18;

  ws.addRow([]); // blank row 3
}

// ─── Linear fit sheet ─────────────────────────────────────────────────────────

function buildLinearSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = LinearFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Lineal', 'Ajuste Lineal — y = a + bx', 'n < 2'); return; }

  const n      = res.n;
  const tCols  = n + 2;
  const ws     = wb.addWorksheet('Lineal');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 14 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE LINEAL', 'y = a + bx', tCols);

  const vars: CalcVar[] = [
    { label: 'x',  values: res.rows.map(r => r.x),  sum: res.sumX  },
    { label: 'y',  values: res.rows.map(r => r.y),  sum: res.sumY  },
    { label: 'x²', values: res.rows.map(r => r.x2), sum: res.sumX2 },
    { label: 'xy', values: res.rows.map(r => r.xy), sum: res.sumXY },
  ];
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => { const e = r.y - (res.a + res.b * r.x); return s + e * e; }, 0);
  const params: ParamDef[] = [
    { label: 'a  (intercepto)', value: res.a },
    { label: 'b  (pendiente)',  value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const yHat     = res.a + res.b * r.x;
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Exponential fit sheet ────────────────────────────────────────────────────

function buildExponentialSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = ExponentialFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Exponencial', 'Ajuste Exponencial — y = ae^(bx)', 'n < 2'); return; }
  if (res.hasNegativeY) { buildUnavailableSheet(wb, 'Exponencial', 'Ajuste Exponencial — y = ae^(bx)', 'yi ≤ 0 (logaritmo indefinido)'); return; }

  const n = res.n, tCols = n + 2;
  const ws = wb.addWorksheet('Exponencial');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE EXPONENCIAL', 'y = a·e^(bx)   →   ln(y) = ln(a) + bx', tCols);

  const vars: CalcVar[] = [
    { label: 'x',    values: res.rows.map(r => r.x),    sum: res.sumX    },
    { label: 'y',    values: res.rows.map(r => r.y),    sum: res.sumY    },
    { label: 'ln(y)',values: res.rows.map(r => r.lnY),  sum: res.sumLnY  },
    { label: 'x²',   values: res.rows.map(r => r.x2),   sum: res.sumX2   },
    { label: 'x·ln(y)', values: res.rows.map(r => r.xLnY), sum: res.sumXLnY },
  ];
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => { const e = r.y - res.a * Math.exp(res.b * r.x); return s + e * e; }, 0);
  const params: ParamDef[] = [
    { label: 'a  (= e^A, A = intercepto linearizado)', value: res.a },
    { label: 'b  (pendiente linearizada)',             value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const yHat = res.a * Math.exp(res.b * r.x);
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Geometric fit sheet ──────────────────────────────────────────────────────

function buildGeometricSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = GeometricFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Geométrico', 'Ajuste Geométrico — y = ax^b', 'n < 2'); return; }
  if (res.invalidPoints) { buildUnavailableSheet(wb, 'Geométrico', 'Ajuste Geométrico — y = ax^b', 'xi ≤ 0 o yi ≤ 0'); return; }

  const n = res.n, tCols = n + 2;
  const ws = wb.addWorksheet('Geométrico');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE GEOMÉTRICO', 'y = a·x^b   →   ln(y) = ln(a) + b·ln(x)', tCols);

  const vars: CalcVar[] = [
    { label: 'x',       values: res.rows.map(r => r.x),      sum: 0 },
    { label: 'y',       values: res.rows.map(r => r.y),      sum: 0 },
    { label: 'ln(x)',   values: res.rows.map(r => r.lnX),    sum: res.sumLnX   },
    { label: 'ln(y)',   values: res.rows.map(r => r.lnY),    sum: res.sumLnY   },
    { label: 'ln²(x)',  values: res.rows.map(r => r.lnX2),   sum: res.sumLnX2  },
    { label: 'ln(x)·ln(y)', values: res.rows.map(r => r.lnXlnY), sum: res.sumLnXlnY },
  ];
  vars[0].sum = res.rows.reduce((s, r) => s + r.x, 0);
  vars[1].sum = res.rows.reduce((s, r) => s + r.y, 0);
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => { const e = r.y - res.a * Math.pow(r.x, res.b); return s + e * e; }, 0);
  const params: ParamDef[] = [
    { label: 'a  (= e^A, A = intercepto linearizado)', value: res.a },
    { label: 'b  (exponente / pendiente linearizada)', value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const yHat = res.a * Math.pow(r.x, res.b);
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Hyperbolic fit sheet ─────────────────────────────────────────────────────

function buildHyperbolicSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = HyperbolicFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Hiperbólico', 'Ajuste Hiperbólico — y = 1/(a+bx)', 'n < 2'); return; }
  if (res.hasZeroY) { buildUnavailableSheet(wb, 'Hiperbólico', 'Ajuste Hiperbólico — y = 1/(a+bx)', 'yi = 0 (inversa indefinida)'); return; }

  const n = res.n, tCols = n + 2;
  const ws = wb.addWorksheet('Hiperbólico');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE HIPERBÓLICO', 'y = 1/(a+bx)   →   1/y = a + bx', tCols);

  const vars: CalcVar[] = [
    { label: 'x',    values: res.rows.map(r => r.x),    sum: res.sumX    },
    { label: 'y',    values: res.rows.map(r => r.y),    sum: 0           },
    { label: '1/y',  values: res.rows.map(r => r.invY), sum: res.sumInvY },
    { label: 'x²',   values: res.rows.map(r => r.x2),   sum: res.sumX2   },
    { label: 'x·(1/y)', values: res.rows.map(r => r.xInvY), sum: res.sumXInvY },
  ];
  vars[1].sum = res.rows.reduce((s, r) => s + r.y, 0);
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => {
    const d = res.a + res.b * r.x;
    const yHat = d !== 0 ? 1 / d : 0;
    const e = r.y - yHat; return s + e * e;
  }, 0);
  const params: ParamDef[] = [
    { label: 'a  (intercepto en 1/y = a + bx)', value: res.a },
    { label: 'b  (pendiente en 1/y = a + bx)',  value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const d = res.a + res.b * r.x;
    const yHat = d !== 0 ? 1 / d : 0;
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Asymptotic fit sheet ─────────────────────────────────────────────────────

function buildAsymptoticSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = AsymptoticFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Asintótico', 'Exp. Asintótico — y = a(1−e^(−bx))', 'n < 2'); return; }

  const n = res.n, tCols = 7;
  const ws = wb.addWorksheet('Asintótico');
  ws.columns = [
    { width: 8 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 18 }, { width: 18 }, { width: 18 },
  ];

  addSheetTitle(ws, 'AJUSTE EXPONENCIAL ASINTÓTICO', 'y = a·(1 − e^(−bx))   →   Gauss-Newton iterativo', tCols);

  // Convergence info
  const convRow = ws.getRow(4);
  ws.mergeCells(4, 1, 4, tCols);
  convRow.getCell(1).value = res.converged
    ? `Convergencia alcanzada en ${res.iterations.length} iteraciones`
    : `Máximo de iteraciones alcanzado (${res.iterations.length})`;
  styleCell(convRow.getCell(1), res.converged ? C.greenBg : C.cream, res.converged ? C.green : C.dark, true, 'left', false, 10);
  setRowHeight(convRow, 18);

  // Iteration table (first 5 + last)
  let curRow = 6;
  const iterHdr = ws.getRow(curRow);
  setRowHeight(iterHdr, 18);
  ['Iter.', 'a', 'b', 'SSE', 'Δa', 'Δb'].forEach((h, i) => {
    const c = iterHdr.getCell(i + 1);
    c.value = h;
    styleCell(c, C.yellow, C.dark, true, 'center');
  });
  curRow++;

  const shown = res.iterations.length <= 8
    ? res.iterations
    : [...res.iterations.slice(0, 5), ...res.iterations.slice(-1)];
  const hasEllipsis = res.iterations.length > 8;

  shown.forEach((it, idx) => {
    if (hasEllipsis && idx === 5) {
      const r = ws.getRow(curRow++);
      ws.mergeCells(curRow - 1, 1, curRow - 1, 6);
      r.getCell(1).value = `⋮  (${res.iterations.length - 6} iteraciones intermedias omitidas)`;
      styleCell(r.getCell(1), C.yellowLight, C.dark, false, 'center', true, 9);
      setRowHeight(r, 14);
    }
    const r = ws.getRow(curRow);
    setRowHeight(r, 16);
    const bg = idx % 2 === 0 ? C.white : C.yellowLight;
    [it.iter, it.a, it.b, it.sse, it.da, it.db].forEach((v, ci) => {
      const c = r.getCell(ci + 1);
      c.value = fmt(typeof v === 'number' ? v : NaN);
      styleCell(c, bg, C.dark, false, ci === 0 ? 'center' : 'right');
      if (ci > 0 && typeof c.value === 'number') c.numFmt = '0.000000';
    });
    curRow++;
  });
  curRow++;

  // Parameters
  const params: ParamDef[] = [
    { label: 'a  (límite asintótico)', value: res.a },
    { label: 'b  (tasa de crecimiento)', value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'SSE',               value: res.sse },
    { label: 'ECM = SSE / n',     value: res.sse / n },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  const parHdrRow = ws.getRow(curRow);
  ws.mergeCells(curRow, 1, curRow, tCols);
  parHdrRow.getCell(1).value = 'PARÁMETROS DEL AJUSTE';
  styleCell(parHdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(parHdrRow, 20);
  curRow++;

  params.forEach(p => {
    const r = ws.getRow(curRow);
    setRowHeight(r, 18);
    r.getCell(1).value = p.label;
    r.getCell(2).value = p.isEq ? p.value : fmt(typeof p.value === 'number' ? p.value : NaN);
    styleCell(r.getCell(1), C.rose, C.purpleMid, true, 'left');
    styleCell(r.getCell(2), C.cream, C.dark, false, 'right');
    if (typeof r.getCell(2).value === 'number') r.getCell(2).numFmt = '0.00000000';
    ws.mergeCells(curRow, 2, curRow, tCols);
    curRow++;
  });
  curRow++;

  // Fitted values
  const fitHdrRow = ws.getRow(curRow);
  ws.mergeCells(curRow, 1, curRow, tCols);
  fitHdrRow.getCell(1).value = 'VALORES AJUSTADOS Y RESIDUOS';
  styleCell(fitHdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(fitHdrRow, 20);
  curRow++;

  const colHdr = ws.getRow(curRow);
  setRowHeight(colHdr, 18);
  ['N°', 'x', 'y', 'ŷ (ajustado)', 'y − ŷ (residual)', '(y − ŷ)²'].forEach((h, i) => {
    colHdr.getCell(i + 1).value = h;
    styleCell(colHdr.getCell(i + 1), C.purpleLight, C.white, true, 'center');
  });
  curRow++;

  res.rows.forEach((r, i) => {
    const row = ws.getRow(curRow);
    setRowHeight(row, 16);
    const bg = i % 2 === 0 ? C.white : C.cream;
    [r.n, r.x, r.y, r.yHat, r.residual, r.residual2].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = fmt(typeof v === 'number' ? v : NaN);
      styleCell(cell, bg, C.dark, false, ci === 0 ? 'center' : 'right');
      if (ci > 0 && typeof cell.value === 'number') cell.numFmt = '0.000000';
    });
    curRow++;
  });

  const sseRow = ws.getRow(curRow);
  sseRow.getCell(1).value = 'TOTAL'; styleCell(sseRow.getCell(1), C.rose, C.purpleMid, true, 'center');
  for (let c = 2; c <= 4; c++) { sseRow.getCell(c).value = ''; styleCell(sseRow.getCell(c), C.rose, C.dark, false, 'right'); }
  sseRow.getCell(5).value = 'SSE ='; styleCell(sseRow.getCell(5), C.rose, C.purpleMid, true, 'right');
  sseRow.getCell(6).value = fmt(res.sse); styleCell(sseRow.getCell(6), C.rose, C.dark, true, 'right');
  if (typeof sseRow.getCell(6).value === 'number') sseRow.getCell(6).numFmt = '0.000000';
  setRowHeight(sseRow, 18);
}

// ─── Logistic fit sheet ───────────────────────────────────────────────────────

function buildLogisticSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = LogisticFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Logístico', 'Ajuste Logístico — y = L/(1+e^(−k(x−x₀)))', 'n < 3'); return; }

  const n = res.n, tCols = 7;
  const ws = wb.addWorksheet('Logístico');
  ws.columns = [
    { width: 8 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 18 },
  ];

  addSheetTitle(ws, 'AJUSTE LOGÍSTICO', 'y = L / (1 + e^(−k·(x − x₀)))   →   Gauss-Newton iterativo', tCols);

  const convRow = ws.getRow(4);
  ws.mergeCells(4, 1, 4, tCols);
  convRow.getCell(1).value = res.converged
    ? `Convergencia alcanzada en ${res.iterations.length} iteraciones`
    : `Máximo de iteraciones alcanzado (${res.iterations.length})`;
  styleCell(convRow.getCell(1), res.converged ? C.greenBg : C.cream, res.converged ? C.green : C.dark, true, 'left', false, 10);
  setRowHeight(convRow, 18);

  let curRow = 6;
  const iterHdr = ws.getRow(curRow);
  setRowHeight(iterHdr, 18);
  ['Iter.', 'L', 'k', 'x₀', 'SSE', 'Norma Δ'].forEach((h, i) => {
    iterHdr.getCell(i + 1).value = h;
    styleCell(iterHdr.getCell(i + 1), C.yellow, C.dark, true, 'center');
  });
  curRow++;

  const shown = res.iterations.length <= 8
    ? res.iterations
    : [...res.iterations.slice(0, 5), ...res.iterations.slice(-1)];
  const hasEllipsis = res.iterations.length > 8;

  shown.forEach((it, idx) => {
    if (hasEllipsis && idx === 5) {
      const r = ws.getRow(curRow++);
      ws.mergeCells(curRow - 1, 1, curRow - 1, 6);
      r.getCell(1).value = `⋮  (${res.iterations.length - 6} iteraciones intermedias omitidas)`;
      styleCell(r.getCell(1), C.yellowLight, C.dark, false, 'center', true, 9);
      setRowHeight(r, 14);
    }
    const r = ws.getRow(curRow);
    setRowHeight(r, 16);
    const bg = idx % 2 === 0 ? C.white : C.yellowLight;
    [it.iter, it.L, it.k, it.x0, it.sse, it.norm].forEach((v, ci) => {
      const c = r.getCell(ci + 1);
      c.value = fmt(typeof v === 'number' ? v : NaN);
      styleCell(c, bg, C.dark, false, ci === 0 ? 'center' : 'right');
      if (ci > 0 && typeof c.value === 'number') c.numFmt = '0.000000';
    });
    curRow++;
  });
  curRow++;

  const params: ParamDef[] = [
    { label: 'L  (capacidad máxima / asíntota)', value: res.L },
    { label: 'k  (tasa de crecimiento)',          value: res.k },
    { label: 'x₀ (punto de inflexión)',           value: res.x0 },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'SSE',               value: res.sse },
    { label: 'ECM = SSE / n',     value: res.sse / n },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  const parHdrRow = ws.getRow(curRow);
  ws.mergeCells(curRow, 1, curRow, tCols);
  parHdrRow.getCell(1).value = 'PARÁMETROS DEL AJUSTE';
  styleCell(parHdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(parHdrRow, 20);
  curRow++;

  params.forEach(p => {
    const r = ws.getRow(curRow);
    setRowHeight(r, 18);
    r.getCell(1).value = p.label;
    r.getCell(2).value = p.isEq ? p.value : fmt(typeof p.value === 'number' ? p.value : NaN);
    styleCell(r.getCell(1), C.rose, C.purpleMid, true, 'left');
    styleCell(r.getCell(2), C.cream, C.dark, false, 'right');
    if (typeof r.getCell(2).value === 'number') r.getCell(2).numFmt = '0.00000000';
    ws.mergeCells(curRow, 2, curRow, tCols);
    curRow++;
  });
  curRow++;

  // Fitted values table
  const fitHdrRow = ws.getRow(curRow);
  ws.mergeCells(curRow, 1, curRow, tCols);
  fitHdrRow.getCell(1).value = 'VALORES AJUSTADOS Y RESIDUOS';
  styleCell(fitHdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(fitHdrRow, 20);
  curRow++;

  const colHdr = ws.getRow(curRow);
  setRowHeight(colHdr, 18);
  ['N°', 'x', 'y', 'ŷ (ajustado)', 'y − ŷ (residual)', '(y − ŷ)²'].forEach((h, i) => {
    colHdr.getCell(i + 1).value = h;
    styleCell(colHdr.getCell(i + 1), C.purpleLight, C.white, true, 'center');
  });
  curRow++;

  res.rows.forEach((r, i) => {
    const row = ws.getRow(curRow);
    setRowHeight(row, 16);
    const bg = i % 2 === 0 ? C.white : C.cream;
    [r.n, r.x, r.y, r.yHat, r.residual, r.residual2].forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = fmt(typeof v === 'number' ? v : NaN);
      styleCell(cell, bg, C.dark, false, ci === 0 ? 'center' : 'right');
      if (ci > 0 && typeof cell.value === 'number') cell.numFmt = '0.000000';
    });
    curRow++;
  });

  const sseRow = ws.getRow(curRow);
  sseRow.getCell(1).value = 'TOTAL'; styleCell(sseRow.getCell(1), C.rose, C.purpleMid, true, 'center');
  for (let c = 2; c <= 4; c++) { sseRow.getCell(c).value = ''; styleCell(sseRow.getCell(c), C.rose, C.dark, false, 'right'); }
  sseRow.getCell(5).value = 'SSE ='; styleCell(sseRow.getCell(5), C.rose, C.purpleMid, true, 'right');
  sseRow.getCell(6).value = fmt(res.sse); styleCell(sseRow.getCell(6), C.rose, C.dark, true, 'right');
  if (typeof sseRow.getCell(6).value === 'number') sseRow.getCell(6).numFmt = '0.000000';
  setRowHeight(sseRow, 18);
}

// ─── Logarithmic fit sheet ────────────────────────────────────────────────────

function buildLogarithmicSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = LogarithmicFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Logarítmico', 'Ajuste Logarítmico — y = a+b·ln(x)', 'n < 2'); return; }
  if (res.hasNonPositiveX) { buildUnavailableSheet(wb, 'Logarítmico', 'Ajuste Logarítmico — y = a+b·ln(x)', 'xi ≤ 0 (ln indefinido)'); return; }

  const n = res.n, tCols = n + 2;
  const ws = wb.addWorksheet('Logarítmico');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE LOGARÍTMICO', 'y = a + b·ln(x)   →   Y = a + bX  donde X = ln(x)', tCols);

  const vars: CalcVar[] = [
    { label: 'x',    values: res.rows.map(r => r.x),    sum: 0              },
    { label: 'y',    values: res.rows.map(r => r.y),    sum: res.sumY       },
    { label: 'ln(x)',values: res.rows.map(r => r.lnX),  sum: res.sumLnX     },
    { label: 'ln²(x)',values: res.rows.map(r => r.lnX2), sum: res.sumLnX2   },
    { label: 'y·ln(x)',values: res.rows.map(r => r.yLnX), sum: res.sumYLnX  },
  ];
  vars[0].sum = res.rows.reduce((s, r) => s + r.x, 0);
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => { const e = r.y - (res.a + res.b * Math.log(r.x)); return s + e * e; }, 0);
  const params: ParamDef[] = [
    { label: 'a  (intercepto)', value: res.a },
    { label: 'b  (pendiente)',  value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const yHat = res.a + res.b * Math.log(r.x);
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Power fit sheet ──────────────────────────────────────────────────────────

function buildPowerSheet(wb: ExcelJS.Workbook, points: DataPoint[]) {
  const res = PowerFitService.compute(points);
  if (!res) { buildUnavailableSheet(wb, 'Potencial', 'Ajuste Potencial — y = ax^b', 'n < 2'); return; }
  if (res.invalidPoints) { buildUnavailableSheet(wb, 'Potencial', 'Ajuste Potencial — y = ax^b', 'xi ≤ 0 o yi ≤ 0'); return; }

  const n = res.n, tCols = n + 2;
  const ws = wb.addWorksheet('Potencial');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, 'AJUSTE POTENCIAL', 'y = a·x^b   →   ln(y) = ln(a) + b·ln(x)', tCols);

  const vars: CalcVar[] = [
    { label: 'x',           values: res.rows.map(r => r.x),       sum: 0                },
    { label: 'y',           values: res.rows.map(r => r.y),       sum: 0                },
    { label: 'ln(x)',       values: res.rows.map(r => r.lnX),     sum: res.sumLnX       },
    { label: 'ln(y)',       values: res.rows.map(r => r.lnY),     sum: res.sumLnY       },
    { label: 'ln²(x)',      values: res.rows.map(r => r.lnX2),    sum: res.sumLnX2      },
    { label: 'ln(x)·ln(y)', values: res.rows.map(r => r.lnXlnY), sum: res.sumLnXlnY    },
  ];
  vars[0].sum = res.rows.reduce((s, r) => s + r.x, 0);
  vars[1].sum = res.rows.reduce((s, r) => s + r.y, 0);
  let row = addTransposedTable(ws, vars, n, 4);

  const sse = res.rows.reduce((s, r) => { const e = r.y - res.a * Math.pow(r.x, res.b); return s + e * e; }, 0);
  const params: ParamDef[] = [
    { label: 'a  (= e^A, A = intercepto linearizado)', value: res.a },
    { label: 'b  (exponente / pendiente linearizada)', value: res.b },
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  ];
  row = addParametersSection(ws, params, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => {
    const yHat = res.a * Math.pow(r.x, res.b);
    const residual = r.y - yHat;
    return { n: r.n, x: r.x, y: r.y, yHat, residual, residual2: residual * residual };
  });
  addFittedTable(ws, fitted, sse, sse / n, row, tCols);
}

// ─── Polynomial fit sheet ─────────────────────────────────────────────────────

function buildPolynomialSheet(wb: ExcelJS.Workbook, points: DataPoint[], degree = 2) {
  if (points.length < degree + 1) {
    buildUnavailableSheet(wb, 'Polinomial', `Ajuste Polinomial grado ${degree}`, `n < ${degree + 1}`);
    return;
  }
  const res = PolynomialFitService.compute(points, degree);
  if (!res) { buildUnavailableSheet(wb, 'Polinomial', `Ajuste Polinomial grado ${degree}`, 'Sistema singular'); return; }

  const n     = res.n;
  const k     = res.degree;
  const tCols = n + 2;
  const ws    = wb.addWorksheet('Polinomial');
  const colW: Partial<ExcelJS.Column>[] = [{ width: 16 }];
  for (let i = 0; i < n; i++) colW.push({ width: 13 });
  colW.push({ width: 14 });
  ws.columns = colW;

  addSheetTitle(ws, `AJUSTE POLINOMIAL (Grado ${k})`, `y = a₀ + a₁x + a₂x² + … + aₖxᵏ   (ecuaciones normales)`, tCols);

  // Build variables: x, y, x², xy, x³, x²y, ... up to xᵏ, xᵏ⁻¹y
  const SUPS = ['', '', '²', '³', '⁴', '⁵'];
  const calcVars: CalcVar[] = [
    { label: 'x',  values: res.rows.map(r => r.x),  sum: res.xSums[1] },
    { label: 'y',  values: res.rows.map(r => r.y),  sum: res.xySums[0] },
  ];
  // x powers: x², x³, ..., x^(2k)
  for (let p = 2; p <= 2 * k; p++) {
    const sup  = p <= 5 ? SUPS[p] : `^${p}`;
    const vals = res.rows.map(r => Math.pow(r.x, p));
    calcVars.push({ label: `x${sup}`, values: vals, sum: res.xSums[p] });
  }
  // xy products: xy, x²y, ..., x^k y
  for (let p = 1; p <= k; p++) {
    const sup  = p <= 1 ? '' : (p <= 5 ? SUPS[p] : `^${p}`);
    const vals = res.rows.map(r => Math.pow(r.x, p) * r.y);
    calcVars.push({ label: `x${sup}y`, values: vals, sum: res.xySums[p] });
  }

  let row = addTransposedTable(ws, calcVars, n, 4);

  // Normal equations section
  ws.addRow([]);
  row++;
  const neHdrRow = ws.getRow(row);
  ws.mergeCells(row, 1, row, tCols);
  neHdrRow.getCell(1).value = 'ECUACIONES NORMALES (Sistema XᵀX·β = Xᵀy)';
  styleCell(neHdrRow.getCell(1), C.purpleMid, C.white, true, 'left', false, 11);
  setRowHeight(neHdrRow, 20);
  row++;

  // Show the (k+1)x(k+2) augmented matrix rows
  const m = k + 1;
  const colLabels = ['', ...res.xSums.slice(0, m).map((_, j) => `Σx${j === 0 ? '⁰' : j <= 5 ? SUPS[j] || `^${j}` : `^${j}`}`), 'Σxⁱy'];
  const matHdr = ws.getRow(row);
  setRowHeight(matHdr, 16);
  colLabels.forEach((h, ci) => {
    matHdr.getCell(ci + 1).value = h;
    styleCell(matHdr.getCell(ci + 1), C.yellow, C.dark, true, 'center');
  });
  row++;

  for (let i = 0; i < m; i++) {
    const r = ws.getRow(row);
    setRowHeight(r, 16);
    r.getCell(1).value = `a${i}`;
    styleCell(r.getCell(1), C.gray, C.dark, true, 'center');
    for (let j = 0; j < m; j++) {
      const c = r.getCell(j + 2);
      c.value = fmt(res.XtX[i][j]);
      styleCell(c, i % 2 === 0 ? C.yellowLight : C.white, C.dark, false, 'right');
      if (typeof c.value === 'number') c.numFmt = '0.000000';
    }
    const rhsCell = r.getCell(m + 2);
    rhsCell.value = fmt(res.Xty[i]);
    styleCell(rhsCell, C.blueLight, C.blue, true, 'right');
    if (typeof rhsCell.value === 'number') rhsCell.numFmt = '0.000000';
    row++;
  }

  // Parameters
  const paramDefs: ParamDef[] = res.coefficients.map((c, i) => ({
    label: `a${i}${i === 0 ? '  (término independiente)' : i === 1 ? '  (coeficiente lineal)' : `  (coeficiente x${i <= 5 ? SUPS[i] : `^${i}`})`}`,
    value: c,
  }));
  paramDefs.push(
    { label: 'Ecuación ajustada', value: res.equation, isEq: true },
    { label: 'SSE',               value: res.sse },
    { label: 'ECM = SSE / n',     value: res.ecm },
    { label: 'r  (correlación)',  value: res.r },
    { label: 'R² (determinación)', value: res.rSquared },
    { label: 'R² (%)',  value: fmtPct(res.rSquared), isEq: true },
    { label: 'Calidad', value: quality(res.rSquared), isEq: true },
  );
  row = addParametersSection(ws, paramDefs, row, tCols);

  const fitted: FittedRow[] = res.rows.map(r => ({
    n: r.n, x: r.x, y: r.y, yHat: r.yHat,
    residual: r.residual, residual2: r.residual2,
  }));
  addFittedTable(ws, fitted, res.sse, res.ecm, row, tCols);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const ReportExcelService = {
  async generate(points: DataPoint[]): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'CurveAnalysis v1.0';
    wb.created  = new Date();
    wb.modified = new Date();

    buildSummarySheet(wb, points);
    buildDataSheet(wb, points);
    buildLinearSheet(wb, points);
    buildExponentialSheet(wb, points);
    buildGeometricSheet(wb, points);
    buildHyperbolicSheet(wb, points);
    buildAsymptoticSheet(wb, points);
    buildLogisticSheet(wb, points);
    buildLogarithmicSheet(wb, points);
    buildPowerSheet(wb, points);
    buildPolynomialSheet(wb, points);

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);
    triggerDownload(buffer as ArrayBuffer, `CurveAnalysis_${date}.xlsx`);
  },
};
