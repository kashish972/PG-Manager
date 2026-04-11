import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IRentPayment, CreatePaymentInput } from '@/types';

export class PaymentRepository {
  async create(tenantId: string, input: CreatePaymentInput): Promise<IRentPayment> {
    const db = await connectToTenantDb(tenantId);
    
    const payment: Omit<IRentPayment, '_id'> = {
      personId: new ObjectId(input.personId),
      amount: input.amount,
      paymentDate: input.paymentDate,
      month: input.month,
      status: input.status,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      createdAt: new Date(),
    };
    
    const result = await db.collection<IRentPayment>('rentPayments').insertOne(payment as IRentPayment);
    return { ...payment, _id: result.insertedId } as IRentPayment;
  }

  async findById(id: string, tenantId: string): Promise<IRentPayment | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IRentPayment>('rentPayments').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IRentPayment>('rentPayments').find().sort({ paymentDate: -1 }).toArray();
  }

  async findByPerson(personId: string, tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IRentPayment>('rentPayments')
      .find({ personId: new ObjectId(personId) })
      .sort({ paymentDate: -1 })
      .toArray();
  }

  async findByMonth(month: string, tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IRentPayment>('rentPayments').find({ month }).toArray();
  }

  async findPending(tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IRentPayment>('rentPayments').find({ status: 'pending' }).toArray();
  }

  async update(id: string, tenantId: string, input: Partial<CreatePaymentInput>): Promise<IRentPayment | null> {
    const db = await connectToTenantDb(tenantId);
    
    const updateData: any = { ...input };
    if (input.personId) {
      updateData.personId = new ObjectId(input.personId);
    }
    
    await db.collection<IRentPayment>('rentPayments').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IRentPayment>('rentPayments').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async countByStatus(tenantId: string): Promise<{ paid: number; pending: number; overdue: number }> {
    const db = await connectToTenantDb(tenantId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    
    const result = await db.collection<IRentPayment>('rentPayments').aggregate(pipeline).toArray();
    
    const counts = { paid: 0, pending: 0, overdue: 0 };
    result.forEach((r) => {
      if (r._id in counts) {
        counts[r._id as keyof typeof counts] = r.count;
      }
    });
    
    return counts;
  }

  async getMonthlyRevenue(tenantId: string, month: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $match: { month, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const result = await db.collection<IRentPayment>('rentPayments').aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }

  async getPaidPaymentsByMonth(tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return db.collection<IRentPayment>('rentPayments')
      .find({ month: currentMonth, status: 'paid' })
      .toArray();
  }

  async getPendingPaymentsByMonth(tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return db.collection<IRentPayment>('rentPayments')
      .find({ month: currentMonth, status: 'pending' })
      .toArray();
  }

  async getOverduePayments(tenantId: string): Promise<IRentPayment[]> {
    const db = await connectToTenantDb(tenantId);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const previousMonths = [];
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      previousMonths.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    return db.collection<IRentPayment>('rentPayments')
      .find({ 
        status: { $in: ['pending', 'overdue'] },
        $or: [
          { month: { $in: previousMonths } },
          { month: currentMonth, status: 'overdue' }
        ]
      })
      .toArray();
  }
}

export const paymentRepository = new PaymentRepository();