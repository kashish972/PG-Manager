'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { usePersons, useDeletePerson } from '@/hooks/use-data';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function PersonsPage() {
  const { data: persons, isLoading, refetch } = usePersons();
  const { data: session } = useSession();
  const deletePerson = useDeletePerson();

  const canEdit = session?.user?.role !== 'member';

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this person?')) {
      await deletePerson.mutateAsync(id);
      refetch();
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Residents</h1>
          {canEdit && (
            <Link href="/persons/add">
              <Button>Add Resident</Button>
            </Link>
          )}
        </div>

        {persons?.length === 0 ? (
          <div className={styles.empty}>
            <p>No residents yet. Add your first resident!</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Aadhar</th>
                  <th>Move In</th>
                  <th>Rent</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {persons?.map((person: any) => (
                  <tr key={person._id} className={!person.isActive ? styles.inactive : ''}>
                    <td>{person.roomNumber}</td>
                    <td>
                      <Link href={`/persons/${person._id}`} className={styles.nameLink}>
                        {person.name}
                      </Link>
                    </td>
                    <td>{person.phone}</td>
                    <td>{person.aadharCard.slice(0, 4)}****{person.aadharCard.slice(-4)}</td>
                    <td>{new Date(person.moveInDate).toLocaleDateString()}</td>
                    <td>₹{person.monthlyRent}</td>
                    <td>
                      <span className={`${styles.status} ${person.isActive ? styles.active : styles.inactiveStatus}`}>
                        {person.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/persons/${person._id}`}>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(person._id)}
                            disabled={deletePerson.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}