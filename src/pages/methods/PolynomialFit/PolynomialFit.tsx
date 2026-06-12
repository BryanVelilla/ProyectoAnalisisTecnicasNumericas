import { useMemo, useState } from 'react';
import { Sigma, Download, RefreshCw, Info } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
} from 'recharts';
import { useData } from '../../../store/DataContext';
import { PolynomialFitService, type PolynomialFitResult } from '../../../services/polynomialFit.service';
import { DataService } from '../../../services/data.service';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button }     from '../../../components/ui/Button';
import { Badge }      from '../../../components/ui/Badge';
import { SolutionSteps, fmtS, type StepData } from '../../../components/shared/SolutionSteps';
import ss from '../../../components/shared/SolutionSteps/SolutionSteps.module.css';
import styles from './PolynomialFit.module.css';

const COLOR   = '#c026d3';
const BG_POLY = '#fdf4ff';
const BD_POLY = '#e879f9';

const DEGREES = [2, 3, 4, 5] as const;
type Degree = typeof DEGREES[number];

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return DataService.formatNumber(parseFloat(v.toPrecision(6)));
}

function fmtR(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return v.toFixed(6).replace(/\.?0+$/, '');
  return v.toExponential(4);
}

// ─── Superscript helper ───────────────────────────────────────────────────────

function sup(n: number): string {
  return n <= 1 ? '' : n === 2 ? '²' : n === 3 ? '³' : n === 4 ? '⁴' : `^${n}`;
}

// ─── Degree selector ───────────────────────────────────────────────────────────

function DegreeSelector({ degree, onChange }: { degree: Degree; onChange: (d: Degree) => void }) {
  function buildFormula(k: Degree): string {
    const terms = ['a₀'];
    if (k >= 1) terms.push('a₁x');
    for (let i = 2; i <= k; i++) terms.push(`a₂x${sup(i)}`);
    const inner = Array.from({ length: k + 1 }, (_, i) =>
      i === 0 ? 'a₀' : i === 1 ? 'a₁x' : `a${i}x${sup(i)}`
    );
    return `ŷ = ${inner.join(' + ')}`;
  }

  return (
    <div className={styles.degreeBar}>
      <span className={styles.degreeLabel}>Grado</span>
      <div className={styles.degreeGroup}>
        {DEGREES.map(d => (
          <button
            key={d}
            className={`${styles.degreeBtn} ${degree === d ? styles.degreeBtnActive : ''}`}
            onClick={() => onChange(d)}
            title={`Polinomio de grado ${d}`}
          >
            {d}
          </button>
        ))}
      </div>
      <span className={styles.degreeFormula}>{buildFormula(degree)}</span>
    </div>
  );
}

// ─── Chart ─────────────────────────────────────────────────────────────────────

