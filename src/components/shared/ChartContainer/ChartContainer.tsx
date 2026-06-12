import { type ReactNode } from 'react';
import { LineChart } from 'lucide-react';
import styles from './ChartContainer.module.css';

interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  isEmpty?: boolean;
  minHeight?: number;
}

export function ChartContainer({
  title = 'Gráfica de Ajuste',
  subtitle,
  actions,
  children,
  isEmpty = true,
  minHeight = 320,
}: ChartContainerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      <div className={styles.body} style={{ minHeight }}>
        {isEmpty ? (
          <>
            <div className={styles.placeholder} />
            <div className={styles.placeholderContent}>
              <div className={styles.placeholderIcon}>
                <LineChart size={24} />
              </div>
              <p className={styles.placeholderTitle}>Gráfica no disponible</p>
              <p className={styles.placeholderSub}>
                Ingrese datos en la sección de Gestión de Datos para generar la visualización.
              </p>
            </div>
          </>
        ) : (
          children
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerNote}>
          {isEmpty ? 'Sin datos — área reservada para la gráfica interactiva' : 'Gráfica generada con los datos actuales'}
        </span>
        {actions}
      </div>
    </div>
  );
}
