export interface DashboardTransactionPoint {
    date: string;
    total: number;
    amount: string;
}

export interface DashboardRecentTransaction {
    id: string;
    reference: string;
    value: string;
    status: string;
    type: string;
    created_at: string;
    org_id: string | null;
    org_name: string | null;
    owner_role?: string | null;
}

export interface DashboardCounts {
    total_orgs: number;
    active_orgs: number;
    suspended_orgs: number;
    descendants: number;
    direct_children: number;
    descendant_levels: Record<string, number>;
    role_breakdown: Record<string, number>;
}

export interface DashboardWallets {
    count: number;
    total_balance: string;
    avg_balance: string;
}

export interface DashboardTransactions {
    total: number;
    total_value: string;
    last_7_days: DashboardTransactionPoint[];
    recent: DashboardRecentTransaction[];
}

export interface DashboardOrgInfo {
    id: string;
    name: string;
    level: string;
    level_label: string;
    status: string;
    tenant_id: string;
    tenant_name: string;
    parent_id: string | null;
}

export interface DashboardSummary {
    binding_id: string | null;
    role: string;
    role_label: string;
    org: DashboardOrgInfo;
    path: Array<{ id: string; name: string }>;
    counts: DashboardCounts;
    wallets: DashboardWallets;
    transactions: DashboardTransactions;
}

export interface DashboardOverview {
    tenant?: { id: string; name: string | null };
    totals: {
        orgs: number;
        wallets: number;
        wallet_balance: string;
        transactions: number;
        transaction_value: string;
    };
    role_breakdown: Record<string, number>;
    daily: DashboardTransactionPoint[];
    recent_transactions: DashboardRecentTransaction[];
}

export interface DashboardResponse {
    summaries: DashboardSummary[];
    overview: DashboardOverview;
}
