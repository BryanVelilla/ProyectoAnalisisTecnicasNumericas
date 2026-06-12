import { type ReactNode } from 'react';
import styles from './PageHeader.module.css';

type PageHeaderColor = 'blue' | 'green' | 'orange' | 'purple';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  formula?: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: PageHeaderColor;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  formula,
  description,
  icon,
  iconColor = 'blue',
  actions,
}: PageHeaderProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        {icon && (
          <div className={[styles.iconWrapper, styles[iconColor]].join(' ')}>
            {icon}
          </div>
        )}
        <div className={styles.text}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.title}>{title}</h1>
          {formula && <code className={styles.formula}>{formula}</code>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
