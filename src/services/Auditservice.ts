/**
 * Audit Service
 * All API calls for the Settings → Audit Logs tab (API Logs, Login Logs, Audit Trail).
 *
 * NOTE: Endpoint paths below follow the same convention as the rest of the app
 * (/audit/...). If your backend uses different paths, update the three GET
 * calls at the bottom of this file — everything else (types, helpers, the
 * component) stays the same.
 */

import { get } from './api';
import { buildQuery } from './vendormanagementservice';

// ─── Shared helpers ─────────────────────────────────────────────────────────────
export const extractAuditError = (err: any): string => {
    if (!err) return 'An unexpected error occurred';
    const d = err?.response?.data ?? err?.data ?? err;
    if (typeof d === 'string') return d;
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
export interface AuditListParams {
    page?: number;
    page_size?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
}

/** A single API-call log entry */
export interface ApiLogEntry {
    id: number;
    method: string;              // GET / POST / PUT / DELETE
    endpoint: string;             // e.g. /vendor/request-funding/
    status_code: number;
    actor?: string;               // user/vendor who made the call
    actor_email?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    request_body?: any;
    response_body?: any;
    created_at: string;
}

/** A single login-event entry */
export interface LoginLogEntry {
    id: number;
    user_email: string;
    user_name?: string;
    status: 'success' | 'failed' | string;
    ip_address?: string;
    device?: string;
    location?: string;
    failure_reason?: string;
    created_at: string;
}

/** A single audit-trail entry (create/update/delete of a resource) */
export interface AuditTrailEntry {
    id: number;
    action: string;               // e.g. "created", "updated", "deleted", "approved"
    resource_type: string;        // e.g. "Vendor", "Group", "Permission"
    resource_id?: string | number;
    resource_name?: string;
    actor?: string;
    actor_email?: string;
    changes?: Record<string, { old?: any; new?: any }>;
    ip_address?: string;
    created_at: string;
}

export interface PaginatedResult<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const auditService = {
    /** GET /audit/api-logs/ — every API call made against the platform */
    getApiLogs(params?: AuditListParams): Promise<PaginatedResult<ApiLogEntry>> {
        return get(`/audit/api-logs/${buildQuery(params)}`);
    },

    /** GET /audit/login-logs/ — every login attempt (success + failure) */
    getLoginLogs(params?: AuditListParams): Promise<PaginatedResult<LoginLogEntry>> {
        return get(`/audit/login-logs/${buildQuery(params)}`);
    },

    /** GET /audit/trail/ — create/update/delete/approve events across resources */
    getAuditTrail(params?: AuditListParams): Promise<PaginatedResult<AuditTrailEntry>> {
        return get(`/audit/trail/${buildQuery(params)}`);
    },
};