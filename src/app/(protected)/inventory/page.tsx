'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getInventory, deleteInventoryItem } from '@/actions/inventory.actions';
import { SkeletonTable } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
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
      getInventory().then(data => {
        setItems(data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    await deleteInventoryItem(id);
    const updated = await getInventory();
    setItems(updated || []);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good': return styles.good;
      case 'fair': return styles.fair;
      case 'needs_repair': return styles.needsRepair;
      case 'replaced': return styles.replaced;
      default: return '';
    }
  };

  const categories = [...new Set(items.map(item => item.category))];
  const filteredItems = filter === 'all' ? items : items.filter(item => item.category === filter);

  const canManage = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  if (loading || !canManage) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <SkeletonTable rows={6} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Inventory</h1>
          {canManage && (
            <button className={styles.addBtn} onClick={() => router.push('/inventory/add')}>
              + Add Item
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat} ({items.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className={styles.empty}>
            <p>No inventory items found.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Location</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <span className={`${styles.condition} ${getConditionColor(item.condition)}`}>
                        {item.condition.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{item.location}</td>
                    {canManage && (
                      <td>
                        <button 
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}