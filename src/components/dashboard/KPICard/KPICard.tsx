import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './KPICard.module.css';

type KPIColor = 'blue' | 'green' | 'orange' | 'red';
type KPITrend = 'up' | 'down' | 'stable';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  color?: KPIColor;
  trend?: KPITrend;
  trendValue?: string;
  description?: string;
  isEmpty?: boolean;
}

const TREND_ICONS = {
  up:     TrendingUp,
  down:   TrendingDown,
  stable: Minus,
};

export function KPICard({
  label,
  value,
  unit,
  icon,
  color = 'blue',
  trend,
  trendValue,
  description,
  isEmpty = false,
}: KPICardProps) {
  const TrendIcon = trend ? TREND_ICONS[trend] : null;

  return (
    <div className={[styles.card, styles[`accent-${color}`]].join(' ')}>
      <div className={styles.header}>
        <div className={styles.labelWrapper}>
          <div className={[styles.iconWrapper, styles[color]].join(' ')}>{icon}</div>
          <span className={styles.label}>{label}</span>
        </div>
      </div>

      {isEmpty ? (
        <div className={styles.placeholder}>
          <Minus size={14} />
          Sin datos — ingrese datos para calcular
        </div>
      ) : (
        <>
          <div>
            <span className={styles.value}>{value}</span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </div>

          {trend && (
            <div className={styles.trend}>
              <span className={[styles.trendBadge, styles[trend]].join(' ')}>
                {TrendIcon && <TrendIcon size={10} />}
                {trendValue}
              </span>
              <span className={styles.trendDesc}>vs. método anterior</span>
            </div>
          )}
        </>
      )}

      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
