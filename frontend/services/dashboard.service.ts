import { apiServer } from '@/lib/api-server';
import type { DashboardSummary, DashboardQuery } from '@/types';

export const dashboardService = {
  getSummary: (query?: DashboardQuery) =>
    apiServer<DashboardSummary>('/dashboard', { params: query as Record<string, unknown> }),
};
