'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createNotice } from '@/actions/notice.actions';
import styles from './page.module.css';

export default function AddNoticePage() {
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
    const result = await createNotice(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/notices');
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
        <button className={styles.backBtn} onClick={() => router.push('/notices')}>
          ← Back
        </button>
        <h1 className={styles.title}>Add New Notice</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              name="title"
              type="text"
              className={styles.input}
              required
              placeholder="Enter notice title"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select name="priority" className={styles.select} required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Content</label>
            <textarea
              name="content"
              className={styles.textarea}
              required
              rows={6}
              placeholder="Enter notice content"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating...' : 'Create Notice'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}