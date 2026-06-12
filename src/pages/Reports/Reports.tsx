import { useState } from 'react';
import { FileText, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Table } from 'lucide-react';
import { PageHeader }  from '../../components/shared/PageHeader';
import { Button }      from '../../components/ui/Button';
import { useData }     from '../../store/DataContext';
import { ReportExcelService } from '../../services/reportExcel.service';
import { ReportPdfService }   from '../../services/reportPdf.service';
import { ReportWordService }  from '../../services/reportWord.service';
import styles from './Reports.module.css';

type Format = 'excel' | 'pdf' | 'word';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface FormatCard {
  id:          Format;
  icon:        React.ReactNode;
  title:       string;
  description: string;
  ext:         string;
  accent:      string;
}

const FORMATS: FormatCard[] = [
  {
    id:          'excel',
    icon:        <FileSpreadsheet size={24} />,
    title:       'Exportar Excel',
    description: 'Libro con 10 hojas: Resumen, Datos y una por cada método. Tablas de cálculo con colores, parámetros, valores ajustados y residuos.',
    ext:         '.xlsx',
    accent:      '#16a34a',
  },
  {
    id:          'pdf',
    icon:        <FileText size={24} />,
    title:       'Generar PDF',
    description: 'Documento multipágina con portada, ranking comparativo, tablas de cálculo por método, parámetros y análisis de residuos.',
    ext:         '.pdf',
    accent:      '#dc2626',
  },
  {
    id:          'word',
    icon:        <Table size={24} />,
    title:       'Exportar Word',
    description: 'Documento .doc con tablas de todos los métodos, parámetros, residuos y resumen estadístico. Compatible con Word y LibreOffice.',
    ext:         '.doc',
    accent:      '#2563eb',
  },
];

export function Reports() {
  const { points } = useData();
  const hasData    = points.length >= 2;

  const [status, setStatus]   = useState<Record<Format, Status>>({
    excel: 'idle', pdf: 'idle', word: 'idle',
  });
  const [error, setError]     = useState<Record<Format, string>>({
    excel: '', pdf: '', word: '',
  });

  function setFmt(fmt: Format, s: Status, msg = '') {
    setStatus(prev => ({ ...prev, [fmt]: s }));
    setError(prev  => ({ ...prev, [fmt]: msg }));
  }

  async function handleGenerate(fmt: Format) {
    if (!hasData) return;
    setFmt(fmt, 'loading');
    try {
      if (fmt === 'excel') await ReportExcelService.generate(points);
      if (fmt === 'pdf')   ReportPdfService.generate(points);
      if (fmt === 'word')  ReportWordService.generate(points);
      setFmt(fmt, 'success');
      setTimeout(() => setFmt(fmt, 'idle'), 3000);
    } catch (e) {
      setFmt(fmt, 'error', e instanceof Error ? e.message : 'Error inesperado');
      setTimeout(() => setFmt(fmt, 'idle'), 5000);
    }
  }

  async function handleAll() {
    if (!hasData) return;
    for (const fmt of ['excel', 'pdf', 'word'] as Format[]) {
      await handleGenerate(fmt);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Módulo de Reportes"
        title="Generación de Reportes"
        description="Exporta todos los resultados del análisis en tres formatos profesionales. Los reportes incluyen tablas de cálculo, parámetros ajustados, residuos y análisis estadístico."
        icon={<FileText size={22} />}
        iconColor="green"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleAll}
            disabled={!hasData}
          >
            Exportar Todo
          </Button>
        }
      />

      {/* Dataset info bar */}
      <div className={styles.infoBar}>
        <span className={`${styles.dot} ${hasData ? styles.dotGreen : styles.dotRed}`} />
        {hasData
          ? <span><strong>{points.length}</strong> punto{points.length !== 1 ? 's' : ''} cargado{points.length !== 1 ? 's' : ''} — listo para exportar</span>
          : <span>Sin datos — ingresa puntos en la sección <strong>Datos</strong> antes de generar reportes</span>
        }
      </div>

      {/* Format cards */}
      <div className={styles.grid}>
        {FORMATS.map(card => {
          const s = status[card.id];
          const isLoading = s === 'loading';
          const isSuccess = s === 'success';
          const isError   = s === 'error';

          return (
            <div
              key={card.id}
              className={`${styles.card} ${!hasData ? styles.cardDisabled : ''}`}
              style={{ '--card-accent': card.accent } as React.CSSProperties}
            >
              <div className={styles.cardIconWrap} style={{ color: card.accent }}>
                {card.icon}
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDesc}>{card.description}</p>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.extBadge}>{card.ext}</span>

                {isError && (
                  <div className={styles.errorMsg}>
                    <AlertCircle size={12} />
                    <span>{error[card.id]}</span>
                  </div>
                )}

                <Button
                  variant={card.id === 'excel' ? 'primary' : 'outline'}
                  size="sm"
                  fullWidth
                  disabled={!hasData || isLoading}
                  onClick={() => handleGenerate(card.id)}
                  leftIcon={
                    isLoading ? <Loader2 size={14} className={styles.spin} /> :
                    isSuccess ? <CheckCircle size={14} /> :
                    <Download size={14} />
                  }
                >
                  {isLoading ? 'Generando…' : isSuccess ? '¡Descargado!' : `Descargar ${card.ext}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content preview */}
      {hasData && (
        <div className={styles.preview}>
          <h4 className={styles.previewTitle}>Contenido incluido en cada reporte</h4>
          <div className={styles.previewGrid}>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>Tabla de comparación con ranking de los 8 métodos (R², r, ECM)</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>Datos originales ({points.length} punto{points.length !== 1 ? 's' : ''})</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>Tabla de cálculo por método (con transformaciones linealizadas)</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>Parámetros ajustados: a, b (y L, k, x₀ para el logístico)</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>Valores ajustados ŷ, residuales y (y−ŷ)² por punto</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewBullet} />
              <span>SSE, ECM, coeficientes r y R², clasificación de calidad</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
