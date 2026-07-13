import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function getEffectiveTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  if (session.user.role === 'superadmin') {
    const cookieStore = await cookies();
    const activeTenant = cookieStore.get('superadmin_active_tenant')?.value;
    if (activeTenant) {
      return activeTenant;
    }
  }

  return session.user.tenantId || null;
}
