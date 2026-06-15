/**
 * Vendor Management Service
 * Centralises all API calls for the VendorManagement feature.
 * Import and use these in your component instead of inline fetch calls.
 */
import { get, post, patch, del } from './api';
import { Tenant } from './tenantService';

// export const API_BASE = 'http://188.166.161.13:8061';

// ─── Shared helpers ────────────────────────────────────────────────────────────
// export const buildHeaders = (): HeadersInit => {
//     const token =
//         typeof window !== 'undefined'
//             ? localStorage.getItem('token') ||
//               localStorage.getItem('access_token') ||
//               localStorage.getItem('accessToken')
//             : null;
//     return {
//         'Content-Type': 'application/json',
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     };
// };

export const buildQuery = <T extends object>(params?: T): string => {
    if (!params) return '';

    const q = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            q.append(k, String(v));
        }
    });

    return q.toString() ? `?${q.toString()}` : '';
};

// /** Generic fetch wrapper — throws the parsed JSON body on non-ok responses */
// const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
//     const res = await fetch(`${API_BASE}${path}`, {
//         headers: buildHeaders(),
//         ...options,
//     });
//     const data = await res.json().catch(() => ({}));
//     if (!res.ok) throw data;
//     return data as T;
// };

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface VendorListParams {
    hierachy?: string;
    account_status?: string;
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
}

export interface TransactionParams {
    vendor_id: number;
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
}

export interface AnalyticsParams {
    start_date: string;
    end_date: string;
}

export interface VendorConfigPayload {
    commission_rate?: string;
    funding_cap?: string;
    transaction_max?: string;
    monthly_target?: string;
    account_status?: string;
    // API / rate-limit fields (stored in configuration blob if backend supports it)
    api_rate_limit_per_minute?: string;
    api_rate_limit_per_day?: string;
    webhook_url?: string;
    enable_api_access?: boolean;
}

export interface CreateVendorPayload {
    hierachy: string;
    related_vendor?: number | string;
    business_name: string;
    email: string;
    phone_number: string;
    domain: string;
    sub_domain?: string;
    slug?: string;
    trial_ends?: string;
    address: string;
    city: string;
    state: string;
    country?: string;
    postal_code: string;
    description?: string;
    industry?: string;
    category?: string;
    website?: string;
    contact_name?: string;
    email1?: string;
    email2?: string;
    registration_number?: string;
    cac_registration_number?: string;
    owner_name?: string;
    dob?: string;
    nationality?: string;
    id_type?: string;
    id_number?: string;
    owner_address?: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    funding_cap?: string;
    transaction_max?: string;
    commission_rate?: string;
    monthly_target?: string;
    entity_name?: string;
    company_website?: string;
    company_address?: string;
    signatory_name?: string;
    signatory_phone_number?: string;
    signatory_email?: string;
    [key: string]: any;
}



// ─── Service object ────────────────────────────────────────────────────────────
export const vendorManagementService = {
    /** Fetch all related child vendors with optional filters */
    getRelatedVendors(params?: VendorListParams) {
        return get<any>(`/vendor/retrieve/related-children/${buildQuery(params)}`);
    },

    /** Fetch summary analytics for the stat cards */
    getAnalytics(params: AnalyticsParams) {
        return get<{
            total_balance: number;
            total_transactions: number;
            processed_today: number;
            active: number;
        }>(`/vendor/children/analytics/${buildQuery(params)}`);
    },

    /** Fetch direct children of a specific vendor */
    getVendorChildren(vendorId: number) {
        return get<any>(`/vendor/retrieve/related-children/?vendor_id=${vendorId}`);
    },

    /** Paginated transactions for a specific vendor */
    getVendorTransactions(params: TransactionParams) {
        return get<{
            count: number;
            next: string | null;
            previous: string | null;
            results: any[];
        }>(`/vendor/retrieve-children/transactions/${buildQuery(params as any)}`);
    },

    /** Create a new vendor / sub-vendor / agent / cashier / POS */
    createVendor(payload: CreateVendorPayload) {
        return post<any>('/vendor/create/', payload);
    },

    /** Update vendor configuration (commission, limits, API settings etc.) */
    updateVendorConfig(vendorId: number, payload: VendorConfigPayload) {
        return patch<any>(`/vendor/update/${vendorId}/`, payload);
    },

    /** Hard-delete a vendor */
    deleteVendor(vendorId: number) {
        return del<void>(`/vendor/delete/${vendorId}/`);
    },
};

/** Extract a human-readable error from whatever shape DRF returns */
export const extractBackendError = (data: any): string => {
    if (!data || typeof data !== 'object') return 'An unexpected error occurred';
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length)
        return data.non_field_errors.join(' ');
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(data))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    if (msgs.length) return msgs.join(' | ');
    return 'An unexpected error occurred';
};