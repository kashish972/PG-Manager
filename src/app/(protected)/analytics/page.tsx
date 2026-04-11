'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAnalyticsData } from '@/actions/analytics.actions';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './page.module.css';

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member') {
      getAnalyticsData().then(result => {
        setData(result);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  if (loading || !data || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Analytics & Insights</h1>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{data.occupancy.rate}%</span>
            <span className={styles.statLabel}>Occupancy Rate</span>
            <span className={styles.statSub}>{data.occupancy.occupied}/{data.occupancy.total} rooms</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.available}`}>{data.occupancy.available}</span>
            <span className={styles.statLabel}>Available Rooms</span>
            <span className={styles.statSub}>Vacant now</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>₹{data.revenue.monthly.toLocaleString()}</span>
            <span className={styles.statLabel}>Monthly Revenue</span>
            <span className={styles.statSub}>Avg: ₹{data.revenue.averageRent.toLocaleString()}/room</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>₹{(data.revenue.projectedAnnual / 100000).toFixed(1)}L</span>
            <span className={styles.statLabel}>Projected Annual</span>
            <span className={styles.statSub}>₹{data.revenue.totalCollected.toLocaleString()} collected</span>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3>Revenue Trend (Last 6 Months)</h3>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.revenue.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" />
                  <XAxis dataKey="month" stroke="#a0a0b0" fontSize={12} />
                  <YAxis stroke="#a0a0b0" fontSize={12} tickFormatter={(v) => `₹${(v/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ background: '#1f1f3a', border: '1px solid #2a2a4e', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#e94560" fill="#e94560" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Room Occupancy</h3>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Occupied', value: data.occupancy.occupied, fill: '#e94560' },
                  { name: 'Available', value: data.occupancy.available, fill: '#00d9a5' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" />
                  <XAxis dataKey="name" stroke="#a0a0b0" fontSize={12} />
                  <YAxis stroke="#a0a0b0" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#1f1f3a', border: '1px solid #2a2a4e', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={styles.breakdown}>
          <div className={styles.breakdownCard}>
            <h3>Resident Breakdown</h3>
            <div className={styles.breakdownList}>
              <div className={styles.breakdownItem}>
                <span>Active Residents</span>
                <span className={styles.active}>{data.persons.active}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span>Inactive/Moved Out</span>
                <span className={styles.inactive}>{data.persons.inactive}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span>Total Registered</span>
                <span>{data.persons.total}</span>
              </div>
            </div>
          </div>

          <div className={styles.breakdownCard}>
            <h3>Maintenance Status</h3>
            <div className={styles.breakdownList}>
              <div className={styles.breakdownItem}>
                <span>Pending</span>
                <span className={styles.pending}>{data.maintenance.pending}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span>In Progress</span>
                <span className={styles.inProgress}>{data.maintenance.inProgress}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span>Resolved</span>
                <span className={styles.resolved}>{data.maintenance.resolved}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}