'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { personRepository } from '@/repositories/person.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import { maintenanceRepository } from '@/repositories/maintenance.repository';
import { blockRepository } from '@/repositories/block.repository';

export async function getAnalyticsData() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return null;
  }

  const tenantId = session.user.tenantId;

  try {
    const blocks = await blockRepository.findAll(tenantId);
    
    const totalRooms = blocks.reduce((sum, block) => sum + block.rooms.length, 0);
    
    const persons = await personRepository.findAll(tenantId);
    const activePersons = persons.filter(p => p.isActive && p.roomNumber && p.blockId);
    
    const occupiedRoomSet = new Set<string>();
    activePersons.forEach(p => {
      if (p.blockId && p.roomNumber) {
        occupiedRoomSet.add(`${p.blockId}:${p.roomNumber}`);
      }
    });
    
    const occupiedRooms = occupiedRoomSet.size;
    const availableRooms = totalRooms - occupiedRooms;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const totalRent = activePersons.reduce((sum, p) => sum + (p.monthlyRent || 0), 0);
    const avgRent = activePersons.length > 0 ? Math.round(totalRent / activePersons.length) : 0;

    const payments = await paymentRepository.findAll(tenantId);
    const paidPayments = payments.filter(p => p.status === 'paid');
    const totalCollected = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const maintenanceStats = await maintenanceRepository.countByStatus(tenantId);
    const openRequests = maintenanceStats.pending + maintenanceStats.in_progress;

    const months: { [key: string]: number } = {};
    const last6Months: string[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      months[monthKey] = 0;
      last6Months.push(monthKey);
    }

    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (const month of last6Months) {
      const monthPayments = payments.filter(p => p.month === month && p.status === 'paid');
      const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const monthName = new Date(month + '-01').toLocaleString('default', { month: 'short' });
      monthlyRevenue.push({ month: monthName, revenue });
    }

    const blockWiseOccupancy = blocks.map(block => {
      const blockRoomSet = new Set(block.rooms.map(r => r.roomNumber));
      const blockOccupied = Array.from(occupiedRoomSet).filter(key => {
        const [blockId, roomNum] = key.split(':');
        return blockId === String(block._id) && blockRoomSet.has(roomNum);
      }).length;
      const blockTotal = block.rooms.length;
      const blockAvailable = blockTotal - blockOccupied;

      const acRooms = block.rooms.filter(r => r.isAC);
      const nonAcRooms = block.rooms.filter(r => !r.isAC);
      
      const acOccupied = acRooms.filter(r => occupiedRoomSet.has(`${String(block._id)}:${r.roomNumber}`)).length;
      const nonAcOccupied = nonAcRooms.filter(r => occupiedRoomSet.has(`${String(block._id)}:${r.roomNumber}`)).length;

      return {
        _id: String(block._id),
        name: block.name,
        total: blockTotal,
        occupied: blockOccupied,
        available: blockAvailable,
        occupancyRate: blockTotal > 0 ? Math.round((blockOccupied / blockTotal) * 100) : 0,
        ac: {
          total: acRooms.length,
          occupied: acOccupied,
          available: acRooms.length - acOccupied,
        },
        nonAc: {
          total: nonAcRooms.length,
          occupied: nonAcOccupied,
          available: nonAcRooms.length - nonAcOccupied,
        },
      };
    });

    return {
      occupancy: {
        total: totalRooms,
        occupied: occupiedRooms,
        available: availableRooms,
        rate: occupancyRate,
      },
      revenue: {
        totalCollected,
        monthly: totalRent,
        averageRent: avgRent,
        projectedAnnual: totalRent * 12,
        monthlyTrend: monthlyRevenue,
      },
      maintenance: {
        open: openRequests,
        pending: maintenanceStats.pending,
        inProgress: maintenanceStats.in_progress,
        resolved: maintenanceStats.resolved,
      },
      persons: {
        total: persons.length,
        active: activePersons.length,
        inactive: persons.length - activePersons.length,
      },
      blocks: blockWiseOccupancy,
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return null;
  }
}