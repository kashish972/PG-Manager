'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, User, Users, Home, IndianRupee, Megaphone, Wrench, FileText, Briefcase, DoorOpen, Package, Settings, Sun, Moon } from 'lucide-react';
import styles from './Sidebar.module.css';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'admin'] },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp, roles: ['owner', 'admin'] },
  { href: '/my-details', label: 'My Details', icon: User, roles: ['member'] },
  { href: '/persons', label: 'Residents', icon: Users, roles: ['owner', 'admin'] },
  { href: '/rooms', label: 'Rooms', icon: Home, roles: ['owner', 'admin'] },
  { href: '/payments', label: 'Payments', icon: IndianRupee, roles: ['owner', 'admin'] },
  { href: '/notices', label: 'Notices', icon: Megaphone, roles: ['owner', 'admin', 'member'] },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['owner', 'admin', 'member'] },
  { href: '/complaints', label: 'Complaints', icon: FileText, roles: ['owner', 'admin', 'member'] },
  { href: '/staff', label: 'Staff', icon: Briefcase, roles: ['owner', 'admin'] },
  { href: '/visitors', label: 'Visitors', icon: DoorOpen, roles: ['owner', 'admin'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['owner', 'admin'] },
  { href: '/users', label: 'Users', icon: Settings, roles: ['owner', 'admin'] },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(session?.user?.role || '')
  );

  const tenantName = session?.user?.tenantId 
    ? session.user.tenantId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '';

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarGlow}></div>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <div className={styles.logoIconInner}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L4 12V28H12V20H20V28H28V12L16 4Z" fill="white" fillOpacity="0.95"/>
              <rect x="14" y="10" width="4" height="6" rx="1" fill="var(--accent)"/>
            </svg>
          </div>
        </div>
        <div className={styles.logoText}>
          <h2>PG Manager</h2>
          {tenantName && <span className={styles.tenantName}>{tenantName}</span>}
        </div>
        <button 
          onClick={toggleTheme} 
          className={styles.themeToggleBtn}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navLabel}>Menu</span>
          {filteredItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className={styles.navLinkIcon}><item.icon size={20} /></span>
              <span className={styles.navLinkText}>{item.label}</span>
              {pathname === item.href && <span className={styles.activeIndicator}></span>}
            </Link>
          ))}
        </div>
      </nav>
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{session?.user?.name || 'User'}</span>
            <span className={styles.userRole}>{session?.user?.role || 'Member'}</span>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className={styles.logoutBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}