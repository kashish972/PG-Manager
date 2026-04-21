<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - PG Manager Development Guide

## Build, Lint & Test Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build           # Production build
npm run start           # Start production server

# Linting
npm run lint            # Run ESLint on entire project
npm run lint -- --fix   # Auto-fix linting issues
```

> **Note**: No test framework configured yet. Run a single test when added with: `npm test -- --testPathPattern="filename"` or `npm test -- -t "test name"`

---

## Project Structure

```
pg-manager/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Auth routes (login, register)
│   │   ├── (protected)/ # Protected routes (dashboard, etc.)
│   │   └── api/          # API routes
│   ├── actions/          # Server Actions
│   ├── components/       # React components
│   │   ├── layout/       # Layout components (Sidebar, MainLayout)
│   │   └── ui/           # UI components (Button, Form)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries (auth, db)
│   ├── repositories/     # Data access layer
│   └── types/            # TypeScript types
└── .env.local            # Environment variables
```

---

## Code Style Guidelines

### Imports
- Use absolute imports with `@/` prefix (e.g., `@/components/layout/Sidebar`)
- Group imports: external → internal → relative
- Order: React/Next imports → external libs → @/ imports → relative imports

```typescript
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { userRepository } from '@/repositories/user.repository';
import styles from './page.module.css';
```

### Types & Interfaces
- Use interfaces for objects, types for unions/primitives
- Prefix interfaces with `I` for complex types (e.g., `IUser`)
- Use explicit return types for server actions and utilities

```typescript
interface IUser {
  _id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'member';
}
```

### Naming Conventions
- **Files**: kebab-case (e.g., `dashboard-page.tsx`, `user-list.tsx`)
- **Components**: PascalCase (e.g., `MainLayout.tsx`, `Sidebar.tsx`)
- **Functions/variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Classes**: PascalCase (e.g., `UserRepository`)
- **Repositories**: `<Entity>Repository` pattern

### Component Patterns
- Client components: Add `'use client'` at top
- Server components: Default (no directive needed)
- Use functional components only (no class components)
- Destructure props where possible
- Define interfaces for all component props

```typescript
'use client';

import { useState } from 'react';

interface Props {
  title: string;
  onSubmit: (data: Data) => void;
}

export function MyComponent({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

### CSS Modules
- Use `.module.css` suffix for component styles
- Follow BEM-like naming: `.block`, `.blockElement`, `.block--modifier`
- Co-locate CSS with component in same directory

```css
.container { }
.header { }
.button { }
.button:disabled { }
.error { }
```

### Error Handling
- Use try/catch for async operations, especially DB calls
- Return error objects from server actions: `{ error: 'message' }`
- Log errors with console.error for debugging
- Never expose sensitive info in error messages

```typescript
// Server Action
export async function createUser(formData: FormData): Promise<{ success: boolean } | { error: string }> {
  try {
    // ... logic
    return { success: true };
  } catch (error) {
    console.error('Create user error:', error);
    return { error: 'Failed to create user' };
  }
}
```

### Formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Always use curly braces for conditionals, even single-line
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer early returns to reduce nesting

---

## MongoDB Conventions
- Use `ObjectId` from mongodb for ID fields
- Connect to tenant DBs via `connectToTenantDb(tenantId)`
- Main DB: `pgmanager_main`, Tenant DBs: `pg_<tenantSlug>`
- Use repositories for all DB operations

---

## Authentication (NextAuth)
- Use JWT strategy with `maxAge: 30 days`
- Extend session types for custom fields (id, role, tenantId)
- Roles: `owner`, `admin`, `member` (defined in auth.ts)

---

## Key Technologies
- **Framework**: Next.js 16.2.3 (App Router, Turbopack)
- **Auth**: NextAuth.js v4 (credentials provider)
- **DB**: MongoDB with mongodb driver
- **Forms**: React Hook Form + Zod
- **State**: React Query (TanStack Query)

---

## Environment Variables
```
MONGO_URI=mongodb://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```