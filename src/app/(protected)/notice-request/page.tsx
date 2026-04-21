'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPersons, requestMoveOutNotice, cancelMoveOutNotice } from '@/actions/person.actions';
import { getCurrentPG } from '@/actions/pg.actions';
import { AlertTriangle, Check, X, Calendar } from 'lucide-react';
import styles from './page.module.css';

export default function NoticeRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [myPerson, setMyPerson] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role === 'member') {
      getPersons().then(data => {
        const myData = data?.find((p: any) => p.email === session.user?.email || p.phone === (session.user as any)?.phone);
        setMyPerson(myData);
        setLoading(false);
      }).catch(() => setLoading(false));
      
      getCurrentPG().then(pg => {
        if (pg) setNoticePeriodDays(pg.noticePeriodDays || 30);
      }).catch(() => {});
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myPerson || !reason.trim()) return;
    
    setSubmitting(true);
    setMessage(null);

    const result = await requestMoveOutNotice(myPerson._id, reason);
    
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result?.moveOutDate) {
      setMessage({ type: 'success', text: 'Notice submitted successfully! Move-out date: ' + new Date(result.moveOutDate).toLocaleDateString() });
      setReason('');
    } else {
      setMessage({ type: 'success', text: 'Notice submitted successfully!' });
      setReason('');
    }
    
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!myPerson || !confirm('Are you sure you want to cancel your move-out notice?')) return;
    
    setSubmitting(true);
    const result = await cancelMoveOutNotice(myPerson._id);
    
    if (result?.success) {
      setMessage(null);
      window.location.reload();
    }
    
    setSubmitting(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!myPerson) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Request Move-Out</h1>
          </div>
          <div className={styles.notFound}>
            <p>You are not registered as a resident in this PG.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasNoticeRequested = myPerson?.noticeRequestedAt;
  const daysRemaining = hasNoticeRequested && myPerson?.moveOutDate 
    ? Math.ceil((new Date(myPerson.moveOutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Request Move-Out</h1>
        </div>

        {hasNoticeRequested && (
          <div className={styles.noticeCard}>
            <div className={styles.noticeHeader}>
              <AlertTriangle size={24} className={styles.warningIcon} />
              <h2>Notice Submitted</h2>
            </div>
            
            <div className={styles.noticeDetails}>
              <div className={styles.detailRow}>
                <span>Requested On:</span>
                <span>{new Date(myPerson.noticeRequestedAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Move-Out Date:</span>
                <span>{new Date(myPerson.moveOutDate).toLocaleDateString()}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Days Remaining:</span>
                <span className={styles.daysRemaining}>{Math.max(0, Math.floor(daysRemaining))} days</span>
              </div>
              {myPerson.noticeReason && (
                <div className={styles.detailRow}>
                  <span>Reason:</span>
                  <span>{myPerson.noticeReason}</span>
                </div>
              )}
            </div>

            {myPerson.noticeApprovedAt ? (
              <div className={styles.approvedBadge}>
                <Check size={16} /> Approved
              </div>
            ) : (
              <div className={styles.pendingBadge}>
                <Calendar size={16} /> Pending Owner Approval
              </div>
            )}

            <button 
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={submitting}
            >
              <X size={16} /> Cancel Notice
            </button>
          </div>
        )}

        {!hasNoticeRequested && (
          <div className={styles.formCard}>
            <p className={styles.description}>
              If you wish to move out, please submit a move-out notice. 
              You must give at least <strong>{noticePeriodDays} days</strong> notice before moving out.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="reason" className={styles.label}>Reason for Moving Out</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., shifting to another city, buying own house, etc."
                  className={styles.textarea}
                  rows={4}
                  required
                />
              </div>

              {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                  {message.text}
                </div>
              )}

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={submitting || !reason.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Move-Out Notice'}
              </button>
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}