'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createInventoryItem } from '@/actions/inventory.actions';
import styles from './page.module.css';

export default function AddInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await createInventoryItem(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/inventory');
    }
  };

  if (status === 'loading' || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push('/inventory')}>
          ← Back
        </button>
        <h1 className={styles.title}>Add Inventory Item</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Item Name</label>
              <input name="name" type="text" className={styles.input} required placeholder="e.g., Bed No. 1" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select name="category" className={styles.select} required>
                <option value="">Select Category</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Quantity</label>
              <input name="quantity" type="number" className={styles.input} required min="1" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Condition</label>
              <select name="condition" className={styles.select} required>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="replaced">Replaced</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input name="location" type="text" className={styles.input} required placeholder="e.g., Room 101" />
            </div>

            <div className={styles.fieldFull}>
              <label className={styles.label}>Notes (Optional)</label>
              <textarea name="notes" className={styles.textarea} rows={3} placeholder="Additional details..." />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}