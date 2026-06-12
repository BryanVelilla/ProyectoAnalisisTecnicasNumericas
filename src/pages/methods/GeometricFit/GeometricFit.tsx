import { useMemo, useState } from 'react';
import { BarChart2, Download, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { GeometricFitService, type GeometricFitResult } from '../../../services/geometricFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './GeometricFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('geometric')!;

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
  result: GeometricFitResult;
  dataPoints: { x: number; y: number }[];
  fitCurve: { x: number; y: number }[];
}

function GeometricChart({ result, dataPoints, fitCurve }: ChartProps) {
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
          fill="#10b981"
          stroke="#059669"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: GeometricFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>ln(Xᵢ)</th>
            <th>ln(Yᵢ)</th>
            <th>ln²(Xᵢ)</th>
            <th>ln(Xᵢ)·ln(Yᵢ)</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnX)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnY)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnX2)}</td>
              <td className={styles.numeric}>{fmtResult(row.lnXlnY)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>—</td>
            <td className={styles.numeric}>—</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnX)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnX2)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumLnXlnY)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Linearization box ─────────────────────────────────────────────────────────

function LinearizationBox({ result }: { result: GeometricFitResult }) {
  const A = Math.log(result.a);
  return (
    <div className={styles.linearizationBox}>
      <p className={styles.linearizationTitle}>Linealización aplicada</p>
      <div className={styles.linearizationSteps}>
        <span>y = a·x<sup>b</sup></span>
        <span className={styles.arrow}>→</span>
        <span>ln(y) = ln(a) + b·ln(x)</span>
        <span className={styles.arrow}>→</span>
        <span>Y = A + b·X</span>
      </div>
      <div className={styles.linearizationValues}>
        <span>X = ln(x)</span>
        <span>Y = ln(y)</span>
        <span>A = ln(a) = {fmtResult(A)}</span>
        <span>b = {fmtResult(result.b)}</span>
        <span>a = e<sup>A</sup> = {fmtResult(result.a)}</span>
      </div>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildGeoSteps(result: GeometricFitResult): StepData[] {
  const { n, sumLnX, sumLnY, sumLnX2, sumLnY2, sumLnXlnY, a, b, r, rSquared } = result;
  const D = n * sumLnX2 - sumLnX * sumLnX;
  const numerB = n * sumLnXlnY - sumLnX * sumLnY;
  const D2 = n * sumLnY2 - sumLnY * sumLnY;
  const denomR = Math.sqrt(Math.max(0, D * D2));
  const A = Math.log(a);
  const C = '#16a34a';
  const BG = '#f0fdf4';
  const BD = '#bbf7d0';

  return [
    {
      title: 'Doble linealización logarítmica',
      children: (
        <div>
          <p className={ss.text}>
            El modelo y = ax^b se linealiza aplicando ln a ambos lados:
          </p>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            ln(y) = ln(a) + b·ln(x) &nbsp;→&nbsp; Y = A + b·X &nbsp;(X = ln(x), Y = ln(y), A = ln(a))
          </div>
          <p className={ss.note}>Se trabaja con los pares transformados (ln(xᵢ), ln(yᵢ)), obteniendo un modelo lineal.</p>
        </div>
      ),
    },
    {
      title: 'Sumas en el espacio doble logarítmico',
      children: (
        <div>
          <p className={ss.text}>Con Xᵢ = ln(xᵢ) y Yᵢ = ln(yᵢ):</p>
          <div className={ss.chips}>
            {[`n = ${n}`, `ΣXᵢ = Σln(xᵢ) = ${fmtS(sumLnX)}`, `ΣYᵢ = Σln(yᵢ) = ${fmtS(sumLnY)}`,
              `ΣXᵢ² = ${fmtS(sumLnX2)}`, `ΣXᵢYᵢ = ${fmtS(sumLnXlnY)}`, `ΣYᵢ² = ${fmtS(sumLnY2)}`]
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
      title: 'Exponente b',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>b = (n·ΣXᵢYᵢ − ΣXᵢ·ΣYᵢ) / D</div>
          <div className={ss.calcBlock}>
            <div>= ({n} × {fmtS(sumLnXlnY)} − {fmtS(sumLnX)} × {fmtS(sumLnY)}) / {fmtS(D)}</div>
            <div>= ({fmtS(n * sumLnXlnY)} − {fmtS(sumLnX * sumLnY)}) / {fmtS(D)}</div>
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
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>A = (ΣYᵢ − b·ΣXᵢ) / n &nbsp;→&nbsp; a = e^A</div>
          <div className={ss.calcBlock}>
            <div>A = ({fmtS(sumLnY)} − {fmtS(b)} × {fmtS(sumLnX)}) / {n}</div>
            <div>A = ({fmtS(sumLnY)} − {fmtS(b * sumLnX)}) / {n} = {fmtS(A)}</div>
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
            r = (n·ΣXᵢYᵢ − ΣXᵢ·ΣYᵢ) / √[D·(n·ΣYᵢ² − (ΣYᵢ)²)] &nbsp;&nbsp; R² = r²
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

export function GeometricFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? GeometricFitService.compute(points) : null),
    [calculated, points]
  );

  const fitCurve = useMemo(
    () => (result && !result.invalidPoints ? GeometricFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(() => points.map(p => ({ x: p.x, y: p.y })), [points]);

  const hasData = points.length >= 2;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE GEOMÉTRICO — CurveAnalysis',
      '====================================',
      `n = ${result.n}`,
      `a              = ${fmtResult(result.a)}`,
      `b              = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de cálculo (linealización doble logarítmica):',
      'N°\tXi\tYi\tln(Xi)\tln(Yi)\tln²(Xi)\tln(Xi)·ln(Yi)',
      ...result.rows.map(r =>
        `${r.n}\t${r.x}\t${r.y}\t${fmtResult(r.lnX)}\t${fmtResult(r.lnY)}\t${fmtResult(r.lnX2)}\t${fmtResult(r.lnXlnY)}`
      ),
      `Σ\t—\t—\t${fmtResult(result.sumLnX)}\t${fmtResult(result.sumLnY)}\t${fmtResult(result.sumLnX2)}\t${fmtResult(result.sumLnXlnY)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ajuste_geometrico.txt';
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
        icon={<BarChart2 size={22} />}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={handleReset} disabled={!calculated}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<BarChart2 size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <BarChart2 size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) con Xi &gt; 0 y Yi &gt; 0 en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {result?.invalidPoints && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                <span>
                  El ajuste geométrico requiere Xi &gt; 0 y Yi &gt; 0 en todos los pares.
                  Revise o corrija sus datos.
                </span>
              </div>
            )}

            {/* Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Geométrico</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {result && !result.invalidPoints ? (
                <GeometricChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <BarChart2 size={28} className={styles.placeholderIcon} />
                  <p>
                    {result?.invalidPoints
                      ? 'No se puede graficar: Xi o Yi contiene valores ≤ 0'
                      : <>Presione <strong>Calcular</strong> para generar la gráfica</>}
                  </p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {result && !result.invalidPoints && (
              <>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>Tabla de Cálculo Intermedio (doble logarítmica)</p>
                  <CalcTable result={result} />
                  <div className={styles.sumSummary}>
                    <span>n = {result.n}</span>
                    <span>Σln(x) = {fmtResult(result.sumLnX)}</span>
                    <span>Σln(y) = {fmtResult(result.sumLnY)}</span>
                    <span>Σln²(x) = {fmtResult(result.sumLnX2)}</span>
                    <span>Σln(x)·ln(y) = {fmtResult(result.sumLnXlnY)}</span>
                  </div>
                </div>
                <div className={styles.card}>
                  <LinearizationBox result={result} />
                </div>
              </>
            )}

            {/* Step-by-step solution */}
            {result && !result.invalidPoints && (
              <SolutionSteps steps={buildGeoSteps(result)} color="#16a34a" />
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
                {result && !result.invalidPoints ? (
                  <span className={styles.equation}>{result.equation}</span>
                ) : (
                  <span className={styles.equationPlaceholder}>
                    {result?.invalidPoints
                      ? 'No aplicable (Xi ≤ 0 o Yi ≤ 0)'
                      : 'Ejecute el cálculo para obtener la ecuación'}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a', desc: 'Coeficiente escala', value: result?.a },
                  { label: 'b', desc: 'Exponente potencia', value: result?.b },
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

            {result && !result.invalidPoints && (
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
                Requiere Xi &gt; 0 y Yi &gt; 0. Se linealiza con transformación doble logarítmica:
                ln(y) = ln(a) + b·ln(x).
              </p>
            </div>

            <div className={styles.actionsCol}>
              <Button variant="outline" size="sm" fullWidth leftIcon={<Download size={14} />}
                disabled={!result || result.invalidPoints} onClick={handleExport}>
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
