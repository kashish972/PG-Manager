'use client';

import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export function Skeleton({ 
  variant = 'rectangular', 
  width, 
  height, 
  className = '',
  count = 1 
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${styles.skeleton} ${styles[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Skeleton variant="circular" width={50} height={50} />
        <div className={styles.cardInfo}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      </div>
      <div className={styles.cardBody}>
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="80%" height={16} />
        <Skeleton variant="text" width="60%" height={16} />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className={styles.statsGrid}>
      <Skeleton variant="card" width="100%" height={120} />
      <Skeleton variant="card" width="100%" height={120} />
      <Skeleton variant="card" width="100%" height={120} />
      <Skeleton variant="card" width="100%" height={120} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <Skeleton variant="text" width="20%" height={20} />
        <Skeleton variant="text" width="25%" height={20} />
        <Skeleton variant="text" width="15%" height={20} />
        <Skeleton variant="text" width="20%" height={20} />
        <Skeleton variant="text" width="20%" height={20} />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={styles.tableRow}>
          <Skeleton variant="text" width="20%" height={18} />
          <Skeleton variant="text" width="25%" height={18} />
          <Skeleton variant="text" width="15%" height={18} />
          <Skeleton variant="text" width="20%" height={18} />
          <Skeleton variant="text" width="20%" height={18} />
        </div>
      ))}
    </div>
  );
}
