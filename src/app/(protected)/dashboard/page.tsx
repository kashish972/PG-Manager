'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useDashboardStats } from '@/hooks/use-data';
import { useDashboardPrefs } from '@/hooks/use-dashboard-prefs';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: stats, isLoading } = useDashboardStats();
  const { prefs, isLoaded, updatePref, resetToDefaults, toggleAll } = useDashboardPrefs();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (session?.user?.role === 'member') {
      router.push('/my-details');
    }
  }, [session, router]);

  if (isLoading || !isLoaded || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Dashboard</h1>
          {session?.user?.role !== 'member' && (
            <button 
              className={styles.settingsBtn}
              onClick={() => setShowSettings(true)}
              title="Customize Dashboard"
            >
              ⚙️
            </button>
          )}
        </div>
        
        <div className={styles.statsGrid}>
          {prefs.totalResidents && (
            <div className={styles.statCard}>
              <span className={styles.statIcon}>👥</span>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.totalPersons || 0}</span>
                <span className={styles.statLabel}>Total Residents</span>
              </div>
            </div>
          )}

          {prefs.activeResidents && (
            <div className={styles.statCard}>
              <span className={styles.statIcon}>✅</span>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.activePersons || 0}</span>
                <span className={styles.statLabel}>Active Residents</span>
              </div>
            </div>
          )}

          {prefs.monthlyRevenue && (
            <div className={styles.statCard}>
              <span className={styles.statIcon}>💰</span>
              <div className={styles.statContent}>
                <span className={styles.statValue}>₹{stats?.monthlyRevenue?.toLocaleString() || 0}</span>
                <span className={styles.statLabel}>This Month</span>
              </div>
            </div>
          )}

          {prefs.pendingPayments && (
            <div className={styles.statCard}>
              <span className={styles.statIcon}>⏳</span>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats?.pendingPayments || 0}</span>
                <span className={styles.statLabel}>Pending</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.detailsGrid}>
          {prefs.revenueCard && (
            <div className={styles.detailCard}>
              <h3>Monthly Revenue</h3>
              <p className={styles.amount}>₹{stats?.totalRent?.toLocaleString() || 0}/month</p>
            </div>
          )}

          {prefs.paymentStatus && (
            <div className={styles.detailCard}>
              <h3>Payment Status</h3>
              <div className={styles.paymentStats}>
                <div className={styles.paymentItem}>
                  <span className={styles.statusDot} data-status="paid"></span>
                  <span>Paid: {stats?.paidPayments || 0}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.statusDot} data-status="pending"></span>
                  <span>Pending: {stats?.pendingPayments || 0}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.statusDot} data-status="overdue"></span>
                  <span>Overdue: {stats?.overduePayments || 0}</span>
                </div>
              </div>
            </div>
          )}
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
    </MainLayout>
  );
}