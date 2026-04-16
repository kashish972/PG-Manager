'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useCreatePayment, useUpdatePayment, useActivePersons } from '@/hooks/use-data';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { getBlocks } from '@/actions/block.actions';
import { getPayment } from '@/actions/payment.actions';
import styles from './page.module.css';

function AddPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPersonId = searchParams.get('personId');
  const preselectedPaymentId = searchParams.get('paymentId');
  const isEditing = !!preselectedPaymentId;
  const { data: persons } = useActivePersons();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const [blocks, setBlocks] = useState<any[]>([]);
  
  useEffect(() => {
    getBlocks().then(setBlocks).catch(() => {});
  }, []);

  const [formData, setFormData] = useState<{
    personId: string;
    amount: string;
    paymentDate: string;
    month: string;
    status: string;
    paymentMethod: string;
    notes: string;
  }>({
    personId: preselectedPersonId || '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7),
    status: 'pending',
    paymentMethod: 'cash',
    notes: '',
  });

  const getPersonDisplay = (person: any) => {
    if (!person) return '';
    const block = blocks.find(b => String(b._id) === String(person.blockId));
    const blockName = block?.name || '';
    const roomNum = person.roomNumber || '';
    return blockName ? `${person.name} (${blockName} - Room ${roomNum})` : roomNum ? `${person.name} (Room ${roomNum})` : person.name;
  };

  useEffect(() => {
    if (preselectedPersonId && persons) {
      const person = persons.find((p: any) => p._id === preselectedPersonId);
      if (person) {
        setFormData(prev => ({ ...prev, amount: String(person.monthlyRent) }));
      }
    }
  }, [preselectedPersonId, persons]);

  useEffect(() => {
    async function loadPayment() {
      if (preselectedPaymentId) {
        const payment = await getPayment(preselectedPaymentId);
        if (payment) {
          setFormData({
            personId: String(payment.personId || ''),
            amount: String(payment.amount || ''),
            paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            month: payment.month || new Date().toISOString().slice(0, 7),
            status: (payment.status || 'pending') as 'pending' | 'paid' | 'overdue',
            paymentMethod: (payment.paymentMethod || 'cash') as 'cash' | 'transfer' | 'upi',
            notes: payment.notes || '',
          });
        }
      }
    }
    loadPayment();
  }, [preselectedPaymentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      fd.append(key, value);
    });
    
    if (isEditing) {
      await updatePayment.mutateAsync({ id: preselectedPaymentId, formData: fd });
    } else {
      await createPayment.mutateAsync(fd);
    }
    router.push('/payments');
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>{isEditing ? 'Edit Payment' : 'Add Payment'}</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Person *</label>
              <select
                className={styles.select}
                value={formData.personId}
                onChange={e => setFormData({ ...formData, personId: e.target.value })}
                required
              >
                <option value="">Select Person</option>
                {persons?.map((person: any) => (
                  <option key={person._id} value={person._id}>
                    {getPersonDisplay(person)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Amount *</label>
              <input
                type="number"
                className={styles.input}
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Payment Date *</label>
              <input
                type="date"
                className={styles.input}
                value={formData.paymentDate}
                onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Month *</label>
              <input
                type="month"
                className={styles.input}
                value={formData.month}
                onChange={e => setFormData({ ...formData, month: e.target.value })}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Status *</label>
              <select
                className={styles.select}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Payment Method *</label>
              <select
                className={styles.select}
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div className={styles.fieldFull}>
              <label className={styles.label}>Notes</label>
              <textarea
                className={styles.textarea}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" disabled={createPayment.isPending || updatePayment.isPending} className={styles.submitBtn}>
            {createPayment.isPending || updatePayment.isPending ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}

export default function AddPaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddPaymentForm />
    </Suspense>
  );
}