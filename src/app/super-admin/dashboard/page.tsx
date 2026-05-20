'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllPGs, togglePGStatus } from '@/actions/super-admin.actions';
import { IPG } from '@/types';
import { Building, Plus, LogIn, ToggleRight, ToggleLeft, Loader2, Search } from 'lucide-react';
import styles from './page.module.css';

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pgs, setPgs] = useState<IPG[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.user.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    loadPGs();
  }, []);

  async function loadPGs() {
    setLoading(true);
    const result = await getAllPGs();
    if ('pgs' in result) {
      setPgs(result.pgs);
    }
    setLoading(false);
  }

  async function handleToggleStatus(pg: IPG) {
    setTogglingId(pg._id.toString());
    await togglePGStatus(pg._id.toString(), pg.status);
    await loadPGs();
    setTogglingId(null);
  }

  function handleEnterPG(slug: string) {
    window.location.href = `/api/enter-pg?slug=${slug}`;
  }

  const filteredPGs = pgs.filter(pg =>
    pg.name.toLowerCase().includes(search.toLowerCase()) ||
    pg.slug.toLowerCase().includes(search.toLowerCase()) ||
    pg.address.toLowerCase().includes(search.toLowerCase())
  );

  const activePGs = filteredPGs.filter(pg => !pg.status || pg.status === 'active');
  const suspendedPGs = filteredPGs.filter(pg => pg.status === 'suspended');

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Super Admin Dashboard</h1>
            <p className={styles.subtitle}>Manage all PG tenants</p>
          </div>
          <button
            className={styles.createBtn}
            onClick={() => router.push('/register')}
          >
            <Plus size={20} />
            <span>Create PG</span>
          </button>
        </div>

        <div className={styles.searchBar}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search PGs by name, slug or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Loading PGs...</p>
          </div>
        ) : (
          <>
            {activePGs.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Active PGs <span className={styles.count}>({activePGs.length})</span>
                </h2>
                <div className={styles.grid}>
                  {activePGs.map((pg) => (
                    <div key={pg._id.toString()} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                          <Building size={24} />
                        </div>
                        <div className={styles.cardInfo}>
                          <h3 className={styles.cardName}>{pg.name}</h3>
                          <span className={styles.cardSlug}>{pg.slug}</span>
                        </div>
                        <span className={styles.badgeActive}>{(pg.status || 'active').charAt(0).toUpperCase() + (pg.status || 'active').slice(1)}</span>
                      </div>
                      <p className={styles.cardAddress}>{pg.address}</p>
                      <div className={styles.cardStats}>
                        <div className={styles.stat}>
                          <span className={styles.statValue}>₹{pg.monthlyRent}</span>
                          <span className={styles.statLabel}>Rent</span>
                        </div>
                        <div className={styles.stat}>
                          <span className={styles.statValue}>{pg.totalRooms}</span>
                          <span className={styles.statLabel}>Rooms</span>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.enterBtn}
                          onClick={() => handleEnterPG(pg.slug)}
                        >
                          <LogIn size={16} />
                          <span>Enter PG</span>
                        </button>
                        <button
                          className={styles.suspendBtn}
                          onClick={() => handleToggleStatus(pg)}
                          disabled={togglingId === pg._id.toString()}
                        >
                          {togglingId === pg._id.toString() ? (
                            <Loader2 size={16} className={styles.spinner} />
                          ) : (
                            <ToggleRight size={16} />
                          )}
                          <span>Suspend</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suspendedPGs.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Suspended PGs <span className={styles.count}>({suspendedPGs.length})</span>
                </h2>
                <div className={styles.grid}>
                  {suspendedPGs.map((pg) => (
                    <div key={pg._id.toString()} className={`${styles.card} ${styles.suspendedCard}`}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                          <Building size={24} />
                        </div>
                        <div className={styles.cardInfo}>
                          <h3 className={styles.cardName}>{pg.name}</h3>
                          <span className={styles.cardSlug}>{pg.slug}</span>
                        </div>
                        <span className={styles.badgeSuspended}>Suspended</span>
                      </div>
                      <p className={styles.cardAddress}>{pg.address}</p>
                      <div className={styles.cardStats}>
                        <div className={styles.stat}>
                          <span className={styles.statValue}>₹{pg.monthlyRent}</span>
                          <span className={styles.statLabel}>Rent</span>
                        </div>
                        <div className={styles.stat}>
                          <span className={styles.statValue}>{pg.totalRooms}</span>
                          <span className={styles.statLabel}>Rooms</span>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.enterBtn}
                          onClick={() => handleEnterPG(pg.slug)}
                        >
                          <LogIn size={16} />
                          <span>Enter PG</span>
                        </button>
                        <button
                          className={styles.resumeBtn}
                          onClick={() => handleToggleStatus(pg)}
                          disabled={togglingId === pg._id.toString()}
                        >
                          {togglingId === pg._id.toString() ? (
                            <Loader2 size={16} className={styles.spinner} />
                          ) : (
                            <ToggleLeft size={16} />
                          )}
                          <span>Resume</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredPGs.length === 0 && (
              <div className={styles.empty}>
                <Building size={48} />
                <h3>No PGs Found</h3>
                <p>{search ? 'No PGs match your search.' : 'No PGs registered yet.'}</p>
                {!search && (
                  <button
                    className={styles.createBtn}
                    onClick={() => router.push('/register')}
                  >
                    <Plus size={20} />
                    <span>Create First PG</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
