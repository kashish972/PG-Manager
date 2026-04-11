'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAnalyticsData } from '@/actions/analytics.actions';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Home, IndianRupee, TrendingUp, Users, FileText, Wrench, Check, X, DollarSign, TrendingUp as TrendingUpIcon, Diamond, Snowflake, Flame } from 'lucide-react';
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
        <div className={styles.loading}>
          <div className={styles.skeleton}></div>
        </div>
      </MainLayout>
    );
  }

  const maintenanceData = [
    { name: 'Pending', value: data.maintenance.pending, color: '#ffc947' },
    { name: 'In Progress', value: data.maintenance.inProgress, color: '#6366f1' },
    { name: 'Resolved', value: data.maintenance.resolved, color: '#00d9a5' }
  ];

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Analytics & Insights</h1>
            <p className={styles.subtitle}>Your PG performance at a glance</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.occupancyCard}`}>
            <div className={styles.statIcon}><BarChart3 size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{data.occupancy.rate}%</span>
              <span className={styles.statLabel}>Occupancy Rate</span>
            </div>
            <div className={styles.statMiniChart}>
              <div className={styles.miniProgress} style={{ '--progress': `${data.occupancy.rate}%`, '--color': '#e94560' } as React.CSSProperties}></div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.availableCard}`}>
            <div className={styles.statIcon}><Home size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{data.occupancy.available}</span>
              <span className={styles.statLabel}>Available Rooms</span>
            </div>
            <div className={styles.statBadge}>Vacant</div>
          </div>

          <div className={`${styles.statCard} ${styles.revenueCard}`}>
            <div className={styles.statIcon}><IndianRupee size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₹{(data.revenue.monthly / 1000).toFixed(1)}K</span>
              <span className={styles.statLabel}>Monthly Revenue</span>
            </div>
            <div className={styles.statTrend}>
              <span>↑</span> +12%
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.annualCard}`}>
            <div className={styles.statIcon}><TrendingUp size={24} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₹{(data.revenue.projectedAnnual / 100000).toFixed(1)}L</span>
              <span className={styles.statLabel}>Projected Annual</span>
            </div>
          </div>
        </div>

        <div className={styles.chartsSection}>
          <div className={styles.mainChartCard}>
            <div className={styles.chartHeader}>
              <h3><TrendingUpIcon size={20} style={{marginRight: '8px', verticalAlign: 'middle'}} />Revenue Trend</h3>
              <span className={styles.chartPeriod}>Last 6 Months</span>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenue.monthlyTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e94560" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#e94560" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" vertical={false} />
                  <XAxis dataKey="month" stroke="#6a6a7a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6a6a7a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ background: '#1f1f3a', border: '1px solid #3a3a5e', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#e94560" strokeWidth={3} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={styles.occupancyBar}>
          <div className={styles.barHeader}>
            <span>Occupancy Progress</span>
            <span>{data.occupancy.rate}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${data.occupancy.rate}%` }}></div>
          </div>
          <div className={styles.barMeta}>
            <span>{data.occupancy.occupied} occupied</span>
            <span>{data.occupancy.available} available</span>
          </div>
        </div>

        {data.blocks && data.blocks.length > 0 && (
          <div className={styles.chartsSection}>
            <div className={styles.mainChartCard} style={{ width: '100%' }}>
              <div className={styles.chartHeader}>
                <h3><Home size={18} /> Block-wise Room Availability</h3>
              </div>
              <div className={styles.blockChartsGrid}>
                {data.blocks.map((block: any, index: number) => {
                  const pieData = [
                    { name: 'Occupied', value: block.occupied, color: '#e94560' },
                    { name: 'Available', value: block.available, color: '#00d9a5' }
                  ];
                  return (
                    <div key={index} className={styles.blockPieCard}>
                      <h4 className={styles.blockPieTitle}>{block.name}</h4>
                      <div className={styles.blockPieStats}>
                        <span style={{ color: '#e94560' }}>{block.occupied} occupied</span>
                        <span style={{ color: '#00d9a5' }}>{block.available} available</span>
                      </div>
                      <div className={styles.blockPieChart}>
                        <ResponsiveContainer width="100%" height={120}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ background: '#1f1f3a', border: '1px solid #3a3a5e', borderRadius: '10px' }}
                              formatter={(value) => [Number(value), 'Rooms']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={styles.blockPiePercentage}>
                        {block.occupancyRate}%
                      </div>
                      {(block.ac.total > 0 || block.nonAc.total > 0) && (
                        <div className={styles.acNonAcStats}>
                          {block.ac.total > 0 && (
                            <div className={styles.acStat}>
                              <Snowflake size={12} />
                              <span>AC: {block.ac.occupied}/{block.ac.total}</span>
                              <span className={styles.acAvailable}>({block.ac.available})</span>
                            </div>
                          )}
                          {block.nonAc.total > 0 && (
                            <div className={styles.nonAcStat}>
                              <Flame size={12} />
                              <span>Non-AC: {block.nonAc.occupied}/{block.nonAc.total}</span>
                              <span className={styles.nonAcAvailable}>({block.nonAc.available})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className={styles.bottomGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Users size={18} /> Resident Analytics</h3>
            </div>
            <div className={styles.analyticsList}>
              <div className={styles.analyticsItem}>
                <div className={styles.analyticsInfo}>
                  <span className={styles.analyticsIcon}><Check size={16} /></span>
                  <span>Active Residents</span>
                </div>
                <span className={styles.analyticsValue} style={{ color: '#00d9a5' }}>{data.persons.active}</span>
              </div>
              <div className={styles.analyticsItem}>
                <div className={styles.analyticsInfo}>
                  <span className={styles.analyticsIcon}><X size={16} /></span>
                  <span>Inactive / Moved Out</span>
                </div>
                <span className={styles.analyticsValue} style={{ color: '#e94560' }}>{data.persons.inactive}</span>
              </div>
              <div className={styles.analyticsItem}>
                <div className={styles.analyticsInfo}>
                  <span className={styles.analyticsIcon}><FileText size={16} /></span>
                  <span>Total Registered</span>
                </div>
                <span className={styles.analyticsValue}>{data.persons.total}</span>
              </div>
              <div className={styles.analyticsItem}>
                <div className={styles.analyticsInfo}>
                  <span className={styles.analyticsIcon}><DollarSign size={16} /></span>
                  <span>Avg Rent / Room</span>
                </div>
                <span className={styles.analyticsValue}>₹{data.revenue.averageRent.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Wrench size={18} /> Maintenance Overview</h3>
            </div>
            <div className={styles.maintenanceChart}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={maintenanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" horizontal={false} />
                  <XAxis type="number" stroke="#6a6a7a" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#6a6a7a" fontSize={11} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ background: '#1f1f3a', border: '1px solid #3a3a5e', borderRadius: '10px' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {maintenanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.maintenanceStats}>
              <div className={styles.maintenanceStat}>
                <span className={styles.dot} style={{ background: '#ffc947' }}></span>
                <span>Pending: {data.maintenance.pending}</span>
              </div>
              <div className={styles.maintenanceStat}>
                <span className={styles.dot} style={{ background: '#6366f1' }}></span>
                <span>In Progress: {data.maintenance.inProgress}</span>
              </div>
              <div className={styles.maintenanceStat}>
                <span className={styles.dot} style={{ background: '#00d9a5' }}></span>
                <span>Resolved: {data.maintenance.resolved}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><Diamond size={20} style={{marginRight: '8px', verticalAlign: 'middle'}} />Revenue Breakdown</h3>
            </div>
            <div className={styles.revenueBreakdown}>
              <div className={styles.revenueItem}>
                <div className={styles.revenueHeader}>
                  <span>Monthly Expected</span>
                  <span className={styles.revenueAmount}>₹{data.revenue.monthly.toLocaleString()}</span>
                </div>
                <div className={styles.revenueBar}>
                  <div className={styles.revenueFill} style={{ width: '100%', background: '#2a2a4e' }}></div>
                </div>
              </div>
              <div className={styles.revenueItem}>
                <div className={styles.revenueHeader}>
                  <span>Collected</span>
                  <span className={styles.revenueAmount} style={{ color: '#00d9a5' }}>₹{data.revenue.totalCollected.toLocaleString()}</span>
                </div>
                <div className={styles.revenueBar}>
                  <div className={styles.revenueFill} style={{ width: `${(data.revenue.totalCollected / data.revenue.monthly) * 100}%`, background: '#00d9a5' }}></div>
                </div>
              </div>
              <div className={styles.revenueItem}>
                <div className={styles.revenueHeader}>
                  <span>Projected Annual</span>
                  <span className={styles.revenueAmount} style={{ color: '#ffc947' }}>₹{(data.revenue.projectedAnnual / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}