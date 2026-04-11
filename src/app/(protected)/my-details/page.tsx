'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPersonByEmail } from '@/actions/person.actions';
import { getPaymentsByPerson } from '@/actions/payment.actions';
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

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>My Details</h1>

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
      </div>
    </MainLayout>
  );
}