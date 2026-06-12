import { useMemo, useState } from 'react';
import { Zap, Download, RefreshCw, Info, CheckCircle, AlertCircle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { LogisticFitService, type LogisticFitResult } from '../../../services/logisticFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './LogisticFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('logistic')!;

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtResult(v: number): string {
  if (isNaN(v) || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return v.toFixed(6).replace(/\.?0+$/, '');
  return v.toExponential(4);
}

function fmtIter(v: number): string {
  if (!isFinite(v)) return '—';
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
  result: LogisticFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve:   { x: number; y: number }[];
}

function LogisticChart({ result, dataPoints, fitCurve }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y), result.L];
  const allX = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad: number = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;
  const xPad: number = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
  const yDomain: [number, number] = [Math.min(0, Math.min(...allY) - yPad), Math.max(...allY) + yPad];
  const xDomain: [number, number] = [Math.min(...allX) - xPad, Math.max(...allX) + xPad];

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

        {/* Asymptote L */}
        <ReferenceLine
          y={result.L}
          stroke="#db2777"
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{ value: `L = ${fmtResult(result.L)}`, position: 'insideTopRight', fontSize: 11, fill: '#db2777' }}
        />
        {/* Inflection point x₀ */}
        <ReferenceLine
          x={result.x0}
          stroke="#9333ea"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ value: `x₀ = ${fmtResult(result.x0)}`, position: 'insideTopRight', fontSize: 10, fill: '#9333ea' }}
        />

        {/* Fitted sigmoid */}
        <Scatter
          name={`Ajuste logístico`}
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
          fill="#f43f5e"
          stroke="#e11d48"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Gauss-Newton iteration table ──────────────────────────────────────────────

