import { type ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (row: T, idx: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = Record<string, unknown>> {
  title?: string;
  columns: TableColumn<T>[];
  rows: T[];
  actions?: ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  rows,
  actions,
  emptyMessage = 'No hay datos disponibles.',
}: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      {(title || actions) && (
        <div className={styles.tableHeader}>
          {title && <span className={styles.tableTitle}>{title}</span>}
          {actions}
        </div>
      )}

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={columns.length}>{emptyMessage}</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                      {col.render ? col.render(row, idx) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.rowCount}>
          {rows.length === 0 ? 'Sin registros' : `${rows.length} fila${rows.length !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
}
