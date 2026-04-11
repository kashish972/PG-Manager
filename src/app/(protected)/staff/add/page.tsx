'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createStaff } from '@/actions/staff.actions';
import styles from './page.module.css';

export default function AddStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await createStaff(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push('/staff');
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
        <button className={styles.backBtn} onClick={() => router.push('/staff')}>
          ← Back
        </button>
        <h1 className={styles.title}>Add New Staff</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name *</label>
            <input
              name="name"
              type="text"
              className={styles.input}
              required
              placeholder="Enter staff name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Phone Number *</label>
            <input
              name="phone"
              type="tel"
              className={styles.input}
              required
              placeholder="Enter phone number"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Role *</label>
            <select name="role" className={styles.select} required>
              <option value="">Select role</option>
              <option value="caretaker">Caretaker</option>
              <option value="cook">Cook</option>
              <option value="security">Security</option>
              <option value="cleaner">Cleaner</option>
              <option value="manager">Manager</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Date of Joining *</label>
              <input
                name="joinDate"
                type="date"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Monthly Salary (₹) *</label>
              <input
                name="salary"
                type="number"
                className={styles.input}
                required
                min="0"
                placeholder="Enter monthly salary"
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Staff'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
