import { createPortal } from 'react-dom';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from '../Button';
import styles from './Dialog.module.css';

type DialogVariant = 'danger' | 'warning' | 'info';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

const ICONS: Record<DialogVariant, typeof AlertTriangle> = {
  danger:  AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const CONFIRM_VARIANTS: Record<DialogVariant, 'danger' | 'primary' | 'outline'> = {
  danger:  'danger',
  warning: 'primary',
  info:    'primary',
};

export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'info',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: DialogProps) {
  if (!open) return null;

  const Icon = ICONS[variant];

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.content}>
          <div className={[styles.iconWrapper, styles[variant]].join(' ')}>
            <Icon size={22} />
          </div>
          <div className={styles.text}>
            <p className={styles.title}>{title}</p>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={CONFIRM_VARIANTS[variant]} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
