import { type ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].join(' ')}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
