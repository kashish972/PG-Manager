import { ObjectId } from 'mongodb';

export type UserRole = 'owner' | 'admin' | 'member';

export interface IUser {
  _id: ObjectId;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPerson {
  _id: ObjectId;
  name: string;
  aadharCard: string;
  phone: string;
  email?: string;
  address?: string;
  blockId?: string;
  roomNumber: string;
  moveInDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoom {
  roomNumber: string;
  capacity: number;
  isAC: boolean;
}

export interface IBlock {
  _id: ObjectId;
  name: string;
  rooms: IRoom[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPG {
  _id: ObjectId;
  name: string;
  slug: string;
  address: string;
  ownerId: ObjectId;
  monthlyRent: number;
  totalRooms: number;
  defaultCapacity: number;
  roomMappings?: { [key: string]: string };
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'cash' | 'transfer' | 'upi';

export interface IRentPayment {
  _id: ObjectId;
  personId: ObjectId;
  amount: number;
  paymentDate: Date;
  month: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: Date;
}

export interface IPG {
  _id: ObjectId;
  name: string;
  slug: string;
  address: string;
  ownerId: ObjectId;
  monthlyRent: number;
  totalRooms: number;
  roomMappings?: { [key: string]: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalPersons: number;
  activePersons: number;
  totalRent: number;
  pendingPayments: number;
  paidPayments: number;
  overduePayments: number;
  monthlyRevenue: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface CreatePersonInput {
  name: string;
  aadharCard: string;
  phone: string;
  email?: string;
  address?: string;
  blockId?: string;
  roomNumber: string;
  moveInDate: Date;
  monthlyRent: number;
  securityDeposit: number;
}

export interface UpdatePersonInput extends Partial<CreatePersonInput> {
  isActive?: boolean;
}

export interface CreatePaymentInput {
  personId: string;
  amount: number;
  paymentDate: Date;
  month: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreatePGInput {
  name: string;
  slug: string;
  address: string;
  monthlyRent: number;
  totalRooms?: number;
  defaultCapacity?: number;
}

export type NoticePriority = 'low' | 'medium' | 'high';

export interface INotice {
  _id: ObjectId;
  title: string;
  content: string;
  priority: NoticePriority;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MaintenancePriority = 'low' | 'medium' | 'high';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'resolved';

export interface IMaintenanceRequest {
  _id: ObjectId;
  personId: ObjectId;
  issue: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface IVisitor {
  _id: ObjectId;
  personId: ObjectId;
  visitorName: string;
  phone?: string;
  purpose: string;
  inTime: Date;
  outTime?: Date;
  vehicleNumber?: string;
  createdAt: Date;
}

export type InventoryCondition = 'good' | 'fair' | 'needs_repair' | 'replaced';

export interface IInventoryItem {
  _id: ObjectId;
  name: string;
  category: string;
  quantity: number;
  condition: InventoryCondition;
  location: string;
  lastServiced?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedback {
  _id: ObjectId;
  personId?: ObjectId;
  rating: number;
  comments?: string;
  isAnonymous: boolean;
  createdAt: Date;
}

export type ChecklistType = 'move_in' | 'move_out';

export interface IChecklistItem {
  item: string;
  isChecked: boolean;
  notes?: string;
}

export interface IChecklist {
  _id: ObjectId;
  personId: ObjectId;
  type: ChecklistType;
  items: IChecklistItem[];
  status: 'pending' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export type ComplaintCategory = 'noise' | 'maintenance' | 'safety' | 'billing' | 'other';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';
export type ComplaintPriority = 'low' | 'medium' | 'high';

export interface IComplaint {
  _id: ObjectId;
  personId: ObjectId;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplaintInput {
  category: ComplaintCategory;
  subject: string;
  description: string;
  priority: ComplaintPriority;
}

export interface UpdateComplaintInput extends Partial<CreateComplaintInput> {
  status?: ComplaintStatus;
  resolution?: string;
}

export type StaffRole = 'caretaker' | 'cook' | 'security' | 'cleaner' | 'manager' | 'maintenance' | 'other';

export interface IStaff {
  _id: ObjectId;
  name: string;
  phone: string;
  role: StaffRole;
  joinDate: Date;
  salary: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalaryPayment {
  _id: ObjectId;
  staffId: ObjectId;
  amount: number;
  month: string;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateStaffInput {
  name: string;
  phone: string;
  role: StaffRole;
  joinDate: Date;
  salary: number;
}

export interface UpdateStaffInput extends Partial<CreateStaffInput> {
  isActive?: boolean;
}

export interface CreateSalaryInput {
  staffId: string;
  amount: number;
  month: string;
  paymentDate: Date;
  notes?: string;
}