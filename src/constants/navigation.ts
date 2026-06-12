import type { NavGroup } from '../types/navigation.types';
import { ROUTES } from '../router/routes';

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      { id: 'dashboard',       label: 'Dashboard',        route: ROUTES.DASHBOARD,       iconName: 'LayoutDashboard' },
      { id: 'data-management', label: 'Gestión de Datos', route: ROUTES.DATA_MANAGEMENT, iconName: 'Database' },
    ],
  },
  {
    id: 'methods',
    label: 'Métodos de Ajuste',
    collapsible: true,
    items: [
      { id: 'linear',      label: 'Ajuste Lineal',           route: ROUTES.LINEAR,      iconName: 'TrendingUp' },
      { id: 'exponential', label: 'Ajuste Exponencial',      route: ROUTES.EXPONENTIAL, iconName: 'Activity' },
      { id: 'geometric',   label: 'Ajuste Geométrico',       route: ROUTES.GEOMETRIC,   iconName: 'BarChart2' },
      { id: 'hyperbolic',  label: 'Ajuste Hiperbólico',      route: ROUTES.HYPERBOLIC,  iconName: 'Minus' },
      { id: 'asymptotic',  label: 'Exp. Asintótico',         route: ROUTES.ASYMPTOTIC,  iconName: 'GitBranch' },
      { id: 'logistic',    label: 'Ajuste Logístico',        route: ROUTES.LOGISTIC,    iconName: 'Zap' },
      { id: 'logarithmic', label: 'Ajuste Logarítmico',      route: ROUTES.LOGARITHMIC, iconName: 'Layers' },
      { id: 'power',       label: 'Ajuste Potencial',        route: ROUTES.POWER,       iconName: 'Cpu' },
      { id: 'polynomial',  label: 'Ajuste Polinomial',       route: ROUTES.POLYNOMIAL,  iconName: 'Sigma' },
    ],
  },
  {
    id: 'analysis',
    label: 'Análisis',
    items: [
      { id: 'comparison', label: 'Comparación General', route: ROUTES.COMPARISON, iconName: 'GitCompare' },
      { id: 'reports',    label: 'Reportes',            route: ROUTES.REPORTS,    iconName: 'FileText' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Configuración', route: ROUTES.SETTINGS, iconName: 'Settings' },
      { id: 'about',    label: 'Acerca de',     route: ROUTES.ABOUT,    iconName: 'Info' },
    ],
  },
];
