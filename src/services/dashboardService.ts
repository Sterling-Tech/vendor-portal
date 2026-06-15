/**
 * Dashboard Service
 * All API calls for the vendor Dashboard and Vend-for-Customer feature.
 * Import from here — never inline fetch in Dashboard.tsx.
 */

import { get, post } from './api';
import { DashboardResponse } from '../types/dashboard';
import { buildQuery } from '../services/vendormanagementservice';

export const fetchDashboardSummary = (tenantId?: string | null) => {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return get<DashboardResponse>(`/tenants/vendor-dashboard/${query}`);
};

// ─── Query builder ─────────────────────────────────────────────────────────────


/** Pull the auth token out of localStorage however it was stored */
export const getAuthToken = (): string | null =>
    typeof window !== 'undefined'
        ? localStorage.getItem('token') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('accessToken')
        : null;

/** Extract a human-readable message from any DRF error shape */
export const extractError = (err: any): string => {
    if (!err) return 'An unexpected error occurred';
    if (typeof err === 'string') return err;
    if (typeof err.detail === 'string') return err.detail;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (Array.isArray(err.non_field_errors)) return err.non_field_errors.join(' ');
    // Field-keyed DRF errors: { email: ["already exists"], phone: ["invalid"] }
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(err))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    return msgs.length ? msgs.join(' | ') : 'An unexpected error occurred';
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface WalletData {
    wallet_type?: { name: string; description: string };
    balance: string;
}

export interface RelatedVendorParams {
    hierachy?: string;
    vendor_id?: string | number;
    search?: string;
    start_date?: string;
    end_date?: string;
}

export interface TransactionParams {
    vendor_id: string | number;
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
}

export interface LedgerParams {
    vendor_id: string | number;
    start_date: string;
    end_date: string;
}

export interface VendPayload {
    account_number: string;
    bill_type: string;
    amount: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const dashboardService = {
    /** Current vendor's wallet balance and type */
    getWallet(): Promise<WalletData> {
        return get('/vendor/wallet/');
    },

    /** All related children (no hierarchy filter) */
    getRelatedVendors(params?: RelatedVendorParams) {
        return get<any>(`/vendor/retrieve/related-children/${buildQuery(params)}`);
    },

    /** Children filtered by hierarchy (vendor | sub_vendor | agent | cashier | pos) */
    getGroupVendors(hierarchy: string) {
        return get<any>(`/vendor/retrieve/related-children/?hierachy=${hierarchy}`);
    },

    /** Direct children of a specific vendor */
    getVendorChildren(vendorId: number) {
        return get<any>(`/vendor/retrieve/related-children/?vendor_id=${vendorId}`);
    },

    /** Paginated transactions for a vendor */
    getVendorTransactions(params: TransactionParams) {
        return get<any>(`/vendor/retrieve-children/transactions/${buildQuery(params as any)}`);
    },

    /** Ledger entries for a vendor within a date range */
    getLedger(params: LedgerParams) {
        return get<any>(`/vendor/ledger/${buildQuery(params as any)}`);
    },

    /**
     * Vend for Customer
     * POST /vendor/vend/ — multipart form data
     * Fields: account_number, bill_type, amount
     */
    vendForCustomer(payload: VendPayload): Promise<any> {
        const token = getAuthToken();
        const formData = new FormData();
        formData.append('account_number', payload.account_number);
        formData.append('bill_type', payload.bill_type);
        formData.append('amount', payload.amount);

        // Multipart: do NOT set Content-Type — browser adds boundary automatically
        return fetch(`${(window as any).__VENDOR_API_BASE__ || 'http://188.166.161.13:8061'}/vendor/vend/`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw data;
            return data;
        });
    },
};
