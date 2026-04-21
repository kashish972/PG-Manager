'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PersonForm } from '@/components/ui/Form';
import { useUpdatePerson, usePerson, useActivePersons } from '@/hooks/use-data';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../add/page.module.css';

export default function EditPersonPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: person, isLoading } = usePerson(id);
  const { data: persons } = useActivePersons();
  const updatePerson = useUpdatePerson();
  const [defaultValues, setDefaultValues] = useState<any>(null);

  useEffect(() => {
    if (person) {
      setDefaultValues({
        ...person,
        moveInDate: new Date(person.moveInDate).toISOString().split('T')[0],
      });
    }
  }, [person]);

  async function handleSubmit(data: any) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    await updatePerson.mutateAsync({ id, formData });
    router.push('/persons');
    router.refresh();
  }

  if (isLoading || !defaultValues) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Edit Resident</h1>
        <PersonForm 
          onSubmit={handleSubmit} 
          defaultValues={defaultValues} 
          isLoading={updatePerson.isPending} 
        />
      </div>
    </MainLayout>
  );
}