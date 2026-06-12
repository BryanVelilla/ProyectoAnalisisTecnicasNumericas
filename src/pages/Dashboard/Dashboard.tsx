import { Award, BarChart3, Activity, AlertCircle } from 'lucide-react';
import { HeroSection } from '../../components/dashboard/HeroSection';
import { MethodCard } from '../../components/dashboard/MethodCard';
import { KPICard } from '../../components/dashboard/KPICard';
import { SectionHeader } from '../../components/dashboard/SectionHeader';
import { FITTING_METHODS } from '../../constants/methods';
import styles from './Dashboard.module.css';

const KPI_DATA = [
  {
    label: 'Mejor Método',
    value: '—',
    icon: <Award size={16} />,
    color: 'blue' as const,
    description: 'El método con mayor coeficiente de determinación R².',
    isEmpty: true,
  },
  {
    label: 'Coef. Correlación (R)',
    value: '—',
    icon: <Activity size={16} />,
    color: 'green' as const,
    description: 'Mide la fuerza y dirección de la relación lineal.',
    isEmpty: true,
  },
  {
    label: 'Coef. Determinación (R²)',
    value: '—',
    icon: <BarChart3 size={16} />,
    color: 'orange' as const,
    description: 'Proporción de la varianza explicada por el modelo.',
    isEmpty: true,
  },
  {
    label: 'Error Cuadrático',
    value: '—',
    icon: <AlertCircle size={16} />,
    color: 'red' as const,
    description: 'Error cuadrático medio del mejor ajuste.',
    isEmpty: true,
  },
];

export function Dashboard() {
  return (
    <div>
      <HeroSection />

      {/* KPI Row */}
      <div className={styles.kpiGrid}>
        {KPI_DATA.map(kpi => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Methods Grid */}
      <SectionHeader
        title="Métodos de Ajuste Disponibles"
        description="Selecciona un método para configurar su ajuste de curva y analizar los resultados."
      />
      <div className={styles.methodGrid}>
        {FITTING_METHODS.map(method => (
          <MethodCard key={method.id} method={method} />
        ))}
      </div>
    </div>
  );
}
