'use client';

import { DashboardPrefs } from '@/hooks/use-dashboard-prefs';
import styles from './WidgetSettings.module.css';

interface WidgetSettingsProps {
  prefs: DashboardPrefs;
  onUpdatePref: (key: keyof DashboardPrefs, value: boolean) => void;
  onReset: () => void;
  onToggleAll: (value: boolean) => void;
  onClose: () => void;
}

const WIDGET_LABELS: Record<keyof DashboardPrefs, string> = {
  totalResidents: 'Total Residents',
  activeResidents: 'Active Residents',
  monthlyRevenue: 'Monthly Revenue',
  pendingPayments: 'Pending Payments',
  paymentStatus: 'Payment Status',
  revenueCard: 'Revenue Card',
};

export function WidgetSettings({ 
  prefs, 
  onUpdatePref, 
  onReset, 
  onToggleAll,
  onClose 
}: WidgetSettingsProps) {
  const allEnabled = Object.values(prefs).every(Boolean);
  const noneEnabled = Object.values(prefs).every(v => !v);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Dashboard Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.bulkActions}>
            <button 
              className={styles.bulkBtn}
              onClick={() => onToggleAll(true)}
              disabled={allEnabled}
            >
              Enable All
            </button>
            <button 
              className={styles.bulkBtn}
              onClick={() => onToggleAll(false)}
              disabled={noneEnabled}
            >
              Disable All
            </button>
          </div>

          <div className={styles.widgetList}>
            {(Object.keys(WIDGET_LABELS) as Array<keyof DashboardPrefs>).map(key => (
              <div key={key} className={styles.widgetItem}>
                <label className={styles.label}>{WIDGET_LABELS[key]}</label>
                <button
                  className={`${styles.toggle} ${prefs[key] ? styles.active : ''}`}
                  onClick={() => onUpdatePref(key, !prefs[key])}
                >
                  <span className={styles.toggleSlider} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={onReset}>
            Reset to Default
          </button>
          <button className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
