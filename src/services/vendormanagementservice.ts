import { get, post, patch, del, put } from './api';

export const buildQuery = <T extends object>(params?: T): string => {
    if (!params) return '';
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return q.toString() ? `?${q.toString()}` : '';
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface VendorListParams {
    hierachy?: string; account_status?: string; status?: string;
    search?: string; start_date?: string; end_date?: string;
}
export interface TransactionParams {
    vendor_id: number; page?: number; page_size?: number;
    start_date?: string; end_date?: string; search?: string;
}
export interface AnalyticsParams { start_date: string; end_date: string; }

/** Fields accepted by PUT /vendor/configure/?vendor_id=X */
export interface VendorConfigurePayload {
    funding_cap?: string;
    transaction_max?: string;
    commission_rate?: string;
    monthly_target?: string;
}

/** Legacy wider payload (kept for backward compat) */
export interface VendorConfigPayload extends VendorConfigurePayload {
    account_status?: string;
    api_rate_limit_per_minute?: string;
    api_rate_limit_per_day?: string;
    webhook_url?: string;
    enable_api_access?: boolean;
}

export interface FundWalletPayload {
    vendor: number;
    amount: number | string;
}

/** Payload accepted by PUT /vendor/fund/child/ */
export interface FundingChildPayload {
    vendor: number | string;
    amount: number | string;
}

/** Vendor summary embedded in a funding-request record */
export interface FundingRequestVendor {
    id: number;
    email: string;
    business_name: string;
    account_status: string;
    hierachy: string;
}

/** A single funding-request record returned by /vendor/request-funding/ */
export interface FundingRequest {
    id: number;
    transaction_ref: string;
    vendor: FundingRequestVendor;
    amount: string;
    status: string;
    request_time: string;
}

/** Valid values accepted by the required request_status query param */
export type FundingRequestStatus = 'pending_review' | 'pending_approval' | 'approved' | 'rejected';

export interface FundingRequestListParams {
    /** REQUIRED by the backend — one of pending_review | pending_approval | approved | rejected */
    request_status: FundingRequestStatus;
    page?: number;
    page_size?: number;
}

export interface CreateVendorPayload {
    hierachy: string; related_vendor?: number | string;
    business_name: string; email: string; phone_number: string; domain: string;
    sub_domain?: string; slug?: string; trial_ends?: string;
    address: string; city: string; state: string; country?: string; postal_code: string;
    description?: string; industry?: string; category?: string; website?: string;
    contact_name?: string; email1?: string; email2?: string;
    registration_number?: string; cac_registration_number?: string;
    owner_name?: string; dob?: string; nationality?: string;
    id_type?: string; id_number?: string; owner_address?: string;
    bank_name?: string; account_name?: string; account_number?: string;
    funding_cap?: string; transaction_max?: string;
    commission_rate?: string; monthly_target?: string;
    entity_name?: string; company_website?: string; company_address?: string;
    signatory_name?: string; signatory_phone_number?: string; signatory_email?: string;
    [key: string]: any;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const vendorManagementService = {
    /** All related child vendors with optional filters */
    getRelatedVendors: (params?: VendorListParams) =>
        get<any>(`/vendor/retrieve/related-children/${buildQuery(params)}`),

    /** Analytics for the stat cards */
    getAnalytics: (params: AnalyticsParams) =>
        get<{ total_balance: number; total_transactions: number; processed_today: number; active: number }>(
            `/vendor/children/analytics/${buildQuery(params)}`
        ),

    /** Direct children of a specific vendor */
    getVendorChildren: (vendorId: number) =>
        get<any>(`/vendor/retrieve/related-children/?vendor_id=${vendorId}`),

    /** Paginated transactions for a vendor */
    getVendorTransactions: (params: TransactionParams) =>
        get<{ count: number; next: string | null; previous: string | null; results: any[] }>(
            `/vendor/retrieve-children/transactions/${buildQuery(params as any)}`
        ),

    /** Create a new vendor / sub-vendor / agent / cashier / POS */
    createVendor: (payload: CreateVendorPayload) =>
        post<any>('/vendor/create/', payload),

    /**
     * Configure vendor limits & commissions.
     * PUT /vendor/configure/?vendor_id={id}
     * Accepted fields: funding_cap, transaction_max, commission_rate, monthly_target
     */
    configureVendor: (vendorId: number, payload: VendorConfigurePayload) =>
        put<any>(`/vendor/configure/?vendor_id=${vendorId}`, payload),

    /**
     * Fund a subordinate vendor's wallet directly.
     * PUT /vendor/fund/child/
     * Payload: { vendor, amount }
     */
    requestWalletFunding: (payload: FundingChildPayload) =>
        put<FundingRequest>('/vendor/fund/child/', payload),

    /**
     * Retrieve funding requests.
     * GET /vendor/request-funding/?request_status=approved
     * `request_status` is REQUIRED by the backend — one of:
     *   pending_review | pending_approval | approved | rejected
     * Vendor admins see only their own requests; system admins see all.
     */
    getFundingRequests: (params: FundingRequestListParams) =>
        get<{ count: number; next: string | null; previous: string | null; results: FundingRequest[] }>(
            `/vendor/request-funding/${buildQuery(params)}`
        ),

    /** @deprecated kept for backward compat — use requestWalletFunding instead */
    fundWallet: (payload: FundWalletPayload) =>
        post<any>('/vendor/wallet/load/', payload),

    /** Hard-delete a vendor */
    deleteVendor: (vendorId: number) =>
        del<void>(`/vendor/delete/${vendorId}/`),

    // ── kept for backward compat ───────────────────────────────────────────────
    updateVendorConfig: (vendorId: number, payload: VendorConfigPayload) =>
        patch<any>(`/vendor/update/${vendorId}/`, payload),
};

/** Extract a human-readable message from any DRF error shape */
export const extractBackendError = (data: any): string => {
    if (!data || typeof data !== 'object') return data || 'An unexpected error occurred';
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length)
        return data.non_field_errors.join(' ');
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(data))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    return msgs.length ? msgs.join(' | ') : data || 'An unexpected error occurred';
};