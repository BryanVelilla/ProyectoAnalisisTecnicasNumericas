import { Info, BookOpen, Code2, GraduationCap } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { FITTING_METHODS } from '../../constants/methods';
import { Badge } from '../../components/ui/Badge';
import styles from './About.module.css';

export function About() {
  return (
    <div>
      <PageHeader
        eyebrow="Acerca de"
        title="Sistema de Ajuste de Curvas Numéricas"
        description="Plataforma académica para el análisis y comparación de modelos de ajuste de curvas, desarrollada para el curso de Análisis de Técnicas Numéricas."
        icon={<Info size={22} />}
        iconColor="blue"
      />

      <div className={styles.layout}>
        {/* Info cards row */}
        <div className={styles.infoGrid}>
          {[
            { icon: <GraduationCap size={20} />, label: 'Contexto', value: 'Análisis de Técnicas Numéricas', sub: 'Ingeniería — Proyecto académico' },
            { icon: <Code2 size={20} />, label: 'Stack', value: 'React + TypeScript + Vite', sub: 'CSS Modules · Lucide React' },
            { icon: <BookOpen size={20} />, label: 'Versión', value: '1.0.0-alpha', sub: 'Fase: Arquitectura Visual' },
          ].map(item => (
            <div key={item.label} className={styles.infoCard}>
              <div className={styles.infoIcon}>{item.icon}</div>
              <p className={styles.infoLabel}>{item.label}</p>
              <p className={styles.infoValue}>{item.value}</p>
              <p className={styles.infoSub}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Methods index */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Índice de Métodos Implementados</h3>
          <div className={styles.methodList}>
            {FITTING_METHODS.map((m, idx) => (
              <div key={m.id} className={styles.methodRow}>
                <span className={styles.methodNum}>{String(idx + 1).padStart(2, '0')}</span>
                <span className={styles.methodName}>{m.name}</span>
                <code className={styles.methodFormula}>{m.formula}</code>
                <Badge variant="success" dot>Disponible</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Créditos y Tecnologías</h3>
          <p className={styles.cardDesc}>
            Este software fue desarrollado con fines académicos y educativos, siguiendo
            buenas prácticas de ingeniería de software y principios de UX/UI para software científico.
          </p>
          <div className={styles.techTags}>
            {['React 18', 'TypeScript', 'Vite 6', 'React Router v6', 'CSS Modules', 'Lucide React'].map(t => (
              <span key={t} className={styles.techTag}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