function IterationTable({ result }: { result: LogisticFitResult }) {
  const iters = result.iterations;
  const shown = iters.length <= 12
    ? iters
    : [...iters.slice(0, 6), { iter: -1, L: NaN, k: NaN, x0: NaN, sse: NaN, norm: NaN }, ...iters.slice(-3)];

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>Iter.</th>
            <th>L</th>
            <th>k</th>
            <th>x₀</th>
            <th>SSE</th>
            <th>‖Δθ‖</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row, idx) =>
            row.iter === -1 ? (
              <tr key={`ell-${idx}`} className={styles.ellipsisRow}>
                <td colSpan={6} className={styles.centered}>⋮</td>
              </tr>
            ) : (
              <tr key={row.iter} className={row.iter === iters.length ? styles.lastIterRow : undefined}>
                <td className={styles.centered}>{row.iter}</td>
                <td className={styles.numeric}>{fmtIter(row.L)}</td>
                <td className={styles.numeric}>{fmtIter(row.k)}</td>
                <td className={styles.numeric}>{fmtIter(row.x0)}</td>
                <td className={styles.numeric}>{fmtIter(row.sse)}</td>
                <td className={styles.numeric}>{fmtIter(row.norm)}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Residuals table ───────────────────────────────────────────────────────────

function ResidualsTable({ result }: { result: LogisticFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th><th>Xᵢ</th><th>Yᵢ</th><th>Ŷᵢ</th>
            <th>Eᵢ = Yᵢ − Ŷᵢ</th><th>Eᵢ²</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.yHat)}</td>
              <td className={`${styles.numeric} ${Math.abs(row.residual) < 1e-3 ? styles.residualGood : ''}`}>
                {fmtResult(row.residual)}
              </td>
              <td className={styles.numeric}>{fmtResult(row.residual2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td colSpan={3} />
            <td className={styles.numeric}>
              {fmtResult(result.rows.reduce((s, r) => s + r.residual, 0))}
            </td>
            <td className={styles.numeric}>{fmtResult(result.sse)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Method info box ───────────────────────────────────────────────────────────

function MethodBox({ result }: { result: LogisticFitResult }) {
  return (
    <div className={styles.methodBox}>
      <p className={styles.methodTitle}>Método numérico: Gauss-Newton (3 parámetros)</p>
      <div className={styles.methodSteps}>
        <span>y = L / (1 + e<sup>−k(x−x₀)</sup>)</span>
        <span className={styles.arrow}>→</span>
        <span>min Σ(yᵢ − ŷᵢ)²</span>
        <span className={styles.arrow}>→</span>
        <span>J<sup>T</sup>J · Δθ = J<sup>T</sup>r</span>
      </div>
      <div className={styles.methodValues}>
        <span>∂f/∂L = 1/(1+s)</span>
        <span>∂f/∂k = Ls(x−x₀)/(1+s)²</span>
        <span>∂f/∂x₀ = −Lks/(1+s)²</span>
        <span>Iter: {result.iterations.length}</span>
        <span>SSE = {fmtIter(result.sse)}</span>
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildLogisticSteps(result: LogisticFitResult): StepData[] {
  const { n, L, k, x0, r, rSquared, sse, converged, iterations, rows } = result;
  const maxY = Math.max(...rows.map(r => r.y));
  const xs = rows.map(r => r.x).sort((a, b) => a - b);
  const medX = xs[Math.floor(xs.length / 2)];
  const C = '#be185d';
  const BG = '#fdf2f8';
  const BD = '#fbcfe8';

  const iterDisplay: Array<{ iter: number; L: number; k: number; x0: number; sse: number; highlight: boolean }> = [];
  if (iterations.length > 0) {
    const show = Math.min(3, iterations.length);
    for (let i = 0; i < show; i++) {
      iterDisplay.push({ ...iterations[i], highlight: false });
    }
    if (iterations.length > 4) iterDisplay.push({ iter: -1, L: 0, k: 0, x0: 0, sse: 0, highlight: false });
    if (iterations.length > 3) {
      iterDisplay.push({ ...iterations[iterations.length - 1], highlight: true });
    }
  }

  return [
    {
      title: 'Modelo logístico de 3 parámetros',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            y = L / (1 + e^(−k·(x − x₀))) &nbsp;&nbsp;→&nbsp;&nbsp; 3 parámetros: L (cap. máx.), k (tasa), x₀ (inflexión)
          </div>
          <p className={ss.note}>
            El modelo sigmoidal no es linealizable. Se minimiza SSE = Σ(yᵢ − ŷᵢ)² con el método de Gauss-Newton
            extendido a 3 parámetros.
          </p>
        </div>
      ),
    },
    {
      title: 'Estimación inicial de parámetros',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            L₀ ≈ 1.1 × max(yᵢ) &nbsp;&nbsp; x₀₀ ≈ mediana(xᵢ) &nbsp;&nbsp; k₀ estimado del crecimiento
          </div>
          <div className={ss.calcBlock}>
            <div>max(yᵢ) = {fmtS(maxY)} &nbsp;→&nbsp; L₀ ≈ 1.1 × {fmtS(maxY)} = {fmtS(1.1 * maxY)}</div>
            <div>x₀₀ ≈ mediana(xᵢ) = {fmtS(medX)}</div>
            <div>k₀: estimado a partir de la tasa de cambio en el punto de inflexión</div>
          </div>
          <p className={ss.note}>Estos valores orientan la búsqueda pero el método los refina automáticamente.</p>
        </div>
      ),
    },
    {
      title: 'Jacobiano y sistema normal (3×3)',
      children: (
        <div>
          <p className={ss.text}>En cada iteración se calculan las 3 derivadas parciales:</p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            ∂f/∂L = 1/(1+e^(−k(x−x₀))) &nbsp;&nbsp; ∂f/∂k = L·(x−x₀)·e^(−k(x−x₀))/(1+e^(−k(x−x₀)))²
          </div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            ∂f/∂x₀ = −L·k·e^(−k(x−x₀))/(1+e^(−k(x−x₀)))²
          </div>
          <p className={ss.text}>Se resuelve el sistema 3×3 y se actualiza [L, k, x₀] ← [L, k, x₀] + [ΔL, Δk, Δx₀].</p>
        </div>
      ),
    },
    {
      title: `Evolución de iteraciones (${iterations.length} total)`,
      children: (
        <div>
          {iterations.length === 0 ? (
            <p className={ss.text}>Sin datos de iteración disponibles.</p>
          ) : (
            <table className={ss.iterTable}>
              <thead>
                <tr><th>Iter</th><th>L</th><th>k</th><th>x₀</th><th>SSE</th></tr>
              </thead>
              <tbody>
                {iterDisplay.map((row, i) =>
                  row.iter === -1 ? (
                    <tr key={`ell-${i}`} className={ss.ellipsisRow}>
                      <td colSpan={5}>· · ·</td>
                    </tr>
                  ) : (
                    <tr key={row.iter} className={row.highlight ? ss.highlightRow : undefined}>
                      <td>{row.iter}</td>
                      <td>{fmtS(row.L)}</td>
                      <td>{fmtS(row.k)}</td>
                      <td>{fmtS(row.x0)}</td>
                      <td>{fmtS(row.sse)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      title: 'Convergencia y parámetros finales',
      children: (
        <div>
          <div className={ss.chips} style={{ marginBottom: '0.5rem' }}>
            {[
              `Converged: ${converged ? 'Sí ✓' : 'No (máx. iter.)'}`,
              `Iteraciones: ${iterations.length}`,
              `n = ${n}`,
            ].map(s => <span key={s} className={ss.chip}>{s}</span>)}
          </div>
          <div className={ss.calcBlock}>
            <div>SSE final = {fmtS(sse)}</div>
            <div>r = {fmtS(r)}</div>
            <div>R² = ({fmtS(r)})² = {fmtS(rSquared)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>
            L = {fmtS(L)} &nbsp;·&nbsp; k = {fmtS(k)} &nbsp;·&nbsp; x₀ = {fmtS(x0)} &nbsp;·&nbsp; R² = {fmtS(rSquared)} ({(rSquared * 100).toFixed(2)} %)
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

export function LogisticFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const tooFewPoints = points.length < 3;

  const result = useMemo(
    () => (calculated && points.length >= 3 ? LogisticFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result ? LogisticFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(() => points.map(p => ({ x: p.x, y: p.y })), [points]);

  const hasData = points.length >= 3;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE LOGÍSTICO — CurveAnalysis',
      '=====================================',
      `n  = ${result.n}`,
      `L  (capacidad de carga) = ${fmtResult(result.L)}`,
      `k  (tasa de crecimiento) = ${fmtResult(result.k)}`,
      `x₀ (punto de inflexión) = ${fmtResult(result.x0)}`,
      `r  = ${fmtResult(result.r)}`,
      `R² = ${fmtResult(result.rSquared)}`,
      `SSE = ${fmtIter(result.sse)}`,
      `Convergió = ${result.converged ? 'Sí' : 'No'}`,
      `Iteraciones = ${result.iterations.length}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de valores ajustados y residuos:',
      'N°\tXi\tYi\tŶi\tEi\tEi²',
      ...result.rows.map(r =>
        `${r.n}\t${r.x}\t${r.y}\t${fmtResult(r.yHat)}\t${fmtResult(r.residual)}\t${fmtResult(r.residual2)}`
      ),
      '',
      'Tabla de convergencia Gauss-Newton:',
      'Iter\tL\tk\tx0\tSSE\t||Δθ||',
      ...result.iterations.map(it =>
        `${it.iter}\t${fmtIter(it.L)}\t${fmtIter(it.k)}\t${fmtIter(it.x0)}\t${fmtIter(it.sse)}\t${fmtIter(it.norm)}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href    = url;
    el.download = 'ajuste_logistico.txt';
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
        icon={<Zap size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={handleReset} disabled={!calculated}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Zap size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Calcular
            </Button>
          </>
        }
      />

      {tooFewPoints && (
        <div className={styles.emptyState}>
          <Zap size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            El ajuste logístico requiere al menos <strong>3 pares</strong> (Xi, Yi) —
            tiene 3 parámetros libres (L, k, x₀). Ingrese los datos en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {/* Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Logístico</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {result ? (
                <LogisticChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <Zap size={28} className={styles.placeholderIcon} />
                  <p>Presione <strong>Calcular</strong> para generar la gráfica</p>
                </div>
              )}
            </div>

            {result && (
              <>
                {/* Gauss-Newton convergence table */}
                <div className={styles.card}>
                  <div className={styles.tableHeader}>
                    <p className={styles.cardTitle} style={{ margin: 0 }}>
                      Convergencia — Gauss-Newton (3 parámetros)
                    </p>
                    {result.converged ? (
                      <span className={styles.convergedBadge}>
                        <CheckCircle size={13} /> Convergió en {result.iterations.length} iter.
                      </span>
                    ) : (
                      <span className={styles.notConvergedBadge}>
                        <AlertCircle size={13} /> No convergió ({result.iterations.length} iter.)
                      </span>
                    )}
                  </div>
                  <IterationTable result={result} />
                </div>

                {/* Residuals table */}
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Tabla de Valores Ajustados y Residuos</p>
                  <ResidualsTable result={result} />
                  <div className={styles.sumSummary}>
                    <span>n = {result.n}</span>
                    <span>SSE = {fmtIter(result.sse)}</span>
                    <span>R² = {(result.rSquared * 100).toFixed(4)}%</span>
                  </div>
                </div>

                {/* Method box */}
                <div className={styles.card}>
                  <MethodBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {result && (
              <SolutionSteps steps={buildLogisticSteps(result)} color="#be185d" />
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
                {result ? (
                  <span className={styles.equation}>{result.equation}</span>
                ) : (
                  <span className={styles.equationPlaceholder}>
                    Ejecute el cálculo para obtener la ecuación
                  </span>
                )}
              </div>
            </div>

            {/* 3-parameter results (L, k, x₀ + r, R²) */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'L',   desc: 'Capacidad de carga',   value: result?.L },
                  { label: 'k',   desc: 'Tasa de crecimiento',  value: result?.k },
                  { label: 'x₀',  desc: 'Punto de inflexión',   value: result?.x0 },
                  { label: 'r',   desc: 'Coef. correlación',    value: result?.r },
                  { label: 'R²',  desc: 'Coef. determinación',  value: result?.rSquared },
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

            {/* Key points card */}
            {result && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Puntos Clave de la Curva</p>
                <div className={styles.keyPointsGrid}>
                  <div className={styles.keyPoint}>
                    <span className={styles.keyPointLabel}>Asíntota superior</span>
                    <span className={styles.keyPointValue}>y = {fmtResult(result.L)}</span>
                    <span className={styles.keyPointDesc}>capacidad máxima</span>
                  </div>
                  <div className={styles.keyPoint}>
                    <span className={styles.keyPointLabel}>Punto de inflexión</span>
                    <span className={styles.keyPointValue}>x = {fmtResult(result.x0)}</span>
                    <span className={styles.keyPointDesc}>y = L/2 = {fmtResult(result.L / 2)}</span>
                  </div>
                  <div className={styles.keyPoint}>
                    <span className={styles.keyPointLabel}>Pendiente máx.</span>
                    <span className={styles.keyPointValue}>kL/4 = {fmtResult(result.k * result.L / 4)}</span>
                    <span className={styles.keyPointDesc}>en x = x₀</span>
                  </div>
                </div>
              </div>
            )}

            {result && (
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
                Modelo sigmoidal de 3 parámetros. Se resuelve por mínimos cuadrados
                no lineales (Gauss-Newton + Levenberg-Marquardt). Requiere ≥ 3 pares de datos.
              </p>
            </div>

            <div className={styles.actionsCol}>
              <Button variant="outline" size="sm" fullWidth leftIcon={<Download size={14} />}
                disabled={!result} onClick={handleExport}>
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
