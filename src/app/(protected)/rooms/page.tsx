'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPersons } from '@/actions/person.actions';
import { getCurrentPG, addRooms, updateRoomNumber } from '@/actions/pg.actions';
import styles from './page.module.css';

export default function RoomsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [persons, setPersons] = useState<any[]>([]);
  const [totalRooms, setTotalRooms] = useState(10);
  const [defaultCapacity, setDefaultCapacity] = useState(2);
  const [roomMappings, setRoomMappings] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRoom, setEditRoom] = useState<{number: string; newNumber: string} | null>(null);
  const [newRoomCount, setNewRoomCount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member') {
      Promise.all([
        getPersons(),
        getCurrentPG()
      ]).then(([personsData, pgData]) => {
        setPersons(personsData || []);
        if (pgData) {
          const rooms = Number(pgData.totalRooms) || 10;
          setTotalRooms(rooms);
          setDefaultCapacity(pgData.defaultCapacity || 2);
          setRoomMappings(pgData.roomMappings || {});
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [session]);

  const handleAddRooms = async () => {
    const count = parseInt(newRoomCount);
    if (!count || count < 1) {
      setError('Please enter a valid number');
      return;
    }
    
    const result = await addRooms(count);
    if (result?.error) {
      setError(result.error);
    } else {
      const pgData = await getCurrentPG();
      if (pgData) {
        const rooms = Number(pgData.totalRooms) || 10;
        setTotalRooms(rooms);
        setRoomMappings(pgData.roomMappings || {});
      }
      setShowAddModal(false);
      setNewRoomCount('');
      setError('');
    }
  };

  const handleEditRoom = async () => {
    if (!editRoom || !editRoom.newNumber) {
      setError('Please enter a room number');
      return;
    }

    const result = await updateRoomNumber(editRoom.number, editRoom.newNumber);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowEditModal(false);
      setEditRoom(null);
      setError('');
      const updatedPersons = await getPersons();
      setPersons(updatedPersons || []);
      const pgData = await getCurrentPG();
      if (pgData?.roomMappings) {
        setRoomMappings(pgData.roomMappings);
      }
    }
  };

  const openEditModal = (roomNumber: string) => {
    setEditRoom({ number: roomNumber, newNumber: roomNumber });
    setShowEditModal(true);
    setError('');
  };

  const activePersons = Array.isArray(persons) ? persons.filter(p => p?.isActive && p?.roomNumber) : [];
  const occupiedRoomNumbers = new Set(activePersons.map(p => p.roomNumber));
  const availableCount = (totalRooms ?? 0) - occupiedRoomNumbers.size;

  if (loading || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  const roomList = [];
  for (let i = 1; i <= totalRooms; i++) {
    const displayNumber = roomMappings[String(i)] || String(i);
    const occupants = persons.filter(p => p.roomNumber === displayNumber && p.isActive);
    const capacity = defaultCapacity;
    roomList.push({
      originalNumber: i,
      displayNumber,
      occupants,
      capacity
    });
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Room Availability</h1>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            + Add Rooms
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{totalRooms}</span>
            <span className={styles.statLabel}>Total Rooms</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.occupied}`}>{activePersons.length}</span>
            <span className={styles.statLabel}>Total Occupants</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.vacant}`}>{availableCount}</span>
            <span className={styles.statLabel}>Available</span>
          </div>
        </div>

        <div className={styles.roomGrid}>
          {roomList.map((room) => {
            const occupantCount = room.occupants.length;
            const isFull = occupantCount >= room.capacity;
            const isPartial = occupantCount > 0 && occupantCount < room.capacity;
            const isVacant = occupantCount === 0;
            
            return (
              <div 
                key={room.originalNumber} 
                className={`${styles.roomCard} ${isVacant ? styles.vacant : styles.occupied}`}
              >
                <div className={styles.roomHeader}>
                  <span className={styles.roomNumber}>Room {room.displayNumber}</span>
                  {isVacant && (
                    <button 
                      className={styles.editBtn}
                      onClick={() => openEditModal(room.displayNumber)}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {room.occupants.map((occupant: any) => (
                  <div key={occupant._id} className={styles.residentName}>
                    {occupant.name} {occupant.phone && <span className={styles.phone}>({occupant.phone})</span>}
                  </div>
                ))}
                {isFull && (
                  <div className={`${styles.status} ${styles.filledStatus}`}>Filled ({occupantCount}/{room.capacity})</div>
                )}
                {isPartial && (
                  <div className={`${styles.status} ${styles.partialStatus}`}>Partially Filled ({occupantCount}/{room.capacity})</div>
                )}
                {isVacant && (
                  <div className={`${styles.status} ${styles.vacantStatus}`}>Vacant</div>
                )}
              </div>
            );
          })}
        </div>

        {showAddModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h2>Add Rooms</h2>
              <div className={styles.field}>
                <label>Number of rooms to add</label>
                <input
                  type="number"
                  value={newRoomCount}
                  onChange={(e) => setNewRoomCount(e.target.value)}
                  placeholder="e.g., 5"
                  min="1"
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.modalActions}>
                <button onClick={() => setShowAddModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleAddRooms} className={styles.submitBtn}>
                  Add Rooms
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h2>Edit Room Number</h2>
              <div className={styles.field}>
                <label>New Room Number</label>
                <input
                  type="text"
                  value={editRoom?.newNumber || ''}
                  onChange={(e) => setEditRoom({ ...editRoom!, newNumber: e.target.value })}
                  placeholder="Enter new room number"
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.modalActions}>
                <button onClick={() => setShowEditModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleEditRoom} className={styles.submitBtn}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}