'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentPG, updateRazorpaySettings } from '@/actions/pg.actions';
import styles from './page.module.css';

export default function RazorpaySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pg, setPg] = useState<any>(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role === 'owner') {
      getCurrentPG().then(data => {
        setPg(data);
        setKeyId(data?.razorpayKeyId || '');
        setKeySecret(data?.razorpayKeySecret || '');
        setIsEnabled(data?.isRazorpayEnabled || false);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const form = new FormData();
    form.append('razorpayKeyId', keyId);
    form.append('razorpayKeySecret', keySecret);
    form.append('isRazorpayEnabled', String(isEnabled));

    const result = await updateRazorpaySettings(form);
    
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Razorpay settings saved successfully!' });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Razorpay Payment Gateway</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <p className={styles.description}>
              Configure Razorpay to accept rent payments directly from tenants.
              Tenants will be able to pay rent online using Razorpay&apos;s secure payment gateway.
            </p>

            <div className={styles.infoBox}>
              <h3>How to get Razorpay API keys:</h3>
              <ol>
                <li>Sign up at <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer">razorpay.com</a></li>
                <li>Go to Settings → API Keys in your Razorpay dashboard</li>
                <li>Generate a new API key (Key ID and Key Secret)</li>
                <li>Copy and paste them below</li>
              </ol>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="keyId" className={styles.label}>Razorpay Key ID</label>
                <input
                  type="text"
                  id="keyId"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="rzp_test_xxxxxxxxxxxxx"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="keySecret" className={styles.label}>Razorpay Key Secret</label>
                <input
                  type="password"
                  id="keySecret"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder="Enter your key secret"
                  className={styles.input}
                />
                <span className={styles.hint}>
                  Keep this secure. It will be encrypted before storing.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Enable Razorpay Payments</span>
                </label>
                <span className={styles.hint}>
                  When enabled, tenants will see Razorpay as a payment option
                </span>
              </div>

              {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                  {message.text}
                </div>
              )}

              <button 
                type="submit" 
                className={styles.saveBtn}
                disabled={saving || !keyId || !keySecret}
              >
                {saving ? 'Saving...' : 'Save Razorpay Settings'}
              </button>
            </form>
          </div>

          {isEnabled && (
            <div className={styles.preview}>
              <h2 className={styles.previewTitle}>Status</h2>
              <div className={styles.statusActive}>
                <span className={styles.statusDot}></span>
                Razorpay is enabled and ready to accept payments
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
