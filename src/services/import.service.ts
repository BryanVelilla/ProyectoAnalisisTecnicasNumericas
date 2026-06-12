import type { DataPoint, ImportOptions, SeparatorType } from '../types/data.types';
import { DataService } from './data.service';

const SEPARATOR_MAP: Record<SeparatorType, string> = {
  comma:     ',',
  semicolon: ';',
  tab:       '\t',
  space:     ' ',
};

export interface ImportResult {
  points: DataPoint[];
  skipped: number;
  errors: string[];
}

// ─── Import architecture (skeleton ready for future implementation) ───────────

export const ImportService = {
  /**
   * Parse a CSV/TXT string into DataPoints.
   * Each row must have at least two columns: X and Y.
   */
  parseText(raw: string, options: Partial<ImportOptions> = {}): ImportResult {
    const separator = SEPARATOR_MAP[options.separator ?? 'comma'];
    const hasHeader = options.hasHeader ?? false;
    const xCol = options.xColumn ?? 0;
    const yCol = options.yColumn ?? 1;

    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const startIdx = hasHeader ? 1 : 0;

    const points: DataPoint[] = [];
    const errors: string[] = [];
    let skipped = 0;

    lines.slice(startIdx).forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cols = trimmed.split(separator);
      const rawX = cols[xCol]?.trim() ?? '';
      const rawY = cols[yCol]?.trim() ?? '';

      const validation = DataService.validate(rawX, rawY);
      if (!validation.valid) {
        const lineNum = startIdx + i + 1;
        errors.push(`Línea ${lineNum}: ${Object.values(validation.errors).join(', ')}`);
        skipped++;
        return;
      }

      points.push(DataService.create(rawX, rawY));
    });

    return { points: DataService.sortByX(points), skipped, errors };
  },

  /**
   * Read a File object as text.
   * Placeholder: actual file reading happens in the component using FileReader API.
   */
  readFile(_file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) ?? '');
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsText(_file);
    });
  },

  /** Validate file type before processing. */
  validateFileType(file: File): { valid: boolean; error?: string } {
    const allowed = ['.csv', '.txt', '.dat', '.tsv'];
    const name = file.name.toLowerCase();
    const isAllowed = allowed.some(ext => name.endsWith(ext));
    if (!isAllowed) {
      return { valid: false, error: `Formato no soportado. Use: ${allowed.join(', ')}` };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'El archivo no debe superar 5 MB.' };
    }
    return { valid: true };
  },
};
