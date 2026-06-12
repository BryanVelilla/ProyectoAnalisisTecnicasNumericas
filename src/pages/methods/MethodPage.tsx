import { useMemo, type ReactNode } from 'react';
import { Play, Download, RefreshCw, Info } from 'lucide-react';
import type { FittingMethod } from '../../types/method.types';
import { PageHeader } from '../../components/shared/PageHeader';
import { ChartContainer } from '../../components/shared/ChartContainer';
import { DataTable, type TableColumn } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useData } from '../../store/DataContext';
import { DataService } from '../../services/data.service';
import styles from './MethodPage.module.css';

interface MethodPageProps {
  method: FittingMethod;
  icon: ReactNode;
}

interface MethodDataRow extends Record<string, unknown> {
  id: string;
  n: number;
  x: string;
  y: string;
}

const DATA_COLUMNS: TableColumn<MethodDataRow>[] = [
  { key: 'n', header: 'N°', align: 'center' },
  { key: 'x', header: 'Xi', align: 'right' },
  { key: 'y', header: 'Yi', align: 'right' },
];

const RESULT_ITEMS = [
  { label: 'a',  key: 'a' },
  { label: 'b',  key: 'b' },
  { label: 'R',  key: 'r' },
  { label: 'R²', key: 'r2' },
];

export function MethodPage({ method, icon }: MethodPageProps) {
  const { points } = useData();
  const inputRows = useMemo(
    () =>
      points.map((point, idx) => ({
        id: point.id,
        n: idx + 1,
        x: DataService.formatNumber(point.x),
        y: DataService.formatNumber(point.y),
      })),
    [points]
  );
  const hasInputData = inputRows.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={`Ajuste de Curvas · ${method.name}`}
        title={method.name}
        formula={method.formula}
        description={method.description}
        icon={icon}
        iconColor="blue"
        actions={
          <>
            <Badge variant="success" dot>Disponible</Badge>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />}>
              Resetear
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Play size={14} />} disabled={!hasInputData}>
              Calcular
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        {/* Main column */}
        <div className={styles.mainCol}>
          {/* Chart */}
          <ChartContainer
            title={`Gráfica — ${method.name}`}
            subtitle={`Modelo: ${method.formula}`}
            actions={
              <Button variant="ghost" size="sm" iconOnly leftIcon={<Download size={14} />} />
            }
          />

          {/* Data table */}
          <DataTable
            title="Datos de Entrada"
            columns={DATA_COLUMNS}
            rows={inputRows}
            emptyMessage="Sin datos — vaya a Gestión de Datos para ingresar valores."
          />
        </div>

        {/* Side column */}
        <div className={styles.sideCol}>
          {/* Equation result */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Ecuación Ajustada</p>
            <div className={styles.equationBox}>
              <span className={styles.equationPlaceholder}>
                Ejecute el cálculo para obtener la ecuación
              </span>
            </div>
          </div>

          {/* Numeric results */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Resultados Numéricos</p>
            <div className={styles.resultsGrid}>
              {RESULT_ITEMS.map(item => (
                <div key={item.key} className={styles.resultItem}>
                  <span className={styles.resultLabel}>{item.label}</span>
                  <span className={styles.resultPlaceholder}>—</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className={styles.card}>
            <p className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} />
              Aplicabilidad
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
              {method.applicability}
            </p>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button variant="outline" size="sm" fullWidth leftIcon={<Download size={14} />} disabled={!hasInputData}>
              Exportar Resultados
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
