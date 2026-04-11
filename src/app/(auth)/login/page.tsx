'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const tenant = formData.get('tenant') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!tenant) {
      setError('Please enter your PG name');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      tenantId: tenant,
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid credentials');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>PG Manager</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>PG Name</label>
            <input
              name="tenant"
              defaultValue={tenantSlug || ''}
              placeholder="your-pg-name"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input name="email" type="email" placeholder="admin@pg.com" className={styles.input} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" className={styles.input} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.registerLink}>
          New PG? <Link href="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}