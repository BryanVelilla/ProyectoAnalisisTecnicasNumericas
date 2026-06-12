import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  errorMsg?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, errorMsg, leftIcon, rightIcon, required, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(errorMsg);

    const inputClass = [
      styles.input,
      hasError && styles.error,
      leftIcon && styles.withLeftIcon,
      rightIcon && styles.withRightIcon,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <div className={styles.inputWrapper}>
          {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
          <input ref={ref} id={inputId} className={inputClass} {...props} />
          {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
        </div>
        {helper && !hasError && <p className={styles.helper}>{helper}</p>}
        {hasError && <p className={styles.errorMsg}>{errorMsg}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
