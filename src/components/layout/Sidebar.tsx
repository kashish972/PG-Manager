'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from './Sidebar.module.css';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['owner', 'admin'] },
  { href: '/analytics', label: 'Analytics', icon: '📈', roles: ['owner', 'admin'] },
  { href: '/my-details', label: 'My Details', icon: '👤', roles: ['member'] },
  { href: '/persons', label: 'Residents', icon: '👥', roles: ['owner', 'admin'] },
  { href: '/rooms', label: 'Rooms', icon: '🏠', roles: ['owner', 'admin'] },
  { href: '/payments', label: 'Payments', icon: '💰', roles: ['owner', 'admin'] },
  { href: '/notices', label: 'Notices', icon: '📢', roles: ['owner', 'admin', 'member'] },
  { href: '/maintenance', label: 'Maintenance', icon: '🔧', roles: ['owner', 'admin', 'member'] },
  { href: '/complaints', label: 'Complaints', icon: '📝', roles: ['owner', 'admin', 'member'] },
  { href: '/staff', label: 'Staff', icon: '👷', roles: ['owner', 'admin'] },
  { href: '/visitors', label: 'Visitors', icon: '🚪', roles: ['owner', 'admin'] },
  { href: '/inventory', label: 'Inventory', icon: '📦', roles: ['owner', 'admin'] },
  { href: '/users', label: 'Users', icon: '⚙️', roles: ['owner', 'admin'] },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(session?.user?.role || '')
  );

  const tenantName = session?.user?.tenantId 
    ? session.user.tenantId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '';

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="url(#gradient)"/>
            <path d="M20 8L8 16V32H16V24H24V32H32V16L20 8Z" fill="white" fillOpacity="0.9"/>
            <rect x="18" y="14" width="4" height="6" rx="1" fill="#e94560"/>
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e94560"/>
                <stop offset="1" stopColor="#c73659"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className={styles.logoText}>
          <h2>PG Manager</h2>
          {tenantName && <span className={styles.tenantName}>{tenantName}</span>}
        </div>
      </div>
      <nav className={styles.nav}>
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.footer}>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </aside>
  );
}