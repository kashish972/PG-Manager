'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getComplaint, updateComplaint } from '@/actions/complaint.actions';
import { getPersons } from '@/actions/person.actions';
import styles from './page.module.css';

const CATEGORY_LABELS: Record<string, string> = {
  noise: 'Noise',
  maintenance: 'Maintenance',
  safety: 'Safety',
  billing: 'Billing',
  other: 'Other',
};

export default function ComplaintDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [complaint, setComplaint] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      Promise.all([
        getComplaint(params.id as string),
        getPersons()
      ]).then(([complaintData, personData]) => {
        setComplaint(complaintData);
        setPersons(personData || []);
        if (complaintData?.resolution) {
          setResolution(complaintData.resolution);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session, params.id]);

  const getPersonName = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.name || 'Unknown';
  };

  const getPersonRoom = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.roomNumber || '';
  };

  const handleStatusChange = async (newStatus: string) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('status', newStatus);
    if (resolution) {
      formData.append('resolution', resolution);
    }
    
    await updateComplaint(params.id as string, formData);
    const updated = await getComplaint(params.id as string);
    setComplaint(updated);
    setSubmitting(false);
  };

  const handleResolutionSave = async () => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('status', complaint.status);
    formData.append('resolution', resolution);
    
    await updateComplaint(params.id as string, formData);
    const updated = await getComplaint(params.id as string);
    setComplaint(updated);
    setSubmitting(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      default: return styles.low;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return styles.open;
      case 'in_progress': return styles.inProgress;
      case 'resolved': return styles.resolved;
      default: return '';
    }
  };

  const isOwnerOrAdmin = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  if (!complaint) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => router.push('/complaints')}>
            ← Back
          </button>
          <div className={styles.notFound}>Complaint not found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push('/complaints')}>
          ← Back to Complaints
        </button>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={`${styles.priority} ${getPriorityColor(complaint.priority)}`}>
                {complaint.priority} priority
              </span>
              <span className={styles.category}>
                {CATEGORY_LABELS[complaint.category] || complaint.category}
              </span>
            </div>
            <span className={`${styles.status} ${getStatusColor(complaint.status)}`}>
              {complaint.status.replace('_', ' ')}
            </span>
          </div>

          <h1 className={styles.subject}>{complaint.subject}</h1>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Filed by</span>
              <span className={styles.metaValue}>
                {getPersonName(complaint.personId)}
                <span className={styles.room}>(Room {getPersonRoom(complaint.personId)})</span>
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Filed on</span>
              <span className={styles.metaValue}>
                {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          <div className={styles.description}>
            <h3>Description</h3>
            <p>{complaint.description}</p>
          </div>

          {isOwnerOrAdmin && (
            <>
              <div className={styles.section}>
                <h3>Update Status</h3>
                <div className={styles.statusButtons}>
                  <button
                    className={`${styles.statusBtn} ${complaint.status === 'open' ? styles.active : ''}`}
                    onClick={() => handleStatusChange('open')}
                    disabled={submitting}
                  >
                    Open
                  </button>
                  <button
                    className={`${styles.statusBtn} ${complaint.status === 'in_progress' ? styles.active : ''}`}
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={submitting}
                  >
                    In Progress
                  </button>
                  <button
                    className={`${styles.statusBtn} ${complaint.status === 'resolved' ? styles.active : ''}`}
                    onClick={() => handleStatusChange('resolved')}
                    disabled={submitting}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Resolution Notes</h3>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Add resolution notes..."
                />
                <button
                  className={styles.saveBtn}
                  onClick={handleResolutionSave}
                  disabled={submitting || resolution === complaint.resolution}
                >
                  {submitting ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </>
          )}

          {complaint.resolution && (
            <div className={styles.resolution}>
              <h3>Resolution</h3>
              <p>{complaint.resolution}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
