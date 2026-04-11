'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoomsWithOccupancy, createBlock, addRoom, updateRoom, deleteRoom, renameBlock, deleteBlock } from '@/actions/block.actions';
import { Plus, Home, Snowflake, Flame, Edit2, Trash2, X, Check, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './page.module.css';

interface IRoom {
  roomNumber: string;
  capacity: number;
  isAC: boolean;
}

interface IBlock {
  _id: string;
  name: string;
  rooms: IRoom[];
}

export default function RoomsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [blocks, setBlocks] = useState<IBlock[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<IBlock | null>(null);
  const [editingRoom, setEditingRoom] = useState<{ blockId: string; index: number; room: IRoom } | null>(null);
  
  const [newBlockName, setNewBlockName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [newRoomIsAC, setNewRoomIsAC] = useState(false);
  const [newRoomCount, setNewRoomCount] = useState(1);
  const [isMultipleRooms, setIsMultipleRooms] = useState(false);
  const [selectedRoomsToDelete, setSelectedRoomsToDelete] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm: () => void }>({ show: false, message: '', onConfirm: () => {} });
  const [error, setError] = useState('');
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'member') {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      const data = await getRoomsWithOccupancy();
      setBlocks(data.blocks || []);
      setPersons(data.persons || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!newBlockName.trim()) {
      setError('Please enter a block name');
      return;
    }
    
    const result = await createBlock(newBlockName.trim());
    if (result?.error) {
      setError(result.error);
    } else {
      setShowBlockModal(false);
      setNewBlockName('');
      setError('');
      loadData();
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomNumber.trim()) {
      setError('Please enter a room number');
      return;
    }
    
    const result = await addRoom(selectedBlock!._id, newRoomNumber.trim(), newRoomCapacity, newRoomIsAC, newRoomCount, isMultipleRooms);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowRoomModal(false);
      setNewRoomNumber('');
      setNewRoomCapacity(2);
      setNewRoomIsAC(false);
      setNewRoomCount(1);
      setIsMultipleRooms(false);
      setError('');
      setSelectedBlock(null);
      loadData();
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom || !newRoomNumber.trim()) {
      setError('Please enter a room number');
      return;
    }
    
    const result = await updateRoom(editingRoom.blockId, editingRoom.index, newRoomNumber.trim(), newRoomCapacity, newRoomIsAC);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowEditRoomModal(false);
      setNewRoomNumber('');
      setNewRoomCapacity(2);
      setNewRoomIsAC(false);
      setError('');
      setEditingRoom(null);
      loadData();
    }
  };

  const handleDeleteRoom = async (blockId: string, index: number) => {
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to delete this room?',
      onConfirm: async () => {
        await deleteRoom(blockId, index);
        loadData();
      }
    });
  };

  const handleDeleteBlock = async (blockId: string) => {
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to delete this block and all its rooms?',
      onConfirm: async () => {
        await deleteBlock(blockId);
        loadData();
      }
    });
  };

  const openAddRoomModal = (block: IBlock) => {
    setSelectedBlock(block);
    setShowRoomModal(true);
    setNewRoomCount(1);
    setIsMultipleRooms(false);
    setError('');
  };

  const toggleRoomSelection = (roomKey: string) => {
    setSelectedRoomsToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomKey)) {
        newSet.delete(roomKey);
      } else {
        newSet.add(roomKey);
      }
      return newSet;
    });
  };

  const handleDeleteSelectedRooms = async () => {
    if (selectedRoomsToDelete.size === 0) return;
    setConfirmModal({
      show: true,
      message: `Are you sure you want to delete ${selectedRoomsToDelete.size} room(s)?`,
      onConfirm: async () => {
        for (const roomKey of selectedRoomsToDelete) {
          const [blockId, indexStr] = roomKey.split('-');
          const index = parseInt(indexStr);
          await deleteRoom(blockId, index);
        }
        setSelectedRoomsToDelete(new Set());
        loadData();
      }
    });
  };

  const openEditRoomModal = (blockId: string, index: number, room: IRoom) => {
    setEditingRoom({ blockId, index, room });
    setNewRoomNumber(room.roomNumber);
    setNewRoomCapacity(room.capacity);
    setNewRoomIsAC(room.isAC);
    setShowEditRoomModal(true);
    setError('');
  };

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const getOccupants = (blockId: string, roomNumber: string) => {
  return persons.filter(
    p =>
      p.isActive &&
      String(p.roomNumber) === String(roomNumber) &&
      String(p.blockId) === String(blockId)
  );
};

  if (loading || session?.user?.role === 'member') {
    return (
      <MainLayout>
        <div className={styles.loading}>Loading...</div>
      </MainLayout>
    );
  }

  const totalRooms = blocks.reduce((sum, b) => sum + b.rooms.length, 0);
  const occupiedRooms = blocks.reduce((sum, block) => {
    return sum + block.rooms.filter(room => getOccupants(block._id, room.roomNumber).length > 0).length;
  }, 0);

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Room Management</h1>
          <button className={styles.addBtn} onClick={() => setShowBlockModal(true)}>
            <Plus size={18} />
            Add Block
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Building2 size={24} /></div>
            <span className={styles.statValue}>{blocks.length}</span>
            <span className={styles.statLabel}>Total Blocks</span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Home size={24} /></div>
            <span className={styles.statValue}>{totalRooms}</span>
            <span className={styles.statLabel}>Total Rooms</span>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.occupied}`}><Home size={24} /></div>
            <span className={`${styles.statValue} ${styles.occupied}`}>{occupiedRooms}</span>
            <span className={styles.statLabel}>Occupied</span>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.vacant}`}><Home size={24} /></div>
            <span className={`${styles.statValue} ${styles.vacant}`}>{totalRooms - occupiedRooms}</span>
            <span className={styles.statLabel}>Vacant</span>
          </div>
        </div>

        {blocks.length === 0 ? (
          <div className={styles.emptyState}>
            <Building2 size={48} />
            <h3>No Blocks Yet</h3>
            <p>Create your first block to start managing rooms</p>
            <button className={styles.addBtn} onClick={() => setShowBlockModal(true)}>
              <Plus size={18} />
              Add First Block
            </button>
          </div>
        ) : (
          <div className={styles.blocksContainer}>
            {selectedRoomsToDelete.size > 0 && (
              <div className={styles.bulkActions}>
                <span>{selectedRoomsToDelete.size} room(s) selected</span>
                <button className={styles.deleteSelectedBtn} onClick={handleDeleteSelectedRooms}>
                  <Trash2 size={16} />
                  Delete Selected
                </button>
                <button className={styles.cancelSelectBtn} onClick={() => setSelectedRoomsToDelete(new Set())}>
                  Cancel
                </button>
              </div>
            )}
            {blocks.map((block) => (
                <div key={block._id} className={styles.blockCard}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockTitle}>
                    <button 
                      className={styles.collapseBtn}
                      onClick={() => toggleBlockCollapse(block._id)}
                    >
                      {collapsedBlocks.has(block._id) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                    <Building2 size={20} />
                    <h3>{block.name}</h3>
                    <span className={styles.roomCount}>{block.rooms.length} rooms</span>
                  </div>
                  <div className={styles.blockActions}>
                    <button 
                      className={styles.addRoomBtn} 
                      onClick={() => openAddRoomModal(block)}
                      title="Add Room"
                    >
                      <Plus size={16} />
                      Add Room
                    </button>
                    <button 
                      className={styles.deleteBlockBtn}
                      onClick={() => handleDeleteBlock(block._id)}
                      title="Delete Block"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {!collapsedBlocks.has(block._id) && (
                <div className={styles.roomsGrid}>
                  {block.rooms.length === 0 ? (
                    <div className={styles.noRooms}>
                      <p>No rooms in this block</p>
                      <button onClick={() => openAddRoomModal(block)}>
                        <Plus size={16} /> Add Room
                      </button>
                    </div>
                  ) : (
                    block.rooms.map((room, index) => {
                      const occupants = getOccupants(block._id, room.roomNumber);
                      const isFull = occupants.length >= room.capacity;
                      const isPartial = occupants.length > 0 && occupants.length < room.capacity;
                      const isVacant = occupants.length === 0;
                      const roomKey = `${block._id}-${index}`;
                      
                      return (
                        <div 
                          key={roomKey} 
                          className={`${styles.roomCard} ${isVacant ? styles.vacant : styles.occupied} ${selectedRoomsToDelete.has(roomKey) ? styles.selected : ''}`}
                        >
                          <div className={styles.roomHeader}>
                            <div className={styles.roomSelect}>
                              <input
                                type="checkbox"
                                checked={selectedRoomsToDelete.has(roomKey)}
                                onChange={() => toggleRoomSelection(roomKey)}
                              />
                            </div>
                            <div className={styles.roomInfo}>
                              <span className={styles.roomNumber}>Room {room.roomNumber}</span>
                              <div className={styles.roomTags}>
                                {room.isAC ? (
                                  <span className={styles.acTag}><Snowflake size={12} /> AC</span>
                                ) : (
                                  <span className={styles.nonAcTag}><Flame size={12} /> Non-AC</span>
                                )}
                                <span className={styles.capacityTag}>{room.capacity}</span>
                              </div>
                            </div>
                            <div className={styles.roomActions}>
                              <button 
                                className={styles.editBtn}
                                onClick={() => openEditRoomModal(block._id, index, room)}
                              >
                                <Edit2 size={14} />
                              </button>
                              {isVacant && (
                                <button 
                                  className={styles.deleteBtn}
                                  onClick={() => handleDeleteRoom(block._id, index)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {occupants.length > 0 ? (
                            <div className={styles.occupants}>
                              {occupants.map((occupant: any) => (
                                <div key={occupant._id} className={styles.occupantName}>
                                  {occupant.name}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          
                          <div className={styles.roomStatus}>
                            {isFull && <span className={`${styles.status} ${styles.filledStatus}`}>Filled ({occupants.length}/{room.capacity})</span>}
                            {isPartial && <span className={`${styles.status} ${styles.partialStatus}`}>Partial ({occupants.length}/{room.capacity})</span>}
                            {isVacant && <span className={`${styles.status} ${styles.vacantStatus}`}>Vacant</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Block Modal */}
        {showBlockModal && (
          <div className={styles.modalOverlay} onClick={() => setShowBlockModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Add New Block</h2>
                <button className={styles.closeBtn} onClick={() => setShowBlockModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.field}>
                  <label>Block Name</label>
                  <input
                    type="text"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    placeholder="e.g., Ground Floor, First Floor, Block A"
                    autoFocus
                  />
                </div>
                {error && <p className={styles.error}>{error}</p>}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowBlockModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleCreateBlock} className={styles.submitBtn}>
                  <Check size={16} />
                  Create Block
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Room Modal */}
        {showRoomModal && (
          <div className={styles.modalOverlay} onClick={() => setShowRoomModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Add Room to {selectedBlock?.name}</h2>
                <button className={styles.closeBtn} onClick={() => setShowRoomModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.field}>
                  <label>Room Type</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioOption} ${!isMultipleRooms ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={!isMultipleRooms}
                        onChange={() => { setIsMultipleRooms(false); setNewRoomCount(1); }}
                      />
                      <span>Single Room</span>
                    </label>
                    <label className={`${styles.radioOption} ${isMultipleRooms ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={isMultipleRooms}
                        onChange={() => setIsMultipleRooms(true)}
                      />
                      <span>Multiple Rooms</span>
                    </label>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Starting Room Number</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder={isMultipleRooms ? "e.g., 201 (creates 201, 202, 203...)" : "e.g., 101"}
                    autoFocus
                  />
                </div>
                {isMultipleRooms && (
                  <div className={styles.field}>
                    <label>Number of Rooms</label>
                    <input
                      type="number"
                      value={newRoomCount}
                      onChange={(e) => setNewRoomCount(parseInt(e.target.value) || 1)}
                      min="1"
                      max="50"
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {`Will create rooms: ${newRoomNumber ? (parseInt(newRoomNumber) || 1) : 1} to ${newRoomNumber ? ((parseInt(newRoomNumber) || 1) + newRoomCount - 1) : newRoomCount}`}
                    </span>
                  </div>
                )}
                <div className={styles.field}>
                  <label>Capacity (Number of Beds)</label>
                  <input
                    type="number"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                  />
                </div>
                <div className={styles.field}>
                  <label>Room Type</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioOption} ${!newRoomIsAC ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={!newRoomIsAC}
                        onChange={() => setNewRoomIsAC(false)}
                      />
                      <Flame size={18} />
                      <span>Non-AC</span>
                    </label>
                    <label className={`${styles.radioOption} ${newRoomIsAC ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={newRoomIsAC}
                        onChange={() => setNewRoomIsAC(true)}
                      />
                      <Snowflake size={18} />
                      <span>AC</span>
                    </label>
                  </div>
                </div>
                {error && <p className={styles.error}>{error}</p>}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowRoomModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleAddRoom} className={styles.submitBtn}>
                  <Plus size={16} />
                  Add Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Room Modal */}
        {showEditRoomModal && editingRoom && (
          <div className={styles.modalOverlay} onClick={() => setShowEditRoomModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Edit Room</h2>
                <button className={styles.closeBtn} onClick={() => setShowEditRoomModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.field}>
                  <label>Room Number</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g., 101, A1"
                    autoFocus
                  />
                </div>
                <div className={styles.field}>
                  <label>Capacity (Number of Beds)</label>
                  <input
                    type="number"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                  />
                </div>
                <div className={styles.field}>
                  <label>Room Type</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioOption} ${!newRoomIsAC ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={!newRoomIsAC}
                        onChange={() => setNewRoomIsAC(false)}
                      />
                      <Flame size={18} />
                      <span>Non-AC</span>
                    </label>
                    <label className={`${styles.radioOption} ${newRoomIsAC ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        checked={newRoomIsAC}
                        onChange={() => setNewRoomIsAC(true)}
                      />
                      <Snowflake size={18} />
                      <span>AC</span>
                    </label>
                  </div>
                </div>
                {error && <p className={styles.error}>{error}</p>}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowEditRoomModal(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleUpdateRoom} className={styles.submitBtn}>
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className={styles.modalOverlay} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
            <div className={styles.modal} style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Confirm Delete</h2>
                <button className={styles.closeBtn} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{confirmModal.message}</p>
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} className={styles.submitBtn} style={{ background: 'var(--error)' }}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
