'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import styles from './page.module.css';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn('credentials', {
      tenantId: '',
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Invalid credentials' : result.error);
      setLoading(false);
    } else {
      setTimeout(() => {
        router.push('/super-admin/dashboard');
        window.location.href = '/super-admin/dashboard';
      }, 500);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Shield size={32} />
        </div>
        <h1 className={styles.title}>Super Admin</h1>
        <p className={styles.subtitle}>Sign in to manage all PG tenants</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="admin@pg-manager.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              name="password"
              type="password"
              className={styles.input}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.backLink}>
          <Link href="/login">Back to PG Login</Link>
        </p>
      </div>
    </div>
  );
}
