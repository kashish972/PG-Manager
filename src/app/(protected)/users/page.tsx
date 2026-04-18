'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUsers, createUser, deleteUser } from '@/actions/user.actions';
import { SkeletonTable } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'member' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role !== 'member') {
      getUsers().then(data => {
        setUsers(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = new FormData();
    form.append('name', formData.name);
    form.append('email', formData.email);
    form.append('password', formData.password);
    form.append('role', formData.role);

    const result = await createUser(form);
    
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', role: 'member' });
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await deleteUser(id);
    const updatedUsers = await getUsers();
    setUsers(updatedUsers);
  };

  if (loading || session?.user?.role === 'member') {
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

  const canAddUser = session?.user?.role === 'owner' || session?.user?.role === 'admin';
  const canDeleteUser = session?.user?.role === 'owner';

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
          {canAddUser && (
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>
              + Add User
            </button>
          )}
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                {canDeleteUser && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`${styles.role} ${styles[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  {canDeleteUser && (
                    <td>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(user._id)}
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
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Add New User</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}