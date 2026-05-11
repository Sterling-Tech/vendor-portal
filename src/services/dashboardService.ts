import { get } from './api';
import { DashboardResponse } from '../types/dashboard';

export const fetchDashboardSummary = (tenantId?: string | null) => {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return get<DashboardResponse>(`/tenants/vendor-dashboard/${query}`);
};
