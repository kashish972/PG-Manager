'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertCircle, DollarSign, MessageSquare, Trash2, CheckCheck } from 'lucide-react';
import { getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from '@/actions/in-app-notification.actions';
import { useRouter } from 'next/navigation';
import styles from './NotificationBell.module.css';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'rent_reminder' | 'rent_overdue' | 'payment_received' | 'general' | 'push' | 'whatsapp' | 'sms';
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ]);
      setNotifications(notifs.map((n: any) => ({
        _id: n._id?.toString() || '',
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt?.toString() || '',
      })));
      setUnreadCount(count as number);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification._id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setLoading(false);
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'rent_overdue':
      case 'rent_reminder':
        return <AlertCircle size={16} />;
      case 'payment_received':
        return <DollarSign size={16} />;
      case 'whatsapp':
      case 'sms':
      case 'push':
        return <MessageSquare size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const getTypeColor = (type: Notification['type']) => {
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={`${styles.bellBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                disabled={loading}
                className={styles.markAllBtn}
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={32} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={`${styles.icon} ${getTypeColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className={styles.content}>
                    <div className={styles.itemTitle}>{notification.title}</div>
                    <div className={styles.itemMessage}>{notification.message}</div>
                    <div className={styles.time}>
                      <Clock size={12} />
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.isRead && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className={styles.footer}>
              <button onClick={() => { setIsOpen(false); router.push('/notifications'); }}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}