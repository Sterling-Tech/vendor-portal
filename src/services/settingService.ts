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
// export interface PermissionItem {
//     permission: {
//         id: number;
//         name: string;
//         description: string;
//         code: string;
//     };
// }
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
    // Field-keyed errors: { email: ["already exists"] }
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(err))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(', ')}`);
    return msgs.length ? msgs.join(' | ') : 'An unexpected error occurred';
};

export const createNewAdmin = (data: adminForm) => {
    return post<CreateAdmin>('/user/admin/', data);
}
// export const changePassword = (data: adminForm) => {
//     return post<CreateAdmin>('/user/admin/', data);
// }
export const getAllAdmin = () => {
    return get<CreateAdmin[]>('/user/admin/');
}
// ─── Update user profile  PUT /user/update-profile/ ───────────────────────────
// Allowed fields: name, gender, phone_number, is_2fa_enabled
// Email is NOT accepted by this endpoint — never pass it
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
        // Uses PUT as per the API spec
        return put<any>('/user/change-password/', data);
    };
