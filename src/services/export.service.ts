import type { DataPoint, ExportOptions, SeparatorType } from '../types/data.types';

const SEPARATOR_MAP: Record<SeparatorType, string> = {
  comma:     ',',
  semicolon: ';',
  tab:       '\t',
  space:     ' ',
};

// ─── Export architecture (skeleton ready for future implementation) ───────────

export const ExportService = {
  /** Convert DataPoints to CSV string. */
  toCSV(points: DataPoint[], options: Partial<ExportOptions> = {}): string {
    const sep = SEPARATOR_MAP[options.separator ?? 'comma'];
    const lines: string[] = [];
    if (options.includeHeader ?? true) {
      lines.push(`X${sep}Y`);
    }
    points.forEach(p => lines.push(`${p.x}${sep}${p.y}`));
    return lines.join('\n');
  },

  /** Convert DataPoints to JSON string. */
  toJSON(points: DataPoint[]): string {
    return JSON.stringify(
      points.map((p, i) => ({ n: i + 1, x: p.x, y: p.y })),
      null,
      2
    );
  },

  /** Trigger a browser file download. */
  download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Export and download as CSV. */
  exportCSV(points: DataPoint[], options: Partial<ExportOptions> = {}): void {
    const content = ExportService.toCSV(points, options);
    const filename = options.filename ?? 'datos_curveanalysis.csv';
    ExportService.download(content, filename, 'text/csv;charset=utf-8;');
  },

  /** Export and download as JSON. */
  exportJSON(points: DataPoint[], options: Partial<ExportOptions> = {}): void {
    const content = ExportService.toJSON(points);
    const filename = options.filename ?? 'datos_curveanalysis.json';
    ExportService.download(content, filename, 'application/json');
  },

  /** Export and download as TXT. */
  exportTXT(points: DataPoint[], options: Partial<ExportOptions> = {}): void {
    const content = ExportService.toCSV(points, { ...options, separator: 'tab' });
    const filename = options.filename ?? 'datos_curveanalysis.txt';
    ExportService.download(content, filename, 'text/plain;charset=utf-8;');
  },
};
