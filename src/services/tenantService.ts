/**
 * Tenant Management Service
 * Handles all tenant-related API operations
 */

import { get, post, patch, del } from './api';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain: string;
    subdomain?: string;
    configuration: Record<string, any>;
    features: string[];
    limits: Record<string, any>;
    custom_settings: Record<string, any>;
    database_name?: string;
    database_url?: string;
    is_active: boolean;
    is_trial: boolean;
    trial_ends_at?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface TenantSummary {
    total_tenants: number;
    active_tenants: number;
    trial_tenants: number;
    total_users: number;
    today_api_calls: number;
    today_transactions: number;
    today_storage_mb: number;
}

export interface TenantStats {
    tenant_id: string;
    tenant_name: string;
    is_active: boolean;
    total_users: number;
    total_transactions: number;
    total_storage_used_mb: number;
    api_calls_today: number;
    last_activity: string | null;
}

export interface TenantUser {
    id: string;
    tenant: string;
    tenant_name?: string;
    user: string;
    user_email?: string;
    user_first_name?: string;
    user_last_name?: string;
    role: string;
    permissions: string[];
    is_tenant_admin: boolean;
    is_active: boolean;
    last_access?: string;
    last_tenant_switch?: string;
    created_at: string;
    updated_at: string;
}

export interface TenantConfiguration {
    id: string;
    tenant: string;
    tenant_name?: string;
    settings: Record<string, any>;
    limits: Record<string, any>;
    features: string[];
    custom_fields: Record<string, any>;
    enable_advanced_analytics: boolean;
    enable_api_access: boolean;
    enable_webhooks: boolean;
    enable_audit_logs: boolean;
    billing_cycle: string;
    max_users: number;
    max_storage_mb: number;
    api_rate_limit: number;
    created_at: string;
    updated_at: string;
}

export interface TenantUsage {
    id: string;
    tenant: string;
    tenant_name?: string;
    date: string;
    active_users: number;
    api_calls: number;
    storage_used_mb: number;
    transactions_count: number;
    data_transfer_mb: number;
    exceeded_limits: string[];
    created_at: string;
    updated_at: string;
}

export interface TenantDomain {
    id: string;
    tenant: string;
    tenant_name?: string;
    domain: string;
    is_primary: boolean;
    is_active: boolean;
    is_ssl_enabled: boolean;
    ssl_certificate?: string;
    ssl_private_key?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTenantRequest {
    name: string;
    slug: string;
    domain: string;
    subdomain?: string;
    configuration?: Record<string, any>;
    features?: string[];
    limits?: Record<string, any>;
    custom_settings?: Record<string, any>;
    is_trial?: boolean;
    trial_ends_at?: string;
    is_active?: boolean;
    admin_email?: string;
    admin_password?: string;
}

export interface UpdateTenantRequest {
    name?: string;
    slug?: string;
    domain?: string;
    subdomain?: string;
    configuration?: Record<string, any>;
    features?: string[];
    limits?: Record<string, any>;
    custom_settings?: Record<string, any>;
    database_name?: string;
    database_url?: string;
    is_active?: boolean;
    is_trial?: boolean;
    trial_ends_at?: string;
}

const buildQuery = (params?: Record<string, string | number | boolean | undefined | null>) => {
    if (!params) return '';
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        query.append(key, String(value));
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

export const tenantService = {
    // Tenant CRUD operations
    getAllTenants(params?: { search?: string; is_active?: boolean; ordering?: string }) {
        return get<Tenant[]>(`/tenants/tenants/${buildQuery(params)}`);
    },

    getTenantById(id: string) {
        return get<Tenant>(`/tenants/tenants/${id}/`);
    },

    createTenant(data: CreateTenantRequest) {
        return post<Tenant>('/tenants/tenants/', data);
    },

    updateTenant(id: string, data: UpdateTenantRequest) {
        return patch<Tenant>(`/tenants/tenants/${id}/`, data);
    },

    deleteTenant(id: string) {
        return del<void>(`/tenants/tenants/${id}/`);
    },

    activateTenant(id: string) {
        return post<Tenant>(`/tenants/tenants/${id}/activate/`, {});
    },

    deactivateTenant(id: string) {
        return post<Tenant>(`/tenants/tenants/${id}/deactivate/`, {});
    },

    getTenantSummary() {
        return get<TenantSummary>('/tenants/tenants/summary/');
    },

    getTenantStats(id: string) {
        return get<TenantStats>(`/tenants/tenants/${id}/stats/`);
    },

    // Tenant Users
    getTenantUsers(tenantId: string) {
        return get<TenantUser[]>(`/tenants/users/${buildQuery({ tenant: tenantId })}`);
    },

    addTenantUser(data: { tenant: string; user: string; role: string; is_tenant_admin?: boolean; permissions?: string[] }) {
        return post<TenantUser>('/tenants/users/', data);
    },

    updateTenantUser(id: string, data: Partial<TenantUser>) {
        return patch<TenantUser>(`/tenants/users/${id}/`, data);
    },

    removeTenantUser(id: string) {
        return del<void>(`/tenants/users/${id}/`);
    },

    setTenantUserRole(id: string, role: string) {
        return post<TenantUser>(`/tenants/users/${id}/set_role/`, { role });
    },

    toggleTenantUserAdmin(id: string) {
        return post<TenantUser>(`/tenants/users/${id}/toggle_admin/`, {});
    },

    // Tenant Configuration
    async getTenantConfiguration(tenantId: string) {
        const configs = await get<TenantConfiguration[]>(`/tenants/configurations/${buildQuery({ tenant: tenantId })}`);
        return configs[0] ?? null;
    },

    updateTenantConfiguration(id: string, data: Partial<TenantConfiguration>) {
        return patch<TenantConfiguration>(`/tenants/configurations/${id}/`, data);
    },

    // Tenant Usage
    getTenantUsage(tenantId: string, params?: { start_date?: string; end_date?: string }) {
        return get<TenantUsage[]>(`/tenants/usage/${buildQuery({ ...params, tenant: tenantId })}`);
    },

    // Tenant Domains
    getTenantDomains(tenantId: string) {
        return get<TenantDomain[]>(`/tenants/domains/${buildQuery({ tenant: tenantId })}`);
    },

    addTenantDomain(data: { tenant: string; domain: string; is_primary?: boolean; is_active?: boolean }) {
        return post<TenantDomain>('/tenants/domains/', data);
    },

    updateTenantDomain(id: string, data: Partial<TenantDomain>) {
        return patch<TenantDomain>(`/tenants/domains/${id}/`, data);
    },

    removeTenantDomain(id: string) {
        return del<void>(`/tenants/domains/${id}/`);
    },
};

