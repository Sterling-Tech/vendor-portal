import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardOverview, DashboardResponse, DashboardSummary } from '../types/dashboard';
import { fetchDashboardSummary } from '../services/dashboardService';

interface UseDashboardSummaryResult {
    summaries: DashboardSummary[];
    overview: DashboardOverview | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useDashboardSummary = (tenantId?: string | null): UseDashboardSummaryResult => {
    const [summaries, setSummaries] = useState<DashboardSummary[]>([]);
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response: DashboardResponse = await fetchDashboardSummary(tenantId ?? undefined);
            setSummaries(response.summaries || []);
            setOverview(response.overview || null);
        } catch (err: any) {
            console.error('Failed to load dashboard summary', err);
            setError(err?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        load();
    }, [load]);

    const safeOverview = useMemo(() => overview, [overview]);

    return {
        summaries,
        overview: safeOverview,
        loading,
        error,
        refresh: load,
    };
};
