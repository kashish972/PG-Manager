'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createMaintenanceRequest } from '@/actions/maintenance.actions';
import { getPersons } from '@/actions/person.actions';
import { getBlocks } from '@/actions/block.actions';
import styles from './page.module.css';

export default function AddMaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [persons, setPersons] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        getPersons(),
        getBlocks()
      ]).then(([personsData, blocksData]) => {
        setPersons(personsData?.filter((p: any) => p.isActive) || []);
        setBlocks(blocksData || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const getPersonDisplay = (person: any) => {
    if (!person) return '';
    const block = blocks.find(b => String(b._id) === String(person.blockId));
    const blockName = block?.name || '';
    const roomNum = person.roomNumber || '';
    return blockName ? `${person.name} (${blockName} - Room ${roomNum})` : roomNum ? `${person.name} (Room ${roomNum})` : person.name;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await createMaintenanceRequest(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push('/maintenance');
    }
  };

  if (loading || status === 'loading' || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push('/maintenance')}>
          ← Back
        </button>
        <h1 className={styles.title}>New Maintenance Request</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
<div className={styles.field}>
              <label className={styles.label}>Select Resident</label>
              <select name="personId" className={styles.select} required>
                <option value="">Choose a resident</option>
                {persons.map((person: any) => (
                  <option key={person._id} value={person._id}>
                    {getPersonDisplay(person)}
                  </option>
                ))}
              </select>
            </div>

          <div className={styles.field}>
            <label className={styles.label}>Issue Title</label>
            <input
              name="issue"
              type="text"
              className={styles.input}
              required
              placeholder="e.g., AC not working, Water leak"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select name="priority" className={styles.select} required>
              <option value="low">Low - Can wait</option>
              <option value="medium">Medium - Needs attention</option>
              <option value="high">High - Urgent</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description (Optional)</label>
            <textarea
              name="description"
              className={styles.textarea}
              rows={4}
              placeholder="Provide more details about the issue..."
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Request'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}