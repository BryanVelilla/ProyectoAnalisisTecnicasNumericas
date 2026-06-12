import {
  Info,
  BookOpen,
  Code2,
  GraduationCap,
  Users,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { FITTING_METHODS } from '../../constants/methods';
import { Badge } from '../../components/ui/Badge';
import styles from './About.module.css';

const PROJECT_INFO = [
  { label: 'Autor(es)', value: 'Bryan Esteban Velilla Perez', icon: <Users size={18} /> },
  { label: 'Asignatura', value: 'Análisis de Técnicas Numéricas', icon: <BookOpen size={18} /> },
  { label: 'Universidad', value: 'Corporacion Universitaria del Caribe CECAR', icon: <Building2 size={18} /> },
  { label: 'Año académico', value: '2026', icon: <CalendarDays size={18} /> },
];

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
        <div className={styles.infoGrid}>
          {[
            {
              icon: <GraduationCap size={20} />,
              label: 'Contexto',
              value: 'Análisis de Técnicas Numéricas',
              sub: 'Ingeniería - Proyecto académico',
            },
            {
              icon: <Code2 size={20} />,
              label: 'Stack',
              value: 'React + TypeScript + Vite',
              sub: 'CSS Modules - Lucide React',
            },
            {
              icon: <BookOpen size={20} />,
              label: 'Versión',
              value: '1.0.0-alpha',
              sub: 'Fase: Arquitectura Visual',
            },
          ].map(item => (
            <div key={item.label} className={styles.infoCard}>
              <div className={styles.infoIcon}>{item.icon}</div>
              <p className={styles.infoLabel}>{item.label}</p>
              <p className={styles.infoValue}>{item.value}</p>
              <p className={styles.infoSub}>{item.sub}</p>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Información del Proyecto</h3>
              <p className={styles.cardDesc}>
                Datos generales del programa, sus autores y el contexto académico para el que fue construido.
              </p>
            </div>
            <Badge variant="success" dot>Proyecto académico</Badge>
          </div>

          <div className={styles.detailsGrid}>
            {PROJECT_INFO.map(item => (
              <div key={item.label} className={styles.detailItem}>
                <div className={styles.detailIcon}>{item.icon}</div>
                <div>
                  <span className={styles.detailLabel}>{item.label}</span>
                  <p className={styles.detailValue}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.purposeBox}>
            <h4 className={styles.purposeTitle}>Propósito del software</h4>
            <p className={styles.purposeText}>
              CurveAnalysis permite registrar datos experimentales, calcular diferentes modelos
              de ajuste de curvas, comparar su desempeño mediante indicadores como r, R² y ECM,
              visualizar los resultados y generar reportes de apoyo para el análisis numérico.
            </p>
          </div>
        </div>

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

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Créditos y Tecnologías</h3>
          <p className={styles.cardDesc}>
            Este software fue desarrollado con fines académicos y educativos, siguiendo
            buenas prácticas de ingeniería de software y principios de UX/UI para software científico.
          </p>
          <div className={styles.techTags}>
            {['React', 'TypeScript', 'Vite', 'React Router', 'Recharts', 'CSS Modules', 'Lucide React'].map(t => (
              <span key={t} className={styles.techTag}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
