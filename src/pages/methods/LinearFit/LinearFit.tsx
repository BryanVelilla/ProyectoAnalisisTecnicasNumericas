import { useMemo, useState } from 'react';
import { TrendingUp, Download, RefreshCw, Info } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { LinearFitService, type LinearFitResult } from '../../../services/linearFit.service';
import { DataService } from '../../../services/data.service';
import { getMethodById } from '../../../constants/methods';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import styles from './LinearFit.module.css';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';

const method = getMethodById('linear')!;

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmt(v: number, decimals = 6): string {
  return DataService.formatNumber(parseFloat(v.toPrecision(decimals)));
}

function fmtResult(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return v.toFixed(6).replace(/\.?0+$/, '');
  return v.toExponential(4);
}

// ─── Chart ─────────────────────────────────────────────────────────────────────

interface ChartProps {
  result: LinearFitResult;
  dataPoints: { x: number; y: number }[];
  fitLine: { x: number; y: number }[];
}

function LinearChart({ result, dataPoints, fitLine }: ChartProps) {
  const allY = [...dataPoints.map(p => p.y), ...fitLine.map(p => p.y)];
  const allX = [...dataPoints.map(p => p.x), ...fitLine.map(p => p.x)];
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
          tickFormatter={v => fmt(v, 4)}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
        >
          <Label value="X" offset={-8} position="insideBottom" style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          domain={yDomain}
          tickCount={6}
          tickFormatter={v => fmt(v, 4)}
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

        {/* Fitted line (rendered first so it's behind the points) */}
        <Scatter
          name={`Ajuste: ${result.equation}`}
          data={fitLine}
          fill="transparent"
          line={{ stroke: '#e03030', strokeWidth: 2 }}
          shape={() => null as unknown as React.ReactElement}
          legendType="line"
        />

        {/* Original data points */}
        <Scatter
          name="Datos originales"
          data={dataPoints}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: LinearFitResult }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            <th>Xᵢ²</th>
            <th>XᵢYᵢ</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtResult(row.x)}</td>
              <td className={styles.numeric}>{fmtResult(row.y)}</td>
              <td className={styles.numeric}>{fmtResult(row.x2)}</td>
              <td className={styles.numeric}>{fmtResult(row.xy)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>{fmtResult(result.sumX)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumY)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumX2)}</td>
            <td className={styles.numeric}>{fmtResult(result.sumXY)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildLinearSteps(result: LinearFitResult): StepData[] {
  const { n, sumX, sumY, sumX2, sumY2, sumXY, a, b, r, rSquared } = result;
  const D = n * sumX2 - sumX * sumX;
  const numerB = n * sumXY - sumX * sumY;
  const D2 = n * sumY2 - sumY * sumY;
  const denomR = Math.sqrt(Math.max(0, D * D2));
  const C = '#3b82f6';
  const BG = '#eff6ff';
  const BD = '#bfdbfe';

  return [
    {
      title: 'Sumas necesarias de los datos',
      children: (
        <div>
          <p className={ss.text}>Con los {n} pares (xᵢ, yᵢ) se calculan las siguientes sumas acumuladas:</p>
          <div className={ss.chips}>
            {[`n = ${n}`, `Σxᵢ = ${fmtS(sumX)}`, `Σyᵢ = ${fmtS(sumY)}`,
              `Σxᵢ² = ${fmtS(sumX2)}`, `Σxᵢyᵢ = ${fmtS(sumXY)}`, `Σyᵢ² = ${fmtS(sumY2)}`]
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
      title: 'Coeficiente b (pendiente)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>b = (n·Σxᵢyᵢ − Σxᵢ·Σyᵢ) / D</div>
          <div className={ss.calcBlock}>
            <div>= ({n} × {fmtS(sumXY)} − {fmtS(sumX)} × {fmtS(sumY)}) / {fmtS(D)}</div>
            <div>= ({fmtS(n * sumXY)} − {fmtS(sumX * sumY)}) / {fmtS(D)}</div>
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
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>a = (Σyᵢ − b·Σxᵢ) / n</div>
          <div className={ss.calcBlock}>
            <div>= ({fmtS(sumY)} − {fmtS(b)} × {fmtS(sumX)}) / {n}</div>
            <div>= ({fmtS(sumY)} − {fmtS(b * sumX)}) / {n}</div>
            <div>= {fmtS(sumY - b * sumX)} / {n}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>a = {fmtS(a)}</span>
        </div>
      ),
    },
    {
      title: 'Coeficiente de correlación de Pearson (r)',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>
            r = (n·Σxᵢyᵢ − Σxᵢ·Σyᵢ) / √[(n·Σxᵢ² − (Σxᵢ)²)·(n·Σyᵢ² − (Σyᵢ)²)]
          </div>
          <div className={ss.calcBlock}>
            <div>Numerador   = {fmtS(numerB)}</div>
            <div>Factor D₁   = {fmtS(D)}</div>
            <div>Factor D₂   = {n}·{fmtS(sumY2)} − ({fmtS(sumY)})² = {fmtS(D2)}</div>
            <div>Denominador = √({fmtS(D)} × {fmtS(D2)}) = {fmtS(denomR)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>
            r = {fmtS(numerB)} / {fmtS(denomR)} = {fmtS(r)}
          </span>
        </div>
      ),
    },
    {
      title: 'Coeficiente de determinación R² y ecuación ajustada',
      children: (
        <div>
          <div className={ss.formulaBox} style={{ borderLeftColor: C }}>R² = r²</div>
          <div className={ss.calcBlock}>
            <div>= ({fmtS(r)})² = {fmtS(r * r)}</div>
          </div>
          <span className={ss.resultLine} style={{ background: BG, color: C, borderColor: BD }}>
            R² = {fmtS(rSquared)} &nbsp;({(rSquared * 100).toFixed(2)} %)
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

export function LinearFit() {
  const { points, clearAll } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(
    () => (calculated && points.length >= 2 ? LinearFitService.compute(points) : null),
    [calculated, points]
  );

  const fitLine = useMemo(
    () => (result ? LinearFitService.getFitLine(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(
    () => points.map(p => ({ x: p.x, y: p.y })),
    [points]
  );

  const hasData = points.length >= 2;

  function handleCalculate() {
    setCalculated(true);
  }

  function handleReset() {
    setCalculated(false);
  }

  function handleExport() {
    if (!result) return;
    const lines = [
      'AJUSTE LINEAL — CurveAnalysis',
      '================================',
      `n = ${result.n}`,
      `a (intercepto) = ${fmtResult(result.a)}`,
      `b (pendiente)  = ${fmtResult(result.b)}`,
      `r              = ${fmtResult(result.r)}`,
      `R²             = ${fmtResult(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de cálculo:',
      'N°\tXi\tYi\tXi²\tXiYi',
      ...result.rows.map(r => `${r.n}\t${r.x}\t${r.y}\t${r.x2}\t${r.xy}`),
      `Σ\t${result.sumX}\t${result.sumY}\t${result.sumX2}\t${result.sumXY}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ajuste_lineal.txt';
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
        icon={<TrendingUp size={22} />}
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
              leftIcon={<TrendingUp size={14} />}
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
          <TrendingUp size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xi, Yi) en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>{' '}
            para ejecutar el ajuste lineal.
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
                  <p className={styles.cardTitle}>Gráfica — Ajuste Lineal</p>
                  <p className={styles.cardSub}>Modelo: {method.formula}</p>
                </div>
              </div>
              {result ? (
                <LinearChart result={result} dataPoints={dataPoints} fitLine={fitLine} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <TrendingUp size={28} className={styles.placeholderIcon} />
                  <p>Presione <strong>Calcular</strong> para generar la gráfica</p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {result && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Tabla de Cálculo Intermedio</p>
                <CalcTable result={result} />
                <div className={styles.sumSummary}>
                  <span>n = {result.n}</span>
                  <span>Σx = {fmtResult(result.sumX)}</span>
                  <span>Σy = {fmtResult(result.sumY)}</span>
                  <span>Σx² = {fmtResult(result.sumX2)}</span>
                  <span>Σxy = {fmtResult(result.sumXY)}</span>
                </div>
              </div>
            )}

            {/* Step-by-step solution */}
            {result && (
              <SolutionSteps steps={buildLinearSteps(result)} color="#3b82f6" />
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
                {result ? (
                  <span className={styles.equation}>{result.equation}</span>
                ) : (
                  <span className={styles.equationPlaceholder}>Ejecute el cálculo para obtener la ecuación</span>
                )}
              </div>
            </div>

            {/* Numeric results */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Resultados Numéricos</p>
              <div className={styles.resultsGrid}>
                {[
                  { label: 'a', desc: 'Intercepto', value: result?.a },
                  { label: 'b', desc: 'Pendiente', value: result?.b },
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

            {/* R² quality indicator */}
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
            </div>

            {/* Actions */}
            <div className={styles.actionsCol}>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<Download size={14} />}
                disabled={!result}
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
