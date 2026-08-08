/**
 * Onboarding Service
 * All API calls for vendor KYC / onboarding.
 */

import { get, post, put } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingProfile {
    description?: string;
    industry?: string;
    category?: string;
    registration_number?: string;
    cac_registration_number?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    domain?: string;
    sub_domain?: string;
    slug?: string;
    trial_ends?: string;
}

export interface OnboardingAgreement {
    entity_name?: string;
    company_website?: string;
    company_address?: string;
    signatory_name?: string;
    signatory_phone_number?: string;
    signatory_email?: string;
}

export interface BankAccount {
    id?: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    is_primary?: boolean;
    verification_status?: string;
}

export interface Owner {
    id?: number;
    name: string;
    dob?: string;
    nationality?: string;
    id_type?: string;
    id_number?: string;
    address?: string;
    verification_status?: string;
}

export interface Contact {
    id?: number;
    name: string;
    email?: string;
    phone?: string;
    is_primary?: boolean;
}

export interface OnboardingData {
    business_name?: string;
    phone_number?: string;
    profile?: OnboardingProfile;
    agreement?: OnboardingAgreement;
    bank_accounts?: BankAccount[];
    owners?: Owner[];
    contacts?: Contact[];
}

export interface OnboardingStatus {
    onboarding_status: string;
    kyc_submitted_at?: string;
    kyc_reviewed_at?: string;
    kyc_rejection_reason?: string;
    is_complete: string | boolean;
    checklist?: Record<string, string>;
}

export interface FullOnboardingResponse {
    id: number;
    business_name: string;
    email: string;
    phone_number?: string;
    account_status: string;
    hierachy: string;
    vendor_type: string;
    related_vendor?: any;
    funding_cap?: string;
    transaction_max?: string;
    commission_rate?: string;
    monthly_target?: string;
    onboarding_status: string;
    kyc_submitted_at?: string;
    kyc_reviewed_at?: string;
    kyc_rejection_reason?: string;
    token?: string;
    test_token?: string;
    test_token_expires_at?: string;
    test_balance?: string;
    wallet?: any;
    profile?: OnboardingProfile | Record<string, any>;
    agreement?: OnboardingAgreement | Record<string, any>;
    bank_accounts?: BankAccount[];
    owners?: Owner[];
    contacts?: Contact[];
    created_at?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const onboardingService = {
    /** GET /vendor/onboarding/ — fetch current onboarding data */
    getOnboarding(): Promise<FullOnboardingResponse> {
        return get<FullOnboardingResponse>('/vendor/onboarding/');
    },

    /** GET /vendor/onboarding/status/ — check onboarding state */
    getStatus(): Promise<OnboardingStatus> {
        return get<OnboardingStatus>('/vendor/onboarding/status/');
    },

    /** PUT /vendor/onboarding/ — save / update onboarding data */
    updateOnboarding(payload: OnboardingData): Promise<FullOnboardingResponse> {
        return put<FullOnboardingResponse>('/vendor/onboarding/', payload);
    },

    /** POST /vendor/onboarding/submit/ — submit for review */
    submitOnboarding(): Promise<FullOnboardingResponse> {
        return post<FullOnboardingResponse>('/vendor/onboarding/submit/', {});
    },
};

export const extractOnboardingError = (err: any): string => {
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
        else if (typeof v === 'string') msgs.push(`${k}: ${v}`);
    return msgs.length ? msgs.join(' | ') : 'An unexpected error occurred';
};