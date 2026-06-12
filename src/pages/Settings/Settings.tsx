import { Settings as SettingsIcon, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Input } from '../../components/ui/forms/Input';
import { Select } from '../../components/ui/forms/Select';
import { Button } from '../../components/ui/Button';
import styles from './Settings.module.css';

const DECIMAL_OPTIONS = [
  { value: '2', label: '2 decimales' },
  { value: '4', label: '4 decimales' },
  { value: '6', label: '6 decimales' },
  { value: '8', label: '8 decimales' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro (Light)' },
  { value: 'dark',  label: 'Oscuro (Dark) — Próximamente', disabled: true },
];

const LANG_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export function Settings() {
  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Configuración"
        description="Personaliza las preferencias del sistema, precisión numérica y opciones de visualización."
        icon={<SettingsIcon size={22} />}
        iconColor="orange"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Save size={14} />}>
            Guardar cambios
          </Button>
        }
      />

      <div className={styles.layout}>
        {/* General */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>General</h3>
          <div className={styles.card}>
            <div className={styles.formGrid}>
              <Input label="Nombre del proyecto" placeholder="Mi Análisis Numérico" />
              <Input label="Institución / Universidad" placeholder="Universidad Nacional" />
              <Input label="Nombre del estudiante" placeholder="Juan Pérez" />
              <Input label="Materia" placeholder="Análisis de Técnicas Numéricas" />
            </div>
          </div>
        </div>

        {/* Numeric */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Precisión Numérica</h3>
          <div className={styles.card}>
            <div className={styles.formGrid}>
              <Select label="Decimales a mostrar" options={DECIMAL_OPTIONS} />
              <Select label="Notación científica" options={[
                { value: 'auto',   label: 'Automática' },
                { value: 'always', label: 'Siempre' },
                { value: 'never',  label: 'Nunca' },
              ]} />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Apariencia</h3>
          <div className={styles.card}>
            <div className={styles.formGrid}>
              <Select label="Tema" options={THEME_OPTIONS} />
              <Select label="Idioma" options={LANG_OPTIONS} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
