'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentPG, updateUPISettings } from '@/actions/pg.actions';
import QRCode from 'react-qr-code';
import styles from './page.module.css';

export default function UPISettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pg, setPg] = useState<any>(null);
  const [upiId, setUpiId] = useState('');
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
        setUpiId(data?.upiId || '');
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const form = new FormData();
    form.append('upiId', upiId);

    const result = await updateUPISettings(form);
    
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'UPI ID saved successfully!' });
    }
    
    setSaving(false);
  };

  const generateUPIQR = () => {
    if (!upiId) return '';
    return `upi://pay?pa=${upiId}&pn=PG+Manager`;
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
          <h1 className={styles.title}>UPI Payment Settings</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <p className={styles.description}>
              Set your UPI ID to generate payment QR codes that tenants can scan to pay rent.
              This QR code will be shown on payment details for members to make payments.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="upiId" className={styles.label}>Your UPI ID</label>
                <input
                  type="text"
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className={styles.input}
                  required
                />
                <span className={styles.hint}>
                  Example: owner@yesbank, yourname@gpay, name@icici
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
                disabled={saving || !upiId}
              >
                {saving ? 'Saving...' : 'Save UPI ID'}
              </button>
            </form>
          </div>

          {upiId && (
            <div className={styles.qrPreview}>
              <h2 className={styles.qrTitle}>QR Code Preview</h2>
              <p className={styles.qrNote}>This QR will be shown to tenants on payment details</p>
              <div className={styles.qrCode}>
                <QRCode value={generateUPIQR()} size={160} />
              </div>
              <p className={styles.upiIdDisplay}>{upiId}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}