export type MethodCategory = 'linear' | 'nonlinear' | 'special';

export type MethodStatus = 'available' | 'beta' | 'coming-soon';

export interface FittingMethod {
  id: string;
  name: string;
  shortName: string;
  formula: string;
  formulaLatex: string;
  description: string;
  category: MethodCategory;
  status: MethodStatus;
  iconName: string;
  route: string;
  variables: string[];
  applicability: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
}

export interface ComparisonResult {
  methodId: string;
  methodName: string;
  r: number;
  rSquared: number;
  error: number;
  rank: number;
}
