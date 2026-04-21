'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentPG } from '@/actions/pg.actions';
import { usePayments } from '@/hooks/use-data';
import QRCode from 'react-qr-code';
import { IndianRupee } from 'lucide-react';
import styles from './page.module.css';

export default function PayRentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: payments } = usePayments();
  const [pg, setPg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role === 'member') {
      getCurrentPG().then(data => {
        setPg(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const myPayments = payments?.filter((p: any) => {
    return p.personId === session?.user?.id;
  }) || [];

  const pendingPayments = myPayments.filter((p: any) => p.status === 'pending' || p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const generateUPIQR = (amount?: number, month?: string) => {
    if (!pg?.upiId) return '';
    if (amount && month) {
      return `upi://pay?pa=${pg.upiId}&pn=PG+Manager&am=${amount}&tn=Rent+${month}`;
    }
    return `upi://pay?pa=${pg.upiId}&pn=PG+Manager`;
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

  if (!pg?.upiId) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Pay Rent</h1>
          </div>
          <div className={styles.noUpi}>
            <p>UPI payment is not set up by the owner yet.</p>
            <p>Please contact your PG owner for payment details.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pay Rent</h1>
          {totalPending > 0 && (
            <div className={styles.pendingBadge}>
              <IndianRupee size={16} />
              ₹{totalPending.toLocaleString()} pending
            </div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.qrCard}>
            <div className={styles.qrHeader}>
              <h2>Scan to Pay</h2>
              <p>Use any UPI app to scan and pay your rent</p>
            </div>
            
            <div className={styles.qrCode}>
              <QRCode value={generateUPIQR()} size={180} />
            </div>
            
            <div className={styles.upiDetails}>
              <p className={styles.upiLabel}>Pay to UPI ID:</p>
              <p className={styles.upiId}>{pg.upiId}</p>
            </div>

            <div className={styles.instructions}>
              <h3>How to Pay:</h3>
              <ol>
                <li>Open your UPI app (GPay, PhonePe, Paytm, etc.)</li>
                <li>Scan the QR code above</li>
                <li>Enter the amount shown below</li>
                <li>Complete the payment</li>
              </ol>
            </div>
          </div>

          <div className={styles.paymentsCard}>
            <h2>Your Payments</h2>
            {myPayments.length === 0 ? (
              <p className={styles.noPayments}>No payment records found.</p>
            ) : (
              <div className={styles.paymentsList}>
                {myPayments.map((payment: any) => (
                  <div key={payment._id} className={`${styles.paymentItem} ${styles[payment.status]}`}>
                    <div className={styles.paymentInfo}>
                      <span className={styles.paymentMonth}>{payment.month}</span>
                      <span className={styles.paymentAmount}>₹{Number(payment.amount).toLocaleString()}</span>
                    </div>
                    <div className={styles.paymentActions}>
                      {payment.status === 'pending' || payment.status === 'overdue' ? (
                        <button 
                          className={styles.payBtn}
                          onClick={() => {
                            const qrWindow = window.open('', '_blank');
                            if (qrWindow) {
                              qrWindow.document.write(`
                                <html>
                                  <head><title>Pay Rent - ${payment.month}</title></head>
                                  <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;margin:0;background:#f5f5f5;">
                                    <h2>Pay Rent for ${payment.month}</h2>
                                    <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateUPIQR(payment.amount, payment.month))}" alt="QR Code" />
                                    </div>
                                    <p style="margin-top:20px;color:#666;">Amount: <strong>₹${Number(payment.amount).toLocaleString()}</strong></p>
                                    <p style="color:#666;">UPI ID: <strong>${pg.upiId}</strong></p>
                                    <p style="color:#888;font-size:14px;margin-top:30px;">Scan with any UPI app to pay</p>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span className={styles.paidBadge}>Paid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}