export type VendorOrgLevel = 'vendor' | 'sub_vendor' | 'agent' | 'cashier';

export type VendorOrgStatus = 'active' | 'suspended' | 'invited';

export interface VendorOrg {
    id: string;
    tenant: string;
    name: string;
    slug: string;
    level: VendorOrgLevel;
    status: VendorOrgStatus;
    parent: string | null;
    parent_name?: string | null;
    configuration: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    wallet_key?: string | null;
    children?: VendorOrg[];
}

export type VendorRole = VendorOrgLevel;

export interface VendorRoleBinding {
    id: string;
    org: string;
    org_name: string;
    tenant_id: string;
    user: string;
    user_email: string;
    role: VendorRole;
    status: VendorOrgStatus;
    assigned_at: string;
    metadata?: Record<string, unknown>;
}

export interface VendorOrgForm {
    name: string;
    slug?: string;  // Auto-generated from name if not provided
    level: VendorOrgLevel;
    parent?: string | null;
    status?: VendorOrgStatus;
}

export interface BindingForm {
    user: string;
    role: VendorRole;
    status?: VendorOrgStatus;
    metadata?: Record<string, unknown>;
}

export interface WalletSummary {
    id: string;
    key: string;
    type: string;
    balance: string;
    owner_type: string;
    owner_id: string;
    role: string | null;
    tenant_id: string | null;
    limits?: Record<string, unknown>;
    created_at: string;
    daily_limit?: string;
    monthly_limit?: string;
    daily_spent?: string;
    monthly_spent?: string;
    is_locked?: boolean;
    failed_pin_attempts?: number;
}

export interface WalletTransferPayload {
    destination_owner_type: 'user' | 'vendor_org';
    destination_owner_id: string;
    amount: number;
    description?: string;
}

export interface WalletTransferResponse {
    transaction_id: string;
    reference: string;
    amount: string;
    status: string;
    created_at: string;
}

export interface ApiKey {
    id: string;
    owner_type: 'vendor_org' | 'user';
    owner_id: string;
    key_id: string;
    scopes: string[];
    is_active: boolean;
    expires_at: string | null;
    revoked_at: string | null;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
    secret: string;
}

export interface ApiKeyAuditEntry {
    id: string;
    requested_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
    action: string;
    success: boolean;
    metadata?: Record<string, unknown>;
}

export interface TenantAdminProfile {
    id: string;
    tenant: string;
    tenant_name: string;
    user: string;
    user_email: string;
    default_limits: Record<string, unknown>;
    onboarding_config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

