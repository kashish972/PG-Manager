'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/actions/in-app-notification.actions';
import { useToast } from '@/components/ui/Toast';
import { Bell, Clock, AlertCircle, DollarSign, MessageSquare, Check, CheckCheck, Trash2 } from 'lucide-react';
import styles from './page.module.css';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { showSuccess } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(100);
      setNotifications(data.map((n: any) => ({
        _id: n._id?.toString() || '',
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt?.toString() || '',
      })));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => 
      prev.map(n => n._id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showSuccess('All notifications marked as read');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rent_overdue':
      case 'rent_reminder':
        return <AlertCircle size={20} />;
      case 'payment_received':
        return <DollarSign size={20} />;
      case 'whatsapp':
      case 'sms':
      case 'push':
        return <MessageSquare size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rent_overdue':
        return styles.typeOverdue;
      case 'rent_reminder':
        return styles.typeReminder;
      case 'payment_received':
        return styles.typePayment;
      default:
        return styles.typeGeneral;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Notifications</h1>
            <p className={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
              <CheckCheck size={18} />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={48} />
            <h2>No notifications yet</h2>
            <p>Notifications will appear here when you receive updates.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                onClick={() => handleMarkAsRead(notification._id)}
              >
                <div className={`${styles.icon} ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div className={styles.content}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{notification.title}</span>
                    {!notification.isRead && <span className={styles.unreadBadge}>Unread</span>}
                  </div>
                  <div className={styles.itemMessage}>{notification.message}</div>
                  <div className={styles.itemMeta}>
                    <Clock size={14} />
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className={styles.unreadDot} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}