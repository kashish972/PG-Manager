'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getNotices, deleteNotice } from '@/actions/notice.actions';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function NoticesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role) {
      getNotices().then(data => {
        setNotices(data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    await deleteNotice(id);
    const updated = await getNotices();
    setNotices(updated || []);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return styles.high;
      case 'medium': return styles.medium;
      default: return styles.low;
    }
  };

  const canManage = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonBadge}></div>
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonText}></div>
                  <div className={styles.skeletonTextShort}></div>
                </div>
                <div className={styles.skeletonFooter}>
                  <div className={styles.skeletonDate}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Notice Board</h1>
          {canManage && (
            <button className={styles.addBtn} onClick={() => router.push('/notices/add')}>
              + Add Notice
            </button>
          )}
        </div>

        {notices.length === 0 ? (
          <div className={styles.empty}>
            <p>No notices yet.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {notices.map((notice: any, index: number) => (
              <div 
                key={notice._id} 
                className={styles.card}
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className={styles.cardHeader}>
                  <span className={`${styles.priority} ${getPriorityColor(notice.priority)}`}>
                    {notice.priority}
                  </span>
                  {canManage && (
                    <div className={styles.actions}>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(notice._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <h3 className={styles.cardTitle}>{notice.title}</h3>
                <p className={styles.cardContent}>{notice.content}</p>
                <span className={styles.date}>
                  {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}