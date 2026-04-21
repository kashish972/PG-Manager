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
import { MessageSquare, Loader2, AlertTriangle, Check, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { Pagination } from '@/components/ui/Pagination';
import { approveMoveOutNotice, rejectMoveOutNotice, cancelMoveOutNotice } from '@/actions/person.actions';
import { getCurrentPG } from '@/actions/pg.actions';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [noticeModalPerson, setNoticeModalPerson] = useState<any>(null);

  useEffect(() => {
    getCurrentPG().then(pg => {
      if (pg) setNoticePeriodDays(pg.noticePeriodDays || 30);
    }).catch(() => {});
  }, []);

  const handleApproveNotice = async () => {
    if (!noticeModalPerson) return;
    setApprovingId(noticeModalPerson._id);
    const result = await approveMoveOutNotice(noticeModalPerson._id);
    if (result?.success) {
      showSuccess(`${noticeModalPerson.name}'s move-out notice approved!`);
      refetch();
    } else {
      showError(result?.error || 'Failed to approve notice');
    }
    setApprovingId(null);
    setNoticeModalPerson(null);
  };

  const handleRejectNotice = async () => {
    if (!noticeModalPerson) return;
    setApprovingId(noticeModalPerson._id);
    const result = await rejectMoveOutNotice(noticeModalPerson._id);
    if (result?.success) {
      showSuccess(`${noticeModalPerson.name}'s move-out notice rejected!`);
      refetch();
    } else {
      showError(result?.error || 'Failed to reject notice');
    }
    setApprovingId(null);
    setNoticeModalPerson(null);
  };

  const handleCancelNotice = async () => {
    if (!noticeModalPerson) return;
    setApprovingId(noticeModalPerson._id);
    const result = await cancelMoveOutNotice(noticeModalPerson._id);
    if (result?.success) {
      showSuccess(`Notice cancelled for ${noticeModalPerson.name}!`);
      refetch();
    } else {
      showError(result?.error || 'Failed to cancel notice');
    }
    setApprovingId(null);
    setNoticeModalPerson(null);
  };

  const filteredPersons = persons?.filter((person: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      person.name?.toLowerCase().includes(query) ||
      person.phone?.includes(query) ||
      person.roomNumber?.toLowerCase().includes(query) ||
      person.aadharCard?.includes(query)
    );
  }) || [];

  useEffect(() => {
    const maxPage = Math.ceil((persons?.length || 0) / itemsPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    }
  }, [persons?.length, itemsPerPage]);

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

        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by name, phone, room..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
        </div>

        {filteredPersons.length === 0 && searchQuery ? (
          <div className={styles.empty}>
            <p>No residents found for "{searchQuery}"</p>
          </div>
        ) : filteredPersons.length === 0 ? (
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
                {filteredPersons
                  ?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((person: any) => (
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
                      {person.noticeRequestedAt && (
                        <button
                          className={styles.noticeBadge}
                          onClick={() => setNoticeModalPerson(person)}
                          disabled={approvingId === person._id}
                          title={person.moveOutDate ? `Moving out on ${new Date(person.moveOutDate).toLocaleDateString()}` : 'Notice pending'}
                        >
                          {person.noticeApprovedAt ? <Check size={12} /> : <AlertTriangle size={12} />}
                          {person.noticeApprovedAt ? 'Approved' : 'Leaving'}
                        </button>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleSendNotification(person)}
                            className={styles.notifyBtn}
                            disabled={sendingNotification === person._id}
                            title="Send notification"
                          >
                            {sendingNotification === person._id ? (
                              <Loader2 size={14} className={styles.spin} />
                            ) : (
                              <MessageSquare size={14} />
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
<Pagination
              currentPage={currentPage}
              totalItems={filteredPersons.length || 0}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
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

        {noticeModalPerson && (
          <div className={styles.modalOverlay} onClick={() => setNoticeModalPerson(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Move-Out Notice</h2>
                <button className={styles.closeBtn} onClick={() => setNoticeModalPerson(null)}>×</button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.personInfo}>
                  <h3>{noticeModalPerson.name}</h3>
                  <p>Room {noticeModalPerson.roomNumber}</p>
                </div>

                <div className={styles.noticeInfo}>
                  <div className={styles.infoRow}>
                    <span>Notice Submitted:</span>
                    <span>{noticeModalPerson.noticeRequestedAt ? new Date(noticeModalPerson.noticeRequestedAt).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Move-Out Date:</span>
                    <span>{noticeModalPerson.moveOutDate ? new Date(noticeModalPerson.moveOutDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Reason:</span>
                    <span>{noticeModalPerson.noticeReason || 'Not specified'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Status:</span>
                    <span className={noticeModalPerson.noticeApprovedAt ? styles.approved : styles.pending}>
                      {noticeModalPerson.noticeApprovedAt ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  {!noticeModalPerson.noticeApprovedAt && (
                    <button 
                      className={styles.approveBtn}
                      onClick={handleApproveNotice}
                      disabled={approvingId === noticeModalPerson._id}
                    >
                      <Check size={16} /> Approve
                    </button>
                  )}
                  {!noticeModalPerson.noticeApprovedAt && (
                    <button 
                      className={styles.rejectBtn}
                      onClick={handleRejectNotice}
                      disabled={approvingId === noticeModalPerson._id}
                    >
                      <X size={16} /> Reject
                    </button>
                  )}
                  <button 
                    className={styles.cancelBtn}
                    onClick={handleCancelNotice}
                    disabled={approvingId === noticeModalPerson._id}
                  >
                    Cancel Notice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}