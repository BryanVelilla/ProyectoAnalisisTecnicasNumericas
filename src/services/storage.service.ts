import type { DataPoint } from '../types/data.types';

const STORAGE_KEY = 'curveanalysis_dataset_v1';

export const StorageService = {
  save(points: DataPoint[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch {
      // Storage quota exceeded or unavailable — silent fail
    }
  },

  load(): DataPoint[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is DataPoint =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as DataPoint).id === 'string' &&
          typeof (item as DataPoint).x === 'number' &&
          typeof (item as DataPoint).y === 'number'
      );
    } catch {
      return [];
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silent fail
    }
  },
};