function PolyChart({ result, dataPoints, fitCurve }: {
  result:      PolynomialFitResult;
  dataPoints:  { x: number; y: number }[];
  fitCurve:    { x: number; y: number }[];
}) {
  const allY  = [...dataPoints.map(p => p.y), ...fitCurve.map(p => p.y)];
  const allX  = [...dataPoints.map(p => p.x), ...fitCurve.map(p => p.x)];
  const yPad  = (Math.max(...allY) - Math.min(...allY)) * 0.12 || 1;
  const xPad  = (Math.max(...allX) - Math.min(...allX)) * 0.05 || 1;
  const yDomain: [number, number] = [Math.min(...allY) - yPad, Math.max(...allY) + yPad];
  const xDomain: [number, number] = [Math.min(...allX) - xPad, Math.max(...allX) + xPad];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" dataKey="x" domain={xDomain} tickCount={7}
          tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}>
          <Label value="X" offset={-8} position="insideBottom"
            style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </XAxis>
        <YAxis type="number" dataKey="y" domain={yDomain} tickCount={6}
          tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} width={70}>
          <Label value="Y" angle={-90} position="insideLeft"
            style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
        </YAxis>
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(v: number) => fmtR(v)}
          contentStyle={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '8px', fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

        <Scatter
          name={`Ajuste grado ${result.degree}: ${result.equation}`}
          data={fitCurve}
          fill="transparent"
          line={{ stroke: COLOR, strokeWidth: 2 }}
          shape={() => null as unknown as React.ReactElement}
          legendType="line"
        />
        <Scatter
          name="Datos originales"
          data={dataPoints}
          fill={COLOR}
          stroke="#86198f"
          strokeWidth={1}
          r={5}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Calculation Table ─────────────────────────────────────────────────────────

function CalcTable({ result }: { result: PolynomialFitResult }) {
  const k = result.degree;
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.calcTable}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Xᵢ</th>
            <th>Yᵢ</th>
            {Array.from({ length: k - 1 }, (_, i) => (
              <th key={i}>Xᵢ{sup(i + 2)}</th>
            ))}
            {Array.from({ length: k }, (_, i) => (
              <th key={i}>Xᵢ{sup(i + 1)}Yᵢ</th>
            ))}
            <th>ŷᵢ</th>
            <th>(Yᵢ−ŷᵢ)²</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.n}>
              <td className={styles.centered}>{row.n}</td>
              <td className={styles.numeric}>{fmtR(row.x)}</td>
              <td className={styles.numeric}>{fmtR(row.y)}</td>
              {row.xPowers.slice(1).map((v, i) => (
                <td key={i} className={styles.numeric}>{fmtR(v)}</td>
              ))}
              {row.xPowersY.map((v, i) => (
                <td key={i} className={styles.numeric}>{fmtR(v)}</td>
              ))}
              <td className={styles.numeric}>{fmtR(row.yHat)}</td>
              <td className={styles.numeric}>{fmtR(row.residual2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.sumRow}>
            <td className={styles.centered}>Σ</td>
            <td className={styles.numeric}>{fmtR(result.xSums[1])}</td>
            <td className={styles.numeric}>{fmtR(result.xySums[0])}</td>
            {Array.from({ length: k - 1 }, (_, i) => (
              <td key={i} className={styles.numeric}>{fmtR(result.xSums[i + 2])}</td>
            ))}
            {Array.from({ length: k }, (_, i) => (
              <td key={i} className={styles.numeric}>{fmtR(result.xySums[i + 1])}</td>
            ))}
            <td className={styles.numeric}>—</td>
            <td className={styles.numeric}>{fmtR(result.sse)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Step-by-step derivation ───────────────────────────────────────────────────

function buildPolySteps(result: PolynomialFitResult): StepData[] {
  const { degree: k, n, xSums, xySums, XtX, Xty, coefficients, r, rSquared, sse, ssTot, equation } = result;

  const steps: StepData[] = [];

  // Step 1: Sums
  steps.push({
    title: `Sumas acumuladas de potencias (n = ${n}, grado k = ${k})`,
    children: (
      <div>
        <p className={ss.text}>
          Para el ajuste polinomial se necesitan las sumas Σxⁱ (i = 0…{2*k}) y Σxʲ·y (j = 0…{k}):
        </p>
        <div className={ss.chips}>
          {xSums.map((s, i) => (
            <span key={i} className={ss.chip}>
              {i === 0 ? `n = ${n}` : `Σx${sup(i)} = ${fmtS(s)}`}
            </span>
          ))}
        </div>
        <div className={ss.chips} style={{ marginTop: 8 }}>
          {xySums.map((s, i) => (
            <span key={i} className={ss.chip}>
              {i === 0 ? `Σy = ${fmtS(s)}` : `Σx${sup(i)}y = ${fmtS(s)}`}
            </span>
          ))}
        </div>
      </div>
    ),
  });

  // Step 2: Normal equations matrix
  steps.push({
    title: 'Sistema de ecuaciones normales: (XᵀX) β = Xᵀy',
    children: (
      <div>
        <p className={ss.text}>
          Minimizando Σ(yᵢ − ŷᵢ)², el sistema de ecuaciones normales resulta:
        </p>
        <div className={styles.matrixWrap}>
          {XtX.map((row, i) => (
            <div key={i} className={styles.matrixRow}>
              <span style={{ color: 'var(--color-text-muted)', minWidth: 24 }}>
                {i === 0 ? '⎡' : i === XtX.length - 1 ? '⎣' : '⎢'}
              </span>
              {row.map((v, j) => (
                <span key={j} className={styles.matrixCell}>{fmtS(v)}</span>
              ))}
              <span className={styles.matrixSep}>│</span>
              <span className={styles.matrixRhs}>{fmtS(Xty[i])}</span>
              <span style={{ color: 'var(--color-text-muted)', minWidth: 24 }}>
                {i === 0 ? '⎤' : i === XtX.length - 1 ? '⎦' : '⎥'}
              </span>
            </div>
          ))}
        </div>
        <p className={ss.text} style={{ marginTop: 8 }}>
          Se resuelve por eliminación gaussiana con pivoteo parcial para mayor estabilidad numérica.
        </p>
      </div>
    ),
  });

  // Step 3: Coefficients
  steps.push({
    title: `Coeficientes del polinomio de grado ${k}`,
    children: (
      <div>
        <p className={ss.text}>
          Aplicando la eliminación gaussiana y sustitución hacia atrás:
        </p>
        <div className={ss.chips}>
          {coefficients.map((c, i) => (
            <span key={i} className={ss.chip} style={{ background: BG_POLY, borderColor: BD_POLY, color: COLOR }}>
              a{i} = {fmtS(c)}
            </span>
          ))}
        </div>
        <div className={ss.conclusionBox} style={{ background: BG_POLY, borderColor: BD_POLY, marginTop: 12 }}>
          <span className={ss.conclusionEq} style={{ color: COLOR }}>{equation}</span>
        </div>
      </div>
    ),
  });

  // Step 4: Residuals and SSE
  steps.push({
    title: 'Residuos: SSE y ECM',
    children: (
      <div>
        <div className={ss.formulaBox} style={{ borderLeftColor: COLOR }}>
          SSE = Σ(yᵢ − ŷᵢ)² &nbsp;&nbsp; ECM = SSE / n
        </div>
        <div className={ss.calcBlock}>
          {result.rows.map(r => (
            <div key={r.n}>
              i = {r.n}: yᵢ = {fmtS(r.y)} &nbsp; ŷᵢ = {fmtS(r.yHat)} &nbsp; eᵢ = {fmtS(r.residual)} &nbsp; eᵢ² = {fmtS(r.residual2)}
            </div>
          ))}
        </div>
        <span className={ss.resultLine} style={{ background: BG_POLY, color: COLOR, borderColor: BD_POLY }}>
          SSE = {fmtS(sse)} &nbsp;&nbsp; ECM = {fmtS(result.ecm)}
        </span>
      </div>
    ),
  });

  // Step 5: R²
  steps.push({
    title: 'Coeficiente de determinación R²',
    children: (
      <div>
        <div className={ss.formulaBox} style={{ borderLeftColor: COLOR }}>
          R² = 1 − SSres / SStot &nbsp;&nbsp; SStot = Σ(yᵢ − ȳ)²
        </div>
        <div className={ss.calcBlock}>
          <div>SSres = {fmtS(sse)}</div>
          <div>SStot = {fmtS(ssTot)}</div>
          <div>R² = 1 − {fmtS(sse)} / {fmtS(ssTot)} = {fmtS(rSquared)}</div>
        </div>
        <span className={ss.resultLine} style={{ background: BG_POLY, color: COLOR, borderColor: BD_POLY }}>
          R² = {fmtS(rSquared)} &nbsp;({(rSquared * 100).toFixed(2)} %) &nbsp;→&nbsp; r = {fmtS(r)}
        </span>
        <div className={ss.conclusionBox} style={{ background: BG_POLY, borderColor: BD_POLY, marginTop: 12 }}>
          <span className={ss.conclusionEq} style={{ color: COLOR }}>{equation}</span>
        </div>
      </div>
    ),
  });

  return steps;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function PolynomialFit() {
  const { points, clearAll } = useData();
  const [degree, setDegree]     = useState<Degree>(2);
  const [calculated, setCalc]   = useState(false);

  const minPoints = degree + 1;
  const hasData   = points.length >= 2;
  const enoughPts = points.length >= minPoints;

  const result = useMemo(
    () => (calculated && enoughPts ? PolynomialFitService.compute(points, degree) : null),
    [calculated, points, degree]
  );

  const fitCurve = useMemo(
    () => (result ? PolynomialFitService.getFitCurve(result, points) : []),
    [result, points]
  );

  const dataPoints = useMemo(
    () => points.map(p => ({ x: p.x, y: p.y })),
    [points]
  );

  function handleDegreeChange(d: Degree) {
    setDegree(d);
    setCalc(false);
  }

  function handleExport() {
    if (!result) return;
    const lines = [
      `AJUSTE POLINOMIAL GRADO ${result.degree} — CurveAnalysis`,
      '='.repeat(48),
      `n = ${result.n}`,
      ...result.coefficients.map((c, i) => `a${i} = ${fmtR(c)}`),
      `r  = ${fmtR(result.r)}`,
      `R² = ${fmtR(result.rSquared)}`,
      '',
      `Ecuación: ${result.equation}`,
      '',
      'Tabla de resultados:',
      `N°\tXi\tYi\tYhat\tResidual\tResidual²`,
      ...result.rows.map(r => `${r.n}\t${r.x}\t${r.y}\t${r.yHat.toPrecision(6)}\t${r.residual.toPrecision(6)}\t${r.residual2.toPrecision(6)}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ajuste_polinomial_g${result.degree}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ajuste de Curvas · Ajuste Polinomial"
        title="Ajuste Polinomial"
        formula={`ŷ = a₀ + a₁x + a₂x² + … + aₖxᵏ`}
        description="Regresión polinomial por mínimos cuadrados. Ajusta un polinomio de grado k minimizando la suma de cuadrados de los residuos mediante ecuaciones normales resueltas por eliminación gaussiana."
        icon={<Sigma size={22} />}
        iconColor="purple"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button
              variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={() => setCalc(false)} disabled={!calculated}
            >
              Resetear
            </Button>
            <Button
              variant="primary" size="sm" leftIcon={<Sigma size={14} />}
              onClick={() => setCalc(true)} disabled={!enoughPts}
            >
              Calcular
            </Button>
          </>
        }
      />

      {!hasData && (
        <div className={styles.emptyState}>
          <Sigma size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Sin datos suficientes</p>
          <p className={styles.emptySub}>
            Ingrese al menos 2 pares (Xᵢ, Yᵢ) en{' '}
            <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>{' '}
            para ejecutar el ajuste polinomial.
          </p>
        </div>
      )}

      {hasData && (
        <div className={styles.layout}>
          {/* ── Main column ── */}
          <div className={styles.mainCol}>

            {/* Degree selector + chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>Gráfica — Ajuste Polinomial</p>
                  <p className={styles.cardSub}>ŷ = a₀ + a₁x + … + aₖxᵏ</p>
                </div>
              </div>

              <DegreeSelector degree={degree} onChange={handleDegreeChange} />

              {!enoughPts && (
                <p className={styles.notEnoughMsg}>
                  Se necesitan al menos <strong>{minPoints}</strong> puntos para ajuste de grado {degree}.
                  Actualmente hay <strong>{points.length}</strong>.
                </p>
              )}

              {result ? (
                <PolyChart result={result} dataPoints={dataPoints} fitCurve={fitCurve} />
              ) : (
                <div className={styles.chartPlaceholder}>
                  <Sigma size={28} className={styles.placeholderIcon} />
                  <p>Seleccione el grado y presione <strong>Calcular</strong></p>
                </div>
              )}
            </div>

            {/* Calculation table */}
            {result && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>Tabla de Cálculo Intermedio (grado {result.degree})</p>
                <CalcTable result={result} />
                <div className={styles.sumSummary}>
                  <span>n = {result.n}</span>
                  {result.xSums.slice(1).map((s, i) => (
                    <span key={i}>Σx{sup(i + 1)} = {fmtR(s)}</span>
                  ))}
                  {result.xySums.map((s, i) => (
                    <span key={i}>{i === 0 ? `Σy = ${fmtR(s)}` : `Σx${sup(i)}y = ${fmtR(s)}`}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-step */}
            {result && (
              <SolutionSteps steps={buildPolySteps(result)} color={COLOR} />
            )}

            {/* Input data */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Datos de Entrada ({points.length} pares)</p>
              <div className={styles.tableWrapper}>
                <table className={styles.calcTable}>
                  <thead>
                    <tr><th>N°</th><th>Xi</th><th>Yi</th></tr>
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

            {/* Coefficients */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Coeficientes</p>
              <div className={styles.resultsGrid}>
                {result
                  ? result.coefficients.map((c, i) => (
                      <div key={i} className={styles.resultItem}>
                        <span className={styles.resultLabel}>a{i}</span>
                        <span className={styles.resultDesc}>{i === 0 ? 'intercepto' : `x${sup(i)}`}</span>
                        <span className={styles.resultValue}>{fmtR(c)}</span>
                      </div>
                    ))
                  : [{ label: 'a₀', desc: 'intercepto' }, { label: 'a₁', desc: 'lineal' }, { label: 'a₂', desc: 'cuadrático' }]
                      .map(({ label, desc }) => (
                        <div key={label} className={styles.resultItem}>
                          <span className={styles.resultLabel}>{label}</span>
                          <span className={styles.resultDesc}>{desc}</span>
                          <span className={styles.resultPlaceholder}>—</span>
                        </div>
                      ))
                }
                {result && (
                  <>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>r</span>
                      <span className={styles.resultDesc}>correlación</span>
                      <span className={styles.resultValue}>{fmtR(result.r)}</span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>R²</span>
                      <span className={styles.resultDesc}>determinación</span>
                      <span className={styles.resultValue}>{fmtR(result.rSquared)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quality bar */}
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
                  R² = {(result.rSquared * 100).toFixed(2)} % —{' '}
                  {result.rSquared >= 0.99 ? 'Excelente' :
                   result.rSquared >= 0.95 ? 'Muy bueno' :
                   result.rSquared >= 0.8  ? 'Aceptable' :
                   result.rSquared >= 0.6  ? 'Moderado'  : 'Débil'}
                </p>
              </div>
            )}

            {/* Info */}
            <div className={styles.card}>
              <p className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={15} />
                Aplicabilidad
              </p>
              <p className={styles.infoText}>
                El ajuste polinomial es flexible y puede modelar tendencias no lineales complejas.
                A mayor grado, mayor capacidad de ajuste pero también mayor riesgo de sobre-ajuste
                (overfitting). Se recomienda iniciar con grado 2 y aumentar solo si es necesario.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.actionsCol}>
              <Button
                variant="outline" size="sm" fullWidth
                leftIcon={<Download size={14} />}
                disabled={!result} onClick={handleExport}
              >
                Exportar Resultados
              </Button>
              <Button
                variant="ghost" size="sm" fullWidth
                onClick={() => { clearAll(); setCalc(false); }}
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
