import { get, post, patch, del } from './api';
import { Tenant } from './tenantService';

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
    permission: {
        id: number;
        name: string;
        description: string;
        code: string;
    };
}

export const createNewAdmin = (data: adminForm) => {
    return post<CreateAdmin>('/user/admin/', data);
}
export const getAllAdmin = () => {
    return get<CreateAdmin[]>('/user/admin/');
}

export const getPermissions = () => {
    return get<PermissionItem[]>("/user/permissions/");
};
export const grantPermissions = (
    data: GrantPermissionPayload
) => {
    return post("/user/grant-permission/", data);
};