import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.brand}>
          <span>Curve</span>Analysis
        </span>
        <div className={styles.sep} />
        <span className={styles.course}>Análisis de Técnicas Numéricas · Universidad</span>
      </div>
      <div className={styles.right}>
        <span className={styles.version}>v1.0.0-alpha</span>
        <div className={styles.sep} />
        <span className={styles.link}>Documentación</span>
        <span className={styles.link}>Soporte</span>
      </div>
    </footer>
  );
}
