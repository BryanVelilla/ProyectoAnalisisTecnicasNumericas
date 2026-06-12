import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useSidebar } from '../../../hooks/useSidebar';
import styles from './MainLayout.module.css';

export function MainLayout() {
  const { collapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className={styles.root}>
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div className={styles.body}>
        <Header onMobileMenuToggle={openMobile} />
        <main className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
