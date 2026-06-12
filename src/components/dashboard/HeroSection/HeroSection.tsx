import { Link } from 'react-router-dom';
import { Play, BookOpen } from 'lucide-react';
import { ROUTES } from '../../../router/routes';
import styles from './HeroSection.module.css';

const STATS = [
  { value: '8',     label: 'Métodos' },
  { value: 'R²',    label: 'Métricas' },
  { value: '∞',     label: 'Datasets' },
];

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Plataforma Académica · Análisis Numérico
          </div>

          <h1 className={styles.title}>
            Sistema de <span>Ajuste de Curvas</span> Numéricas
          </h1>

          <p className={styles.subtitle}>
            Plataforma académica para análisis y comparación de modelos matemáticos.
            Visualiza, compara y exporta resultados de regresión con precisión científica.
          </p>

          <div className={styles.actions}>
            <Link to={ROUTES.DATA_MANAGEMENT} className={styles.btnPrimary}>
              <Play size={16} />
              Iniciar Proyecto
            </Link>
            <Link to={ROUTES.ABOUT} className={styles.btnSecondary}>
              <BookOpen size={16} />
              Ver Manual
            </Link>
          </div>
        </div>

        <div className={styles.statsPanel}>
          {STATS.map(stat => (
            <div key={stat.label} className={styles.statCard}>
              <span className={styles.statValue}>{stat.value}</span>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
