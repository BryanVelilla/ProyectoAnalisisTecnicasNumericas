import { type SelectHTMLAttributes, forwardRef } from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  helper?: string;
  errorMsg?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, helper, errorMsg, id, className = '', ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={styles.wrapper}>
        {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
        <div className={styles.selectWrapper}>
          <select
            ref={ref}
            id={selectId}
            className={[styles.select, errorMsg && styles.error, className].filter(Boolean).join(' ')}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className={styles.chevron}>▾</span>
        </div>
        {helper && !errorMsg && <p className={styles.helper}>{helper}</p>}
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
