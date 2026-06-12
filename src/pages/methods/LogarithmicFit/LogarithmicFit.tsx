import { useMemo, useState } from 'react';
import { Layers, Download, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { LogarithmicFitService, type LogarithmicFitResult } from '../../../services/logarithmicFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './LogarithmicFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('logarithmic')!;

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtResult(v: number): string {
  if (isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return v.toFixed(6).replace(/\.?0+$/, '');
  return v.toExponential(4);
}

function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(4)).toString();
  return v.toExponential(2);
}

// ─── Chart ─────────────────────────────────────────────────────────────────────

interface ChartProps {
  result: LogarithmicFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve:   { x: number; y: number }[];
}

function LogarithmicChart({ result, dataPoints, fitCurve }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y)];
  const allX = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad: number = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;
  const xPad: number = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
  const yDomain: [number, number] = [Math.min(...allY) - yPad, Math.max(...allY) + yPad];
  const xDomain: [number, number] = [Math.max(0, Math.min(...allX) - xPad), Math.max(...allX) + xPad];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          type="number" dataKey="x"
          domain={xDomain} tickCount={7} tickFormatter={fmtAxis}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
        >
          <Label value="X" offset={-8} position="insideBottom"
            style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </XAxis>
        <YAxis
          type="number" dataKey="y"
          domain={yDomain} tickCount={6} tickFormatter={fmtAxis}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          width={70}
        >
          <Label value="Y" angle={-90} position="insideLeft"
            style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </YAxis>
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(v: number) => fmtResult(v)}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

        {/* Fitted curve */}
        <Scatter
          name={`Ajuste: ${result.equation}`}
          data={fitCurve}
          fill="transparent"
          line={{ stroke: '#e03030', strokeWidth: 2 }}
          shape={() => null as unknown as React.ReactElement}
          legendType="line"
        />
        {/* Data points */}
        <Scatter
          name="Datos originales"
          data={dataPoints}
          fill="#6366f1"
          stroke="#4f46e5"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: LogarithmicFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>ln(Xᵢ)</th>
            <th>ln²(Xᵢ)</th>
            <th>Yᵢ · ln(Xᵢ)</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnX)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnX2)}</td>
              <td className={styles.numeric}>{fmtResult(row.yLnX)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>—</td>
            <td className={styles.numeric}>{fmtResult(result.sumY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnX)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnX2)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumYLnX)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Linearization box ─────────────────────────────────────────────────────────

