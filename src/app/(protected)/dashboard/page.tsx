'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useDashboardStats } from '@/hooks/use-data';
import { useDashboardPrefs } from '@/hooks/use-dashboard-prefs';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { DashboardDetailModal } from '@/components/dashboard/DashboardDetailModal';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, IndianRupee, Wrench, Briefcase, Users, Check, Clock, Home, TrendingUp, DollarSign, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import styles from './page.module.css';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: stats, isLoading } = useDashboardStats();
  const { prefs, isLoaded, updatePref, resetToDefaults, toggleAll } = useDashboardPrefs();
  const [showSettings, setShowSettings] = useState(false);
  const [detailModal, setDetailModal] = useState<'total-residents' | 'active-residents' | 'pending-payments' | 'monthly-revenue' | 'occupied-rooms' | 'occupancy-rate' | 'pending-amount' | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'member') {
      router.push('/my-details');
    }
  }, [session, router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading || !isLoaded || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>
          <div className={styles.skeleton}></div>
        </div>
      </MainLayout>
    );
  }

  const quickActions = [
    { icon: User, label: 'Add Resident', href: '/persons/add', color: '#e94560' },
    { icon: IndianRupee, label: 'Record Payment', href: '/payments/add', color: '#00d9a5' },
    { icon: Wrench, label: 'Maintenance', href: '/maintenance/add', color: '#ffc947' },
    { icon: Briefcase, label: 'Add Staff', href: '/staff/add', color: '#6366f1' },
  ];

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.heroSection}>
          <div className={styles.greeting}>
            <h1><Sparkles size={28} style={{marginRight: '12px', verticalAlign: 'middle'}} />{getGreeting()}!</h1>
            <p className={styles.date}>{formatDate()}</p>
          </div>
          {session?.user?.role !== 'member' && (
            <button 
              className={styles.settingsBtn}
              onClick={() => setShowSettings(true)}
              title="Customize Dashboard"
            >
              <span className={styles.settingsIcon}><SettingsIcon size={18} /></span>
              <span>Customize</span>
            </button>
          )}
        </div>
        
        <div className={styles.statsGrid}>
          {prefs.totalResidents && (
            <div className={`${styles.statCard} ${styles.residentsCard}`} onClick={() => setDetailModal('total-residents')}>
              <div className={styles.statIcon}><Users size={24} /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.totalPersons || 0}</span>
                <span className={styles.statLabel}>Total Residents</span>
              </div>
              <div className={styles.statGlow}></div>
              <span className={styles.clickHint}>Click to view details</span>
            </div>
          )}

          {prefs.activeResidents && (
            <div className={`${styles.statCard} ${styles.activeCard}`} onClick={() => setDetailModal('active-residents')}>
              <div className={styles.statIcon}><Check size={24} /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.activePersons || 0}</span>
                <span className={styles.statLabel}>Active Residents</span>
              </div>
              <div className={styles.statGlow}></div>
              <span className={styles.clickHint}>Click to view details</span>
            </div>
          )}

          {prefs.monthlyRevenue && (
            <div className={`${styles.statCard} ${styles.revenueCard}`} onClick={() => setDetailModal('monthly-revenue')}>
              <div className={styles.statIcon}><IndianRupee size={24} /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</span>
                <span className={styles.statLabel}>This Month</span>
              </div>
              <div className={styles.statGlow}></div>
              <span className={styles.clickHint}>Click to view details</span>
            </div>
          )}

          {prefs.pendingPayments && (
            <div className={`${styles.statCard} ${styles.pendingCard}`} onClick={() => setDetailModal('pending-payments')}>
              <div className={styles.statIcon}><Clock size={24} /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.pendingPayments || 0}</span>
                <span className={styles.statLabel}>Pending Payments</span>
              </div>
              <div className={styles.statGlow}></div>
              <span className={styles.clickHint}>Click to view details</span>
            </div>
          )}
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <button 
                key={index}
                className={styles.actionCard}
                onClick={() => router.push(action.href)}
                style={{ '--accent-color': action.color } as React.CSSProperties}
              >
                <span className={styles.actionIcon}><action.icon size={22} /></span>
                <span className={styles.actionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.bottomGrid}>
          {prefs.revenueCard && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3><IndianRupee size={18} /> Monthly Revenue</h3>
              </div>
              <div className={styles.revenueDisplay}>
                <span className={styles.revenueAmount}>₹{stats?.totalRent?.toLocaleString() || 0}</span>
                <span className={styles.revenueSub}>per month</span>
              </div>
              <div className={styles.revenueBar}>
                <div 
                  className={styles.revenueProgress} 
                  style={{ width: `${Math.min(((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1)) * 100, 100)}%` }}
                ></div>
              </div>
              <span className={styles.revenueLabel}>
                {((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1) * 100).toFixed(0)}% Collected
              </span>
            </div>
          )}

          {prefs.paymentStatus && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3><Users size={18} /> Payment Overview</h3>
              </div>
              <div className={styles.paymentBreakdown}>
                <div className={styles.paymentRow}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.statusDot} data-status="paid"></span>
                    <span>Paid</span>
                  </div>
                  <span className={styles.paymentCount}>{stats?.paidPayments || 0}</span>
                  <div className={styles.paymentBar}>
                    <div className={styles.paidBar} style={{ width: `${((stats?.paidPayments || 0) / Math.max(stats?.activePersons || 1, 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className={styles.paymentRow}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.statusDot} data-status="pending"></span>
                    <span>Pending</span>
                  </div>
                  <span className={styles.paymentCount}>{stats?.pendingPayments || 0}</span>
                  <div className={styles.paymentBar}>
                    <div className={styles.pendingBar} style={{ width: `${((stats?.pendingPayments || 0) / Math.max(stats?.activePersons || 1, 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className={styles.paymentRow}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.statusDot} data-status="overdue"></span>
                    <span>Overdue</span>
                  </div>
                  <span className={styles.paymentCount}>{stats?.overduePayments || 0}</span>
                  <div className={styles.paymentBar}>
                    <div className={styles.overdueBar} style={{ width: `${((stats?.overduePayments || 0) / Math.max(stats?.activePersons || 1, 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setDetailModal('occupied-rooms')}>
            <div className={styles.summaryIcon}><Home size={20} /></div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{stats?.activePersons || 0}</span>
              <span className={styles.summaryLabel}>Rooms Occupied</span>
            </div>
            <span className={styles.clickHintSmall}>Click to view</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setDetailModal('occupancy-rate')}>
            <div className={styles.summaryIcon}><TrendingUp size={20} /></div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{stats?.totalPersons ? Math.round((stats.activePersons / stats.totalPersons) * 100) : 0}%</span>
              <span className={styles.summaryLabel}>Occupancy Rate</span>
            </div>
            <span className={styles.clickHintSmall}>Click to view</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.clickable}`} onClick={() => setDetailModal('pending-amount')}>
            <div className={styles.summaryIcon}><DollarSign size={20} /></div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>₹{((stats?.totalRent || 0) - (stats?.monthlyRevenue || 0)).toLocaleString()}</span>
              <span className={styles.summaryLabel}>Pending Amount</span>
            </div>
            <span className={styles.clickHintSmall}>Click to view</span>
          </div>
        </div>
      </div>

      {showSettings && (
        <WidgetSettings
          prefs={prefs}
          onUpdatePref={updatePref}
          onReset={resetToDefaults}
          onToggleAll={toggleAll}
          onClose={() => setShowSettings(false)}
        />
      )}

      <DashboardDetailModal
        isOpen={detailModal !== null}
        onClose={() => setDetailModal(null)}
        type={detailModal || 'total-residents'}
      />
    </MainLayout>
  );
}