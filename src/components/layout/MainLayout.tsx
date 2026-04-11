'use client';

import { Sidebar } from './Sidebar';
import { useState } from 'react';
import styles from './MainLayout.module.css';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>
        <button 
          className={styles.mobileMenuBtn}
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        {children}
      </main>
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}