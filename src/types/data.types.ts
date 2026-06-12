export interface DataPoint {
  id: string;
  x: number;
  y: number;
}

export interface Dataset {
  points: DataPoint[];
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: {
    x?: string;
    y?: string;
  };
}

export type ImportFormat = 'csv' | 'txt' | 'xlsx';
export type SeparatorType = 'comma' | 'semicolon' | 'tab' | 'space';

export interface ImportOptions {
  format: ImportFormat;
  separator: SeparatorType;
  hasHeader: boolean;
  xColumn: number;
  yColumn: number;
}

export interface ExportOptions {
  format: 'csv' | 'txt' | 'json';
  separator?: SeparatorType;
  includeHeader?: boolean;
  filename?: string;
}
