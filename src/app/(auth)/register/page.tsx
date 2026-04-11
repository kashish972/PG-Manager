'use client';

import { useState } from 'react';
import { registerPG } from '@/actions/pg.actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const address = formData.get('address') as string;
    const monthlyRent = formData.get('monthlyRent') as string;
    const ownerName = formData.get('ownerName') as string;
    const ownerEmail = formData.get('ownerEmail') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const newFormData = new FormData();
    newFormData.append('name', name);
    newFormData.append('slug', slug);
    newFormData.append('address', address);
    newFormData.append('monthlyRent', monthlyRent);
    newFormData.append('totalRooms', formData.get('totalRooms') as string || '10');
    newFormData.append('ownerName', ownerName);
    newFormData.append('ownerEmail', ownerEmail);
    newFormData.append('password', password);

    try {
      await registerPG(newFormData);
      router.push(`/login?tenant=${slug}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Register PG</h1>
        <p className={styles.subtitle}>Create your new PG</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>PG Name</label>
            <input name="name" placeholder="Sunshine PG" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>PG Slug (URL)</label>
            <input name="slug" placeholder="sunshine-pg" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Address</label>
            <input name="address" placeholder="123 Main St, City" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Monthly Rent</label>
            <input name="monthlyRent" type="number" placeholder="5000" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Total Rooms</label>
            <input name="totalRooms" type="number" placeholder="10" defaultValue="10" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Room Capacity</label>
            <input name="defaultCapacity" type="number" placeholder="2" defaultValue="2" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Your Name</label>
            <input name="ownerName" placeholder="John Doe" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Your Email</label>
            <input name="ownerEmail" type="email" placeholder="john@pg.com" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <input name="confirmPassword" type="password" className={styles.input} required />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Creating...' : 'Register PG'}
          </button>
        </form>

        <p className={styles.registerLink}>
          Already have a PG? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}