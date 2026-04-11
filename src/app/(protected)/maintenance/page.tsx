'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMaintenanceRequests, updateMaintenanceStatus, deleteMaintenanceRequest, getMaintenanceStats } from '@/actions/maintenance.actions';
import { getPersons } from '@/actions/person.actions';
import styles from './page.module.css';

export default function MaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0 });
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
        getMaintenanceRequests(),
        getPersons(),
        getMaintenanceStats()
      ]).then(([reqData, personData, statsData]) => {
        setRequests(reqData || []);
        setPersons(personData || []);
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
    return person?.roomNumber || '';
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateMaintenanceStatus(id, newStatus as any);
    const updated = await getMaintenanceRequests();
    const updatedStats = await getMaintenanceStats();
    setRequests(updated || []);
    setStats(updatedStats);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    await deleteMaintenanceRequest(id);
    const updated = await getMaintenanceRequests();
    setRequests(updated || []);
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
      case 'pending': return styles.pending;
      case 'in_progress': return styles.inProgress;
      case 'resolved': return styles.resolved;
      default: return '';
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  const isOwnerOrAdmin = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Maintenance Requests</h1>
          {isOwnerOrAdmin && (
            <button className={styles.addBtn} onClick={() => router.push('/maintenance/add')}>
              + New Request
            </button>
          )}
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Pending</span>
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
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
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

        {filteredRequests.length === 0 ? (
          <div className={styles.empty}>
            <p>No maintenance requests found.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredRequests.map((request: any) => (
              <div key={request._id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo}>
                    <span className={styles.personName}>
                      {getPersonName(request.personId)} 
                      <span className={styles.room}>(Room {getPersonRoom(request.personId)})</span>
                    </span>
                  </div>
                  <span className={`${styles.priority} ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                </div>
                <h3 className={styles.issue}>{request.issue}</h3>
                {request.description && (
                  <p className={styles.description}>{request.description}</p>
                )}
                <div className={styles.cardFooter}>
                  <span className={`${styles.status} ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                  <span className={styles.date}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {isOwnerOrAdmin && (
                  <div className={styles.cardActions}>
                    <select 
                      value={request.status}
                      onChange={(e) => handleStatusChange(request._id, e.target.value)}
                      className={styles.statusSelect}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(request._id)}
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