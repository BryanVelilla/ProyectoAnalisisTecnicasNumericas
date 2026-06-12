import { useMemo, useState } from 'react';
import { Minus, Download, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { HyperbolicFitService, type HyperbolicFitResult } from '../../../services/hyperbolicFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './HyperbolicFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('hyperbolic')!;

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
  result: HyperbolicFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve: { x: number; y: number }[];
}

function HyperbolicChart({ result, dataPoints, fitCurve }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y)];
  const allX = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;
  const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
  const yDomain: [number, number] = [Math.min(...allY) - yPad, Math.max(...allY) + yPad];
  const xDomain: [number, number] = [Math.min(...allX) - xPad, Math.max(...allX) + xPad];

  // Show asymptote info if it falls within the plot range
  const xAsymptote = result.b !== 0 ? -result.a / result.b : null;
  const showAsymptote =
    xAsymptote !== null &&
    xAsymptote > xDomain[0] &&
    xAsymptote < xDomain[1];

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={xDomain}
            tickCount={7}
            tickFormatter={fmtAxis}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          >
            <Label value="X" offset={-8} position="insideBottom" style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={yDomain}
            tickCount={6}
            tickFormatter={fmtAxis}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            width={70}
          >
            <Label value="Y" angle={-90} position="insideLeft" style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number) => fmtResult(value)}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

          <Scatter
            name={`Ajuste: ${result.equation}`}
            data={fitCurve}
            fill="transparent"
            line={{ stroke: '#e03030', strokeWidth: 2 }}
            shape={() => null as unknown as React.ReactElement}
            legendType="line"
          />
          <Scatter
            name="Datos originales"
            data={dataPoints}
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth={1}
            r={5}
          />
        </ScatterChart>
      </ResponsiveContainer>
      {showAsymptote && (
        <p className={styles.asymptoteNote}>
          ⚠ Asíntota vertical en x = {fmtResult(xAsymptote!)} (a + bx = 0)
        </p>
      )}
    </div>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: HyperbolicFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>1/Yᵢ</th>
            <th>Xᵢ²</th>
            <th>Xᵢ · (1/Yᵢ)</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.invY)}</td>
              <td className={styles.numeric}>{fmtResult(row.x2)}</td>
              <td className={styles.numeric}>{fmtResult(row.xInvY)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>{fmtResult(result.sumX)}</td>
            <td className={styles.numeric}>—</td>
            <td className={styles.numeric}>{fmtResult(result.sumInvY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumX2)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumXInvY)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Linearization box ─────────────────────────────────────────────────────────

function LinearizationBox({ result }: { result: HyperbolicFitResult }) {
  return (
    <div className={styles.linearizationBox}>
      <p className={styles.linearizationTitle}>Linealización aplicada</p>
      <div className={styles.linearizationSteps}>
        <span>y = 1/(a + bx)</span>
        <span className={styles.arrow}>→</span>
        <span>1/y = a + bx</span>
        <span className={styles.arrow}>→</span>
        <span>Z = a + bx</span>
      </div>
      <div className={styles.linearizationValues}>
        <span>Z = 1/y</span>
        <span>a = {fmtResult(result.a)}</span>
        <span>b = {fmtResult(result.b)}</span>
        {result.b !== 0 && (
          <span>asíntota: x = {fmtResult(-result.a / result.b)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildHyperSteps(result: HyperbolicFitResult): StepData[] {
  const { n, sumX, sumInvY, sumX2, sumInvY2, sumXInvY, a, b, r, rSquared } = result;
  const D = n * sumX2 - sumX * sumX;
  const numerB = n * sumXInvY - sumX * sumInvY;
  const D2 = n * sumInvY2 - sumInvY * sumInvY;
  const denomR = Math.sqrt(Math.max(0, D * D2));
  const C = '#d97706';
  const BG = '#fffbeb';
  const BD = '#fde68a';

  return [
    {
      title: 'Linealización del modelo',
      children: (
        <div>
          <p className={ss.text}>
            El modelo y = 1/(a + bx) se linealiza tomando el recíproco de ambos lados:
          </p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            1/y = a + b·x &nbsp;→&nbsp; Z = a + b·x &nbsp;(donde Z = 1/y)
          </div>
          <p className={ss.note}>Se trabaja con los pares transformados (xᵢ, 1/yᵢ), obteniendo regresión lineal directa.</p>
        </div>
      ),
    },
    {
      title: 'Sumas en espacio linealizado',
      children: (
        <div>
          <p className={ss.text}>Con Zᵢ = 1/yᵢ como variable dependiente:</p>
          <div className={ss.chips}>
            {[`n = ${n}`, `Σxᵢ = ${fmtS(sumX)}`, `ΣZᵢ = Σ(1/yᵢ) = ${fmtS(sumInvY)}`,
              `Σxᵢ² = ${fmtS(sumX2)}`, `ΣxᵢZᵢ = Σxᵢ/yᵢ = ${fmtS(sumXInvY)}`, `ΣZᵢ² = ${fmtS(sumInvY2)}`]
              .map(s => <span key={s} className={ss.chip}>{s}</span>)}
          </div>
        </div>
      ),
    },
    {
      title: 'Denominador común D',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>D = n·Σxᵢ² − (Σxᵢ)²</div>
          <div className={ss.calcBlock}>
            <div>= {n} × {fmtS(sumX2)} − ({fmtS(sumX)})²</div>
            <div>= {fmtS(n * sumX2)} − {fmtS(sumX * sumX)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>D = {fmtS(D)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente b',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>b = (n·ΣxᵢZᵢ − Σxᵢ·ΣZᵢ) / D</div>
          <div className={ss.calcBlock}>
            <div>= ({n} × {fmtS(sumXInvY)} − {fmtS(sumX)} × {fmtS(sumInvY)}) / {fmtS(D)}</div>
            <div>= ({fmtS(n * sumXInvY)} − {fmtS(sumX * sumInvY)}) / {fmtS(D)}</div>
            <div>= {fmtS(numerB)} / {fmtS(D)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>b = {fmtS(b)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente a (intercepto de 1/y)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>a = (ΣZᵢ − b·Σxᵢ) / n</div>
          <div className={ss.calcBlock}>
            <div>= ({fmtS(sumInvY)} − {fmtS(b)} × {fmtS(sumX)}) / {n}</div>
            <div>= ({fmtS(sumInvY)} − {fmtS(b * sumX)}) / {n}</div>
            <div>= {fmtS(sumInvY - b * sumX)} / {n}</div>
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
            r = (n·ΣxᵢZᵢ − Σxᵢ·ΣZᵢ) / √[D·(n·ΣZᵢ² − (ΣZᵢ)²)] &nbsp;&nbsp; R² = r²
          </div>
          <div className={ss.calcBlock}>
            <div>D₂ = {n}·{fmtS(sumInvY2)} − ({fmtS(sumInvY)})² = {fmtS(D2)}</div>
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

export function HyperbolicFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? HyperbolicFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result && !result.hasZeroY ? HyperbolicFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(() => points.map(p => ({ x: p.x, y: p.y })), [points]);

  const hasData = points.length >= 2;
  const canRender = result !== null && !result.hasZeroY;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE HIPERBÓLICO — CurveAnalysis',
      '=====================================',
      `n = ${result.n}`,
      `a              = ${fmtResult(result.a)}`,
      `b              = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de cálculo (linealización 1/y):',
      'N°\tXi\tYi\t1/Yi\tXi²\tXi·(1/Yi)',
      ...result.rows.map(r =>
        `${r.n}\t${r.x}\t${r.y}\t${fmtResult(r.invY)}\t${r.x2}\t${fmtResult(r.xInvY)}`
      ),
      `Σ\t${fmtResult(result.sumX)}\t—\t${fmtResult(result.sumInvY)}\t${fmtResult(result.sumX2)}\t${fmtResult(result.sumXInvY)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ajuste_hiperbolico.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Ajuste de Curvas · ${method.name}`}
        title={method.name}
        formula={method.formula}
        description={method.description}
        icon={<Minus size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={handleReset} disabled={!calculated}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Minus size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <Minus size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) con Yi ≠ 0 en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {result?.hasZeroY && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                <span>
                  El ajuste hiperbólico requiere Yi ≠ 0 en todos los pares (se necesita calcular 1/Yi).
                  Revise o corrija sus datos.
                </span>
              </div>
            )}

            {/* Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Hiperbólico</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {canRender ? (
                <HyperbolicChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <Minus size={28} className={styles.placeholderIcon} />
                  <p>
                    {result?.hasZeroY
                      ? 'No se puede graficar: Yi contiene ceros'
                      : <>Presione <strong>Calcular</strong> para generar la gráfica</>}
                  </p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {canRender && (
              <>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Tabla de Cálculo Intermedio (linealización 1/y)</p>
                  <CalcTable result={result} />
                  <div className={styles.sumSummary}>
                    <span>n = {result.n}</span>
                    <span>Σx = {fmtResult(result.sumX)}</span>
                    <span>Σ(1/y) = {fmtResult(result.sumInvY)}</span>
                    <span>Σx² = {fmtResult(result.sumX2)}</span>
                    <span>Σx·(1/y) = {fmtResult(result.sumXInvY)}</span>
                  </div>
                </div>

                <div className={styles.card}>
                  <LinearizationBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {canRender && result && (
              <SolutionSteps steps={buildHyperSteps(result)} color="#d97706" />
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
                    {result?.hasZeroY
                      ? 'No aplicable (Yi = 0)'
                      : 'Ejecute el cálculo para obtener la ecuación'}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a', desc: 'Término independiente', value: result?.a },
                  { label: 'b', desc: 'Coeficiente lineal',    value: result?.b },
                  { label: 'r', desc: 'Coef. correlación',     value: result?.r },
                  { label: 'R²', desc: 'Coef. determinación',  value: result?.rSquared },
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

            {/* Asymptote info card */}
            {canRender && result.b !== 0 && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Asíntota Vertical</p>
                <div className={styles.asymptoteCard}>
                  <span className={styles.asymptoteFormula}>x = −a/b</span>
                  <span className={styles.asymptoteValue}>
                    x = {fmtResult(-result.a / result.b)}
                  </span>
                  <p className={styles.asymptoteDesc}>
                    En este valor de x la función tiende a ±∞. La curva no cruza esta línea.
                  </p>
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
                Requiere Yi ≠ 0. Se linealiza con la transformación inversa: 1/y = a + bx,
                aplicando regresión lineal sobre los valores transformados.
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
