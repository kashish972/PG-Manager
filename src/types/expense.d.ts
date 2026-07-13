export interface IExpense {
  _id?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  isDeductible: boolean;
  receiptUrl?: string;
  notes?: string;
  createdAt?: Date;
}

export type ExpenseCategory = 
  | 'electricity'
  | 'water'
  | 'maintenance'
  | 'staff_salary'
  | 'internet'
  | 'security'
  | 'cleaning'
  | 'repairs'
  | 'furniture'
  | 'other';
