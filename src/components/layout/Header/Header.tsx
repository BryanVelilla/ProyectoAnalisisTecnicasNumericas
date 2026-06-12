import { useLocation } from 'react-router-dom';
import { Bell, HelpCircle, Menu } from 'lucide-react';
import { NAV_GROUPS } from '../../../constants/navigation';
import styles from './Header.module.css';

function getBreadcrumb(pathname: string): { label: string; path: string }[] {
  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const current = allItems.find(i => i.route === pathname);

  if (!current) return [{ label: 'Dashboard', path: '/' }];
  if (pathname === '/') return [{ label: 'Dashboard', path: '/' }];

  const group = NAV_GROUPS.find(g => g.items.some(i => i.route === pathname));
  const crumbs = [{ label: 'Inicio', path: '/' }];
  if (group && group.id !== 'main') crumbs.push({ label: group.label, path: '' });
  crumbs.push({ label: current.label, path: pathname });
  return crumbs;
}

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { pathname } = useLocation();
  const crumbs = getBreadcrumb(pathname);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.hamburger}
          onClick={onMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          {crumbs.map((crumb, idx) => (
            <span key={crumb.path || idx} className={styles.breadcrumb}>
              {idx > 0 && <span className={styles.breadcrumbSep}>/</span>}
              <span className={[styles.breadcrumbItem, idx === crumbs.length - 1 && styles.active].filter(Boolean).join(' ')}>
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className={styles.right}>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} />
          Sistema Listo
        </div>

        <div className={styles.divider} />

        <button className={styles.iconBtn} aria-label="Ayuda">
          <HelpCircle size={18} />
        </button>

        <button className={styles.iconBtn} aria-label="Notificaciones">
          <Bell size={18} />
          <span className={styles.notificationDot} />
        </button>

        <div className={styles.divider} />

        <div className={styles.avatar} title="Usuario Académico">UA</div>
      </div>
    </header>
  );
}
