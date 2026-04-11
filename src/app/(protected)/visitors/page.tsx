'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getVisitors, checkoutVisitor, deleteVisitor, createVisitor } from '@/actions/visitor.actions';
import { getPersons } from '@/actions/person.actions';
import styles from './page.module.css';

export default function VisitorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member') {
      Promise.all([getVisitors(), getPersons()]).then(([visData, perData]) => {
        setVisitors(visData || []);
        setPersons(perData || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleCheckout = async (id: string) => {
    await checkoutVisitor(id);
    const updated = await getVisitors();
    setVisitors(updated || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visitor record?')) return;
    await deleteVisitor(id);
    const updated = await getVisitors();
    setVisitors(updated || []);
  };

  const handleAddVisitor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createVisitor(formData);
    const updated = await getVisitors();
    setVisitors(updated || []);
    setShowModal(false);
  };

  const getPersonName = (personId: string) => {
    const person = persons.find(p => p._id === personId);
    return person?.name || 'Unknown';
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeVisitors = visitors.filter(v => !v.outTime);
  const checkedOutVisitors = visitors.filter(v => v.outTime);

  const canManage = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading || !canManage) {
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
          <h1 className={styles.title}>Visitor Log</h1>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            + Log Visitor
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{activeVisitors.length}</span>
            <span className={styles.statLabel}>Currently Inside</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{visitors.length}</span>
            <span className={styles.statLabel}>Total Today</span>
          </div>
        </div>

        {activeVisitors.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Currently Inside</h2>
            <div className={styles.list}>
              {activeVisitors.map((visitor: any) => (
                <div key={visitor._id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <span className={styles.visitorName}>{visitor.visitorName}</span>
                    <span className={styles.personName}>Meeting: {getPersonName(visitor.personId)}</span>
                    <span className={styles.purpose}>{visitor.purpose}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.time}>In: {formatTime(visitor.inTime)}</span>
                    <button className={styles.checkoutBtn} onClick={() => handleCheckout(visitor._id)}>
                      Check Out
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {checkedOutVisitors.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Visitors History</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Meeting</th>
                    <th>Purpose</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedOutVisitors.slice(0, 20).map((visitor: any) => (
                    <tr key={visitor._id}>
                      <td>{visitor.visitorName}</td>
                      <td>{getPersonName(visitor.personId)}</td>
                      <td>{visitor.purpose}</td>
                      <td>{formatTime(visitor.inTime)}</td>
                      <td>{visitor.outTime ? formatTime(visitor.outTime) : '-'}</td>
                      <td>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(visitor._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h2>Log New Visitor</h2>
              <form onSubmit={handleAddVisitor}>
                <div className={styles.field}>
                  <label>Select Resident</label>
                  <select name="personId" required>
                    <option value="">Choose resident</option>
                    {persons.map((person: any) => (
                      <option key={person._id} value={person._id}>
                        {person.name} - Room {person.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Visitor Name</label>
                  <input name="visitorName" type="text" required placeholder="Visitor name" />
                </div>
                <div className={styles.field}>
                  <label>Phone (Optional)</label>
                  <input name="phone" type="text" placeholder="Phone number" />
                </div>
                <div className={styles.field}>
                  <label>Purpose</label>
                  <select name="purpose" required>
                    <option value="">Select purpose</option>
                    <option value="Family Visit">Family Visit</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Official">Official</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Vehicle Number (Optional)</label>
                  <input name="vehicleNumber" type="text" placeholder="Vehicle number" />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setShowModal(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>Log Visitor</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}