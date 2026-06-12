import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration: number;
  exiting: boolean;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id' | 'exiting'>) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;
const nextId = () => `toast_${++toastIdCounter}`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 210);
  }, []);

  const toast = useCallback(
    ({ variant, title, message, duration = 4000 }: Omit<ToastItem, 'id' | 'exiting'>) => {
      const id = nextId();
      setToasts(prev => [...prev, { id, variant, title, message, duration, exiting: false }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const success = useCallback((title: string, message?: string) => toast({ variant: 'success', title, message, duration: 3500 }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ variant: 'error',   title, message, duration: 5000 }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ variant: 'warning', title, message, duration: 4000 }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ variant: 'info',    title, message, duration: 3500 }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {createPortal(
        <div className={styles.container} role="region" aria-label="Notificaciones">
          {toasts.map(t => {
            const Icon = ICONS[t.variant];
            return (
              <div
                key={t.id}
                className={[styles.toast, styles[t.variant], t.exiting && styles.exiting].filter(Boolean).join(' ')}
                role="alert"
              >
                <div className={styles.iconWrapper}>
                  <Icon size={16} />
                </div>
                <div className={styles.body}>
                  <p className={styles.title}>{t.title}</p>
                  {t.message && <p className={styles.message}>{t.message}</p>}
                </div>
                <button className={styles.closeBtn} onClick={() => dismiss(t.id)} aria-label="Cerrar">
                  <X size={14} />
                </button>
                <div
                  className={styles.progress}
                  style={{ animationDuration: `${t.duration}ms` }}
                />
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
