'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumb.module.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function formatLabel(slug: string): string {
  if (slug === 'dashboard') return 'Dashboard';
  if (slug === 'my-details') return 'My Details';
  if (slug === 'pay-rent') return 'Pay Rent';
  if (slug === 'upi-settings') return 'UPI Settings';
  if (slug === 'analytics') return 'Analytics';
  
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();
  
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    
    return {
      label: formatLabel(segment),
      href: isLast ? undefined : href,
    };
  });

  return (
    <nav className={styles.breadcrumb}>
      <Link href="/dashboard" className={styles.homeLink}>
        <Home size={16} />
        <span>Home</span>
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <div key={index} className={styles.item}>
          <ChevronRight size={14} className={styles.separator} />
          {item.href ? (
            <Link href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ) : (
            <span className={styles.current}>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}