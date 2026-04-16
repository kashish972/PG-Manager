'use client';

import { Modal } from '@/components/ui/Modal';
import { usePersons, usePayments, useDashboardStats, useBlocks } from '@/hooks/use-data';
import { Phone, Mail, Calendar, MapPin, CreditCard, IndianRupee, User, Clock, Check, AlertCircle, Snowflake, Users, Home, Filter, X, TrendingUp, Building2, Percent } from 'lucide-react';
import { useMemo, useState } from 'react';
import styles from './DashboardDetailModal.module.css';

type RoomFilter = 'all' | 'ac' | 'non-ac';
type OccupancyFilter = 'all' | 'partial' | 'full';

interface DashboardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'total-residents' | 'active-residents' | 'pending-payments' | 'monthly-revenue' | 'occupied-rooms' | 'occupancy-rate' | 'pending-amount';
}

export function DashboardDetailModal({ isOpen, onClose, type }: DashboardDetailModalProps) {
  const { data: persons } = usePersons();
  const { data: payments } = usePayments();
  const { data: stats } = useDashboardStats();
  const { data: blocks } = useBlocks();
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('all');

  const enrichedPayments = useMemo(() => {
    if (!payments || !persons) return payments || [];
    return payments.map((payment: any) => {
      const person = persons.find((p: any) => p._id === payment.personId);
      return { ...payment, personName: person?.name || 'Unknown' };
    });
  }, [payments, persons]);

  const enrichedPersons = useMemo(() => {
    if (!persons || !blocks) return persons || [];
    return persons.map((person: any) => {
      const block = blocks.find((b: any) => b._id === person.blockId);
      return { ...person, blockName: block?.name || '' };
    });
  }, [persons, blocks]);

  const getBlockRoom = (person: any) => {
    if (!person.blockName && !person.roomNumber) return 'Not assigned';
    if (!person.blockName) return `Room ${person.roomNumber}`;
    if (!person.roomNumber) return person.blockName;
    return `${person.blockName} - Room ${person.roomNumber}`;
  };

  const getTitle = () => {
    switch (type) {
      case 'total-residents': return 'All Residents';
      case 'active-residents': return 'Active Residents';
      case 'pending-payments': return 'Pending Payments';
      case 'monthly-revenue': return 'Revenue Details';
      case 'occupied-rooms': return 'Occupied Rooms';
      case 'occupancy-rate': return 'Occupancy Rate Details';
      case 'pending-amount': return 'Pending Amount Details';
      default: return 'Details';
    }
  };

  const occupiedRoomsData = useMemo(() => {
    if (!blocks || !enrichedPersons) return [];
    const activePersons = enrichedPersons.filter((p: any) => p.isActive);
    const roomMap = new Map<string, { blockName: string; roomNumber: string; isAC: boolean; capacity: number; residents: any[] }>();
    
    activePersons.forEach((person: any) => {
      if (!person.blockId || !person.roomNumber) return;
      const key = `${person.blockId}-${person.roomNumber}`;
      const block = blocks.find((b: any) => b._id === person.blockId);
      const room = block?.rooms?.find((r: any) => r.roomNumber === person.roomNumber);
      
      if (!roomMap.has(key)) {
        roomMap.set(key, {
          blockName: block?.name || '',
          roomNumber: person.roomNumber,
          isAC: room?.isAC || false,
          capacity: room?.capacity || 1,
          residents: []
        });
      }
      roomMap.get(key)!.residents.push(person);
    });
    
    return Array.from(roomMap.values()).sort((a, b) => {
      if (a.blockName !== b.blockName) return a.blockName.localeCompare(b.blockName);
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  }, [blocks, enrichedPersons]);

  const filteredRooms = useMemo(() => {
    return occupiedRoomsData.filter(room => {
      if (roomFilter === 'ac' && !room.isAC) return false;
      if (roomFilter === 'non-ac' && room.isAC) return false;
      if (occupancyFilter === 'partial' && room.residents.length >= room.capacity) return false;
      if (occupancyFilter === 'full' && room.residents.length < room.capacity) return false;
      return true;
    });
  }, [occupiedRoomsData, roomFilter, occupancyFilter]);

  const clearFilters = () => {
    setRoomFilter('all');
    setOccupancyFilter('all');
  };

  const hasActiveFilters = roomFilter !== 'all' || occupancyFilter !== 'all';

  const filteredPersons = type === 'total-residents' 
    ? enrichedPersons 
    : type === 'active-residents' 
      ? enrichedPersons?.filter((p: any) => p.isActive)
      : enrichedPersons;

  const pendingPayments = enrichedPayments?.filter((p: any) => p.status === 'pending' || p.status === 'overdue') || [];
  const paidPayments = enrichedPayments?.filter((p: any) => p.status === 'paid') || [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className={`${styles.badge} ${styles.paid}`}><Check size={12} /> Paid</span>;
      case 'pending':
        return <span className={`${styles.badge} ${styles.pending}`}><Clock size={12} /> Pending</span>;
      case 'overdue':
        return <span className={`${styles.badge} ${styles.overdue}`}><AlertCircle size={12} /> Overdue</span>;
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  if (type === 'monthly-revenue') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="lg">
        <div className={styles.revenueSummary}>
          <div className={styles.revenueCard}>
            <div className={styles.revenueIcon} style={{ background: 'linear-gradient(135deg, #00d9a5 0%, #00c495 100%)' }}>
              <IndianRupee size={24} />
            </div>
            <div className={styles.revenueInfo}>
              <span className={styles.revenueLabel}>Expected Monthly</span>
              <span className={styles.revenueValue}>₹{(stats?.totalRent || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className={styles.revenueCard}>
            <div className={styles.revenueIcon} style={{ background: 'linear-gradient(135deg, #00d9a5 0%, #00c495 100%)' }}>
              <IndianRupee size={24} />
            </div>
            <div className={styles.revenueInfo}>
              <span className={styles.revenueLabel}>Collected</span>
              <span className={styles.revenueValue}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className={styles.revenueCard}>
            <div className={styles.revenueIcon} style={{ background: 'linear-gradient(135deg, #ffc947 0%, #ffb800 100%)' }}>
              <IndianRupee size={24} />
            </div>
            <div className={styles.revenueInfo}>
              <span className={styles.revenueLabel}>Pending</span>
              <span className={styles.revenueValue}>₹{((stats?.totalRent || 0) - (stats?.monthlyRevenue || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className={styles.revenueProgress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${Math.min(((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1)) * 100, 100)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1) * 100).toFixed(1)}% Collected
          </span>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Collection Summary</h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryCount}>{stats?.paidPayments || 0}</span>
              <span className={styles.summaryLabel}>Paid Payments</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryCount}>{stats?.pendingPayments || 0}</span>
              <span className={styles.summaryLabel}>Pending Payments</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryCount}>{stats?.overduePayments || 0}</span>
              <span className={styles.summaryLabel}>Overdue Payments</span>
            </div>
          </div>
        </div>

        {paidPayments.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Recent Payments (Paid)</h4>
            <div className={styles.paymentList}>
              {paidPayments.slice(0, 5).map((payment: any) => (
                <div key={payment._id} className={styles.paymentItem}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.paymentPerson}>
                      <User size={14} /> {payment.personName || 'Unknown'}
                    </span>
                    <span className={styles.paymentMonth}>{payment.month}</span>
                  </div>
                  <div className={styles.paymentRight}>
                    <span className={styles.paymentAmount}>₹{payment.amount?.toLocaleString()}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingPayments.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Outstanding Payments</h4>
            <div className={styles.paymentList}>
              {pendingPayments.slice(0, 5).map((payment: any) => (
                <div key={payment._id} className={`${styles.paymentItem} ${styles.paymentItemAlert}`}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.paymentPerson}>
                      <User size={14} /> {payment.personName || 'Unknown'}
                    </span>
                    <span className={styles.paymentMonth}>{payment.month}</span>
                  </div>
                  <div className={styles.paymentRight}>
                    <span className={styles.paymentAmount}>₹{payment.amount?.toLocaleString()}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    );
  }

  if (type === 'pending-payments') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="lg">
        <div className={styles.paymentStats}>
          <div className={styles.statBox}>
            <span className={styles.statNumber} style={{ color: '#00d9a5' }}>{stats?.paidPayments || 0}</span>
            <span className={styles.statLabel}>Paid</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber} style={{ color: '#ffc947' }}>{stats?.pendingPayments || 0}</span>
            <span className={styles.statLabel}>Pending</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber} style={{ color: '#e94560' }}>{stats?.overduePayments || 0}</span>
            <span className={styles.statLabel}>Overdue</span>
          </div>
        </div>

        {pendingPayments.length > 0 ? (
          <div className={styles.paymentList}>
            <h4 className={styles.sectionTitle}>Pending & Overdue Payments</h4>
            {pendingPayments.map((payment: any) => (
              <div key={payment._id} className={`${styles.paymentItem} ${payment.status === 'overdue' ? styles.paymentItemAlert : ''}`}>
                <div className={styles.paymentInfo}>
                  <span className={styles.paymentPerson}>
                    <User size={14} /> {payment.personName || 'Unknown'}
                  </span>
                  <span className={styles.paymentMonth}>{payment.month}</span>
                  {payment.paymentDate && (
                    <span className={styles.paymentDate}>
                      <Calendar size={12} /> {formatDate(payment.paymentDate)}
                    </span>
                  )}
                </div>
                <div className={styles.paymentRight}>
                  <span className={styles.paymentAmount}>₹{payment.amount?.toLocaleString()}</span>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Check size={48} className={styles.emptyIcon} />
            <p>All payments are up to date!</p>
          </div>
        )}
      </Modal>
    );
  }

  if (type === 'occupied-rooms') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="xl">
        <div className={styles.roomStats}>
          <div className={styles.roomStatBox}>
            <span className={styles.roomStatNumber}>{occupiedRoomsData.length}</span>
            <span className={styles.roomStatLabel}>Total Rooms</span>
          </div>
          <div className={styles.roomStatBox}>
            <span className={styles.roomStatNumber}>{occupiedRoomsData.filter(r => r.isAC).length}</span>
            <span className={styles.roomStatLabel}>AC Rooms</span>
          </div>
          <div className={styles.roomStatBox}>
            <span className={styles.roomStatNumber}>{occupiedRoomsData.filter(r => !r.isAC).length}</span>
            <span className={styles.roomStatLabel}>Non-AC Rooms</span>
          </div>
          <div className={styles.roomStatBox}>
            <span className={styles.roomStatNumber}>{occupiedRoomsData.reduce((sum, r) => sum + r.residents.length, 0)}</span>
            <span className={styles.roomStatLabel}>Total Residents</span>
          </div>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}><Filter size={14} /> Type:</span>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${roomFilter === 'all' ? styles.active : ''}`}
                onClick={() => setRoomFilter('all')}
              >
                All
              </button>
              <button 
                className={`${styles.filterBtn} ${roomFilter === 'ac' ? styles.active : ''}`}
                onClick={() => setRoomFilter('ac')}
              >
                <Snowflake size={12} /> AC
              </button>
              <button 
                className={`${styles.filterBtn} ${roomFilter === 'non-ac' ? styles.active : ''}`}
                onClick={() => setRoomFilter('non-ac')}
              >
                Non-AC
              </button>
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Occupancy:</span>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${occupancyFilter === 'all' ? styles.active : ''}`}
                onClick={() => setOccupancyFilter('all')}
              >
                All
              </button>
              <button 
                className={`${styles.filterBtn} ${occupancyFilter === 'partial' ? styles.active : ''}`}
                onClick={() => setOccupancyFilter('partial')}
              >
                Partial
              </button>
              <button 
                className={`${styles.filterBtn} ${occupancyFilter === 'full' ? styles.active : ''}`}
                onClick={() => setOccupancyFilter('full')}
              >
                Full
              </button>
            </div>
          </div>
          {hasActiveFilters && (
            <button className={styles.clearFiltersBtn} onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>

        <div className={styles.filterResultCount}>
          Showing {filteredRooms.length} of {occupiedRoomsData.length} rooms
        </div>

        {filteredRooms.length > 0 ? (
          <div className={styles.roomList}>
            {filteredRooms.map((room, index) => (
              <div key={index} className={styles.roomCard}>
                <div className={styles.roomHeader}>
                  <div className={styles.roomTitle}>
                    <Home size={18} />
                    <span>{room.blockName} - Room {room.roomNumber}</span>
                  </div>
                  <div className={styles.roomTags}>
                    <span className={`${styles.roomTag} ${room.isAC ? styles.tagAC : styles.tagNonAC}`}>
                      <Snowflake size={12} />
                      {room.isAC ? 'AC' : 'Non-AC'}
                    </span>
                    <span className={`${styles.roomTag} ${room.residents.length >= room.capacity ? styles.tagFull : styles.tagPartial}`}>
                      <Users size={12} />
                      {room.residents.length}/{room.capacity} {room.residents.length >= room.capacity ? '(Full)' : '(Partial)'}
                    </span>
                  </div>
                </div>
                <div className={styles.roomResidents}>
                  {room.residents.map((resident: any) => (
                    <div key={resident._id} className={styles.residentChip}>
                      <div className={styles.residentChipAvatar}>
                        {resident.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className={styles.residentChipInfo}>
                        <span className={styles.residentChipName}>{resident.name}</span>
                        <span className={styles.residentChipPhone}>{resident.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Home size={48} className={styles.emptyIcon} />
            <p>No rooms match the selected filters</p>
          </div>
        )}
      </Modal>
    );
  }

  if (type === 'occupancy-rate') {
    const occupancyRate = stats?.totalPersons ? Math.round((stats.activePersons / stats.totalPersons) * 100) : 0;
    const vacantRooms = (stats?.totalPersons || 0) - (stats?.activePersons || 0);

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="md">
        <div className={styles.occupancyOverview}>
          <div className={styles.occupancyCircle}>
            <svg viewBox="0 0 100 100" className={styles.occupancySvg}>
              <circle cx="50" cy="50" r="45" className={styles.occupancyBg} />
              <circle 
                cx="50" cy="50" r="45" 
                className={styles.occupancyProgress}
                style={{ 
                  strokeDasharray: `${occupancyRate * 2.83} 283`,
                  stroke: occupancyRate >= 80 ? '#00d9a5' : occupancyRate >= 50 ? '#ffc947' : '#e94560'
                }}
              />
            </svg>
            <div className={styles.occupancyValue}>
              <span className={styles.occupancyPercent}>{occupancyRate}%</span>
              <span className={styles.occupancyLabel}>Occupied</span>
            </div>
          </div>
        </div>

        <div className={styles.occupancyStats}>
          <div className={styles.occupancyStatBox}>
            <div className={styles.occupancyStatIcon} style={{ background: 'rgba(0, 217, 165, 0.15)' }}>
              <Users size={20} style={{ color: '#00d9a5' }} />
            </div>
            <div className={styles.occupancyStatInfo}>
              <span className={styles.occupancyStatValue}>{stats?.activePersons || 0}</span>
              <span className={styles.occupancyStatLabel}>Occupied Beds</span>
            </div>
          </div>
          <div className={styles.occupancyStatBox}>
            <div className={styles.occupancyStatIcon} style={{ background: 'rgba(233, 69, 96, 0.15)' }}>
              <Home size={20} style={{ color: '#e94560' }} />
            </div>
            <div className={styles.occupancyStatInfo}>
              <span className={styles.occupancyStatValue}>{vacantRooms}</span>
              <span className={styles.occupancyStatLabel}>Vacant Beds</span>
            </div>
          </div>
          <div className={styles.occupancyStatBox}>
            <div className={styles.occupancyStatIcon} style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
              <Building2 size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className={styles.occupancyStatInfo}>
              <span className={styles.occupancyStatValue}>{stats?.totalPersons || 0}</span>
              <span className={styles.occupancyStatLabel}>Total Beds</span>
            </div>
          </div>
        </div>

        <div className={styles.occupancyBreakdown}>
          <h4 className={styles.sectionTitle}>Occupancy Status</h4>
          <div className={styles.occupancyBar}>
            <div className={styles.occupancyBarFill} style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <div className={styles.occupancyLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: occupancyRate >= 80 ? '#00d9a5' : occupancyRate >= 50 ? '#ffc947' : '#e94560' }}></span>
              <span>Current: {occupancyRate}%</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#2a2a4e' }}></span>
              <span>Vacant: {100 - occupancyRate}%</span>
            </div>
          </div>
        </div>

        {occupancyRate < 80 && (
          <div className={styles.occupancyInsight}>
            <AlertCircle size={18} />
            <span>Consider promoting vacancies to improve occupancy above 80%</span>
          </div>
        )}

        {occupancyRate >= 90 && (
          <div className={styles.occupancyInsight} style={{ background: 'rgba(0, 217, 165, 0.1)', borderColor: 'rgba(0, 217, 165, 0.3)' }}>
            <Check size={18} style={{ color: '#00d9a5' }} />
            <span style={{ color: '#00d9a5' }}>Excellent! Your occupancy is above 90%</span>
          </div>
        )}
      </Modal>
    );
  }

  if (type === 'pending-amount') {
    const pendingAmount = (stats?.totalRent || 0) - (stats?.monthlyRevenue || 0);
    const overduePayments = stats?.overduePayments || 0;
    const pendingPayments = stats?.pendingPayments || 0;

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="md">
        <div className={styles.pendingOverview}>
          <div className={styles.pendingMainCard}>
            <div className={styles.pendingIcon}>
              <IndianRupee size={32} />
            </div>
            <div className={styles.pendingMainInfo}>
              <span className={styles.pendingAmount}>₹{pendingAmount.toLocaleString()}</span>
              <span className={styles.pendingLabel}>Total Pending Amount</span>
            </div>
          </div>
        </div>

        <div className={styles.pendingBreakdown}>
          <div className={styles.pendingStatBox}>
            <span className={styles.pendingStatValue} style={{ color: '#ffc947' }}>{pendingPayments}</span>
            <span className={styles.pendingStatLabel}>Pending Payments</span>
          </div>
          <div className={styles.pendingStatBox}>
            <span className={styles.pendingStatValue} style={{ color: '#e94560' }}>{overduePayments}</span>
            <span className={styles.pendingStatLabel}>Overdue Payments</span>
          </div>
        </div>

        <div className={styles.pendingSummary}>
          <h4 className={styles.sectionTitle}>Collection Summary</h4>
          <div className={styles.pendingRow}>
            <span className={styles.pendingRowLabel}>Expected Monthly Rent</span>
            <span className={styles.pendingRowValue}>₹{(stats?.totalRent || 0).toLocaleString()}</span>
          </div>
          <div className={styles.pendingRow}>
            <span className={styles.pendingRowLabel}>Collected Amount</span>
            <span className={styles.pendingRowValue} style={{ color: '#00d9a5' }}>₹{(stats?.monthlyRevenue || 0).toLocaleString()}</span>
          </div>
          <div className={`${styles.pendingRow} ${styles.pendingRowHighlight}`}>
            <span className={styles.pendingRowLabel}>Pending Amount</span>
            <span className={styles.pendingRowValue}>₹{pendingAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.pendingProgress}>
          <div className={styles.pendingProgressBar}>
            <div 
              className={styles.pendingProgressFill}
              style={{ width: `${Math.min(((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1)) * 100, 100)}%` }}
            ></div>
          </div>
          <span className={styles.pendingProgressLabel}>
            {((stats?.monthlyRevenue || 0) / (stats?.totalRent || 1) * 100).toFixed(1)}% Collected
          </span>
        </div>

        {pendingPayments > 0 || overduePayments > 0 ? (
          <div className={styles.pendingInsight}>
            <AlertCircle size={18} />
            <span>Follow up on pending payments to improve collection rate</span>
          </div>
        ) : (
          <div className={styles.pendingInsight} style={{ background: 'rgba(0, 217, 165, 0.1)', borderColor: 'rgba(0, 217, 165, 0.3)' }}>
            <Check size={18} style={{ color: '#00d9a5' }} />
            <span style={{ color: '#00d9a5' }}>All payments collected! Excellent work.</span>
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="lg">
      <div className={styles.stats}>
        <div className={styles.statBox}>
          <span className={styles.statNumber}>{filteredPersons?.length || 0}</span>
          <span className={styles.statLabel}>
            {type === 'total-residents' ? 'Total' : 'Active'} Residents
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNumber}>
            ₹{filteredPersons?.reduce((sum: number, p: any) => sum + (p.monthlyRent || 0), 0).toLocaleString()}
          </span>
          <span className={styles.statLabel}>Total Monthly Rent</span>
        </div>
      </div>

      {filteredPersons && filteredPersons.length > 0 ? (
        <div className={styles.personList}>
          {filteredPersons.map((person: any) => (
            <div key={person._id} className={styles.personCard}>
              <div className={styles.personHeader}>
                <div className={styles.personAvatar}>
                  {person.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className={styles.personBasic}>
                  <span className={styles.personName}>{person.name}</span>
                  <span className={`${styles.badge} ${person.isActive ? styles.active : styles.inactive}`}>
                    {person.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className={styles.personDetails}>
                <div className={styles.detailRow}>
                  <Phone size={14} />
                  <span>{person.phone}</span>
                </div>
                {person.email && (
                  <div className={styles.detailRow}>
                    <Mail size={14} />
                    <span>{person.email}</span>
                  </div>
                )}
                {(person.roomNumber || person.blockName) && (
                  <div className={styles.detailRow}>
                    <MapPin size={14} />
                    <span>{getBlockRoom(person)}</span>
                  </div>
                )}
                {person.moveInDate && (
                  <div className={styles.detailRow}>
                    <Calendar size={14} />
                    <span>Moved in: {formatDate(person.moveInDate)}</span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <CreditCard size={14} />
                  <span>₹{person.monthlyRent?.toLocaleString()}/month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <User size={48} className={styles.emptyIcon} />
          <p>No residents found</p>
        </div>
      )}
    </Modal>
  );
}
