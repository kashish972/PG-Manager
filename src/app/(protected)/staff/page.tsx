'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStaff, getStaffStats, deleteStaff } from '@/actions/staff.actions';
import { User, Wrench, ChefHat, Shield, Sparkles, ClipboardList, Trash2 } from 'lucide-react';
import { SkeletonStats } from '@/components/ui/Skeleton';
import styles from './page.module.css';

const ROLE_ICONS: Record<string, any> = {
  caretaker: User,
  cook: ChefHat,
  security: Shield,
  cleaner: Sparkles,
  manager: ClipboardList,
  maintenance: Wrench,
  other: User,
};

const ROLE_LABELS: Record<string, string> = {
  caretaker: 'Caretaker',
  cook: 'Cook',
  security: 'Security',
  cleaner: 'Cleaner',
  manager: 'Manager',
  maintenance: 'Maintenance',
  other: 'Other',
};

export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, monthlySalary: 0, pendingSalary: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member') {
      Promise.all([
        getStaff(),
        getStaffStats()
      ]).then(([staffData, statsData]) => {
        setStaff(staffData || []);
        setStats(statsData);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    await deleteStaff(id);
    const updated = await getStaff();
    const updatedStats = await getStaffStats();
    setStaff(updated || []);
    setStats(updatedStats);
  };

  const filteredStaff = filter === 'all' 
    ? staff 
    : filter === 'active' 
      ? staff.filter(s => s.isActive)
      : staff.filter(s => !s.isActive);

  if (loading || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <SkeletonStats />
          <div className={styles.filters}>
            <div className={styles.skeletonFilter}></div>
            <div className={styles.skeletonFilter}></div>
            <div className={styles.skeletonFilter}></div>
          </div>
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}></div>
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
          <h1 className={styles.title}>Staff Management</h1>
          <button className={styles.addBtn} onClick={() => router.push('/staff/add')}>
            + Add Staff
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.active}</span>
            <span className={styles.statLabel}>Active Staff</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>₹{stats.monthlySalary.toLocaleString()}</span>
            <span className={styles.statLabel}>Monthly Salary</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.pending}`}>₹{stats.pendingSalary.toLocaleString()}</span>
            <span className={styles.statLabel}>Pending Salary</span>
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({stats.active})
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'inactive' ? styles.active : ''}`}
            onClick={() => setFilter('inactive')}
          >
            Inactive ({stats.total - stats.active})
          </button>
        </div>

        {filteredStaff.length === 0 ? (
          <div className={styles.empty}>
            <p>No staff members found.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredStaff.map((member: any) => {
              const RoleIcon = ROLE_ICONS[member.role] || User;
              return (
              <div 
                key={member._id} 
                className={`${styles.card} ${!member.isActive ? styles.inactive : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
                    ) : (
                      <RoleIcon size={32} />
                    )}
                  </div>
                  <div className={styles.info}>
                    <h3>{member.name}</h3>
                    <span className={styles.role}>{ROLE_LABELS[member.role] || member.role}</span>
                  </div>
                  <div className={styles.headerActions}>
                    <span className={`${styles.status} ${member.isActive ? styles.active : styles.inactive}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(member._id)}
                      title="Delete Staff"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className={styles.details}>
                  <div className={styles.detailRow}>
                    <span>Phone</span>
                    <span>{member.phone}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Salary</span>
                    <span className={styles.salary}>₹{member.salary.toLocaleString()}/mo</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Joined</span>
                    <span>{new Date(member.joinDate).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button 
                    className={styles.viewBtn}
                    onClick={() => router.push(`/staff/${member._id}`)}
                  >
                    View Details
                  </button>
                  <button 
                    className={styles.payBtn}
                    onClick={() => router.push(`/staff/${member._id}/salary`)}
                  >
                    Pay Salary
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
