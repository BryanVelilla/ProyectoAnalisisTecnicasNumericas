import type { DataPoint, ValidationResult } from '../types/data.types';

let idCounter = Date.now();
const generateId = (): string => `dp_${(++idCounter).toString(36)}`;

export const DataService = {
  generateId,

  /** Parse a string to number. Returns null if invalid. */
  parseNumber(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;
    const n = Number(trimmed);
    return isNaN(n) ? null : n;
  },

  /** Validate raw string inputs before creating a DataPoint. */
  validate(rawX: string, rawY: string): ValidationResult {
    const errors: ValidationResult['errors'] = {};

    if (rawX.trim() === '') {
      errors.x = 'El valor X es obligatorio.';
    } else if (DataService.parseNumber(rawX) === null) {
      errors.x = 'X debe ser un número válido.';
    }

    if (rawY.trim() === '') {
      errors.y = 'El valor Y es obligatorio.';
    } else if (DataService.parseNumber(rawY) === null) {
      errors.y = 'Y debe ser un número válido.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },

  /** Sort an array of DataPoints by X ascending. Pure function (does not mutate). */
  sortByX(points: DataPoint[]): DataPoint[] {
    return [...points].sort((a, b) => a.x - b.x);
  },

  /** Create a new DataPoint from validated strings. */
  create(rawX: string, rawY: string): DataPoint {
    return {
      id: generateId(),
      x: Number(rawX.trim()),
      y: Number(rawY.trim()),
    };
  },

  /** Return a new array with the point added and sorted by X. */
  add(points: DataPoint[], rawX: string, rawY: string): DataPoint[] {
    const newPoint = DataService.create(rawX, rawY);
    return DataService.sortByX([...points, newPoint]);
  },

  /** Return a new array with the point removed. */
  remove(points: DataPoint[], id: string): DataPoint[] {
    return points.filter(p => p.id !== id);
  },

  /** Return a new array with the point updated and re-sorted. */
  update(points: DataPoint[], id: string, rawX: string, rawY: string): DataPoint[] {
    const updated = points.map(p =>
      p.id === id
        ? { ...p, x: Number(rawX.trim()), y: Number(rawY.trim()) }
        : p
    );
    return DataService.sortByX(updated);
  },

  /** Format a number for display (up to 6 significant digits, no trailing zeros). */
  formatNumber(n: number): string {
    const abs = Math.abs(n);
    if (abs === 0) return '0';
    if (abs >= 1e-4 && abs < 1e6) {
      const s = parseFloat(n.toPrecision(6)).toString();
      return s;
    }
    return n.toExponential(4);
  },
};
