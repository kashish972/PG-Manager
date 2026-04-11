# PG Manager - Multi-Tenant Property Management System

## 1. Project Overview

**Project Name:** PG Manager  
**Type:** Full-stack Next.js Web Application  
**Core Functionality:** Multi-tenant PG (Paying Guest) management system where each PG has its own isolated database. Manage tenants, track rent payments, and maintain resident information.  
**Target Users:** PG Owners, PG Admins, and Members (Tenants)

## 2. Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB (separate database per PG/tenant)
- **Server Actions:** For form submissions and mutations
- **React Query:** For data fetching and caching
- **Authentication:** NextAuth.js with credentials provider
- **UI:** Custom CSS with modern design
- **Form Handling:** React Hook Form + Zod validation

## 3. Database Schema (Multi-Tenant)

Each PG gets its own MongoDB database: `pg_{tenant_id}`

### Collections:

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: "owner" | "admin" | "member",
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Persons Collection (PG Residents)
```javascript
{
  _id: ObjectId,
  name: String,
  aadharCard: String (encrypted),
  phone: String,
  email: String,
  address: String,
  roomNumber: String,
  moveInDate: Date,
  monthlyRent: Number,
  securityDeposit: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. RentPayments Collection
```javascript
{
  _id: ObjectId,
  personId: ObjectId,
  amount: Number,
  paymentDate: Date,
  month: String, // "2024-01" format
  status: "paid" | "pending" | "overdue",
  paymentMethod: "cash" | "transfer" | "upi",
  notes: String,
  createdAt: Date
}
```

## 4. Multi-Tenant Architecture

- **Super Admin:** Manages all PGs (separate collection in main db)
- **Tenant Isolation:** Each PG has own MongoDB database
- **Connection Pool:** Dynamic database connection based on subdomain/path
- **Data Separation:** All queries filtered by tenant_id

## 5. User Roles & Permissions

| Feature | Owner | Admin | Member |
|---------|------|-------|--------|
| Create PG | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✓ | ✗ |
| Add/Edit Persons | ✓ | ✓ | ✗ |
| View Persons | ✓ | ✓ | ✓ |
| Rent Payments | ✓ | ✓ | View Own |
| Dashboard | ✓ | ✓ | Limited |
| Settings | ✓ | ✓ | Own Profile |

## 6. UI/UX Specification

### Color Palette
- **Primary:** #1a1a2e (Dark Navy)
- **Secondary:** #16213e (Deep Blue)
- **Accent:** #e94560 (Coral Red)
- **Success:** #00d9a5 (Mint Green)
- **Warning:** #ffc947 (Amber)
- **Background:** #0f0f23 (Almost Black)
- **Surface:** #1f1f3a (Card Background)
- **Text Primary:** #ffffff
- **Text Secondary:** #a0a0b0

### Typography
- **Font Family:** "Outfit" (headings), "DM Sans" (body)
- **Headings:** 2.5rem (h1), 2rem (h2), 1.5rem (h3)
- **Body:** 1rem
- **Small:** 0.875rem

### Layout
- **Sidebar:** Fixed 260px, collapsible on mobile
- **Main Content:** Fluid with max-width 1400px
- **Cards:** 16px padding, 12px border-radius
- **Spacing:** 8px base unit

### Components
- **Buttons:** Primary (coral), Secondary (outlined), Ghost
- **Inputs:** Dark background, 8px padding, focus glow
- **Tables:** Striped rows, hover highlight
- **Modals:** Center overlay with backdrop blur
- **Toasts:** Bottom-right notifications

## 7. Pages & Routes

### Public Routes
- `/` - Landing/Login page
- `/register` - PG registration (Owner only)
- `/login` - User login

### Protected Routes (Require Auth)
- `/dashboard` - Main dashboard with stats
- `/persons` - Resident management (CRUD)
- `/persons/add` - Add new resident
- `/persons/[id]` - View/Edit resident
- `/payments` - Rent payment management
- `/payments/add` - Record new payment
- `/users` - User management (Owner/Admin only)
- `/settings` - PG settings

## 8. API & Server Actions

### Server Actions
- `registerPG` - Create new PG (Owner registration)
- `loginUser` - Authenticate user
- `createPerson` - Add new resident
- `updatePerson` - Update resident info
- `deletePerson` - Remove resident
- `createPayment` - Record rent payment
- `updatePayment` - Update payment
- `getDashboardStats` - Fetch dashboard data

### React Query Hooks
- `usePersons` - Fetch all persons
- `usePerson` - Fetch single person
- `usePayments` - Fetch payments
- `useDashboardStats` - Fetch stats

## 9. Feature List

### Core Features
1. **Multi-Tenant Setup**
   - Create new PG with separate database
   - Subdomain/path-based tenant identification
   - Tenant settings management

2. **User Management**
   - Role-based access control
   - Invite admins/members
   - Profile management

3. **Person Management**
   - Add/Edit/Delete residents
   - Store: name, Aadhar, phone, email, address
   - Room assignment
   - Move-in date tracking

4. **Rent Management**
   - Monthly rent tracking per person
   - Payment status (paid/pending/overdue)
   - Due date calculation
   - Payment history

5. **Dashboard**
   - Total residents count
   - Monthly revenue
   - Pending payments
   - Recent activity

## 10. Acceptance Criteria

- [ ] User can register a new PG as Owner
- [ ] Users can login with correct credentials
- [ ] Owner can add Admin and Member users
- [ ] Admin can add/edit/delete persons
- [ ] Person stores all required details (Aadhar, etc.)
- [ ] Rent payments can be recorded with status
- [ ] Dashboard shows accurate statistics
- [ ] Multi-tenant isolation is working
- [ ] Role-based access is enforced
- [ ] Responsive UI works on all devices