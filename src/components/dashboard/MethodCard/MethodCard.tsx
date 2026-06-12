import { Link } from 'react-router-dom';
import {
  TrendingUp, Activity, BarChart2, Minus, GitBranch, Zap, Layers, Cpu, ArrowRight,
} from 'lucide-react';
import type { FittingMethod } from '../../../types/method.types';
import { Badge } from '../../ui/Badge';
import styles from './MethodCard.module.css';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  TrendingUp, Activity, BarChart2, Minus, GitBranch, Zap, Layers, Cpu,
};

const STATUS_LABELS: Record<string, string> = {
  available:    'Disponible',
  beta:         'Beta',
  'coming-soon':'Próximamente',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default'> = {
  available:    'success',
  beta:         'warning',
  'coming-soon':'default',
};

interface MethodCardProps {
  method: FittingMethod;
}

export function MethodCard({ method }: MethodCardProps) {
  const Icon = ICON_MAP[method.iconName] ?? TrendingUp;

  return (
    <Link to={method.route} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Icon size={20} />
        </div>
        <span className={styles.statusBadge}>
          <Badge variant={STATUS_VARIANTS[method.status]} dot>
            {STATUS_LABELS[method.status]}
          </Badge>
        </span>
      </div>

      <div>
        <p className={styles.name}>{method.name}</p>
        <code className={styles.formula}>{method.formula}</code>
        <p className={styles.description}>{method.description}</p>
      </div>

      <div className={styles.footer}>
        <div className={styles.variables}>
          {method.variables.map(v => (
            <span key={v} className={styles.varChip}>{v}</span>
          ))}
        </div>
        <span className={styles.arrow}>
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
