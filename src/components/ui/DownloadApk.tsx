import { Download } from 'lucide-react';
import styles from './DownloadApk.module.css';

interface DownloadApkProps {
  variant?: 'sidebar' | 'card';
}

export function DownloadApk({ variant = 'sidebar' }: DownloadApkProps) {
  return (
    <a
      href="/PG-ManagerV2.apk"
      download
      className={`${styles.downloadBtn} ${styles[variant]}`}
    >
      <Download size={20} />
      <span className={styles.label}>Download APK</span>
    </a>
  );
}
