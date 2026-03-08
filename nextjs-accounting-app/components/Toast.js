'use client';
import { useEffect } from 'react';
import styles from './Toast.module.css';

const ICONS = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  return (
    <div className={`${styles.toast} ${styles['toast_' + toast.type]}`}>
      <i className={`fas ${ICONS[toast.type] || 'fa-info-circle'} ${styles.icon}`} />
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.closeBtn} onClick={() => onRemove(toast.id)}>
        <i className="fas fa-times" />
      </button>
      <div className={styles.progress} />
    </div>
  );
}

export default function ToastContainer({ toasts = [], removeToast }) {
  if (!toasts.length) return null;
  return (
    <div className={styles.container}>
      {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}
    </div>
  );
}
