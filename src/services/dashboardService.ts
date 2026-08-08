/**
 * Dashboard Service
 * All API calls for the vendor Dashboard and Fund Wallet feature.
 */

import { get, post } from './api';
import { DashboardResponse } from '../types/dashboard';
import { buildQuery } from '../services/vendormanagementservice';

export const fetchDashboardSummary = (tenantId?: string | null) => {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return get<DashboardResponse>(`/tenants/vendor-dashboard/${query}`);
};

export const getAuthToken = (): string | null =>
    typeof window !== 'undefined'
        ? localStorage.getItem('token') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('accessToken')
        : null;

export const extractError = (err: any): string => {
    if (!err) return 'An unexpected error occurred';
    if (typeof err === 'string') return err;
    const d = err?.response?.data ?? err?.data ?? err;
    if (typeof d?.detail === 'string') return d.detail;
    if (typeof d?.message === 'string') return d.message;
    if (typeof d?.error === 'string') return d.error;
    if (Array.isArray(d?.non_field_errors)) return d.non_field_errors.join(' ');
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(d ?? {}))
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

/** Payload for POST /vendor/request-funding/ */
export interface FundWalletPayload {
    amount: string | number;
    proof_of_payment?: File | null;
    proof_type?: 'image' | 'document';
}

/** Response from POST /vendor/request-funding/ */
export interface FundWalletResult {
    id: number;
    transaction_ref: string;
    vendor: {
        id: number;
        email: string;
        business_name: string;
        account_status: string;
        hierachy: string;
    };
    amount: string;
    status: string;
    request_time: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const dashboardService = {
    getWallet(): Promise<WalletData> {
        return get('/vendor/wallet/');
    },

    getRelatedVendors(params?: RelatedVendorParams) {
        return get<any>(`/vendor/retrieve/related-children/${buildQuery(params)}`);
    },

    getGroupVendors(hierarchy: string) {
        return get<any>(`/vendor/retrieve/related-children/?hierachy=${hierarchy}`);
    },

    getVendorChildren(vendorId: number) {
        return get<any>(`/vendor/retrieve/related-children/?vendor_id=${vendorId}`);
    },

    getVendorTransactions(params: TransactionParams) {
        return get<any>(`/vendor/retrieve-children/transactions/${buildQuery(params as any)}`);
    },

    getLedger(params: LedgerParams) {
        return get<any>(`/vendor/ledger/${buildQuery(params as any)}`);
    },

    /**
     * Request wallet funding.
     * POST /vendor/request-funding/
     * Payload: { amount }
     * N.B. This only submits a request — no actual funding occurs until approved.
     */
    requestWalletFunding(payload: FundWalletPayload): Promise<FundWalletResult> {
        if (payload.proof_of_payment instanceof File) {
            const formData = new FormData();
            formData.append('amount', String(payload.amount));
            formData.append('proof_of_payment', payload.proof_of_payment);
            if (payload.proof_type) {
                formData.append('proof_type', payload.proof_type);
            }
            // No headers needed — makeApiCall detects FormData and removes Content-Type
            return post<FundWalletResult>('/vendor/request-funding/', formData);
        }
        return post<FundWalletResult>('/vendor/request-funding/', { amount: payload.amount });
    },
};