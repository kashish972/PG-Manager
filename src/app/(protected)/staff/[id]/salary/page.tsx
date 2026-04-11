'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStaffById, getStaffPendingMonths, paySalary } from '@/actions/staff.actions';
import styles from './page.module.css';

function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function PaySalaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [staff, setStaff] = useState<any>(null);
  const [pendingMonths, setPendingMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member' && params.id) {
      Promise.all([
        getStaffById(params.id as string),
        getStaffPendingMonths(params.id as string)
      ]).then(([staffData, pendingData]) => {
        setStaff(staffData);
        setPendingMonths(pendingData || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session, params.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('staffId', params.id as string);
    
    const result = await paySalary(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push(`/staff/${params.id}`);
    }
  };

  const handleMonthSelect = (month: string) => {
    const form = document.getElementById('salaryForm') as HTMLFormElement;
    const monthInput = form.querySelector('[name="month"]') as HTMLInputElement;
    const amountInput = form.querySelector('[name="amount"]') as HTMLInputElement;
    if (monthInput) monthInput.value = month;
    if (amountInput && staff) amountInput.value = String(staff.salary);
  };

  if (loading || session?.user?.role === 'member') {
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

  const currentMonth = getCurrentMonth();
  const availableMonths = pendingMonths.includes(currentMonth) 
    ? pendingMonths 
    : [currentMonth, ...pendingMonths].sort().reverse();

  return (
    <MainLayout>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push(`/staff/${params.id}`)}>
          ← Back
        </button>
        <h1 className={styles.title}>Pay Salary</h1>
        <p className={styles.subtitle}>Paying salary for <strong>{staff.name}</strong></p>

        {pendingMonths.length > 0 && (
          <div className={styles.pendingSection}>
            <h3>Pending Months</h3>
            <div className={styles.pendingList}>
              {pendingMonths.map(month => (
                <button
                  key={month}
                  className={styles.pendingBadge}
                  onClick={() => handleMonthSelect(month)}
                  type="button"
                >
                  {getMonthName(month)}
                </button>
              ))}
            </div>
          </div>
        )}

        <form id="salaryForm" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Month *</label>
            <select name="month" className={styles.select} required>
              <option value="">Select month</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Amount (₹) *</label>
            <input
              name="amount"
              type="number"
              className={styles.input}
              required
              min="0"
              defaultValue={staff.salary}
              placeholder="Enter amount"
            />
            <span className={styles.hint}>Monthly salary: ₹{staff.salary.toLocaleString()}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Payment Date *</label>
            <input
              name="paymentDate"
              type="date"
              className={styles.input}
              required
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Notes (Optional)</label>
            <textarea
              name="notes"
              className={styles.textarea}
              rows={3}
              placeholder="Add any notes about this payment..."
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm Payment'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}
