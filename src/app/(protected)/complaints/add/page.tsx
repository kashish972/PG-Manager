'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createComplaint } from '@/actions/complaint.actions';
import { getPersons } from '@/actions/person.actions';
import styles from './page.module.css';

export default function AddComplaintPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      getPersons().then(data => {
        setPersons(data?.filter((p: any) => p.isActive) || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await createComplaint(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push('/complaints');
    }
  };

  if (loading || status === 'loading') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  const isMember = session?.user?.role === 'member';

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push('/complaints')}>
          ← Back
        </button>
        <h1 className={styles.title}>File a Complaint</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isMember && (
            <div className={styles.field}>
              <label className={styles.label}>Select Resident</label>
              <select name="personId" className={styles.select} required>
                <option value="">Choose a resident</option>
                {persons.map((person: any) => (
                  <option key={person._id} value={person._id}>
                    {person.name} - Room {person.roomNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select name="category" className={styles.select} required>
              <option value="">Select category</option>
              <option value="noise">Noise</option>
              <option value="maintenance">Maintenance</option>
              <option value="safety">Safety</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Subject</label>
            <input
              name="subject"
              type="text"
              className={styles.input}
              required
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select name="priority" className={styles.select} required>
              <option value="low">Low - Minor issue</option>
              <option value="medium">Medium - Needs attention</option>
              <option value="high">High - Urgent</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              name="description"
              className={styles.textarea}
              rows={4}
              required
              placeholder="Describe the complaint in detail..."
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
