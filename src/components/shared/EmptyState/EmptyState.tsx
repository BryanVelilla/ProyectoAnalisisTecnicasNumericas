import { type ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = <InboxIcon size={28} />,
  title = 'Sin datos',
  description = 'No hay información disponible en este momento.',
  action,
}: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.iconWrapper}>{icon}</div>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
