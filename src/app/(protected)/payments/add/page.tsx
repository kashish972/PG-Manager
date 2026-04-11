'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useCreatePayment, useActivePersons } from '@/hooks/use-data';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import styles from './page.module.css';

function AddPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPersonId = searchParams.get('personId');
  const { data: persons } = useActivePersons();
  const createPayment = useCreatePayment();
  
  const [formData, setFormData] = useState({
    personId: preselectedPersonId || '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7),
    status: 'pending' as const,
    paymentMethod: 'cash' as const,
    notes: '',
  });

  useEffect(() => {
    if (preselectedPersonId && persons) {
      const person = persons.find((p: any) => p._id === preselectedPersonId);
      if (person) {
        setFormData(prev => ({ ...prev, amount: String(person.monthlyRent) }));
      }
    }
  }, [preselectedPersonId, persons]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      fd.append(key, value);
    });
    
    await createPayment.mutateAsync(fd);
    router.push('/payments');
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Add Payment</h1>
        
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
                    {person.name} - Room {person.roomNumber}
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

          <button type="submit" disabled={createPayment.isPending} className={styles.submitBtn}>
            {createPayment.isPending ? 'Saving...' : 'Save'}
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