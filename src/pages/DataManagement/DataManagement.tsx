import { useState, useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Database, Upload, Plus, Trash2, Download, Pencil, Check, X, FileText } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/forms/Input';
import { Select } from '../../components/ui/forms/Select';
import { Dialog } from '../../components/ui/Dialog';
import { useData } from '../../store/DataContext';
import { useToast } from '../../components/ui/Toast';
import { DataService } from '../../services/data.service';
import { ImportService } from '../../services/import.service';
import { ExportService } from '../../services/export.service';
import type { DataPoint } from '../../types/data.types';
import type { SeparatorType } from '../../types/data.types';
import styles from './DataManagement.module.css';

// ─── Sub-component: EditableRow ───────────────────────────────────────────────

interface EditableRowProps {
  point: DataPoint;
  index: number;
  onSave: (id: string, rawX: string, rawY: string) => void;
  onCancel: () => void;
}

function EditableRow({ point, index, onSave, onCancel }: EditableRowProps) {
  const [rawX, setRawX] = useState(String(point.x));
  const [rawY, setRawY] = useState(String(point.y));
  const [errors, setErrors] = useState<{ x?: string; y?: string }>({});

  const validate = () => {
    const result = DataService.validate(rawX, rawY);
    setErrors(result.errors);
    return result.valid;
  };

  const handleSave = () => {
    if (validate()) onSave(point.id, rawX, rawY);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <tr>
      <td style={{ textAlign: 'center' }}>
        <span className={styles.rowNum}>{index + 1}</span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div>
          <input
            className={[styles.editInput, errors.x && styles.hasError].filter(Boolean).join(' ')}
            value={rawX}
            onChange={e => setRawX(e.target.value)}
            onBlur={validate}
            onKeyDown={handleKey}
            autoFocus
            placeholder="X"
            aria-label="Valor X"
          />
          {errors.x && <div className={styles.cellError}>{errors.x}</div>}
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div>
          <input
            className={[styles.editInput, errors.y && styles.hasError].filter(Boolean).join(' ')}
            value={rawY}
            onChange={e => setRawY(e.target.value)}
            onBlur={validate}
            onKeyDown={handleKey}
            placeholder="Y"
            aria-label="Valor Y"
          />
          {errors.y && <div className={styles.cellError}>{errors.y}</div>}
        </div>
      </td>
      <td>
        <div className={styles.editActions}>
          <button className={[styles.actionBtn, styles.saveBtn].join(' ')} onClick={handleSave} title="Guardar (Enter)">
            <Check size={14} />
          </button>
          <button className={[styles.actionBtn, styles.cancelBtn].join(' ')} onClick={onCancel} title="Cancelar (Esc)">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SEPARATOR_OPTIONS = [
  { value: 'comma',     label: 'Coma (,)' },
  { value: 'semicolon', label: 'Punto y coma (;)' },
  { value: 'tab',       label: 'Tabulación' },
  { value: 'space',     label: 'Espacio' },
];

export function DataManagement() {
  const { points, addPoint, deletePoint, updatePoint, clearAll } = useData();
  const toast = useToast();

  // ─── Add form state ───────────────────────────────────────────────────────
  const [rawX, setRawX] = useState('');
  const [rawY, setRawY] = useState('');
  const [formErrors, setFormErrors] = useState<{ x?: string; y?: string }>({});

  // ─── Edit state ───────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);

  // ─── Dialog state ─────────────────────────────────────────────────────────
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ─── Import state ─────────────────────────────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false);
  const [separator, setSeparator] = useState<SeparatorType>('comma');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Add handler ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    const validation = DataService.validate(rawX, rawY);
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    addPoint(rawX, rawY);
    setRawX('');
    setRawY('');
    setFormErrors({});
    toast.success('Par de datos agregado correctamente');
  };

  const handleAddKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  // ─── Edit handler ─────────────────────────────────────────────────────────
  const handleEditSave = (id: string, rx: string, ry: string) => {
    const validation = DataService.validate(rx, ry);
    if (!validation.valid) return;
    updatePoint(id, rx, ry);
    setEditingId(null);
    toast.success('Registro actualizado correctamente');
  };

  // ─── Delete handler ───────────────────────────────────────────────────────
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deletePoint(deleteTarget);
    setDeleteTarget(null);
    toast.success('Registro eliminado correctamente');
  };

  // ─── Clear handler ────────────────────────────────────────────────────────
  const handleClearConfirm = () => {
    clearAll();
    setShowClearDialog(false);
    setEditingId(null);
    toast.info('Todos los datos han sido eliminados');
  };

  // ─── Import handler ───────────────────────────────────────────────────────
  const processFile = async (file: File) => {
    const typeCheck = ImportService.validateFileType(file);
    if (!typeCheck.valid) {
      toast.error('Archivo no válido', typeCheck.error);
      return;
    }
    try {
      const text = await ImportService.readFile(file);
      const result = ImportService.parseText(text, { separator, hasHeader: false });

      if (result.points.length === 0) {
        toast.error('Sin datos válidos', 'El archivo no contiene pares X,Y reconocibles.');
        return;
      }

      result.points.forEach(p => addPoint(String(p.x), String(p.y)));

      const msg = result.skipped > 0
        ? `${result.points.length} pares importados. ${result.skipped} líneas omitidas.`
        : undefined;
      toast.success(`${result.points.length} pares importados correctamente`, msg);
    } catch {
      toast.error('Error al leer el archivo', 'Verifique que el archivo no esté dañado.');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ─── Export handler ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (points.length === 0) {
      toast.warning('Sin datos para exportar', 'Ingrese datos antes de exportar.');
      return;
    }
    ExportService.exportCSV(points, { includeHeader: true });
    toast.success('Archivo CSV exportado correctamente');
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const xMin = xValues.length > 0 ? DataService.formatNumber(Math.min(...xValues)) : '—';
  const xMax = xValues.length > 0 ? DataService.formatNumber(Math.max(...xValues)) : '—';
  const yMin = yValues.length > 0 ? DataService.formatNumber(Math.min(...yValues)) : '—';
  const yMax = yValues.length > 0 ? DataService.formatNumber(Math.max(...yValues)) : '—';

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 01"
        title="Gestión de Datos"
        description="Ingrese pares (x, y) manualmente o importe un archivo. Los datos se compartirán con todos los módulos de ajuste y se conservarán entre sesiones."
        icon={<Database size={22} />}
        iconColor="blue"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download size={15} />}
              onClick={handleExport}
              disabled={points.length === 0}
            >
              Exportar CSV
            </Button>
          </>
        }
      />

      <div className={styles.grid}>
        {/* ─── Data table ─────────────────────────────────────────────────── */}
        <div>
          {/* Table header */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>
                  Conjunto de Datos
                </span>
                {points.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', background: 'var(--color-primary-100)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                    {points.length} {points.length === 1 ? 'par' : 'pares'}
                  </span>
                )}
              </div>
              {points.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => setShowClearDialog(true)}
                >
                  Limpiar todo
                </Button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'center', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', width: '60px' }}>N°</th>
                    <th style={{ textAlign: 'right',  padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>X</th>
                    <th style={{ textAlign: 'right',  padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Y</th>
                    <th style={{ textAlign: 'right',  padding: 'var(--space-3) var(--space-4)', width: '100px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {points.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
                        Sin datos — use el formulario lateral o importe un archivo.
                      </td>
                    </tr>
                  ) : (
                    points.map((point, idx) =>
                      editingId === point.id ? (
                        <EditableRow
                          key={point.id}
                          point={point}
                          index={idx}
                          onSave={handleEditSave}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <tr
                          key={point.id}
                          className={styles.tableRow}
                          style={{ borderBottom: idx < points.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                          onMouseEnter={e => { (e.currentTarget.querySelector(`.${styles.rowActions}`) as HTMLElement | null)?.style && ((e.currentTarget.querySelector(`.${styles.rowActions}`) as HTMLElement).style.opacity = '1'); }}
                          onMouseLeave={e => { (e.currentTarget.querySelector(`.${styles.rowActions}`) as HTMLElement | null)?.style && ((e.currentTarget.querySelector(`.${styles.rowActions}`) as HTMLElement).style.opacity = '0'); }}
                        >
                          <td style={{ textAlign: 'center', padding: 'var(--space-3) var(--space-4)' }}>
                            <span className={styles.rowNum}>{idx + 1}</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>
                            <span className={styles.numValue}>{DataService.formatNumber(point.x)}</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>
                            <span className={styles.numValue}>{DataService.formatNumber(point.y)}</span>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                            <div className={styles.rowActions} style={{ opacity: 0, display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                              <button
                                className={[styles.actionBtn, styles.editBtn].join(' ')}
                                onClick={() => setEditingId(point.id)}
                                title="Editar"
                                aria-label="Editar fila"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className={[styles.actionBtn, styles.deleteBtn].join(' ')}
                                onClick={() => setDeleteTarget(point.id)}
                                title="Eliminar"
                                aria-label="Eliminar fila"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {points.length === 0
                  ? 'Sin registros'
                  : `${points.length} par${points.length !== 1 ? 'es' : ''} · Ordenados por X ↑`}
              </span>
              {points.length > 0 && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  X: [{xMin}, {xMax}] · Y: [{yMin}, {yMax}]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Input panel ────────────────────────────────────────────────── */}
        <div className={styles.inputPanel}>
          {/* Manual entry card */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Ingreso Manual</p>
            <div className={styles.formRow}>
              <Input
                label="Valor X"
                type="number"
                step="any"
                placeholder="ej: 3.14"
                value={rawX}
                onChange={e => { setRawX(e.target.value); if (formErrors.x) setFormErrors(prev => ({ ...prev, x: undefined })); }}
                onKeyDown={handleAddKeyDown}
                errorMsg={formErrors.x}
              />
              <Input
                label="Valor Y"
                type="number"
                step="any"
                placeholder="ej: -2.7"
                value={rawY}
                onChange={e => { setRawY(e.target.value); if (formErrors.y) setFormErrors(prev => ({ ...prev, y: undefined })); }}
                onKeyDown={handleAddKeyDown}
                errorMsg={formErrors.y}
              />
            </div>
            <div className={styles.formActions}>
              <Button variant="primary" size="sm" fullWidth leftIcon={<Plus size={14} />} onClick={handleAdd}>
                Agregar Par
              </Button>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
              Acepta decimales y negativos · Presiona Enter para agregar
            </p>
          </div>

          {/* Summary card */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Resumen del Conjunto</p>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{points.length}</span>
                <span className={styles.summaryLabel}>Pares</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue} style={{ fontSize: 'var(--text-sm)' }}>{xMin}</span>
                <span className={styles.summaryLabel}>X mínimo</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue} style={{ fontSize: 'var(--text-sm)' }}>{xMax}</span>
                <span className={styles.summaryLabel}>X máximo</span>
              </div>
            </div>
          </div>

          {/* Import card */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Importar Archivo</p>

            <div
              className={[styles.importArea, isDragOver && styles.dragOver].filter(Boolean).join(' ')}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Área de importación de archivo"
            >
              <div className={styles.importIcon}>
                {isDragOver ? <FileText size={20} /> : <Upload size={20} />}
              </div>
              <p className={styles.importTitle}>{isDragOver ? 'Suelte el archivo' : 'Arrastre un archivo aquí'}</p>
              <p className={styles.importSub}>CSV · TXT · DAT</p>
              <Button variant="outline" size="sm" onClick={e => e.stopPropagation()}>
                Seleccionar archivo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.dat,.tsv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ marginTop: 'var(--space-4)' }}>
              <Select
                label="Separador de columnas"
                options={SEPARATOR_OPTIONS}
                value={separator}
                onChange={e => setSeparator(e.target.value as SeparatorType)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Dialogs ────────────────────────────────────────────────────────── */}
      <Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearConfirm}
        variant="danger"
        title="¿Limpiar todos los datos?"
        description={`Se eliminarán los ${points.length} par${points.length !== 1 ? 'es' : ''} de datos permanentemente. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar todo"
        cancelLabel="Cancelar"
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        variant="warning"
        title="¿Eliminar este registro?"
        description="El par (X, Y) será eliminado de la tabla y del almacenamiento."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
