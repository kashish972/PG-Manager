import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsPage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  session: {
    data: {
      user: {
        role: 'owner',
        tenantId: 'alpha-pg',
        name: 'Owner Test',
      },
    } as { user: { role: string; tenantId: string; name: string } } | null,
    status: 'authenticated',
  },
  getAnalyticsData: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mocks.session,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('@/components/ui/Skeleton', () => ({
  SkeletonStats: () => <div>Skeleton Stats</div>,
}));

vi.mock('@/actions/analytics.actions', () => ({
  getAnalyticsData: (...args: unknown[]) => mocks.getAnalyticsData(...args),
}));

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Chart = ({ children }: { children?: ReactNode }) => <div data-testid="chart">{children}</div>;

  return {
    AreaChart: Chart,
    Area: Wrapper,
    BarChart: Chart,
    Bar: Wrapper,
    PieChart: Chart,
    Pie: Wrapper,
    Cell: Wrapper,
    XAxis: Wrapper,
    YAxis: Wrapper,
    CartesianGrid: Wrapper,
    Tooltip: Wrapper,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    mocks.push.mockReset();
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
    mocks.getAnalyticsData.mockReset();
    mocks.getAnalyticsData.mockResolvedValue({
      occupancy: {
        rate: 80,
        available: 4,
        occupied: 16,
      },
      revenue: {
        monthly: 120000,
        projectedAnnual: 1440000,
        totalCollected: 96000,
        averageRent: 7500,
        monthlyTrend: [
          { month: 'Jan', revenue: 90000 },
          { month: 'Feb', revenue: 120000 },
        ],
      },
      maintenance: {
        pending: 2,
        inProgress: 1,
        resolved: 5,
      },
      persons: {
        active: 16,
        inactive: 3,
        total: 19,
      },
      blocks: [
        {
          name: 'Block A',
          occupied: 10,
          available: 2,
          occupancyRate: 83,
          ac: { total: 6, occupied: 5, available: 1 },
          nonAc: { total: 6, occupied: 5, available: 1 },
        },
      ],
    });
  });

  it('redirects unauthenticated users to login', async () => {
    mocks.session = {
      data: null,
      status: 'unauthenticated',
    };

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects members back to dashboard', async () => {
    mocks.session.data!.user.role = 'member';

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('loads analytics data and renders key insights for owners', async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText('Analytics & Insights')).toBeInTheDocument();
    expect(mocks.getAnalyticsData).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
    expect(screen.getByText('Available Rooms')).toBeInTheDocument();
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Overview')).toBeInTheDocument();
    expect(screen.getByText('Block-wise Room Availability')).toBeInTheDocument();
  });

  it('renders analytics numbers and computed summaries correctly', async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText('Analytics & Insights')).toBeInTheDocument();

    const occupancyCard = screen.getByText('Occupancy Rate').closest('div') as HTMLElement;
    const availableRoomsCard = screen.getByText('Available Rooms').closest('div') as HTMLElement;
    const monthlyRevenueCard = screen.getByText('Monthly Revenue').closest('div') as HTMLElement;
    const projectedAnnualLabels = screen.getAllByText('Projected Annual');
    const projectedAnnualCard = projectedAnnualLabels[0].closest('div') as HTMLElement;
    const occupancyProgress = screen.getByText('Occupancy Progress').closest('div')?.parentElement as HTMLElement;
    const residentAnalyticsCard = screen.getByText('Resident Analytics').closest('div')?.parentElement as HTMLElement;
    const revenueBreakdownCard = screen.getByText('Revenue Breakdown').closest('div')?.parentElement as HTMLElement;
    const blockCard = screen.getByText('Block A').closest('div') as HTMLElement;

    expect(within(occupancyCard).getByText('80%')).toBeInTheDocument();
    expect(within(availableRoomsCard).getByText('4')).toBeInTheDocument();
    expect(within(monthlyRevenueCard).getByText(/120\.0K/)).toBeInTheDocument();
    expect(within(projectedAnnualCard).getByText(/14\.4L/)).toBeInTheDocument();
    expect(within(occupancyProgress).getByText('80%')).toBeInTheDocument();
    expect(within(occupancyProgress).getByText('16 occupied')).toBeInTheDocument();
    expect(within(occupancyProgress).getByText('4 available')).toBeInTheDocument();
    expect(within(residentAnalyticsCard).getByText(/7,500/)).toBeInTheDocument();
    expect(
      within(revenueBreakdownCard).getByText((_, element) => element?.textContent === '₹1,20,000')
    ).toBeInTheDocument();
    expect(within(revenueBreakdownCard).getByText(/96,000/)).toBeInTheDocument();
    expect(
      within(revenueBreakdownCard).getByText((_, element) => element?.textContent === '₹14.4L')
    ).toBeInTheDocument();
    expect(within(blockCard).getByText('83%')).toBeInTheDocument();
    expect(within(blockCard).getByText('AC: 5/6')).toBeInTheDocument();
    expect(within(blockCard).getByText('Non-AC: 5/6')).toBeInTheDocument();
  });

  it('renders zero-state analytics and hides block cards when none exist', async () => {
    mocks.getAnalyticsData.mockResolvedValue({
      occupancy: {
        rate: 0,
        available: 0,
        occupied: 0,
      },
      revenue: {
        monthly: 0,
        projectedAnnual: 0,
        totalCollected: 0,
        averageRent: 0,
        monthlyTrend: [],
      },
      maintenance: {
        pending: 0,
        inProgress: 0,
        resolved: 0,
      },
      persons: {
        active: 0,
        inactive: 0,
        total: 0,
      },
      blocks: [],
    });

    render(<AnalyticsPage />);

    expect(await screen.findByText('Analytics & Insights')).toBeInTheDocument();

    const occupancyCard = screen.getByText('Occupancy Rate').closest('div') as HTMLElement;
    const availableRoomsCard = screen.getByText('Available Rooms').closest('div') as HTMLElement;
    const monthlyRevenueCard = screen.getByText('Monthly Revenue').closest('div') as HTMLElement;
    const projectedAnnualLabels = screen.getAllByText('Projected Annual');
    const projectedAnnualCard = projectedAnnualLabels[0].closest('div') as HTMLElement;
    const occupancyProgress = screen.getByText('Occupancy Progress').closest('div')?.parentElement as HTMLElement;
    const residentAnalyticsCard = screen.getByText('Resident Analytics').closest('div')?.parentElement as HTMLElement;
    const revenueBreakdownCard = screen.getByText('Revenue Breakdown').closest('div')?.parentElement as HTMLElement;
    const maintenanceCard = screen.getByText('Maintenance Overview').closest('div')?.parentElement as HTMLElement;
    const residentValueNodes = residentAnalyticsCard.querySelectorAll('[class*="_analyticsValue_"]');
    const revenueValueNodes = revenueBreakdownCard.querySelectorAll('[class*="_revenueAmount_"]');

    expect(within(occupancyCard).getByText('0%')).toBeInTheDocument();
    expect(within(availableRoomsCard).getByText('0')).toBeInTheDocument();
    expect(within(monthlyRevenueCard).getByText(/0\.0K/)).toBeInTheDocument();
    expect(within(projectedAnnualCard).getByText(/0\.0L/)).toBeInTheDocument();
    expect(within(occupancyProgress).getByText('0 occupied')).toBeInTheDocument();
    expect(within(occupancyProgress).getByText('0 available')).toBeInTheDocument();
    expect(within(residentAnalyticsCard).getByText('Active Residents')).toBeInTheDocument();
    expect(within(residentAnalyticsCard).getByText('Inactive / Moved Out')).toBeInTheDocument();
    expect(within(residentAnalyticsCard).getByText('Total Registered')).toBeInTheDocument();
    expect(within(residentAnalyticsCard).getByText('Avg Rent / Room')).toBeInTheDocument();
    expect(Array.from(residentValueNodes).map((node) => node.textContent)).toEqual(['0', '0', '0', '₹0']);
    expect(Array.from(revenueValueNodes).map((node) => node.textContent)).toEqual(['₹0', '₹0', '₹0.0L']);
    expect(within(maintenanceCard).getByText('Pending: 0')).toBeInTheDocument();
    expect(within(maintenanceCard).getByText('In Progress: 0')).toBeInTheDocument();
    expect(within(maintenanceCard).getByText('Resolved: 0')).toBeInTheDocument();
    expect(screen.queryByText('Block-wise Room Availability')).not.toBeInTheDocument();
  });
});
