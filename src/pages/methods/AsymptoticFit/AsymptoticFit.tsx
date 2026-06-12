import { useMemo, useState } from 'react';
import { GitBranch, Download, RefreshCw, Info, CheckCircle, AlertCircle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { AsymptoticFitService, type AsymptoticFitResult } from '../../../services/asymptoticFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './AsymptoticFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('asymptotic')!;

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
  result: AsymptoticFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve: { x: number; y: number }[];
}

function AsymptoticChart({ result, dataPoints, fitCurve }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y), result.a];
  const allX = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;
  const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
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
          <Label value="X" offset={-8} position="insideBottom" style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </XAxis>
        <YAxis
          type="number" dataKey="y"
          domain={yDomain} tickCount={6} tickFormatter={fmtAxis}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          width={70}
        >
          <Label value="Y" angle={-90} position="insideLeft" style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </YAxis>
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value: number) => fmtResult(value)}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

        {/* Horizontal asymptote line y = a */}
        <ReferenceLine
          y={result.a}
          stroke="#0891b2"
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{ value: `a = ${fmtResult(result.a)}`, position: 'insideTopRight', fontSize: 11, fill: '#0891b2' }}
        />

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
          fill="#06b6d4"
          stroke="#0891b2"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Gauss-Newton iteration table ──────────────────────────────────────────────

