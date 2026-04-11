'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PersonForm } from '@/components/ui/Form';
import { useCreatePerson, useActivePersons } from '@/hooks/use-data';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function AddPersonPage() {
  const router = useRouter();
  const createPerson = useCreatePerson();
  const { data: persons } = useActivePersons();

  async function handleSubmit(data: any) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    await createPerson.mutateAsync(formData);
    router.push('/persons');
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Add Resident</h1>
        <PersonForm onSubmit={handleSubmit} isLoading={createPerson.isPending} />
      </div>
    </MainLayout>
  );
}