import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './SolutionSteps.module.css';

export interface StepData {
  title: string;
  children: ReactNode;
}

interface Props {
  steps: StepData[];
  color: string;
}

export function SolutionSteps({ steps, color }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <FlaskConical size={14} style={{ color, flexShrink: 0 }} />
        <p className={styles.headerTitle}>Procedimiento de Solución — Paso a Paso</p>
        <span className={styles.headerBadge}>{steps.length} pasos</span>
      </div>
      <ol className={styles.list}>
        {steps.map((step, i) => (
          <li key={i} className={styles.step}>
            <div className={styles.stepLeft}>
              <span className={styles.stepNum} style={{ background: color }}>
                {i + 1}
              </span>
              {i < steps.length - 1 && <div className={styles.connector} />}
            </div>
            <div className={styles.stepContent}>
              <p className={styles.stepTitle}>{step.title}</p>
              <div>{step.children}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function fmtS(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 0.001 && abs < 1_000_000) return parseFloat(v.toPrecision(6)).toString();
  return v.toExponential(4);
}
