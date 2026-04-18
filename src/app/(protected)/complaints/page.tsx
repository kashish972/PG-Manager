'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getComplaints, deleteComplaint, getComplaintStats } from '@/actions/complaint.actions';
import { getPersons } from '@/actions/person.actions';
import { getBlocks } from '@/actions/block.actions';
import { SkeletonStats } from '@/components/ui/Skeleton';
import styles from './page.module.css';

const CATEGORY_LABELS: Record<string, string> = {
  noise: 'Noise',
  maintenance: 'Maintenance',
  safety: 'Safety',
  billing: 'Billing',
  other: 'Other',
};

export default function ComplaintsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [stats, setStats] = useState({ open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        getComplaints(),
        getPersons(),
        getBlocks(),
        getComplaintStats()
      ]).then(([complaintData, personData, blockData, statsData]) => {
        setComplaints(complaintData || []);
        setPersons(personData || []);
        setBlocks(blockData || []);
        setStats(statsData);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const getPersonName = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.name || 'Unknown';
  };

  const getPersonRoom = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    if (!person) return '';
    const block = blocks.find(b => String(b._id) === String(person.blockId));
    const blockName = block?.name || '';
    const roomNum = person.roomNumber || '';
    return blockName ? `${blockName} - Room ${roomNum}` : roomNum ? `Room ${roomNum}` : '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this complaint?')) return;
    await deleteComplaint(id);
    const updated = await getComplaints();
    const updatedStats = await getComplaintStats();
    setComplaints(updated || []);
    setStats(updatedStats);
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

  const filteredComplaints = filter === 'all' 
    ? complaints 
    : complaints.filter(c => c.status === filter);

  const isOwnerOrAdmin = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <SkeletonStats />
          <div className={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonItem}></div>
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
          <h1 className={styles.title}>Complaints</h1>
          <button className={styles.addBtn} onClick={() => router.push('/complaints/add')}>
            + New Complaint
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.open}</span>
            <span className={styles.statLabel}>Open</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.in_progress}</span>
            <span className={styles.statLabel}>In Progress</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.resolved}</span>
            <span className={styles.statLabel}>Resolved</span>
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'open' ? styles.active : ''}`}
            onClick={() => setFilter('open')}
          >
            Open
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'in_progress' ? styles.active : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'resolved' ? styles.active : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </button>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className={styles.empty}>
            <p>No complaints found.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredComplaints.map((complaint: any) => (
              <div 
                key={complaint._id} 
                className={styles.card}
                onClick={() => router.push(`/complaints/${complaint._id}`)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo}>
                    <span className={styles.personName}>
                      {getPersonName(complaint.personId)} 
                      <span className={styles.room}>(Room {getPersonRoom(complaint.personId)})</span>
                    </span>
                    <span className={styles.category}>
                      {CATEGORY_LABELS[complaint.category] || complaint.category}
                    </span>
                  </div>
                  <span className={`${styles.priority} ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                </div>
                <h3 className={styles.subject}>{complaint.subject}</h3>
                {complaint.description && (
                  <p className={styles.description}>
                    {complaint.description.length > 100 
                      ? complaint.description.substring(0, 100) + '...' 
                      : complaint.description}
                  </p>
                )}
                <div className={styles.cardFooter}>
                  <span className={`${styles.status} ${getStatusColor(complaint.status)}`}>
                    {complaint.status.replace('_', ' ')}
                  </span>
                  <span className={styles.date}>
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {isOwnerOrAdmin && (
                  <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(complaint._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
