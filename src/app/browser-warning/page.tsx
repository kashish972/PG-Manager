'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, ExternalLink, Globe } from 'lucide-react';
import styles from './page.module.css';

function BrowserWarningContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <AlertTriangle className={styles.icon} />
        </div>
        
        <h1 className={styles.title}>Browser Compatibility Warning</h1>
        
        <p className={styles.description}>
          It looks like you&apos;re opening this website from within the LinkedIn app. 
          Some features may not work properly in this browser.
        </p>
        
        <p className={styles.description}>
          For the best experience, please open this website in a dedicated browser:
        </p>
        
        <div className={styles.browserList}>
          <div className={styles.browserItem}>
            <Globe className={styles.browserIcon} />
            <span>Google Chrome (Recommended)</span>
          </div>
          <div className={styles.browserItem}>
            <Globe className={styles.browserIcon} />
            <span>Apple Safari</span>
          </div>
          <div className={styles.browserItem}>
            <ExternalLink className={styles.browserIcon} />
            <span>Microsoft Edge</span>
          </div>
        </div>
        
        <p className={styles.instruction}>
          Simply copy the link from your browser&apos;s address bar and paste it into Chrome, Safari, or Edge.
        </p>
        
        {returnUrl && (
          <a href={returnUrl} className={styles.continueLink}>
            Continue anyway
          </a>
        )}
      </div>
    </div>
  );
}

export default function BrowserWarningPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <BrowserWarningContent />
    </Suspense>
  );
}