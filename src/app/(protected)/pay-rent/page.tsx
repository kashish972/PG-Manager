'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentPG } from '@/actions/pg.actions';
import { getPersonByEmail } from '@/actions/person.actions';
import { getPaymentsByPerson } from '@/actions/payment.actions';
import { createPayment, updatePayment, updatePaymentByMember } from '@/actions/payment.actions';
import { getBlocks as getBlocksAction } from '@/actions/block.actions';
import QRCode from 'react-qr-code';
import { IndianRupee, Download } from 'lucide-react';
import { generateReceiptPDF, downloadReceipt } from '@/lib/receipt-generator';
import styles from './page.module.css';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PayRentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pg, setPg] = useState<any>(null);
  const [person, setPerson] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

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
      }).catch(() => {});

      getBlocksAction().then(setBlocks).catch(() => {});

      if (session?.user?.email) {
        getPersonByEmail(session.user.email).then(async (personData) => {
          if (!personData) {
            console.error('Person not found for email:', session.user.email);
            setLoading(false);
            return;
          }
          setPerson(personData);
          
          // Auto-generate payment records for past months
          try {
            await fetch('/api/generate-payments', { method: 'POST' });
          } catch (e) {
            console.log('Payment generation trigger failed, continuing...');
          }
          
          if (personData?._id) {
            return getPaymentsByPerson(personData._id.toString());
          }
          return [];
        }).then(paymentData => {
          setPayments(paymentData || []);
          setLoading(false);
        }).catch((error) => {
          console.error('Error loading payments:', error);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }
  }, [session]);

  const pendingPayments = payments.filter((p: any) => p.status === 'pending' || p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const generateUPIQR = (amount?: number, month?: string) => {
    if (!pg?.upiId) return '';
    if (amount && month) {
      return `upi://pay?pa=${pg.upiId}&pn=PG+Manager&am=${amount}&tn=Rent+${month}`;
    }
    return `upi://pay?pa=${pg.upiId}&pn=PG+Manager`;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async (payment: any) => {
    setProcessingPayment(payment._id);
    
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK');
        setProcessingPayment(null);
        return;
      }

      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payment.amount),
          currency: 'INR',
          receipt: `rent_${payment.month}_${person?._id}`,
          notes: {
            month: payment.month,
            personId: person?._id,
            paymentId: payment._id,
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Failed to create order');
        setProcessingPayment(null);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: pg.name,
        description: `Rent Payment for ${payment.month}`,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            
            if (verifyData.verified) {
              const formData = new FormData();
              formData.append('razorpayPaymentId', response.razorpay_payment_id);
              formData.append('razorpayOrderId', response.razorpay_order_id);
              formData.append('notes', `Paid via Razorpay - ${payment.month}`);

              const result = await updatePaymentByMember(payment._id, formData);
              
              console.log('updatePaymentByMember result:', result);
              
              if (result?.error) {
                alert('Payment verification failed');
              }
              router.refresh();
            } else {
              alert('Payment verification failed');
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed');
          }
          setProcessingPayment(null);
        },
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setProcessingPayment(null);
    }
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

  if (!person) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Pay Rent</h1>
          </div>
          <div className={styles.noUpi}>
            <p>Your details not found.</p>
            <p>Please contact your PG owner to add your details.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasRazorpay = pg?.isRazorpayEnabled && pg?.razorpayKeyId;
  const hasUPI = pg?.upiId;
  const hasPaymentMethods = hasRazorpay || hasUPI;

  if (!hasPaymentMethods) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Pay Rent</h1>
          </div>
          <div className={styles.noUpi}>
            <p>Online payment is not set up by the owner yet.</p>
            <p>Please contact your PG owner to enable Razorpay or UPI payments.</p>
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
          {(pg?.upiId || pg?.isRazorpayEnabled) && (
            <div className={styles.qrCard}>
              <div className={styles.qrHeader}>
                <h2>Pay Your Rent</h2>
                <p>Choose your preferred payment method below</p>
              </div>

              {pg?.isRazorpayEnabled && (
                <div className={styles.razorpaySection}>
                  <h3>Pay Online with Razorpay</h3>
                  <p className={styles.razorpayDesc}>
                    Pay securely using Credit/Debit Card, Net Banking, UPI, or Wallets
                  </p>
                  
                  {pendingPayments.length > 0 ? (
                    <div className={styles.pendingList}>
                      {pendingPayments.map((payment: any) => (
                        <div key={payment._id} className={styles.paymentItem}>
                          <div className={styles.pendingInfo}>
                            <span className={styles.paymentMonth}>{payment.month}</span>
                            <span className={styles.paymentAmount}>₹{Number(payment.amount).toLocaleString()}</span>
                          </div>
                          <div className={styles.paymentActions}>
                            <button 
                              className={styles.payBtn}
                              onClick={() => handleRazorpayPayment(payment)}
                              disabled={processingPayment === payment._id}
                            >
                              {processingPayment === payment._id ? (
                                <span>Processing...</span>
                              ) : (
                                <span>💳 Pay Now ₹{Number(payment.amount).toLocaleString()}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noPending}>No pending payments!</p>
                  )}
                </div>
              )}

              {pg?.upiId && (
                <div className={styles.upiSection}>
                  <h3>Or Scan QR Code (UPI)</h3>
                  <div className={styles.qrCode}>
                    <QRCode value={generateUPIQR()} size={180} />
                  </div>
                  <div className={styles.upiDetails}>
                    <p className={styles.upiLabel}>Pay to UPI ID:</p>
                    <p className={styles.upiId}>{pg.upiId}</p>
                  </div>
                </div>
              )}

              <div className={styles.instructions}>
                <h3>Payment Instructions:</h3>
                <ol>
                  <li>Select a pending payment above</li>
                  <li>Click "Pay Now" to pay via Razorpay</li>
                  <li>Complete the payment using your preferred method</li>
                  <li>Payment will be automatically recorded</li>
                </ol>
              </div>
            </div>
          )}

          <div className={styles.paymentsCard}>
            <div className={styles.cardHeader}>
              <h2>Payment History</h2>
              {payments.filter((p: any) => p.status === 'paid').length > 0 && (
                <button 
                  className={styles.downloadAllBtn}
                  onClick={() => {
                    const block = blocks.find((b: any) => String(b._id) === String(person?.blockId));
                    const blockName = block?.name || '';
                    
                    downloadReceipt({
                      pgName: pg?.name || 'PG Manager',
                      personName: person?.name || 'Tenant',
                      roomNumber: person?.roomNumber || '',
                      blockName,
                      payments: payments
                        .filter((p: any) => p.status === 'paid')
                        .map((p: any) => ({
                          month: p.month,
                          amount: Number(p.amount),
                          paymentDate: new Date(p.paymentDate).toLocaleDateString(),
                          paymentMethod: p.paymentMethod,
                          status: p.status,
                          razorpayPaymentId: p.razorpayPaymentId,
                          razorpayOrderId: p.razorpayOrderId,
                          notes: p.notes,
                        })),
                      generatedDate: new Date().toLocaleDateString(),
                    }, `receipts_${person?.name || 'tenant'}.pdf`);
                  }}
                >
                  <Download size={16} />
                  Download All Receipts
                </button>
              )}
            </div>
            {payments.length === 0 ? (
              <p className={styles.noPayments}>No payment records found.</p>
            ) : (
              <div className={styles.paymentsList}>
                {payments.map((payment: any) => (
                  <div key={payment._id} className={`${styles.paymentItem} ${styles[payment.status]}`}>
                    <div className={styles.paymentInfo}>
                      <span className={styles.paymentMonth}>{payment.month}</span>
                      <span className={styles.paymentAmount}>₹{Number(payment.amount).toLocaleString()}</span>
                    </div>
                    <div className={styles.paymentMeta}>
                      <span className={styles.paymentMethod}>{payment.paymentMethod}</span>
                      {payment.razorpayPaymentId && (
                        <span className={styles.razorpayId}>ID: {payment.razorpayPaymentId}</span>
                      )}
                    </div>
                    <div className={styles.paymentStatus}>
                      {payment.status === 'paid' ? (
                        <span className={styles.paidBadge}>Paid</span>
                      ) : (
                        <span className={styles[`status_${payment.status}`]}>{payment.status}</span>
                      )}
                    </div>
                    {payment.status === 'paid' && (
                      <button 
                        className={styles.downloadBtn}
                        onClick={() => {
                          const block = blocks.find((b: any) => String(b._id) === String(person?.blockId));
                          const blockName = block?.name || '';
                          
                          downloadReceipt({
                            pgName: pg?.name || 'PG Manager',
                            personName: person?.name || 'Tenant',
                            roomNumber: person?.roomNumber || '',
                            blockName,
                            payments: [{
                              month: payment.month,
                              amount: Number(payment.amount),
                              paymentDate: new Date(payment.paymentDate).toLocaleDateString(),
                              paymentMethod: payment.paymentMethod,
                              status: payment.status,
                              razorpayPaymentId: payment.razorpayPaymentId,
                              razorpayOrderId: payment.razorpayOrderId,
                              notes: payment.notes,
                            }],
                            generatedDate: new Date().toLocaleDateString(),
                          }, `receipt_${payment.month}.pdf`);
                        }}
                      >
                        <Download size={14} />
                      </button>
                    )}
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
