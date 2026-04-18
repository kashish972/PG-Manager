'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { usePersons, useDeletePerson } from '@/hooks/use-data';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import { getBlocks } from '@/actions/block.actions';
import { sendNotificationToPerson } from '@/actions/notification.actions';
import { createNotification } from '@/actions/in-app-notification.actions';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { NotificationModal } from '@/components/ui/NotificationModal';
import styles from './page.module.css';

export default function PersonsPage() {
  const { data: persons, isLoading, refetch } = usePersons();
  const { data: session } = useSession();
  const deletePerson = useDeletePerson();
  const { showSuccess, showError, showInfo } = useToast();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blockMap, setBlockMap] = useState<Record<string, string>>({});
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [notificationPerson, setNotificationPerson] = useState<any>(null);

  useEffect(() => {
    getBlocks().then(data => {
      setBlocks(data || []);
      const map: Record<string, string> = {};
      data?.forEach((b: any) => {
        map[b._id] = b.name;
      });
      setBlockMap(map);
    }).catch(() => {});
  }, []);

  const canEdit = session?.user?.role !== 'member';

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this person?')) {
      await deletePerson.mutateAsync(id);
      refetch();
    }
  }

  function handleSendNotification(person: any) {
    if (!person.phone) {
      showError('This person does not have a phone number');
      return;
    }
    setNotificationPerson({
      ...person,
      blockName: blockMap[person.blockId] || '',
    });
  }

  async function onSendNotification(personId: string, message: string, method: 'whatsapp' | 'sms' | 'push') {
    const person = notificationPerson;
    setSendingNotification(personId);
    
    let sendResult: { success: boolean; error: string } = { success: false, error: '' };
    
    if (method === 'push') {
      // For push, just show local notification - to user's own browser
      const { showPushNotification } = await import('@/lib/push-notification.service');
      await showPushNotification({ title: 'PG Manager', body: message });
      sendResult = { success: true, error: '' };
    } else {
      const result = await sendNotificationToPerson(personId, message, method);
      sendResult = result as typeof sendResult;
    }

    // Save notification to database for in-app viewing
    if (sendResult.success && person?.email) {
      try {
        await createNotification(
          person.email,
          'Notification',
          message,
          method
        );
      } catch (e) {
        console.error('Failed to save notification:', e);
      }
    }

    setSendingNotification(null);

    if (!sendResult.success) {
      showError(sendResult.error || 'Failed to send');
      return { success: false, error: sendResult.error };
    } else {
      showSuccess(`Notification sent via ${method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'Push'}!`);
      return { success: true };
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.skeletonTitle}></div>
          </div>
          <SkeletonTable rows={8} />
        </div>
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
                    <td>
                      {person.blockId && blockMap[person.blockId] && (
                        <span className={styles.blockTag}>{blockMap[person.blockId]}</span>
                      )}
                      <span>Room {person.roomNumber}</span>
                    </td>
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
                          <button
                            onClick={() => handleSendNotification(person)}
                            disabled={sendingNotification === person._id}
                            className={styles.notificationBtn}
                            title="Send WhatsApp Notification"
                          >
                            {sendingNotification === person._id ? (
                              <Loader2 size={16} className={styles.spinner} />
                            ) : (
                              <MessageSquare size={16} />
                            )}
                          </button>
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

        {notificationPerson && (
          <NotificationModal
            isOpen={!!notificationPerson}
            onClose={() => setNotificationPerson(null)}
            person={notificationPerson}
            onSend={onSendNotification}
          />
        )}
      </div>
    </MainLayout>
  );
}