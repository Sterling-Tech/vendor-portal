import { get, post, patch, del } from './api';
import {
    VendorOrg,
    VendorOrgForm,
    VendorRoleBinding,
    BindingForm,
    WalletSummary,
    WalletTransferPayload,
    WalletTransferResponse,
    ApiKey,
    ApiKeyWithSecret,
    ApiKeyAuditEntry,
    TenantAdminProfile,
} from '../types/vendor';

const buildTenantQuery = (tenantId?: string | null) => (tenantId ? `?tenant_id=${tenantId}` : '');

export const fetchTenantAdminProfiles = (tenantId?: string | null) => {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return get<TenantAdminProfile[]>(`/tenants/admin-profiles/${query}`);
};

export const fetchVendorOrgTree = (tenantId?: string | null) => {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    return get<VendorOrg[]>(`/tenants/vendor-orgs/tree/${query}`);
};

export const createVendorOrg = (payload: VendorOrgForm & { tenant: string }) => {
    // Auto-generate slug from name if not provided
    const slug = payload.slug || payload.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return post<VendorOrg>('/tenants/vendor-orgs/', { ...payload, slug });
};

export const updateVendorOrg = (id: string, payload: Partial<VendorOrgForm>) =>
    patch<VendorOrg>(`/tenants/vendor-orgs/${id}/`, payload);

export const deleteVendorOrg = (id: string) =>
    del<void>(`/tenants/vendor-orgs/${id}/`);

export const fetchOrgBindings = (orgId: string) =>
    get<VendorRoleBinding[]>(`/tenants/vendor-orgs/${orgId}/bindings/`);

export const addOrgBinding = (orgId: string, payload: BindingForm) =>
    post<VendorRoleBinding>(`/tenants/vendor-orgs/${orgId}/add_binding/`, payload);

export const updateBindingStatus = (bindingId: string, payload: Partial<BindingForm>) =>
    patch<VendorRoleBinding>(`/tenants/vendor-bindings/${bindingId}/`, payload);

export const deleteBinding = (bindingId: string) =>
    del<void>(`/tenants/vendor-bindings/${bindingId}/`);

export const fetchOrgWallets = (orgId: string) =>
    get<WalletSummary[]>(`/wallets/api/vendor-wallets/?owner_type=vendor_org&owner_id=${orgId}`);

export const fetchUserWallets = (userId: string) =>
    get<WalletSummary[]>(`/wallets/api/vendor-wallets/?owner_type=user&owner_id=${userId}`);

export const transferBetweenWallets = (walletId: string, payload: WalletTransferPayload) =>
    post<WalletTransferResponse>(`/wallets/api/vendor-wallets/${walletId}/transfer/`, payload);

export const fetchApiKeys = (ownerType: 'vendor_org' | 'user', ownerId: string) =>
    get<ApiKey[]>(`/core/api-keys/?owner_type=${ownerType}&owner_id=${ownerId}`);

export const issueApiKey = (payload: { owner_type: 'vendor_org' | 'user'; owner_id: string; scopes?: string[]; expires_at?: string | null }) =>
    post<ApiKeyWithSecret>('/core/api-keys/', payload);

export const rotateApiKey = (id: string) =>
    post<ApiKeyWithSecret>(`/core/api-keys/${id}/rotate/`, {});

export const revokeApiKey = (id: string) =>
    post<ApiKey>(`/core/api-keys/${id}/revoke/`, {});

export const deleteApiKey = (id: string) =>
    del<void>(`/core/api-keys/${id}/`);

export const fetchApiKeyAudit = (id: string) =>
    get<ApiKeyAuditEntry[]>(`/core/api-keys/${id}/audit/`);

export const bootstrapUserApiKey = () =>
    post<ApiKeyWithSecret>('/core/api-keys/bootstrap/', {});

export const fetchWalletTransactions = (walletId: string) =>
    get<any[]>(`/wallets/api/vendor-wallets/${walletId}/transactions/`);

