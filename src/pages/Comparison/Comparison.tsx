import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare, Download, RefreshCw, ExternalLink,
  TrendingUp, Award, BarChart3, AlertCircle,
  ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label, ReferenceArea,
} from 'recharts';
import { useData } from '../../store/DataContext';
import {
  ComparisonService,
  type MethodCompResult,
  type ComparisonResult,
} from '../../services/comparison.service';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import styles from './Comparison.module.css';

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtR(v: number): string {
  if (isNaN(v) || !isFinite(v)) return '—';
  return v.toFixed(5);
}

function fmtECM(v: number): string {
  if (isNaN(v) || !isFinite(v) || v === Infinity) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(5)).toString();
  return v.toExponential(3);
}

function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e-4 && abs < 1e6) return parseFloat(v.toPrecision(4)).toString();
  return v.toExponential(2);
}

// ─── Quality helpers ───────────────────────────────────────────────────────────

function qualityLabel(r2: number): string {
  if (r2 >= 0.95) return 'Excelente';
  if (r2 >= 0.8)  return 'Bueno';
  if (r2 >= 0.6)  return 'Moderado';
  return 'Débil';
}

function qualityClass(r2: number): string {
  if (r2 >= 0.95) return styles.excellent;
  if (r2 >= 0.8)  return styles.good;
  if (r2 >= 0.6)  return styles.moderate;
  return styles.weak;
}

function r2Color(r2: number): string {
  if (r2 >= 0.95) return '#10b981';
  if (r2 >= 0.8)  return '#3b82f6';
  if (r2 >= 0.6)  return '#f59e0b';
  return '#ef4444';
}

// ─── Rank medal ────────────────────────────────────────────────────────────────

function RankMedal({ rank, valid }: { rank: number; valid: boolean }) {
  if (!valid) return (
    <span className={`${styles.rankMedal} ${styles.invalid}`}>—</span>
  );
  if (rank === 1) return <span className={`${styles.rankMedal} ${styles.gold}`}>1°</span>;
  if (rank === 2) return <span className={`${styles.rankMedal} ${styles.silver}`}>2°</span>;
  if (rank === 3) return <span className={`${styles.rankMedal} ${styles.bronze}`}>3°</span>;
  return <span className={`${styles.rankMedal} ${styles.normal}`}>{rank}°</span>;
}

// ─── Zoom types ───────────────────────────────────────────────────────────────

type ZoomDomain = { x: [number, number]; y: [number, number] };
type DragState  = { x1: number; y1: number; x2: number; y2: number } | null;

// Chart inner margins (must match the margin prop passed to ScatterChart)
const CM = { top: 16, right: 32, bottom: 36, left: 16 } as const;
const Y_AXIS_W = 72; // must match width prop on YAxis

// ─── Comparison Chart ─────────────────────────────────────────────────────────

