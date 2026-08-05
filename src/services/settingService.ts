import { get, post, put, patch, del } from './api';
import { Tenant } from './tenantService';

export interface UpdateProfilePayload {
    name?: string;
    gender?: string;
    phone_number?: string;
    is_2fa_enabled?: boolean;
}

export interface UserProfile {
    id: number;
    name: string;
    gender: string;
    phone_number: string;
    email: string;
    is_2fa_enabled: boolean;
    user_type: string;
}
export interface CreateAdmin {
    id: string;
    name: string;
    email: string;
    gender: string;
    phone_number: string;
}
export interface adminForm {
    name: string;
    email: string;
    gender: string;
    phone_number: string;
}
export interface Permission {
    id: number;
    name: string;
    description: string;
    code: string;
}

export interface GrantPermissionPayload {
    user: string;
    permissions: number[];
}
export interface PermissionItem {
        id: number;
        name: string;
        description: string;
        code: string;
}
export interface ChangePasswordPayload {
    old_password: string;
    new_password: string;
    confirm_password: string;
}

/** Extract a human-readable error from any DRF response shape */
export const extractError = (err: any): string => {
    if (!err || typeof err !== 'object') return String(err || 'An unexpected error occurred');
    if (typeof err.detail === 'string') return err.detail;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (Array.isArray(err.non_field_errors) && err.non_field_errors.length)
        return err.non_field_errors.join(' ');
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(err))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    return msgs.length ? msgs.join(' | ') : 'An unexpected error occurred';
};

export const createNewAdmin = (data: adminForm) => {
    return post<CreateAdmin>('/user/admin/', data);
}
export const getAllAdmin = () => {
    return get<CreateAdmin[]>('/user/admin/');
}
export const updateProfile = (data: UpdateProfilePayload) =>
    put<UserProfile>('/user/update-profile/', data);

export const getPermissions = () => {
    return get<PermissionItem[]>("/user/permissions/all");
};
export const grantPermissions = (
    data: GrantPermissionPayload
) => {
    return post("/user/grant-permission/", data);
};
export const changePassword = (data: ChangePasswordPayload) =>  {
        return put<any>('/user/change-password/',data);
    };

// ═════════════════════════════════════════════════════════════════════════
// TOTP (AUTHENTICATOR APP) 2FA
// ═════════════════════════════════════════════════════════════════════════

export interface TotpSetupResponse {
    secret: string;
    otpauth_uri: string;
    qr_code: string;
}

export interface TotpConfirmPayload {
    otp: string;
}

export interface TotpUserProfile {
    id: number;
    name: string;
    gender: string;
    phone_number: string;
    email: string;
    is_2fa_enabled: boolean;
    two_fa_method: 'email' | 'authenticator';
    totp_confirmed: boolean;
    group?: { id: number; name: string; description: string; created_at: string } | null;
    user_type: string;
    [key: string]: any;
}

export const setupTotp = () =>
    post<TotpSetupResponse>('/user/2fa/totp/setup/', {});

export const confirmTotp = (data: TotpConfirmPayload) =>
    post<TotpUserProfile>('/user/2fa/totp/confirm/', data);

export const disableTotp = () =>
    post<TotpUserProfile>('/user/2fa/totp/disable/', {});

// ═════════════════════════════════════════════════════════════════════════
// TOTP LOGIN VERIFICATION  (called from TotpLoginVerify page)
// ═════════════════════════════════════════════════════════════════════════

export interface TotpLoginPayload {
    email: string;
    otp: string;
}

/** POST /user/login/confirm-totp/ — verify TOTP code during login */
export const verifyTotpLogin = (data: TotpLoginPayload) =>
    post<any>('/user/login/confirm-totp/', data);

// ═════════════════════════════════════════════════════════════════════════
// PASSWORD POLICY
// ═════════════════════════════════════════════════════════════════════════

export interface PasswordPolicy {
    is_enabled: boolean;
    min_length: number;
    require_upper: boolean;
    require_lower: boolean;
    require_number: boolean;
    require_symbol: boolean;
    block_common_passwords: boolean;
    check_hibp_online: boolean;
    history_depth: number;
    max_failed_attempts: number;
    lockout_minutes: number;
    attempt_window_minutes: number;
    password_expiry_days: number;
    updated_at?: string;
}

export const getPasswordPolicy = () =>
    get<PasswordPolicy>('/user/password-policy/');

export const updatePasswordPolicy = (data: Omit<PasswordPolicy, 'updated_at'>) =>
    put<PasswordPolicy>('/user/password-policy/', data);