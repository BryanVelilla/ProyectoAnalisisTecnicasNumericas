import { useMemo, useState } from 'react';
import { Activity, Download, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { ExponentialFitService, type ExponentialFitResult } from '../../../services/exponentialFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './ExponentialFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('exponential')!;

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
  result: ExponentialFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve: { x: number; y: number }[];
}

function ExponentialChart({ result, dataPoints, fitCurve }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y)];
  const allX = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.12 || 1;
  const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
  const yDomain: [number, number] = [Math.min(...allY) - yPad, Math.max(...allY) + yPad];
  const xDomain: [number, number] = [Math.min(...allX) - xPad, Math.max(...allX) + xPad];

  return (
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

        {/* Fitted curve (rendered first, behind data points) */}
        <Scatter
          name={`Ajuste: ${result.equation}`}
          data={fitCurve}
          fill="transparent"
          line={{ stroke: '#e03030', strokeWidth: 2 }}
          shape={() => null as unknown as React.ReactElement}
          legendType="line"
        />

        {/* Original data points */}
        <Scatter
          name="Datos originales"
          data={dataPoints}
          fill="#8b5cf6"
          stroke="#6d28d9"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: ExponentialFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>ln(Yᵢ)</th>
            <th>Xᵢ²</th>
            <th>Xᵢ·ln(Yᵢ)</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnY)}</td>
              <td className={styles.numeric}>{fmtResult(row.x2)}</td>
              <td className={styles.numeric}>{fmtResult(row.xLnY)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>{fmtResult(result.sumX)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumX2)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumXLnY)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Linearization note ────────────────────────────────────────────────────────