function LinearizationBox({ result }: { result: LogarithmicFitResult }) {
  return (
    <div className={styles.linearizationBox}>
      <p className={styles.linearizationTitle}>Linealización aplicada</p>
      <div className={styles.linearizationSteps}>
        <span>y = a + b·ln(x)</span>
        <span className={styles.arrow}>→</span>
        <span>X = ln(x)</span>
        <span className={styles.arrow}>→</span>
        <span>y = a + b·X</span>
      </div>
      <div className={styles.linearizationValues}>
        <span>X = ln(x)</span>
        <span>a = {fmtResult(result.a)}</span>
        <span>b = {fmtResult(result.b)}</span>
        <span>y(1) = a = {fmtResult(result.a)}</span>
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildLogSteps(result: LogarithmicFitResult): StepData[] {
  const { n, sumLnX, sumY, sumLnX2, sumY2, sumYLnX, a, b, r, rSquared } = result;
  const D = n * sumLnX2 - sumLnX * sumLnX;
  const numerB = n * sumYLnX - sumLnX * sumY;
  const D2 = n * sumY2 - sumY * sumY;
  const denomR = Math.sqrt(Math.max(0, D * D2));
  const C = '#4f46e5';
  const BG = '#eef2ff';
  const BD = '#c7d2fe';

  return [
    {
      title: 'Sustitución de variable independiente',
      children: (
        <div>
          <p className={ss.text}>
            El modelo y = a + b·ln(x) ya es lineal en ln(x). Se sustituye X = ln(x):
          </p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            y = a + b·X &nbsp;&nbsp;(X = ln(x)) &nbsp;&nbsp;→&nbsp;&nbsp; Regresión lineal sobre (ln(xᵢ), yᵢ)
          </div>
          <p className={ss.note}>No es necesario transformar y. Solo la variable x se logaritmiza.</p>
        </div>
      ),
    },
    {
      title: 'Sumas con X = ln(x)',
      children: (
        <div>
          <p className={ss.text}>Con Xᵢ = ln(xᵢ):</p>
          <div className={ss.chips}>
            {[`n = ${n}`, `ΣXᵢ = Σln(xᵢ) = ${fmtS(sumLnX)}`, `Σyᵢ = ${fmtS(sumY)}`,
              `ΣXᵢ² = ${fmtS(sumLnX2)}`, `ΣXᵢyᵢ = Σln(x)·y = ${fmtS(sumYLnX)}`, `Σyᵢ² = ${fmtS(sumY2)}`]
              .map(s => <span key={s} className={ss.chip}>{s}</span>)}
          </div>
        </div>
      ),
    },
    {
      title: 'Denominador común D',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>D = n·ΣXᵢ² − (ΣXᵢ)²</div>
          <div className={ss.calcBlock}>
            <div>= {n} × {fmtS(sumLnX2)} − ({fmtS(sumLnX)})²</div>
            <div>= {fmtS(n * sumLnX2)} − {fmtS(sumLnX * sumLnX)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>D = {fmtS(D)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente b (escala logarítmica)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>b = (n·ΣXᵢyᵢ − ΣXᵢ·Σyᵢ) / D</div>
          <div className={ss.calcBlock}>
            <div>= ({n} × {fmtS(sumYLnX)} − {fmtS(sumLnX)} × {fmtS(sumY)}) / {fmtS(D)}</div>
            <div>= ({fmtS(n * sumYLnX)} − {fmtS(sumLnX * sumY)}) / {fmtS(D)}</div>
            <div>= {fmtS(numerB)} / {fmtS(D)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>b = {fmtS(b)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente a (intercepto)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>a = (Σyᵢ − b·ΣXᵢ) / n</div>
          <div className={ss.calcBlock}>
            <div>= ({fmtS(sumY)} − {fmtS(b)} × {fmtS(sumLnX)}) / {n}</div>
            <div>= ({fmtS(sumY)} − {fmtS(b * sumLnX)}) / {n}</div>
            <div>= {fmtS(sumY - b * sumLnX)} / {n}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>a = {fmtS(a)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente de correlación r y R²',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            r = (n·ΣXᵢyᵢ − ΣXᵢ·Σyᵢ) / √[D·(n·Σyᵢ² − (Σyᵢ)²)] &nbsp;&nbsp; R² = r²
          </div>
          <div className={ss.calcBlock}>
            <div>D₂ = {n}·{fmtS(sumY2)} − ({fmtS(sumY)})² = {fmtS(D2)}</div>
            <div>Denominador = √({fmtS(D)} × {fmtS(D2)}) = {fmtS(denomR)}</div>
            <div>r = {fmtS(numerB)} / {fmtS(denomR)} = {fmtS(r)}</div>
            <div>R² = ({fmtS(r)})² = {fmtS(rSquared)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>
            r = {fmtS(r)} &nbsp;·&nbsp; R² = {fmtS(rSquared)} ({(rSquared * 100).toFixed(2)} %)
          </span>
          <div className={ss.conclusionBox} style={{ background: BG, borderColor: BD }}>
            <span className={ss.conclusionEq} style={{ color: C }}>{result.equation}</span>
          </div>
        </div>
      ),
    },
  ];
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function LogarithmicFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? LogarithmicFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result && !result.hasNonPositiveX ? LogarithmicFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(() => points.map(p => ({ x: p.x, y: p.y })), [points]);

  const hasData  = points.length >= 2;
  const canRender = result !== null && !result.hasNonPositiveX;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE LOGARÍTMICO — CurveAnalysis',
      '=====================================',
      `n = ${result.n}`,
      `a              = ${fmtResult(result.a)}`,
      `b              = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de cálculo (sustitución X = ln(x)):',
      'N°\tXi\tYi\tln(Xi)\tln²(Xi)\tYi·ln(Xi)',
      ...result.rows.map(r =>
        `${r.n}\t${r.x}\t${r.y}\t${fmtResult(r.lnX)}\t${fmtResult(r.lnX2)}\t${fmtResult(r.yLnX)}`
      ),
      `Σ\t—\t${fmtResult(result.sumY)}\t${fmtResult(result.sumLnX)}\t${fmtResult(result.sumLnX2)}\t${fmtResult(result.sumYLnX)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href    = url;
    el.download = 'ajuste_logaritmico.txt';
    el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Ajuste de Curvas · ${method.name}`}
        title={method.name}
        formula={method.formula}
        description={method.description}
        icon={<Layers size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={handleReset} disabled={!calculated}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Layers size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <Layers size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) con Xi &gt; 0 en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {result?.hasNonPositiveX && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                <span>
                  El ajuste logarítmico requiere Xi &gt; 0 en todos los pares (se necesita calcular ln(Xi)).
                  Revise o corrija sus datos.
                </span>
              </div>
            )}

            {/* Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Logarítmico</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {canRender ? (
                <LogarithmicChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <Layers size={28} className={styles.placeholderIcon} />
                  <p>
                    {result?.hasNonPositiveX
                      ? 'No se puede graficar: Xi contiene valores ≤ 0'
                      : <>Presione <strong>Calcular</strong> para generar la gráfica</>}
                  </p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {canRender && (
              <>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Tabla de Cálculo Intermedio (sustitución X = ln x)</p>
                  <CalcTable result={result} />
                  <div className={styles.sumSummary}>
                    <span>n = {result.n}</span>
                    <span>Σy = {fmtResult(result.sumY)}</span>
                    <span>Σln(x) = {fmtResult(result.sumLnX)}</span>
                    <span>Σln²(x) = {fmtResult(result.sumLnX2)}</span>
                    <span>Σy·ln(x) = {fmtResult(result.sumYLnX)}</span>
                  </div>
                </div>

                <div className={styles.card}>
                  <LinearizationBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {canRender && result && (
              <SolutionSteps steps={buildLogSteps(result)} color="#4f46e5" />
            )}

            {/* Input data */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Datos de Entrada ({points.length} pares)</p>
              <div className={styles.tableWrapper}>
                <table className={styles.calcTable}>
                  <thead><tr><th>N°</th><th>Xi</th><th>Yi</th></tr></thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={p.id}>
                        <td className={styles.centered}>{i + 1}</td>
                        <td className={styles.numeric}>{DataService.formatNumber(p.x)}</td>
                        <td className={styles.numeric}>{DataService.formatNumber(p.y)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Side column ── */}
          <div className={styles.sideCol}>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Ecuación Ajustada</p>
              <div className={styles.equationBox}>
                {canRender ? (
                  <span className={styles.equation}>{result.equation}</span>
                ) : (
                  <span className={styles.equationPlaceholder}>
                    {result?.hasNonPositiveX
                      ? 'No aplicable (Xi ≤ 0)'
                      : 'Ejecute el cálculo para obtener la ecuación'}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a',  desc: 'Intercepto (y en x=1)', value: result?.a },
                  { label: 'b',  desc: 'Coef. logarítmico',     value: result?.b },
                  { label: 'r',  desc: 'Coef. correlación',     value: result?.r },
                  { label: 'R²', desc: 'Coef. determinación',   value: result?.rSquared },
                ].map(({ label, desc, value }) => (
                  <div key={label} className={styles.resultItem}>
                    <span className={styles.resultLabel}>{label}</span>
                    <span className={styles.resultDesc}>{desc}</span>
                    {value !== undefined ? (
                      <span className={styles.resultValue}>{fmtResult(value)}</span>
                    ) : (
                      <span className={styles.resultPlaceholder}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Interpretation card */}
            {canRender && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Interpretación del Modelo</p>
                <div className={styles.interpretGrid}>
                  <div className={styles.interpretItem}>
                    <span className={styles.interpretLabel}>y en x = 1</span>
                    <span className={styles.interpretValue}>{fmtResult(result.a)}</span>
                    <span className={styles.interpretDesc}>ln(1) = 0, por tanto y = a</span>
                  </div>
                  <div className={styles.interpretItem}>
                    <span className={styles.interpretLabel}>Cambio por décuplo</span>
                    <span className={styles.interpretValue}>{fmtResult(result.b * Math.log(10))}</span>
                    <span className={styles.interpretDesc}>Δy cuando x se multiplica por 10</span>
                  </div>
                  <div className={styles.interpretItem}>
                    <span className={styles.interpretLabel}>Tipo de crecimiento</span>
                    <span className={styles.interpretValue} style={{ fontSize: 'var(--text-sm)' }}>
                      {result.b > 0 ? 'Logarítmico creciente' : result.b < 0 ? 'Logarítmico decreciente' : 'Constante'}
                    </span>
                    <span className={styles.interpretDesc}>{result.b > 0 ? 'b > 0' : result.b < 0 ? 'b < 0' : 'b = 0'}</span>
                  </div>
                </div>
              </div>
            )}

            {canRender && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Calidad del Ajuste</p>
                <div className={styles.qualityBar}>
                  <div
                    className={styles.qualityFill}
                    style={{
                      width: `${Math.min(Math.abs(result.rSquared) * 100, 100)}%`,
                      background: result.rSquared >= 0.95
                        ? 'var(--color-success)'
                        : result.rSquared >= 0.8
                        ? 'var(--color-warning)'
                        : 'var(--color-error)',
                    }}
                  />
                </div>
                <p className={styles.qualityLabel}>
                  R² = {(result.rSquared * 100).toFixed(2)}% —{' '}
                  {result.rSquared >= 0.95 ? 'Ajuste excelente'
                    : result.rSquared >= 0.8 ? 'Ajuste aceptable'
                    : result.rSquared >= 0.6 ? 'Ajuste moderado'
                    : 'Ajuste débil'}
                </p>
              </div>
            )}

            <div className={styles.card}>
              <p className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={15} />Aplicabilidad
              </p>
              <p className={styles.infoText}>{method.applicability}</p>
              <p className={styles.infoNote}>
                Requiere Xi &gt; 0. Se linealiza sustituyendo X = ln(x) y
                aplicando regresión lineal directa sobre los pares (ln(xᵢ), yᵢ).
              </p>
            </div>

            <div className={styles.actionsCol}>
              <Button variant="outline" size="sm" fullWidth leftIcon={<Download size={14} />}
                disabled={!canRender} onClick={handleExport}>
                Exportar Resultados
              </Button>
              <Button variant="ghost" size="sm" fullWidth
                onClick={() => { clearAll(); handleReset(); }} disabled={!hasData}>
                Limpiar datos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
