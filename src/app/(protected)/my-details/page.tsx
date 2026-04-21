'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPersonByEmail } from '@/actions/person.actions';
import { getPaymentsByPerson } from '@/actions/payment.actions';
import { changePassword } from '@/actions/user.actions';
import { subscribeToPush } from '@/actions/push.actions';
import { requestPushPermission, getPushPermissionStatus, urlBase64ToUint8Array } from '@/lib/push-notification.service';
import { Modal } from '@/components/ui/Modal';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Lock, Eye, EyeOff, AlertCircle, Check, Bell, BellOff } from 'lucide-react';
import styles from './page.module.css';

function getMonthNumber(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  return year * 12 + month;
}

function getMonthName(monthNum: number): string {
  const year = Math.floor(monthNum / 12);
  const month = monthNum % 12;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonth(monthStr: string): string {
  if (!monthStr) return 'N/A';
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function generateMonthList(startMonth: number, endMonth: number, paidMonths: string[], hasAnyPayments: boolean): { month: string, status: string }[] {
  const months = [];
  const paidSet = new Set(paidMonths);
  
  for (let m = startMonth; m <= endMonth; m++) {
    const monthStr = getMonthName(m);
    let status = 'pending';
    
    if (paidSet.has(monthStr)) {
      status = 'paid';
    } else if (!hasAnyPayments && m === endMonth) {
      status = 'pending';
    } else if (m < endMonth) {
      status = 'overdue';
    }
    
    months.push({ month: monthStr, status });
  }
  
  return months;
}

export default function MyDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [person, setPerson] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSubscribing, setPushSubscribing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email && session?.user?.role === 'member') {
      getPersonByEmail(session.user.email).then(data => {
        setPerson(data);
        if (data?._id) {
          return getPaymentsByPerson(data._id.toString());
        }
        return [];
      }).then(paymentData => {
        setPayments(paymentData || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (session?.user?.role !== 'member') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.user?.email && session?.user?.role === 'member') {
      setPushEnabled(getPushPermissionStatus() === 'granted');
    }
  }, [session]);

  const handlePushSubscribe = async () => {
    const result = await requestPushPermission();
    if (!result.granted) {
      alert(result.error || 'Push permission denied');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_KEY || ''),
      });

      await subscribeToPush({
        subscription: sub,
        endpoint: sub.endpoint,
      });

      setPushEnabled(true);
      alert('Push notifications enabled!');
    } catch (error: any) {
      alert(error.message || 'Failed to subscribe');
    }
  };

  if (loading || status === 'loading') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  if (!person) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.noData}>
            <h2>No details found</h2>
            <p>Your details have not been added by the owner yet.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getFullYear() * 12 + (currentDate.getMonth() + 1);
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const moveInDate = person.moveInDate ? new Date(person.moveInDate) : new Date();
  const moveInMonth = moveInDate.getFullYear() * 12 + (moveInDate.getMonth() + 1);
  const moveInMonthStr = `${moveInDate.getFullYear()}-${String(moveInDate.getMonth() + 1).padStart(2, '0')}`;

  const paidMonths = payments.filter(p => p.status === 'paid').map(p => p.month);
  const hasAnyPayments = payments.length > 0;

  const allMonths = generateMonthList(moveInMonth, currentMonth, paidMonths, hasAnyPayments).reverse();
  
  const pendingCount = allMonths.filter(m => m.status === 'pending' || m.status === 'overdue').length;
  const nextPaymentMonth = allMonths.find(m => m.status === 'pending' || m.status === 'overdue');
  
  const totalPendingAmount = pendingCount * (person.monthlyRent || 0);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (result?.error) {
      setPasswordError(result.error);
    } else {
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    }
  };

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Details</h1>
          <div className={styles.headerActions}>
            <button 
              className={`${styles.pushBtn} ${pushEnabled ? styles.pushEnabled : ''}`}
              onClick={handlePushSubscribe}
              title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
            >
              {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              {pushEnabled ? 'Push On' : 'Enable Push'}
            </button>
            <button className={styles.changePasswordBtn} onClick={() => setShowPasswordModal(true)}>
              <Lock size={18} />
              Change Password
            </button>
            <NotificationBell />
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>Room Number</span>
            <span className={styles.overviewValue}>{person.roomNumber}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>Monthly Rent</span>
            <span className={styles.overviewValue}>₹{person.monthlyRent?.toLocaleString()}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>Pending Months</span>
            <span className={`${styles.overviewValue} ${pendingCount > 0 ? styles.pending : styles.paid}`}>
              {pendingCount} {pendingCount === 1 ? 'month' : 'months'}
            </span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>Pending Amount</span>
            <span className={`${styles.overviewValue} ${totalPendingAmount > 0 ? styles.pending : styles.paid}`}>
              ₹{totalPendingAmount.toLocaleString()}
            </span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>Next Payment</span>
            <span className={`${styles.overviewValue} ${nextPaymentMonth ? styles.overdue : styles.paid}`}>
              {nextPaymentMonth ? formatMonth(nextPaymentMonth.month) : 'All Clear'}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Name</span>
                <span className={styles.value}>{person.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{person.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Phone</span>
                <span className={styles.value}>{person.phone || 'Not provided'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Aadhar Card</span>
                <span className={styles.value}>{person.aadharCard || 'Not provided'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Address</span>
                <span className={styles.value}>{person.address || 'Not provided'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Move-in Date</span>
                <span className={styles.value}>
                  {person.moveInDate ? new Date(person.moveInDate).toLocaleDateString() : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Payment Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Security Deposit</span>
                <span className={styles.value}>₹{person.securityDeposit?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.paymentsSection}>
          <h2 className={styles.sectionTitle}>Payment History</h2>
          {allMonths.length > 0 ? (
            <div className={styles.paymentsList}>
              {allMonths.map((monthData) => (
                <div key={monthData.month} className={styles.paymentCard}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.paymentMonth}>{formatMonth(monthData.month)}</span>
                    <span className={styles.paymentDate}>
                      {monthData.status === 'paid' ? 'Paid' : monthData.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                  <div className={styles.paymentAmount}>
                    ₹{person.monthlyRent?.toLocaleString()}
                  </div>
                  <span className={`${styles.paymentStatus} ${styles[monthData.status]}`}>
                    {monthData.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noPayments}>No payment history available</p>
          )}
        </div>

        <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }} title="Change Password" size="sm">
          <form onSubmit={handleChangePassword} className={styles.passwordForm}>
            {passwordError && (
              <div className={styles.passwordError}>
                <AlertCircle size={16} />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className={styles.passwordSuccess}>
                <Check size={16} />
                {passwordSuccess}
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label>Current Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className={styles.togglePassword}>
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>New Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className={styles.togglePassword}>
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <button type="submit" disabled={isChangingPassword} className={styles.submitBtn}>
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}