function LinearizationBox({ result }: { result: ExponentialFitResult }) {
  const A = Math.log(result.a);
  return (
    <div className={styles.linearizationBox}>
      <p className={styles.linearizationTitle}>Linealización aplicada</p>
      <div className={styles.linearizationSteps}>
        <span>y = a·e<sup>bx</sup></span>
        <span className={styles.arrow}>→</span>
        <span>ln(y) = ln(a) + bx</span>
        <span className={styles.arrow}>→</span>
        <span>Y = A + bx</span>
      </div>
      <div className={styles.linearizationValues}>
        <span>A = ln(a) = {fmtResult(A)}</span>
        <span>b = {fmtResult(result.b)}</span>
        <span>a = e<sup>A</sup> = {fmtResult(result.a)}</span>
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildExpSteps(result: ExponentialFitResult): StepData[] {
  const { n, sumX, sumLnY, sumX2, sumXLnY, sumLnY2, a, b, r, rSquared } = result;
  const D = n * sumX2 - sumX * sumX;
  const numerB = n * sumXLnY - sumX * sumLnY;
  const D2 = n * sumLnY2 - sumLnY * sumLnY;
  const denomR = Math.sqrt(Math.max(0, D * D2));
  const A = Math.log(a);
  const C = '#7c3aed';
  const BG = '#f5f3ff';
  const BD = '#ddd6fe';

  return [
    {
      title: 'Linealización del modelo',
      children: (
        <div>
          <p className={ss.text}>
            El modelo y = ae^(bx) no es lineal. Se aplica logaritmo natural a ambos lados:
          </p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            ln(y) = ln(a) + b·x &nbsp;→&nbsp; Y = A + b·x &nbsp;(donde Y = ln(y), A = ln(a))
          </div>
          <p className={ss.note}>Con esta sustitución obtenemos un modelo lineal Y = A + bx sobre los pares (xᵢ, ln(yᵢ)).</p>
        </div>
      ),
    },
    {
      title: 'Sumas en espacio linealizado',
      children: (
        <div>
          <p className={ss.text}>Se calculan las sumas usando Yᵢ = ln(yᵢ) como nueva variable dependiente:</p>
          <div className={ss.chips}>
            {[`n = ${n}`, `Σxᵢ = ${fmtS(sumX)}`, `ΣYᵢ = Σln(yᵢ) = ${fmtS(sumLnY)}`,
              `Σxᵢ² = ${fmtS(sumX2)}`, `ΣxᵢYᵢ = Σxᵢln(yᵢ) = ${fmtS(sumXLnY)}`, `ΣYᵢ² = ${fmtS(sumLnY2)}`]
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
      title: 'Coeficiente b (tasa de crecimiento)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>b = (n·ΣxᵢYᵢ − Σxᵢ·ΣYᵢ) / D</div>
          <div className={ss.calcBlock}>
            <div>= ({n} × {fmtS(sumXLnY)} − {fmtS(sumX)} × {fmtS(sumLnY)}) / {fmtS(D)}</div>
            <div>= ({fmtS(n * sumXLnY)} − {fmtS(sumX * sumLnY)}) / {fmtS(D)}</div>
            <div>= {fmtS(numerB)} / {fmtS(D)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>b = {fmtS(b)}</span>
        </div>
      ),
    },
    {
      title: 'Constante A = ln(a) y recuperación de a',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>A = (ΣYᵢ − b·Σxᵢ) / n &nbsp;→&nbsp; a = e^A</div>
          <div className={ss.calcBlock}>
            <div>A = ({fmtS(sumLnY)} − {fmtS(b)} × {fmtS(sumX)}) / {n}</div>
            <div>A = ({fmtS(sumLnY)} − {fmtS(b * sumX)}) / {n} = {fmtS(A)}</div>
            <div>a = e^{fmtS(A)} = {fmtS(a)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>
            A = {fmtS(A)} &nbsp;→&nbsp; a = {fmtS(a)}
          </span>
        </div>
      ),
    },
    {
      title: 'Coeficiente de correlación r y R²',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            r = (n·ΣxᵢYᵢ − Σxᵢ·ΣYᵢ) / √[D·(n·ΣYᵢ² − (ΣYᵢ)²)] &nbsp;&nbsp; R² = r²
          </div>
          <div className={ss.calcBlock}>
            <div>D₂ = {n}·{fmtS(sumLnY2)} − ({fmtS(sumLnY)})² = {fmtS(D2)}</div>
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

export function ExponentialFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? ExponentialFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result && !result.hasNegativeY ? ExponentialFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(
    () => points.map(p => ({ x: p.x, y: p.y })),
    [points]
  );

  const hasData = points.length >= 2;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE EXPONENCIAL — CurveAnalysis',
      '=====================================',
      `n = ${result.n}`,
      `a              = ${fmtResult(result.a)}`,
      `b              = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de cálculo (linealización ln(y)):',
      'N°\tXi\tYi\tln(Yi)\tXi²\tXi·ln(Yi)',
      ...result.rows.map(r =>
        `${r.n}\t${r.x}\t${r.y}\t${fmtResult(r.lnY)}\t${r.x2}\t${fmtResult(r.xLnY)}`
      ),
      `Σ\t${result.sumX}\t${fmtResult(result.sumY)}\t${fmtResult(result.sumLnY)}\t${result.sumX2}\t${fmtResult(result.sumXLnY)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ajuste_exponencial.txt';
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
        icon={<Activity size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={handleReset}
              disabled={!calculated}
            >
              Resetear
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Activity size={14} />}
              onClick={handleCalculate}
              disabled={!hasData}
            >
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <Activity size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>{' '}
            para ejecutar el ajuste exponencial.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {/* Negative Y warning */}
            {result?.hasNegativeY && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                <span>
                  El ajuste exponencial requiere que todos los valores Yi sean estrictamente positivos (Yi &gt; 0).
                  Revise o corrija sus datos.
                </span>
              </div>
            )}

            {/* Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Exponencial</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {result && !result.hasNegativeY ? (
                <ExponentialChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <Activity size={28} className={styles.placeholderIcon} />
                  <p>
                    {result?.hasNegativeY
                      ? 'No se puede graficar: Yi contiene valores ≤ 0'
                      : <>Presione <strong>Calcular</strong> para generar la gráfica</>}
                  </p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {result && !result.hasNegativeY && (
              <>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Tabla de Cálculo Intermedio (linealización)</p>
                  <CalcTable result={result} />
                  <div className={styles.sumSummary}>
                    <span>n = {result.n}</span>
                    <span>Σx = {fmtResult(result.sumX)}</span>
                    <span>Σy = {fmtResult(result.sumY)}</span>
                    <span>Σln(y) = {fmtResult(result.sumLnY)}</span>
                    <span>Σx² = {fmtResult(result.sumX2)}</span>
                    <span>Σx·ln(y) = {fmtResult(result.sumXLnY)}</span>
                  </div>
                </div>

                <div className={styles.card}>
                  <LinearizationBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {result && !result.hasNegativeY && (
              <SolutionSteps steps={buildExpSteps(result)} color="#7c3aed" />
            )}

            {/* Input data table */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Datos de Entrada ({points.length} pares)</p>
              <div className={styles.tableWrapper}>
                <table className={styles.calcTable}>
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Xi</th>
                      <th>Yi</th>
                    </tr>
                  </thead>
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

            {/* Equation */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Ecuación Ajustada</p>
              <div className={styles.equationBox}>
                {result && !result.hasNegativeY ? (
                  <span className={styles.equation}>{result.equation}</span>
                ) : (
                  <span className={styles.equationPlaceholder}>
                    {result?.hasNegativeY
                      ? 'No aplicable (Yi ≤ 0)'
                      : 'Ejecute el cálculo para obtener la ecuación'}
                  </span>
                )}
              </div>
            </div>

            {/* Numeric results */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a', desc: 'Amplitud inicial', value: result?.a },
                  { label: 'b', desc: 'Tasa de crecimiento', value: result?.b },
                  { label: 'r', desc: 'Coef. correlación', value: result?.r },
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

            {/* Quality bar */}
            {result && !result.hasNegativeY && (
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
                  {result.rSquared >= 0.95
                    ? 'Ajuste excelente'
                    : result.rSquared >= 0.8
                    ? 'Ajuste aceptable'
                    : result.rSquared >= 0.6
                    ? 'Ajuste moderado'
                    : 'Ajuste débil'}
                </p>
              </div>
            )}

            {/* Applicability */}
            <div className={styles.card}>
              <p className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={15} />
                Aplicabilidad
              </p>
              <p className={styles.infoText}>{method.applicability}</p>
              <p className={styles.infoNote}>
                Requiere Yi &gt; 0. Se linealiza tomando ln(y) = ln(a) + bx y aplicando regresión lineal sobre los valores transformados.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.actionsCol}>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<Download size={14} />}
                disabled={!result || result.hasNegativeY}
                onClick={handleExport}
              >
                Exportar Resultados
              </Button>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => { clearAll(); handleReset(); }}
                disabled={!hasData}
              >
                Limpiar datos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
