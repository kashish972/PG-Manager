'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { usePayments, useDeletePayment } from '@/hooks/use-data';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { getPersons } from '@/actions/person.actions';
import QRCode from 'react-qr-code';
import { jsPDF } from 'jspdf';
import { FileText } from 'lucide-react';
import styles from './page.module.css';

export default function PaymentsPage() {
  const { data: payments, isLoading, refetch } = usePayments();
  const { data: session } = useSession();
  const deletePayment = useDeletePayment();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const canEdit = session?.user?.role !== 'member';

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this payment?')) {
      await deletePayment.mutateAsync(id);
      refetch();
    }
  }

  async function handleViewPayment(payment: any) {
    setSelectedPayment(payment);
    const personsData = await getPersons();
    setPersons(personsData || []);
  }

  async function handleGeneratePayments() {
    setGenerating(true);
    try {
      const { generateMonthlyPayments } = await import('@/actions/payment-generate.actions');
      const result = await generateMonthlyPayments();
      alert(result?.message || result?.error || 'Done');
      refetch();
    } catch (error) {
      alert('Failed to generate payments');
    } finally {
      setGenerating(false);
    }
  }

  const getPersonName = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.name || 'Unknown';
  };

  const getPersonRoom = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.roomNumber || '';
  };

  const generateReceipt = () => {
    if (!selectedPayment) return;
    
    const person = persons.find(p => p._id === selectedPayment.personId);
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Rent Payment Receipt', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PG Manager', 105, 30, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(12);
    doc.text('Receipt Details', 20, 45);
    
    doc.setFontSize(10);
    doc.text(`Receipt ID: ${selectedPayment._id}`, 20, 55);
    doc.text(`Month: ${selectedPayment.month}`, 20, 62);
    doc.text(`Amount: ₹${selectedPayment.amount?.toLocaleString()}`, 20, 69);
    doc.text(`Status: ${selectedPayment.status}`, 20, 76);
    doc.text(`Payment Date: ${new Date(selectedPayment.paymentDate).toLocaleDateString()}`, 20, 83);
    doc.text(`Payment Method: ${selectedPayment.paymentMethod}`, 20, 90);
    
    if (person) {
      doc.text('Tenant Details', 20, 105);
      doc.text(`Name: ${person.name}`, 20, 112);
      doc.text(`Room: ${person.roomNumber}`, 20, 119);
    }
    
    doc.save(`receipt-${selectedPayment.month}.pdf`);
  };

  const generateUPIQR = () => {
    if (!selectedPayment) return '';
    return `upi://pay?pa=owner@upi&pn=PG+Manager&am=${selectedPayment.amount}&tn=Rent+${selectedPayment.month}`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Payments</h1>
          {canEdit && (
            <div className={styles.headerActions}>
              <button 
                className={styles.generateBtn}
                onClick={handleGeneratePayments}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Monthly'}
              </button>
              <Link href="/payments/add">
                <Button>+ Add Payment</Button>
              </Link>
            </div>
          )}
        </div>

        {payments?.length === 0 ? (
          <div className={styles.empty}>
            <p>No payments yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Date</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments?.map((payment: any) => (
                  <tr key={payment._id}>
                    <td>
                      <button 
                        className={styles.viewLink}
                        onClick={() => handleViewPayment(payment)}
                      >
                        {payment.month}
                      </button>
                    </td>
                    <td>₹{payment.amount}</td>
                    <td>
                      <span className={`${styles.status} ${styles[payment.status]}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className={styles.method}>{payment.paymentMethod}</td>
                    <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    {canEdit && (
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/payments/add?personId=${payment.personId}`}>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(payment._id)}
                            disabled={deletePayment.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedPayment && (
          <div className={styles.modalOverlay} onClick={() => setSelectedPayment(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Payment Details</h2>
                <button className={styles.closeBtn} onClick={() => setSelectedPayment(null)}>×</button>
              </div>
              
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Month</span>
                  <span className={styles.value}>{selectedPayment.month}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Amount</span>
                  <span className={styles.value}>₹{selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Resident</span>
                  <span className={styles.value}>
                    {getPersonName(selectedPayment.personId)} (Room {getPersonRoom(selectedPayment.personId)})
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Payment Method</span>
                  <span className={styles.value}>{selectedPayment.paymentMethod}</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.receiptBtn} onClick={generateReceipt}>
                  <FileText className={styles.icon} size={16} /> Download Receipt
                </button>
              </div>

              <div className={styles.qrSection}>
                <h3>UPI Payment QR</h3>
                <p className={styles.qrNote}>Scan to pay ₹{selectedPayment.amount?.toLocaleString()}</p>
                <div className={styles.qrCode}>
                  <QRCode value={generateUPIQR()} size={120} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}