function ComparisonChart({ result }: { result: ComparisonResult }) {
  const { dataPoints, ranked } = result;
  const validMethods = ranked.filter(m => m.valid && m.fitCurve.length > 0);

  // Visibility filter
  const [active, setActive] = useState<Set<string>>(
    () => new Set(validMethods.map(m => m.id))
  );
  const toggle = (id: string) =>
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Zoom state
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain | null>(null);
  const [drag, setDrag] = useState<DragState>(null);

  // Refs to avoid stale closures in event listeners
  const activeDomainRef = useRef<ZoomDomain | null>(null);
  const baseDomainRef   = useRef<ZoomDomain | null>(null);

  // Base domain from data
  const ys = dataPoints.map(p => p.y);
  const xs = dataPoints.map(p => p.x);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yPad = (yMax - yMin) * 0.18 || 1;
  const xPad = (xMax - xMin) * 0.06 || 0.5;
  const baseDomain: ZoomDomain = {
    x: [xMin - xPad, xMax + xPad],
    y: [yMin - yPad, yMax + yPad * 2],
  };

  const activeDomain  = zoomDomain ?? baseDomain;
  activeDomainRef.current = activeDomain;
  baseDomainRef.current   = baseDomain;

  // Pixel coords → data coords (relative to the chart plot area)
  function pixelToData(clientX: number, clientY: number) {
    const el = chartRef.current;
    if (!el) return null;
    const rect      = el.getBoundingClientRect();
    const plotLeft  = CM.left + Y_AXIS_W;
    const plotTop   = CM.top;
    const plotW     = rect.width  - plotLeft - CM.right;
    const plotH     = rect.height - plotTop  - CM.bottom;
    const rx = clientX - rect.left - plotLeft;
    const ry = clientY - rect.top  - plotTop;
    if (rx < 0 || rx > plotW || ry < 0 || ry > plotH) return null;
    const [x1, x2] = activeDomainRef.current!.x;
    const [, y2]   = activeDomainRef.current!.y;
    const [y1]     = activeDomainRef.current!.y;
    return {
      x: x1 + (rx / plotW) * (x2 - x1),
      y: y2 - (ry / plotH) * (y2 - y1),
    };
  }

  // ── Toolbar actions ──────────────────────────────────────────────────────────
  function zoomStep(factor: number) {
    const d = activeDomainRef.current!;
    const xMid = (d.x[0] + d.x[1]) / 2;
    const yMid = (d.y[0] + d.y[1]) / 2;
    const xHalf = (d.x[1] - d.x[0]) / 2 * factor;
    const yHalf = (d.y[1] - d.y[0]) / 2 * factor;
    const nd: ZoomDomain = {
      x: [xMid - xHalf, xMid + xHalf],
      y: [yMid - yHalf, yMid + yHalf],
    };
    const b = baseDomainRef.current!;
    if (factor >= 1 && nd.x[0] <= b.x[0] && nd.x[1] >= b.x[1]) {
      setZoomDomain(null);
    } else {
      setZoomDomain(nd);
    }
  }

  // ── Mouse-wheel zoom (non-passive listener so we can preventDefault) ─────────
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / 0.85 : 0.85;
      const rect    = el.getBoundingClientRect();
      const d       = activeDomainRef.current!;
      const b       = baseDomainRef.current!;
      const plotLeft = CM.left + Y_AXIS_W;
      const plotTop  = CM.top;
      const plotW    = rect.width  - plotLeft - CM.right;
      const plotH    = rect.height - plotTop  - CM.bottom;
      const rx = Math.max(0, Math.min(e.clientX - rect.left - plotLeft, plotW));
      const ry = Math.max(0, Math.min(e.clientY - rect.top  - plotTop,  plotH));
      const [x1, x2] = d.x, [y1, y2] = d.y;
      const mx = x1 + (rx / plotW) * (x2 - x1);
      const my = y2 - (ry / plotH) * (y2 - y1);
      const nd: ZoomDomain = {
        x: [mx - (mx - x1) * factor, mx + (x2 - mx) * factor],
        y: [my - (my - y1) * factor, my + (y2 - my) * factor],
      };
      if (factor >= 1 && nd.x[0] <= b.x[0] && nd.x[1] >= b.x[1]) {
        setZoomDomain(null);
      } else {
        setZoomDomain(nd);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // refs handle staleness — no need to re-register

  // ── Drag-to-zoom (pointer capture keeps events on this div) ──────────────────
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const coords = pixelToData(e.clientX, e.clientY);
    if (!coords) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDrag({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const coords = pixelToData(e.clientX, e.clientY);
    if (!coords) return;
    setDrag(prev => prev ? { ...prev, x2: coords.x, y2: coords.y } : null);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    const { x1, y1, x2, y2 } = drag;
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const d = activeDomainRef.current!;
    const xRange = d.x[1] - d.x[0], yRange = d.y[1] - d.y[0];
    if ((maxX - minX) > xRange * 0.02 && (maxY - minY) > yRange * 0.02) {
      setZoomDomain({ x: [minX, maxX], y: [minY, maxY] });
    }
    setDrag(null);
  }

  // Zoom level percentage relative to base domain
  const isZoomed   = zoomDomain !== null;
  const zoomLevel  = isZoomed
    ? Math.round((baseDomain.x[1] - baseDomain.x[0]) / (zoomDomain.x[1] - zoomDomain.x[0]) * 100)
    : 100;

  const allOn  = validMethods.every(m => active.has(m.id));
  const noneOn = validMethods.every(m => !active.has(m.id));
  const visibleMethods = validMethods.filter(m => active.has(m.id));

  return (
    <>
      {/* ── Zoom toolbar ── */}
      <div className={styles.zoomBar}>
        <div className={styles.zoomBtnGroup}>
          <button className={styles.zoomBtn} onClick={() => zoomStep(0.65)} title="Ampliar (Zoom In)">
            <ZoomIn size={14} />
          </button>
          <button className={styles.zoomBtn} onClick={() => zoomStep(1 / 0.65)} disabled={!isZoomed} title="Reducir (Zoom Out)">
            <ZoomOut size={14} />
          </button>
          <button
            className={`${styles.zoomBtn} ${isZoomed ? styles.zoomBtnReset : ''}`}
            onClick={() => setZoomDomain(null)}
            disabled={!isZoomed}
            title="Restablecer vista completa"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <span className={`${styles.zoomLevel} ${isZoomed ? styles.zoomLevelActive : ''}`}>
          {zoomLevel}%
        </span>
        <span className={styles.zoomHint}>
          Arrastra para seleccionar · Rueda del ratón para zoom
        </span>
      </div>

      {/* ── Chart with pointer/wheel handlers ── */}
      <div
        ref={chartRef}
        className={`${styles.chartWrapper} ${drag ? styles.chartWrapperSelecting : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
        style={{ touchAction: 'none' }}
      >
        <ResponsiveContainer width="100%" height={440}>
          <ScatterChart margin={CM}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number" dataKey="x"
              domain={activeDomain.x}
              tickCount={7} tickFormatter={fmtAxis}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            >
              <Label value="X" offset={-8} position="insideBottom"
                style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            </XAxis>
            <YAxis
              type="number" dataKey="y"
              domain={activeDomain.y}
              tickCount={6} tickFormatter={fmtAxis}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              width={Y_AXIS_W}
            >
              <Label value="Y" angle={-90} position="insideLeft"
                style={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            </YAxis>
            {!drag && (
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v: number) => fmtAxis(v)}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            )}

            {/* Selection rectangle while dragging */}
            {drag && (
              <ReferenceArea
                x1={Math.min(drag.x1, drag.x2)} x2={Math.max(drag.x1, drag.x2)}
                y1={Math.min(drag.y1, drag.y2)} y2={Math.max(drag.y1, drag.y2)}
                stroke="var(--color-accent)" strokeOpacity={0.8} strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="var(--color-accent)" fillOpacity={0.09}
              />
            )}

            {/* Method fit curves */}
            {visibleMethods.map(m => (
              <Scatter
                key={m.id}
                name={m.name}
                data={m.fitCurve}
                fill="transparent"
                stroke={m.color}
                line={{
                  stroke: m.color,
                  strokeWidth: 2,
                  strokeDasharray: m.dash || undefined,
                } as React.SVGProps<SVGPathElement>}
                shape={() => null as unknown as React.ReactElement}
                legendType="line"
                isAnimationActive={false}
              />
            ))}

            {/* Original data points — always on top */}
            <Scatter
              name="Datos originales"
              data={dataPoints}
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth={1.5}
              r={5}
              shape="circle"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Filterable legend */}
      <div className={styles.legendGrid}>
        <div className={styles.legendItem}>
          <svg width="14" height="14" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
          </svg>
          <span className={styles.legendLabel}>Datos originales</span>
        </div>

        {ranked.map(m => {
          const isOn = active.has(m.id);
          return (
            <button
              key={m.id}
              className={`${styles.legendBtn} ${!isOn ? styles.legendBtnOff : ''} ${!m.valid ? styles.legendBtnDisabled : ''}`}
              onClick={() => m.valid && toggle(m.id)}
              disabled={!m.valid}
              title={!m.valid ? (m.invalidReason ?? 'No aplicable') : (isOn ? `Ocultar ${m.name}` : `Mostrar ${m.name}`)}
              aria-pressed={isOn}
            >
              <svg width="24" height="10" style={{ flexShrink: 0 }}>
                <line x1="0" y1="5" x2="24" y2="5"
                  stroke={m.color} strokeWidth="2.5"
                  strokeDasharray={m.dash || undefined}
                  opacity={isOn ? 1 : 0.4}
                />
              </svg>
              <span className={styles.legendLabel}>
                {m.name}{!m.valid ? ' (N/A)' : ''}
              </span>
            </button>
          );
        })}

        {validMethods.length > 1 && (
          <button
            className={styles.legendBtnQuick}
            onClick={() => setActive(noneOn ? new Set(validMethods.map(m => m.id)) : new Set())}
          >
            {noneOn ? 'Mostrar todos' : allOn ? 'Ocultar todos' : 'Ninguno'}
          </button>
        )}
      </div>
      {!allOn && !noneOn && (
        <p className={styles.chartLegendNote}>
          {active.size} de {validMethods.length} métodos visibles ·{' '}
          <button
            className={styles.legendResetLink}
            onClick={() => setActive(new Set(validMethods.map(m => m.id)))}
          >
            Mostrar todos
          </button>
        </p>
      )}
    </>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ result, n }: { result: ComparisonResult; n: number }) {
  const best = result.ranked.find(m => m.valid);
  if (!best) return null;

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>
        <span className={styles.summaryLabel}>Resumen Comparativo · {n} pares de datos</span>
        <Badge variant="success" dot>
          {result.validCount} de {result.ranked.length} métodos aplicables
        </Badge>
      </div>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryItemLabel}>Mejor Método</span>
          <span className={styles.summaryItemValue} style={{ display: 'flex', alignItems: 'center' }}>
            <span
              className={styles.bestMethodDot}
              style={{ background: best.color }}
            />
            {best.name}
          </span>
          <span className={styles.summaryItemSub}>{best.formula}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryItemLabel}>Mejor R²</span>
          <span className={styles.summaryItemValue}>
            {(best.rSquared * 100).toFixed(2)}%
          </span>
          <span className={styles.summaryItemSub}>{qualityLabel(best.rSquared)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryItemLabel}>Mejor ECM</span>
          <span className={styles.summaryItemValueSmall}>{fmtECM(best.ecm)}</span>
          <span className={styles.summaryItemSub}>Error cuadrático medio</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryItemLabel}>Ecuación</span>
          <span className={styles.summaryItemValueSmall} style={{ fontSize: 11, wordBreak: 'break-all' }}>
            {best.equation}
          </span>
          <span className={styles.summaryItemSub}>{best.params}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Ranking Table ────────────────────────────────────────────────────────────

function RankingTable({ result }: { result: ComparisonResult }) {
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>
        <Award size={15} /> Ranking de Métodos
      </p>
      <p className={styles.cardSub}>
        Ordenado por coeficiente de determinación R² descendente · Mejor método en 1°
      </p>
      <div className={styles.tableWrapper}>
        <table className={styles.rankTable}>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Método</th>
              <th style={{ textAlign: 'left' }}>Ecuación Ajustada</th>
              <th>r</th>
              <th style={{ minWidth: 120 }}>R²</th>
              <th>ECM</th>
              <th>Calidad</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {result.ranked.map(m => (
              <tr
                key={m.id}
                className={!m.valid ? styles.invalidRow : ''}
              >
                {/* Rank */}
                <td className={styles.rankCell}>
                  <RankMedal rank={m.rank} valid={m.valid} />
                </td>

                {/* Method name + color */}
                <td>
                  <div className={styles.methodCell}>
                    <span
                      className={styles.stripeBar}
                      style={{ background: m.color, opacity: m.valid ? 1 : 0.3 }}
                    />
                    <div>
                      <div className={styles.methodName}>{m.name}</div>
                      <div className={styles.methodFormula}>{m.formula}</div>
                    </div>
                  </div>
                </td>

                {/* Equation */}
                <td className={styles.equationCell} title={m.equation}>
                  {m.equation}
                </td>

                {/* r */}
                <td className={styles.numeric}>
                  {m.valid ? fmtR(m.r) : '—'}
                </td>

                {/* R² with bar */}
                <td className={styles.r2Cell}>
                  <div className={styles.r2Value}>
                    {m.valid ? `${(m.rSquared * 100).toFixed(2)}%` : '—'}
                  </div>
                  {m.valid && (
                    <div className={styles.r2Bar}>
                      <div
                        className={styles.r2Fill}
                        style={{
                          width: `${Math.max(0, Math.min(m.rSquared * 100, 100))}%`,
                          background: r2Color(m.rSquared),
                        }}
                      />
                    </div>
                  )}
                </td>

                {/* ECM */}
                <td className={styles.numeric}>
                  {m.valid ? fmtECM(m.ecm) : '—'}
                </td>

                {/* Quality badge */}
                <td>
                  {m.valid ? (
                    <span className={`${styles.qualityBadge} ${qualityClass(m.rSquared)}`}>
                      {qualityLabel(m.rSquared)}
                    </span>
                  ) : (
                    <span className={`${styles.qualityBadge} ${styles.na}`}>
                      {m.invalidReason ?? 'No aplicable'}
                    </span>
                  )}
                </td>

                {/* Link to method page */}
                <td>
                  <button
                    className={styles.linkBtn}
                    title={`Ir a ${m.name}`}
                    onClick={() => navigate(m.route)}
                  >
                    <ExternalLink size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Export helper ────────────────────────────────────────────────────────────

function buildExport(result: ComparisonResult, n: number): string {
  const best = result.ranked.find(m => m.valid);
  const lines: string[] = [
    'COMPARACIÓN DE MÉTODOS DE AJUSTE — CurveAnalysis',
    '='.repeat(56),
    `n = ${n} pares de datos`,
    `Métodos aplicables: ${result.validCount} de ${result.ranked.length}`,
    best ? `Mejor método: ${best.name} (R² = ${(best.rSquared * 100).toFixed(4)}%)` : '',
    '',
    'RANKING (ordenado por R² descendente)',
    '-'.repeat(56),
    'Pos.\tMétodo\t\t\tr\t\tR²\t\tECM\t\tCalidad',
    '-'.repeat(56),
    ...result.ranked.map(m =>
      m.valid
        ? `${m.rank}°\t${m.name}\t${fmtR(m.r)}\t${(m.rSquared * 100).toFixed(4)}%\t${fmtECM(m.ecm)}\t${qualityLabel(m.rSquared)}`
        : `—\t${m.name}\tNo aplicable (${m.invalidReason})`
    ),
    '',
    'ECUACIONES AJUSTADAS',
    '-'.repeat(56),
    ...result.ranked.filter(m => m.valid).map(m =>
      `${m.rank}° ${m.name}: ${m.equation}\n   Parámetros: ${m.params}`
    ),
  ];
  return lines.join('\n');
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Comparison() {
  const { points } = useData();
  const [calculated, setCalculated] = useState(false);

  const result = useMemo<ComparisonResult | null>(
    () => (calculated && points.length >= 2 ? ComparisonService.compute(points) : null),
    [calculated, points]
  );

  const hasData = points.length >= 2;

  function handleCalculate() { setCalculated(true); }
  function handleReset()     { setCalculated(false); }

  function handleExport() {
    if (!result) return;
    const text = buildExport(result, points.length);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparacion_metodos.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Análisis Comparativo"
        title="Comparación General"
        description="Compara los 8 métodos de ajuste sobre el mismo conjunto de datos y selecciona el mejor modelo."
        icon={<GitCompare size={22} />}
        iconColor="purple"
        actions={
          <>
            <Badge variant="success" dot>
              {hasData ? `${points.length} pares cargados` : 'Sin datos'}
            </Badge>
            {calculated && (
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}
                onClick={handleReset}>
                Resetear
              </Button>
            )}
            {result && (
              <Button variant="outline" size="sm" leftIcon={<Download size={14} />}
                onClick={handleExport}>
                Exportar tabla
              </Button>
            )}
            <Button variant="primary" size="sm" leftIcon={<GitCompare size={14} />}
              onClick={handleCalculate} disabled={!hasData}>
              Comparar todos
            </Button>
          </>
        }
      />

      <div className={styles.layout}>

        {/* ── Empty state ── */}
        {!hasData && (
          <div className={styles.emptyState}>
            <GitCompare size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Sin datos para comparar</p>
            <p className={styles.emptySub}>
              Ingrese al menos 2 pares (Xi, Yi) en{' '}
              <a href="/datos" className={styles.emptyLink}>Gestión de Datos</a>{' '}
              para ejecutar la comparación de todos los métodos.
            </p>
          </div>
        )}

        {/* ── Pre-calculate placeholder ── */}
        {hasData && !calculated && (
          <div className={styles.preCalcState}>
            <TrendingUp size={32} style={{ opacity: 0.3, color: 'var(--color-text-muted)' }} />
            <p className={styles.preCalcTitle}>Listo para comparar</p>
            <p className={styles.preCalcSub}>
              Se ejecutarán los 8 métodos de ajuste con los {points.length} pares de datos cargados.
              El ranking mostrará los modelos de mejor a peor ajuste.
            </p>
            <Button variant="primary" size="sm" leftIcon={<GitCompare size={14} />}
              onClick={handleCalculate}>
              Comparar todos
            </Button>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <>
            {/* Summary */}
            <SummaryCard result={result} n={points.length} />

            {/* Chart */}
            <div className={styles.chartCard}>
              <p className={styles.cardTitle}>
                <BarChart3 size={15} /> Superposición de Curvas de Ajuste
              </p>
              <p className={styles.cardSub}>
                Cada método se representa con un color y estilo de línea únicos ·
                Los puntos negros son los datos originales
              </p>
              <ComparisonChart result={result} />
            </div>

            {/* Ranking table */}
            <RankingTable result={result} />

            {/* Footer note */}
            <div className={styles.card} style={{ padding: 'var(--space-4) var(--space-6)' }}>
              <p className={styles.cardTitle} style={{ marginBottom: 4, gap: 6 }}>
                <AlertCircle size={14} />Criterios de Evaluación
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                <strong>R²</strong> (coeficiente de determinación): mide la proporción de la varianza
                explicada por el modelo — cuanto más cercano a 1, mejor el ajuste. &nbsp;
                <strong>ECM</strong> (error cuadrático medio = Σ(yᵢ−ŷᵢ)²/n): mide la magnitud promedio
                del error en las unidades de y al cuadrado — valores menores indican mejor precisión.&nbsp;
                <strong>Calidad</strong>: Excelente R²≥95% · Bueno R²≥80% · Moderado R²≥60% · Débil R²&lt;60%.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