function IterationTable({ result }: { result: AsymptoticFitResult }) {
  // Show at most 12 iterations in the table (all if fewer)
  const shown = result.iterations.length <= 12
    ? result.iterations
    : [
        ...result.iterations.slice(0, 6),
        { iter: -1, a: NaN, b: NaN, sse: NaN, da: NaN, db: NaN },
        ...result.iterations.slice(-3),
      ];

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>Iter.</th>
            <th>a</th>
            <th>b</th>
            <th>SSE</th>
            <th>|Δa|</th>
            <th>|Δb|</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row, idx) =>
            row.iter === -1 ? (
              <tr key={`ellipsis-${idx}`} className={styles.ellipsisRow}>
                <td colSpan={6} className={styles.centered}>⋮</td>
              </tr>
            ) : (
              <tr key={row.iter} className={row.iter === result.iterations.length ? styles.lastIterRow : undefined}>
                <td className={styles.centered}>{row.iter}</td>
                <td className={styles.numeric}>{fmtIter(row.a)}</td>
                <td className={styles.numeric}>{fmtIter(row.b)}</td>
                <td className={styles.numeric}>{fmtIter(row.sse)}</td>
                <td className={styles.numeric}>{fmtIter(Math.abs(row.da))}</td>
                <td className={styles.numeric}>{fmtIter(Math.abs(row.db))}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Residuals table ───────────────────────────────────────────────────────────

function ResidualsTable({ result }: { result: AsymptoticFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>Ŷᵢ</th>
            <th>Eᵢ = Yᵢ − Ŷᵢ</th>
            <th>Eᵢ²</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.yHat)}</td>
              <td className={`${styles.numeric} ${Math.abs(row.residual) < 1e-4 ? styles.residualGood : ''}`}>
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
            <td className={styles.numeric}>{fmtResult(result.rows.reduce((s, r) => s + r.residual, 0))}</td>
            <td className={styles.numeric}>{fmtResult(result.sse)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Method info box ───────────────────────────────────────────────────────────

function MethodBox({ result }: { result: AsymptoticFitResult }) {
  return (
    <div className={styles.linearizationBox}>
      <p className={styles.linearizationTitle}>Método numérico: Gauss-Newton</p>
      <div className={styles.linearizationSteps}>
        <span>y = a(1 − e<sup>−bx</sup>)</span>
        <span className={styles.arrow}>→</span>
        <span>min Σ(yᵢ − ŷᵢ)²</span>
        <span className={styles.arrow}>→</span>
        <span>J<sup>T</sup>J · Δθ = J<sup>T</sup>r</span>
      </div>
      <div className={styles.linearizationValues}>
        <span>∂f/∂a = 1 − e<sup>−bx</sup></span>
        <span>∂f/∂b = a·x·e<sup>−bx</sup></span>
        <span>Iteraciones: {result.iterations.length}</span>
        <span>SSE = {fmtIter(result.sse)}</span>
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildAsympSteps(result: AsymptoticFitResult): StepData[] {
  const { n, a, b, r, rSquared, sse, converged, iterations, rows } = result;
  const maxY = Math.max(...rows.map(r => r.y));
  const a0approx = 1.15 * maxY;
  const C = '#0891b2';
  const BG = '#ecfeff';
  const BD = '#a5f3fc';

  // Build iteration display rows: first 3 + ellipsis + last
  const iterDisplay: Array<{ iter: number; a: number; b: number; sse: number; highlight: boolean }> = [];
  if (iterations.length > 0) {
    const show = Math.min(3, iterations.length);
    for (let i = 0; i < show; i++) {
      iterDisplay.push({ ...iterations[i], highlight: false });
    }
    if (iterations.length > 4) iterDisplay.push({ iter: -1, a: 0, b: 0, sse: 0, highlight: false });
    if (iterations.length > 3) {
      iterDisplay.push({ ...iterations[iterations.length - 1], highlight: true });
    }
  }

  return [
    {
      title: 'Modelo no lineal — por qué se usa Gauss-Newton',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            y = a · (1 − e^(−b·x)) &nbsp;&nbsp;→&nbsp;&nbsp; 2 parámetros no lineales: a y b
          </div>
          <p className={ss.note}>
            No existe una sustitución que linealice este modelo completamente. Se minimiza la suma de cuadrados
            de residuos SSE = Σ(yᵢ − ŷᵢ)² usando el método iterativo de Gauss-Newton.
          </p>
        </div>
      ),
    },
    {
      title: 'Estimación inicial de parámetros',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            a₀ ≈ 1.15 × max(yᵢ) &nbsp;&nbsp; b₀ estimado del punto de inflexión
          </div>
          <div className={ss.calcBlock}>
            <div>max(yᵢ) = {fmtS(maxY)} &nbsp;→&nbsp; a₀ ≈ 1.15 × {fmtS(maxY)} = {fmtS(a0approx)}</div>
            <div>b₀: estimado a partir del xᵢ donde y ≈ a·(1 − 1/e) ≈ 0.632·a</div>
          </div>
          <p className={ss.note}>Estos valores son solo punto de partida; el método los refina en cada iteración.</p>
        </div>
      ),
    },
    {
      title: 'Actualización iterativa de Gauss-Newton',
      children: (
        <div>
          <p className={ss.text}>En cada iteración se construye el Jacobiano de las derivadas parciales:</p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            ∂f/∂a = 1 − e^(−bx) &nbsp;&nbsp; ∂f/∂b = a·x·e^(−bx)
          </div>
          <p className={ss.text}>Luego se resuelve el sistema normal:</p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            [Δa, Δb]ᵀ = (JᵀJ)⁻¹ · Jᵀ · r &nbsp;&nbsp;&nbsp; [a, b] ← [a, b] + [Δa, Δb]
          </div>
          <p className={ss.note}>Se repite hasta que ‖[Δa, Δb]‖ &lt; 10⁻⁸ o se supera el máximo de iteraciones.</p>
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
                <tr>
                  <th>Iter</th><th>a</th><th>b</th><th>SSE</th>
                </tr>
              </thead>
              <tbody>
                {iterDisplay.map((row, i) =>
                  row.iter === -1 ? (
                    <tr key={`ell-${i}`} className={ss.ellipsisRow}>
                      <td colSpan={4}>· · ·</td>
                    </tr>
                  ) : (
                    <tr key={row.iter} className={row.highlight ? ss.highlightRow : undefined}>
                      <td>{row.iter}</td>
                      <td>{fmtS(row.a)}</td>
                      <td>{fmtS(row.b)}</td>
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
            a = {fmtS(a)} &nbsp;·&nbsp; b = {fmtS(b)} &nbsp;·&nbsp; R² = {fmtS(rSquared)} ({(rSquared * 100).toFixed(2)} %)
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

export function AsymptoticFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? AsymptoticFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result ? AsymptoticFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(() => points.map(p => ({ x: p.x, y: p.y })), [points]);

  const hasData = points.length >= 2;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE EXPONENCIAL ASINTÓTICO — CurveAnalysis',
      '================================================',
      `n = ${result.n}`,
      `a (asíntota)   = ${fmtResult(result.a)}`,
      `b (tasa)       = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      `SSE            = ${fmtIter(result.sse)}`,
      `Convergió      = ${result.converged ? 'Sí' : 'No'}`,
      `Iteraciones    = ${result.iterations.length}`,
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
      'Iter\ta\tb\tSSE\t|Δa|\t|Δb|',
      ...result.iterations.map(it =>
        `${it.iter}\t${fmtIter(it.a)}\t${fmtIter(it.b)}\t${fmtIter(it.sse)}\t${fmtIter(Math.abs(it.da))}\t${fmtIter(Math.abs(it.db))}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = 'ajuste_exponencial_asintotico.txt';
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
        icon={<GitBranch size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={handleReset} disabled={!calculated}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<GitBranch size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <GitBranch size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>{' '}
            para ejecutar el ajuste exponencial asintótico.
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
                  <p className={styles.cardTitle}>Gráfica — Exp. Asintótico</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {result ? (
                <AsymptoticChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <GitBranch size={28} className={styles.placeholderIcon} />
                  <p>Presione <strong>Calcular</strong> para generar la gráfica</p>
                </div>
              )}
            </div>

            {result && (
              <>
                {/* Gauss-Newton iteration table */}
                <div className={styles.card}>
                  <div className={styles.tableHeader}>
                    <p className={styles.cardTitle} style={{ margin: 0 }}>
                      Convergencia — Gauss-Newton
                    </p>
                    {result.converged ? (
                      <span className={styles.convergedBadge}>
                        <CheckCircle size={13} /> Convergió en {result.iterations.length} iteraciones
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

                {/* Method explanation */}
                <div className={styles.card}>
                  <MethodBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {result && (
              <SolutionSteps steps={buildAsympSteps(result)} color="#0891b2" />
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

            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a', desc: 'Asíntota horizontal', value: result?.a },
                  { label: 'b', desc: 'Tasa de crecimiento', value: result?.b },
                  { label: 'r', desc: 'Coef. correlación',   value: result?.r },
                  { label: 'R²', desc: 'Coef. determinación', value: result?.rSquared },
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

            {/* Asymptote info */}
            {result && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Asíntota Horizontal</p>
                <div className={styles.asymptoteCard}>
                  <span className={styles.asymptoteFormula}>lím y = a</span>
                  <span className={styles.asymptoteFormula} style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>
                    x → ∞
                  </span>
                  <span className={styles.asymptoteValue}>y = {fmtResult(result.a)}</span>
                  <p className={styles.asymptoteDesc}>
                    Valor máximo al que tiende el sistema. La curva se aproxima pero nunca supera este límite.
                  </p>
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
                Modelo no lineal — se resuelve por mínimos cuadrados no lineales (Gauss-Newton con
                amortiguamiento Levenberg-Marquardt). No requiere linealización.
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
