import { ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { ISalaryPayment, CreateSalaryInput } from '@/types';

export class SalaryRepository {
  async create(tenantId: string, input: CreateSalaryInput): Promise<ISalaryPayment> {
    const db = await connectToTenantDb(tenantId);
    
    const payment: Omit<ISalaryPayment, '_id'> = {
      staffId: new ObjectId(input.staffId),
      amount: input.amount,
      month: input.month,
      paymentDate: input.paymentDate,
      notes: input.notes,
      createdAt: new Date(),
    };
    
    const result = await db.collection<ISalaryPayment>('salaryPayments').insertOne(payment as ISalaryPayment);
    return { ...payment, _id: result.insertedId } as ISalaryPayment;
  }

  async findById(id: string, tenantId: string): Promise<ISalaryPayment | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<ISalaryPayment>('salaryPayments').findOne({ _id: new ObjectId(id) });
  }

  async findByStaff(staffId: string, tenantId: string): Promise<ISalaryPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<ISalaryPayment>('salaryPayments')
      .find({ staffId: new ObjectId(staffId) })
      .sort({ month: -1 })
      .toArray();
  }

  async findByMonth(month: string, tenantId: string): Promise<ISalaryPayment[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<ISalaryPayment>('salaryPayments')
      .find({ month })
      .sort({ paymentDate: -1 })
      .toArray();
  }

  async isMonthPaid(staffId: string, month: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const payment = await db.collection<ISalaryPayment>('salaryPayments').findOne({
      staffId: new ObjectId(staffId),
      month,
    });
    return !!payment;
  }

  async getPaidMonths(staffId: string, tenantId: string): Promise<string[]> {
    const db = await connectToTenantDb(tenantId);
    const payments = await db.collection<ISalaryPayment>('salaryPayments')
      .find({ staffId: new ObjectId(staffId) })
      .toArray();
    return payments.map(p => p.month);
  }

  async getTotalPaidForStaff(staffId: string, tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $match: { staffId: new ObjectId(staffId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const result = await db.collection<ISalaryPayment>('salaryPayments').aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }

  async getTotalPaidThisMonth(tenantId: string): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const result = await db.collection<ISalaryPayment>('salaryPayments').aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<ISalaryPayment>('salaryPayments').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

export const salaryRepository = new SalaryRepository();
