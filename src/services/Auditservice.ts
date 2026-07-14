/**
 * Audit Service
 * All API calls for the Settings → Audit Logs tab.
 *
 * Backed by the two real endpoints documented by the API team:
 *   GET /audit/logs/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD   (start_date & end_date REQUIRED)
 *   GET /audit/history/user/?user_id=<id>                        (user_id REQUIRED)
 *
 * The previous "API Logs" / "Login Logs" panels were built against endpoints
 * that don't exist on the backend (method/status_code/duration_ms fields
 * were never real) — they've been removed. Everything below now maps
 * 1:1 onto the two real responses.
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

/** Query params for GET /audit/logs/ — start_date & end_date are required by the API */
export interface AuditLogsParams {
    start_date: string;
    end_date: string;
    page?: number;
    page_size?: number;
}

/** Query params for GET /audit/history/user/ — user_id is required by the API */
export interface UserHistoryParams {
    user_id: string | number;
}

export interface AuditLogActor {
    id: number;
    name?: string;
    email?: string;
}

/** A single entry returned by GET /audit/logs/ */
export interface AuditLogEntry {
    actor: AuditLogActor;
    actor_email?: string;
    action: string;
    summary: string;
    ip_address?: string;
    timestamp: string;
}

/** A single entry returned by GET /audit/history/user/ */
export interface UserHistoryEntry {
    id: number;
    object_id: string;
    action: string;
    previous: Record<string, any>;
    present: Record<string, any>;
    timestamp: string;
}

export interface PaginatedResult<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const auditService = {
    /** GET /audit/logs/?start_date=&end_date= — action/summary feed across the platform */
    getAuditLogs(params: AuditLogsParams): Promise<PaginatedResult<AuditLogEntry>> {
        return get(`/audit/logs/${buildQuery(params)}`);
    },

    /** GET /audit/history/user/?user_id= — field-level before/after history for one user */
    getUserHistory(params: UserHistoryParams): Promise<UserHistoryEntry[]> {
        return get(`/audit/history/user/${buildQuery(params)}`);
    },
};