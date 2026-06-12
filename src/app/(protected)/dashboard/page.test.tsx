import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
  session: {
    data: {
      user: {
        role: 'owner',
        tenantId: 'alpha-pg',
        name: 'Owner Test',
      },
    },
    status: 'authenticated',
  },
  dashboardHook: {
    data: {
      totalPersons: 15,
      activePersons: 12,
      totalRent: 90000,
      pendingPayments: 3,
      paidPayments: 9,
      overduePayments: 1,
      monthlyRevenue: 72000,
    },
    isLoading: false,
    refetch: vi.fn(),
  },
  prefsHook: {
    prefs: {
      totalResidents: true,
      activeResidents: true,
      monthlyRevenue: true,
      pendingPayments: true,
      paymentStatus: true,
      revenueCard: true,
    },
    isLoaded: true,
    updatePref: vi.fn(),
    resetToDefaults: vi.fn(),
    toggleAll: vi.fn(),
  },
  showSuccess: vi.fn(),
  showError: vi.fn(),
  sendBulkRentReminders: vi.fn(),
  clearActiveTenant: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mocks.session,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/hooks/use-data', () => ({
  useDashboardStats: () => mocks.dashboardHook,
}));

vi.mock('@/hooks/use-dashboard-prefs', () => ({
  useDashboardPrefs: () => mocks.prefsHook,
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('@/components/dashboard/WidgetSettings', () => ({
  WidgetSettings: () => <div>Widget Settings</div>,
}));

vi.mock('@/components/dashboard/DashboardDetailModal', () => ({
  DashboardDetailModal: ({ isOpen, type }: { isOpen: boolean; type: string }) =>
    isOpen ? <div>{`Detail Modal ${type}`}</div> : null,
}));

vi.mock('@/components/ui/Skeleton', () => ({
  SkeletonStats: () => <div>Skeleton Stats</div>,
}));

vi.mock('@/actions/notification.actions', () => ({
  sendBulkRentReminders: (...args: unknown[]) => mocks.sendBulkRentReminders(...args),
}));

vi.mock('@/actions/super-admin.actions', () => ({
  clearActiveTenant: (...args: unknown[]) => mocks.clearActiveTenant(...args),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showSuccess: mocks.showSuccess,
    showError: mocks.showError,
  }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.searchParams = new URLSearchParams();
    mocks.session = {
      data: {
        user: {
          role: 'owner',
          tenantId: 'alpha-pg',
          name: 'Owner Test',
        },
      },
      status: 'authenticated',
    };
    mocks.dashboardHook = {
      data: {
        totalPersons: 15,
        activePersons: 12,
        totalRent: 90000,
        pendingPayments: 3,
        paidPayments: 9,
        overduePayments: 1,
        monthlyRevenue: 72000,
      },
      isLoading: false,
      refetch: vi.fn(),
    };
    mocks.prefsHook = {
      prefs: {
        totalResidents: true,
        activeResidents: true,
        monthlyRevenue: true,
        pendingPayments: true,
        paymentStatus: true,
        revenueCard: true,
      },
      isLoaded: true,
      updatePref: vi.fn(),
      resetToDefaults: vi.fn(),
      toggleAll: vi.fn(),
    };
    mocks.sendBulkRentReminders.mockReset();
    mocks.clearActiveTenant.mockReset();
    mocks.showSuccess.mockReset();
    mocks.showError.mockReset();
  });

  it('redirects members to my-details', async () => {
    mocks.session.data.user.role = 'member';

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/my-details');
    });
  });

  it('renders dashboard stats and quick actions for owners', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Total Residents')).toBeInTheDocument();
    expect(screen.getByText('Active Residents')).toBeInTheDocument();
    expect(screen.getByText('Pending Payments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reminders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
  });

  it('renders the expected dashboard numbers and derived totals', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();

    const totalResidentsCard = screen.getByText('Total Residents').closest('div') as HTMLElement;
    const activeResidentsCard = screen.getByText('Active Residents').closest('div') as HTMLElement;
    const pendingPaymentsCard = screen.getByText('Pending Payments').closest('div') as HTMLElement;
    const monthlyRevenueStatCard = screen.getByText('This Month').closest('div') as HTMLElement;
    const monthlyRevenuePanel = screen.getByText('Monthly Revenue').closest('div')?.parentElement as HTMLElement;
    const paymentOverviewPanel = screen.getByText('Payment Overview').closest('div')?.parentElement as HTMLElement;
    const roomsOccupiedCard = screen.getByText('Rooms Occupied').closest('div') as HTMLElement;
    const occupancyRateCard = screen.getByText('Occupancy Rate').closest('div') as HTMLElement;
    const pendingAmountCard = screen.getByText('Pending Amount').closest('div') as HTMLElement;

    expect(within(totalResidentsCard).getByText('15')).toBeInTheDocument();
    expect(within(activeResidentsCard).getByText('12')).toBeInTheDocument();
    expect(within(pendingPaymentsCard).getByText('3')).toBeInTheDocument();
    expect(within(monthlyRevenueStatCard).getByText(/72,000/)).toBeInTheDocument();
    expect(within(monthlyRevenuePanel).getByText(/90,000/)).toBeInTheDocument();
    expect(within(monthlyRevenuePanel).getByText('80% Collected')).toBeInTheDocument();
    expect(within(paymentOverviewPanel).getByText('9')).toBeInTheDocument();
    expect(within(paymentOverviewPanel).getByText('3')).toBeInTheDocument();
    expect(within(paymentOverviewPanel).getByText('1')).toBeInTheDocument();
    expect(within(roomsOccupiedCard).getByText('12')).toBeInTheDocument();
    expect(within(occupancyRateCard).getByText('80%')).toBeInTheDocument();
    expect(within(pendingAmountCard).getByText(/18,000/)).toBeInTheDocument();
  });

  it('renders zero-state metrics without breaking percentage calculations', async () => {
    mocks.dashboardHook.data = {
      totalPersons: 0,
      activePersons: 0,
      totalRent: 0,
      pendingPayments: 0,
      paidPayments: 0,
      overduePayments: 0,
      monthlyRevenue: 0,
    };

    render(<DashboardPage />);

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();

    const totalResidentsCard = screen.getByText('Total Residents').closest('div') as HTMLElement;
    const activeResidentsCard = screen.getByText('Active Residents').closest('div') as HTMLElement;
    const pendingPaymentsCard = screen.getByText('Pending Payments').closest('div') as HTMLElement;
    const monthlyRevenueStatCard = screen.getByText('This Month').closest('div') as HTMLElement;
    const monthlyRevenuePanel = screen.getByText('Monthly Revenue').closest('div')?.parentElement as HTMLElement;
    const paymentOverviewPanel = screen.getByText('Payment Overview').closest('div')?.parentElement as HTMLElement;
    const occupancyRateCard = screen.getByText('Occupancy Rate').closest('div') as HTMLElement;
    const pendingAmountCard = screen.getByText('Pending Amount').closest('div') as HTMLElement;

    expect(within(totalResidentsCard).getByText('0')).toBeInTheDocument();
    expect(within(activeResidentsCard).getByText('0')).toBeInTheDocument();
    expect(within(pendingPaymentsCard).getByText('0')).toBeInTheDocument();
    expect(within(monthlyRevenueStatCard).getByText(/0/)).toBeInTheDocument();
    expect(within(monthlyRevenuePanel).getByText('0% Collected')).toBeInTheDocument();
    expect(within(paymentOverviewPanel).getAllByText('0')).toHaveLength(3);
    expect(within(occupancyRateCard).getByText('0%')).toBeInTheDocument();
    expect(within(pendingAmountCard).getByText(/0/)).toBeInTheDocument();
  });

  it('sends bulk reminders and shows success feedback', async () => {
    mocks.sendBulkRentReminders.mockResolvedValue({
      summary: { sent: 4, failed: 1, skipped: 2 },
    });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /send reminders/i }));

    await waitFor(() => {
      expect(mocks.sendBulkRentReminders).toHaveBeenCalledTimes(1);
      expect(mocks.showSuccess).toHaveBeenCalledWith('Reminders sent! Sent: 4, Failed: 1, Skipped: 2');
    });
  });

  it('shows reminder errors when the bulk action fails', async () => {
    mocks.sendBulkRentReminders.mockResolvedValue({
      error: 'Notification provider unavailable',
    });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /send reminders/i }));

    await waitFor(() => {
      expect(mocks.sendBulkRentReminders).toHaveBeenCalledTimes(1);
      expect(mocks.showError).toHaveBeenCalledWith('Error: Notification provider unavailable');
    });
  });

  it('shows super admin banner and clears active tenant when going back', async () => {
    mocks.searchParams = new URLSearchParams('superadmin_tenant=alpha-pg');
    mocks.clearActiveTenant.mockResolvedValue({ success: true });

    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /back to super admin/i }));

    await waitFor(() => {
      expect(mocks.clearActiveTenant).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith('/super-admin/dashboard');
    });
  });
});
