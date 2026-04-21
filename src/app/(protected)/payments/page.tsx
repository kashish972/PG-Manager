'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { usePayments, useDeletePayment } from '@/hooks/use-data';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { getPersons } from '@/actions/person.actions';
import { getBlocks } from '@/actions/block.actions';
import { getCurrentPG } from '@/actions/pg.actions';
import QRCode from 'react-qr-code';
import { jsPDF } from 'jspdf';
import { FileText } from 'lucide-react';
import { SkeletonStats, SkeletonTable } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function PaymentsPage() {
  const { data: payments, isLoading, refetch } = usePayments();
  const { data: session } = useSession();
  const deletePayment = useDeletePayment();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [upiId, setUpiId] = useState('');

  const canEdit = session?.user?.role !== 'member';

  useEffect(() => {
    getPersons().then(setPersons).catch(() => {});
    getBlocks().then(setBlocks).catch(() => {});
    getCurrentPG().then(data => {
      if (data) setUpiId(data.upiId || '');
    }).catch(() => {});
  }, []);

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
    if (!person) return '';
    const block = blocks.find(b => String(b._id) === String(person.blockId));
    const blockName = block?.name || '';
    const roomNum = person.roomNumber || '';
    return blockName ? `${blockName} - Room ${roomNum}` : roomNum ? `Room ${roomNum}` : '';
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
    if (!selectedPayment || !upiId) return '';
    return `upi://pay?pa=${upiId}&pn=PG+Manager&am=${selectedPayment.amount}&tn=Rent+${selectedPayment.month}`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <SkeletonStats />
          <SkeletonTable rows={8} />
        </div>
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
                          <Link href={`/payments/add?personId=${payment.personId}&paymentId=${payment._id}`}>
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
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}