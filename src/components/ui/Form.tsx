'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styles from './Form.module.css';

const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  aadharCard: z.string().min(12, 'Aadhar must be 12 digits').max(12),
  phone: z.string().min(10, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email').optional(),
  address: z.string().optional(),
  roomNumber: z.string().min(1, 'Room number is required'),
  moveInDate: z.string().min(1, 'Move in date is required'),
  monthlyRent: z.number().min(0, 'Rent must be positive'),
  securityDeposit: z.number().min(0, 'Deposit must be positive'),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  onSubmit: (data: PersonFormData) => void;
  defaultValues?: Partial<PersonFormData>;
  isLoading?: boolean;
}

export function PersonForm({ onSubmit, defaultValues, isLoading }: PersonFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Name *</label>
          <input {...register('name')} className={styles.input} />
          {errors.name && <span className={styles.error}>{errors.name.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Aadhar Card *</label>
          <input {...register('aadharCard')} className={styles.input} maxLength={12} />
          {errors.aadharCard && <span className={styles.error}>{errors.aadharCard.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Phone *</label>
          <input {...register('phone')} className={styles.input} maxLength={10} />
          {errors.phone && <span className={styles.error}>{errors.phone.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input {...register('email')} type="email" className={styles.input} />
          {errors.email && <span className={styles.error}>{errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Address</label>
          <input {...register('address')} className={styles.input} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Room Number *</label>
          <input {...register('roomNumber')} className={styles.input} />
          {errors.roomNumber && <span className={styles.error}>{errors.roomNumber.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Move In Date *</label>
          <input {...register('moveInDate')} type="date" className={styles.input} />
          {errors.moveInDate && <span className={styles.error}>{errors.moveInDate.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Monthly Rent *</label>
          <input {...register('monthlyRent', { valueAsNumber: true })} type="number" className={styles.input} />
          {errors.monthlyRent && <span className={styles.error}>{errors.monthlyRent.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Security Deposit *</label>
          <input {...register('securityDeposit', { valueAsNumber: true })} type="number" className={styles.input} />
          {errors.securityDeposit && <span className={styles.error}>{errors.securityDeposit.message}</span>}
        </div>
      </div>

      <button type="submit" disabled={isLoading} className={styles.submitBtn}>
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}

const paymentSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  month: z.string().min(1, 'Month is required'),
  status: z.enum(['paid', 'pending', 'overdue']),
  paymentMethod: z.enum(['cash', 'transfer', 'upi']),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  defaultValues?: Partial<PaymentFormData>;
  isLoading?: boolean;
}

export function PaymentForm({ onSubmit, defaultValues, isLoading }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Person *</label>
          <select {...register('personId')} className={styles.select}>
            <option value="">Select Person</option>
          </select>
          {errors.personId && <span className={styles.error}>{errors.personId.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Amount *</label>
          <input {...register('amount', { valueAsNumber: true })} type="number" className={styles.input} />
          {errors.amount && <span className={styles.error}>{errors.amount.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Payment Date *</label>
          <input {...register('paymentDate')} type="date" className={styles.input} />
          {errors.paymentDate && <span className={styles.error}>{errors.paymentDate.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Month *</label>
          <input {...register('month')} type="month" className={styles.input} />
          {errors.month && <span className={styles.error}>{errors.month.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Status *</label>
          <select {...register('status')} className={styles.select}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Payment Method *</label>
          <select {...register('paymentMethod')} className={styles.select}>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Notes</label>
          <textarea {...register('notes')} className={styles.textarea} />
        </div>
      </div>

      <button type="submit" disabled={isLoading} className={styles.submitBtn}>
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}