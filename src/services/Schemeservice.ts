import { get } from './api';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** The supplier a scheme belongs to */
export interface SchemeSupplier {
    id: number;
    name: string;
    code: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    is_active: boolean;
    created_at: string;
}

/** A single scheme assignment, as returned by GET /scheme/my-schemes/ */
export interface AssignedScheme {
    scheme: number;
    name: string;
    code: string;
    description: string;
    scheme_active: boolean;
    supplier: SchemeSupplier;
    assigned_at: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const schemeService = {
    /**
     * GET /scheme/my-schemes/
     * Returns the ring-fence schemes the calling vendor is assigned to.
     * Assignment is at the top-level vendor and inherits down the whole
     * hierarchy, so a child node sees the schemes assigned to its org root.
     * No parameters.
     */
    getMySchemes: () => get<AssignedScheme[]>('/scheme/my-schemes/'),
};

/** Extract a human-readable message from any DRF error shape */
export const extractSchemeError = (err: any): string => {
    const data = err?.response?.data ?? err?.data ?? err;
    if (!data) return 'An unexpected error occurred while loading your schemes.';
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
        return data.non_field_errors.join(' ');
    }
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(data)) {
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    }
    return msgs.length ? msgs.join(' | ') : 'An unexpected error occurred while loading your schemes.';
};