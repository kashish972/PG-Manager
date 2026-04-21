'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStaffById, getStaffSalaryHistory, getStaffPendingMonths, updateStaff } from '@/actions/staff.actions';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { User, Wrench, ChefHat, Shield, Sparkles, ClipboardList, Edit } from 'lucide-react';
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

function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export default function StaffDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [staff, setStaff] = useState<any>(null);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [pendingMonths, setPendingMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState('');
  const [aadharImage, setAadharImage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      Promise.all([
        getStaffById(params.id as string),
        getStaffSalaryHistory(params.id as string),
        getStaffPendingMonths(params.id as string)
      ]).then(([staffData, historyData, pendingData]) => {
        setStaff(staffData);
        setPhoto(staffData?.photo || '');
        setAadharImage(staffData?.aadharCardImage || '');
        setSalaryHistory(historyData || []);
        setPendingMonths(pendingData || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session, params.id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    formData.append('photo', photo);
    formData.append('aadharCardImage', aadharImage);
    const result = await updateStaff(params.id as string, formData);
    setSaving(false);
    if (result?.success) {
      setEditing(false);
      const updated = await getStaffById(params.id as string);
      setStaff(updated);
    }
  };

  const canEdit = session?.user?.role !== 'member';
  const totalPaid = salaryHistory.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  if (!staff) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => router.push('/staff')}>
            ← Back
          </button>
          <div className={styles.notFound}>Staff member not found</div>
        </div>
      </MainLayout>
    );
  }

  const RoleIcon = ROLE_ICONS[staff.role] || User;

  if (editing) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => setEditing(false)}>
            ← Back
          </button>
          <h1 className={styles.title}>Edit Staff</h1>

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.field}>
              <ImageUpload
                value={photo}
                onChange={(url) => setPhoto(url)}
                label="Staff Photo"
              />
            </div>
            <div className={styles.field}>
              <ImageUpload
                value={aadharImage}
                onChange={(url) => setAadharImage(url)}
                label="Aadhar Card Image"
                aspectRatio="landscape"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input name="name" type="text" className={styles.input} defaultValue={staff.name} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone *</label>
              <input name="phone" type="tel" className={styles.input} defaultValue={staff.phone} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Role *</label>
              <select name="role" className={styles.select} defaultValue={staff.role} required>
                <option value="caretaker">Caretaker</option>
                <option value="cook">Cook</option>
                <option value="security">Security</option>
                <option value="cleaner">Cleaner</option>
                <option value="manager">Manager</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Date of Joining *</label>
              <input name="joinDate" type="date" className={styles.input} defaultValue={new Date(staff.joinDate).toISOString().split('T')[0]} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Monthly Salary (₹) *</label>
              <input name="salary" type="number" className={styles.input} defaultValue={staff.salary} required min="0" />
            </div>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input name="isActive" type="checkbox" defaultChecked={staff.isActive} value="true" />
                Active
              </label>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push('/staff')}>
          ← Back to Staff
        </button>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.avatar}>
              {staff.photo ? (
                <img src={staff.photo} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <RoleIcon size={32} />
              )}
            </div>
            {canEdit && (
              <button className={styles.editBtn} onClick={() => setEditing(true)} title="Edit">
                <Edit size={18} />
              </button>
            )}
            <div className={styles.headerInfo}>
              <h1>{staff.name}</h1>
              <span className={styles.role}>{ROLE_LABELS[staff.role] || staff.role}</span>
              <span className={`${styles.status} ${staff.isActive ? styles.active : styles.inactive}`}>
                {staff.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className={styles.details}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>{staff.phone}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Monthly Salary</span>
              <span className={styles.salary}>₹{staff.salary.toLocaleString()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Date of Joining</span>
              <span className={styles.detailValue}>{new Date(staff.joinDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Total Paid</span>
              <span className={styles.detailValue}>₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>

          {pendingMonths.length > 0 && (
            <div className={styles.pendingSection}>
              <h3>Pending Salary Months ({pendingMonths.length})</h3>
              <div className={styles.pendingList}>
                {pendingMonths.slice(0, 6).map(month => (
                  <span key={month} className={styles.pendingBadge}>{getMonthName(month)}</span>
                ))}
                {pendingMonths.length > 6 && (
                  <span className={styles.pendingMore}>+{pendingMonths.length - 6} more</span>
                )}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              className={styles.payBtn}
              onClick={() => router.push(`/staff/${staff._id}/salary`)}
            >
              Pay Salary
            </button>
          </div>
        </div>

        <div className={styles.historyCard}>
          <h2>Salary History</h2>
          {salaryHistory.length === 0 ? (
            <p className={styles.noHistory}>No salary payments recorded yet.</p>
          ) : (
            <div className={styles.historyList}>
              {salaryHistory.map((payment: any) => (
                <div key={payment._id} className={styles.historyItem}>
                  <div className={styles.historyLeft}>
                    <span className={styles.historyMonth}>{getMonthName(payment.month)}</span>
                    <span className={styles.historyDate}>
                      Paid on {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <span className={styles.historyAmount}>₹{payment.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}