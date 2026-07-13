'use server';

import { connectToTenantDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { IExpense, ExpenseCategory } from '@/types/expense';

export async function addExpense(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const category = formData.get('category') as ExpenseCategory;
    const description = formData.get('description') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const date = new Date(formData.get('date') as string);
    const isDeductible = formData.get('isDeductible') === 'true';
    const notes = formData.get('notes') as string;

    if (!category || !description || !amount || !date) {
      return { success: false, error: 'All required fields must be filled' };
    }

    const db = await connectToTenantDb(process.env.TENANT_ID!);
    await db.collection('expenses').insertOne({
      category,
      description,
      amount,
      date,
      isDeductible,
      notes,
      createdAt: new Date(),
    });

    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Add expense error:', error);
    return { success: false, error: 'Failed to add expense' };
  }
}

export async function getExpenses(startDate?: string, endDate?: string): Promise<IExpense[]> {
  try {
    const db = await connectToTenantDb(process.env.TENANT_ID!);
    const query: any = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const expenses = await db.collection('expenses')
      .find(query)
      .sort({ date: -1 })
      .toArray();
    
    return JSON.parse(JSON.stringify(expenses));
  } catch (error) {
    console.error('Get expenses error:', error);
    return [];
  }
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await connectToTenantDb(process.env.TENANT_ID!);
    await db.collection('expenses').deleteOne({ _id: new ObjectId(id) });
    
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Delete expense error:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}

export async function getExpenseCategories(): Promise<{ category: ExpenseCategory; label: string }[]> {
  return [
    { category: 'electricity', label: 'Electricity' },
    { category: 'water', label: 'Water' },
    { category: 'maintenance', label: 'Maintenance' },
    { category: 'staff_salary', label: 'Staff Salary' },
    { category: 'internet', label: 'Internet/WiFi' },
    { category: 'security', label: 'Security' },
    { category: 'cleaning', label: 'Cleaning' },
    { category: 'repairs', label: 'Repairs' },
    { category: 'furniture', label: 'Furniture/Appliances' },
    { category: 'other', label: 'Other' },
  ];
}
