import { get, post, patch, del, put } from './api';

export interface Permission {
    id: number;
    name: string;
    description: string;
    code: string;
}

export interface GroupPermission {
    permission: Permission;
}

export interface GroupMember {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    gender: string;
    is_2fa_enabled: boolean;
    user_type: string;
}


export interface GroupDetails extends Group {
    permissions: GroupPermission[];
    members: GroupMember[];
}
// hhh
export interface Group {
    id: number;
    name: string;
    description: string;
    created_at: string;
}
export interface CreateGroupPayload {
  name: string;
  description: string;
}
export interface EditGroupPayload {
  name: string;
  description: string;
}

export interface RemoveGroupMembersPayload {
    group: number;
    members: number[];
}

export const createGroup = (
  payload: CreateGroupPayload
) => {
  return post("/user/group/", payload);
};
export const retriveGroups = () => {
    return get<Group[]>('/user/group/');
}
export const viewGroup = (groupId: number | string) => {
    return get<GroupDetails>(
        `/user/group/?group_id=${groupId}`
    );
};
export const editGroup = (
    payload: EditGroupPayload,
    groupId: string | number
) =>{
    return put<Group>(
    `/user/group/?group_id=${groupId}`,
    payload
  )
}

export const removeGroupMembers = (
    payload: RemoveGroupMembersPayload
) => {
    return del<void>("/user/group/members/", payload);
};

export const addMemberToGroup = (payload: {
    group: number;
    members: number[];
}) => {
    return put("/user/group/members/", payload);
};

export const getSystemPermissions = () => {
  return get<Permission[]>("/user/permissions/all/");
};

export const grantGroupPermissions = (payload: {
  group: number;
  permissions: number[];
}) => {
  return post("/user/group/permission/grant/", payload);
};
export const deleteGroup = (groupId: string | number) => {
  return del<void>(`/user/group/?group_id=${groupId}`);
};
export const revokeGroupPermissions = (payload: {
  group: number;
  permissions: number[];
}) => {
  return post<GroupDetails>(
    "/user/group/permission/revoke/",
    payload
  );
};