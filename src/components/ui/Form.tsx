'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { getBlocks } from '@/actions/block.actions';
import { getPersons } from '@/actions/person.actions';
import { ImageUpload } from '@/components/ui/ImageUpload';
import styles from './Form.module.css';

const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  aadharCard: z.string().min(12, 'Aadhar must be 12 digits').max(12),
  phone: z.string().min(10, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email').optional(),
  address: z.string().optional(),
  blockId: z.string().min(1, 'Block is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  moveInDate: z.string().min(1, 'Move in date is required'),
  monthlyRent: z.number().min(0, 'Rent must be positive'),
  securityDeposit: z.number().min(0, 'Deposit must be positive'),
  aadharCardImage: z.string().optional(),
  photo: z.string().optional(),
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
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues,
  });

const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [aadharImage, setAadharImage] = useState(defaultValues?.aadharCardImage || '');
  const [photo, setPhoto] = useState(defaultValues?.photo || '');

  useEffect(() => {
    console.log('Fetching blocks...ajiaa123');
    getBlocks().then(data => {
      setBlocks(data || []);
      setIsLoaded(true);
    }).catch((err) => {
      console.log('blocks error:', err);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded && defaultValues && defaultValues.blockId) {
      reset({
        ...defaultValues,
        blockId: String(defaultValues.blockId),
        roomNumber: String(defaultValues.roomNumber || ''),
      });
    }
  }, [isLoaded, defaultValues, reset]);

  const selectedBlockId = watch('blockId');

  const getCurrentBlockRooms = () => {
    if (!selectedBlockId) return [];
    const block = blocks.find(b => String(b._id) === selectedBlockId);
    return block?.rooms || [];
  };

  const getDefaultBlockRooms = () => {
    if (!defaultValues?.blockId || !blocks.length) return [];
    const block = blocks.find(b => String(b._id) === String(defaultValues.blockId));
    return block?.rooms || [];
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <input type="hidden" {...register('aadharCardImage')} value={aadharImage} />
      <input type="hidden" {...register('photo')} value={photo} />
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
          <ImageUpload
            value={photo}
            onChange={(url) => {
              setPhoto(url);
              setValue('photo', url);
            }}
            label="Resident Photo"
          />
        </div>

        <div className={styles.field}>
          <ImageUpload
            value={aadharImage}
            onChange={(url) => {
              setAadharImage(url);
              setValue('aadharCardImage', url);
            }}
            label="Aadhar Card Image"
            aspectRatio="landscape"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Block *</label>
          <select {...register('blockId')} className={styles.select}>
            <option value="">Select Block</option>
            {blocks.map(block => (
              <option key={block._id} value={String(block._id)}>{block.name}</option>
            ))}
          </select>
          {errors.blockId && <span className={styles.error}>{errors.blockId.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Room Number *</label>
          <select {...register('roomNumber')} className={styles.select}>
            <option value="">Select Room</option>
            {(selectedBlockId ? getCurrentBlockRooms() : defaultValues?.blockId ? getDefaultBlockRooms() : []).map((room: any) => (
              <option key={room.roomNumber} value={room.roomNumber}>Room {room.roomNumber}</option>
            ))}
          </select>
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

  const [persons, setPersons] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    getPersons().then(data => {
      setPersons(data || []);
      return getBlocks();
    }).then(blockData => {
      setBlocks(blockData || []);
    }).catch(() => {});
  }, []);

  const getPersonDisplay = (person: any) => {
    if (!person) return '';
    const block = blocks.find(b => String(b._id) === String(person.blockId));
    const blockName = block?.name || '';
    const roomNum = person.roomNumber || '';
    return blockName ? `${person.name} (${blockName} - Room ${roomNum})` : roomNum ? `${person.name} (Room ${roomNum})` : person.name;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Person *</label>
          <select {...register('personId')} className={styles.select}>
            <option value="">Select Person</option>
            {persons.map(person => (
              <option key={person._id} value={person._id}>
                {getPersonDisplay(person)}
              </option>
            ))}
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