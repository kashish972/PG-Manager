import { connectToTenantDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { IExpense } from '@/types/expense';

export class ExpenseRepository {
  async create(tenantId: string, input: Omit<IExpense, '_id' | 'createdAt'>): Promise<IExpense> {
    const db = await connectToTenantDb(tenantId);
    const expense: Omit<IExpense, '_id'> = {
      ...input,
      createdAt: new Date(),
    };
    const result = await db.collection('expenses').insertOne(expense);
    return { ...expense, _id: result.insertedId.toString() } as IExpense;
  }

  async findAll(tenantId: string, startDate?: Date, endDate?: Date): Promise<IExpense[]> {
    const db = await connectToTenantDb(tenantId);
    const query: any = {};
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const expenses = await db.collection('expenses')
      .find(query)
      .sort({ date: -1 })
      .toArray();
    
    return JSON.parse(JSON.stringify(expenses)) as IExpense[];
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getCategoryTotals(tenantId: string, startDate?: Date, endDate?: Date): Promise<{ category: string; total: number; deductible: number; nonDeductible: number }[]> {
    const db = await connectToTenantDb(tenantId);
    const match: any = {};
    
    if (startDate && endDate) {
      match.date = { $gte: startDate, $lte: endDate };
    }
    
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          deductible: {
            $sum: {
              $cond: [{ $eq: ['$isDeductible', true] }, '$amount', 0]
            }
          },
          nonDeductible: {
            $sum: {
              $cond: [{ $eq: ['$isDeductible', false] }, '$amount', 0]
            }
          }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          deductible: 1,
          nonDeductible: 1,
          _id: 0
        }
      }
    ];
    
    const result = await db.collection('expenses').aggregate(pipeline).toArray();
    return JSON.parse(JSON.stringify(result));
  }
}
