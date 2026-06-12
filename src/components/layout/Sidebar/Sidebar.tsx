import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, TrendingUp, Activity, BarChart2,
  Minus, GitBranch, Zap, Layers, Cpu, GitCompare, FileText,
  Settings, Info, ChevronRight, ChevronLeft, Sigma,
} from 'lucide-react';
import { NAV_GROUPS } from '../../../constants/navigation';
import { Badge } from '../../ui/Badge';
import styles from './Sidebar.module.css';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard, Database, TrendingUp, Activity, BarChart2,
  Minus, GitBranch, Zap, Layers, Cpu, GitCompare, FileText,
  Settings, Info, Sigma,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const cls = [
    styles.sidebar,
    collapsed && styles.collapsed,
    mobileOpen && styles.mobileOpen,
  ].filter(Boolean).join(' ');

  return (
    <aside className={cls}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandLogo}>Σ</div>
        <div className={styles.brandText}>
          <p className={styles.brandTitle}>CurveAnalysis</p>
          <p className={styles.brandSubtitle}>v1.0 · Académico</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_GROUPS.map(group => (
          <div key={group.id} className={styles.group}>
            <p className={styles.groupLabel}>{group.label}</p>
            {group.items.map(item => {
              const Icon = ICON_MAP[item.iconName];
              return (
                <NavLink
                  key={item.id}
                  to={item.route}
                  className={({ isActive }) =>
                    [styles.navItem, isActive && styles.active].filter(Boolean).join(' ')
                  }
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                >
                  <span className={styles.navIcon}>
                    {Icon && <Icon size={18} />}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && (
                    <span className={styles.navBadge}>
                      <Badge variant={item.badgeVariant ?? 'primary'} dot>
                        {item.badge}
                      </Badge>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <button className={styles.collapseBtn} onClick={onToggle} aria-label="Contraer sidebar">
        <span className={styles.collapseIcon}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </span>
      </button>
    </aside>
  );
}
