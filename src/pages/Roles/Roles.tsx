import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
    DataGrid,
    GridColDef,
} from "@mui/x-data-grid";

import {
    addMemberToGroup,
    deleteGroup,
    grantGroupPermissions,
    Group, GroupDetails, retriveGroups,
    viewGroup,
} from "../../services/roleService";
import { createGroup, editGroup } from "../../services/roleService";
import { toast } from "react-toastify";
import CreateGroupModal from "../../components/Permissions/CreateGroupModal"
import EditGroupModal from "../../components/Permissions/EditGroupModal"
import AddMemberModal from "../../components/Permissions/AddMember";
import ViewGroupModal from "../../components/Permissions/ViewGroupModal";
import AssignPermissionModal from "../../components/Permissions/AssignGroupPermission";
import DeleteGroupDialog from "../../components/Permissions/DeleteGroupModal";
export default function GroupManagement() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editing, setEditing] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [assigning, setAssigning] = useState(false)
    const [openAssign, setOpenAssign] = useState(false)
    const [openAssignPermission, setOpenAssignPermission] = useState(false);
    const [assigningPermission, setAssigningPermission] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [anchorEl, setAnchorEl] =
        useState<null | HTMLElement>(null);

    const [selectedGroup, setSelectedGroup] =
        useState<Group | null>(null);
    const [selectedvGroup, setSelectedvGroup] =
        useState<GroupDetails | null>(null);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);

            const groups = await retriveGroups();

            console.log(groups);

            setGroups(groups);
        } finally {
            setLoading(false);
        }
    };

    const handleViewGroup = async (
        groupId: number
    ) => {
        try {
            setLoading(true);

            const group = await viewGroup(groupId);

            setSelectedvGroup(group);
            setSelectedGroup(group);

            setOpenView(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (payload: {
        name: string;
        description: string;
    }) => {
        try {
            setCreating(true);

            await createGroup(payload);

            toast.success("Group created successfully");

            setOpenCreate(false);

            loadGroups();
        } catch (err: any) {
            toast.error(err.message || "Failed to create group");
        } finally {
            setCreating(false);
        }
    };

    const handleEditGroup = async (group_id: string | number, payload: {
        name: string;
        description: string;
    }) => {
        try {
            setEditing(true);

            await editGroup(payload, group_id);

            toast.success("Group Updated successfully");

            setOpenEdit(false);

            loadGroups();
        } catch (err: any) {
            toast.error(err.message || "Failed to Update group");
        } finally {
            setEditing(false);
        }
    };

    const handleAssignUsers = async (
        groupId: number,
        members: number[]
    ) => {
        try {
            setAssigning(true);

            await addMemberToGroup({
                group: groupId,
                members,
            });

            toast.success("Users assigned successfully");

            setOpenAssign(false);

            viewGroup(groupId.toString());

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignPermissions = async (
        groupId: number,
        permissions: number[]
    ) => {
        try {
            setAssigningPermission(true);

            await grantGroupPermissions({
                group: groupId,
                permissions,
            });

            toast.success("Permissions assigned successfully");

            setOpenAssignPermission(false);

            await viewGroup(groupId.toString());
        } catch (err: any) {
            toast.error(
                err.message || "Failed to assign permissions"
            );
        } finally {
            setAssigningPermission(false);
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        try {
            setDeleting(true);

            await deleteGroup(groupId);

            toast.success("Group deleted successfully");

            setOpenDelete(false);

            loadGroups();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete group");
        } finally {
            setDeleting(false);
        }
    };

    const handleMenuOpen = (
        e: React.MouseEvent<HTMLElement>,
        row: Group
    ) => {
        setAnchorEl(e.currentTarget);
        setSelectedGroup(row);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Group",
            flex: 1,
        },
        {
            field: "description",
            headerName: "Description",
            flex: 2,
        },
        {
            field: "created_at",
            headerName: "Created",
            flex: 1,
            valueGetter: (params) =>
                new Date(params.value).toLocaleDateString(),
        },
        {
            field: "action",
            headerName: "Action",
            width: 100,
            sortable: false,
            renderCell: (params) => (
                <IconButton
                    onClick={(e) =>
                        handleMenuOpen(e, params.row)
                    }
                >
                    <MoreVertIcon />
                </IconButton>
            ),
        },
    ];
    const refreshGroup = async (groupId: number) => {
        await viewGroup(groupId.toString());
    };
    return (
        <>
            <Card>
                <CardContent>

                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={3}
                    >
                        <Box>
                            <Typography
                                variant="h5"
                                fontWeight={700}
                            >
                                User Groups
                            </Typography>

                            <Typography color="text.secondary">
                                Manage roles and permissions
                            </Typography>
                        </Box>

                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            onClick={() =>
                                setOpenCreate(true)
                            }
                        >
                            Create Group
                        </Button>
                    </Stack>

                    <DataGrid
                        rows={groups ?? []}
                        columns={columns}
                        loading={loading}
                        autoHeight
                        disableRowSelectionOnClick
                        pageSizeOptions={[10]}
                    />
                </CardContent>
            </Card>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >

                <MenuItem
                    onClick={() => {
                        handleMenuClose();

                        if (selectedGroup) {
                            handleViewGroup(selectedGroup.id);
                        }
                    }}
                >
                    View
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        console.log("edit");
                        setOpenEdit(true)
                        handleMenuClose();
                    }}
                >
                    Edit
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        console.log("permissions");
                        setOpenAssignPermission(true);
                        handleMenuClose();
                    }}
                >
                    Manage Permissions
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        console.log("members");
                        setOpenAssign(true)
                        handleMenuClose();
                    }}
                >
                    Assign Members
                </MenuItem>

                <MenuItem
                    sx={{ color: "red" }}
                    onClick={() => {
                        console.log("delete");
                        setOpenDelete(true);
                        handleMenuClose();
                    }}
                >
                    Delete
                </MenuItem>

            </Menu>

            {/* CreateGroupModal */}
            <CreateGroupModal
                open={openCreate}
                loading={creating}
                onClose={() => setOpenCreate(false)}
                onSubmit={handleCreateGroup}
            />
            {/* EditGroupModal */}
            <EditGroupModal
                open={openEdit}
                loading={editing}
                onClose={() => setOpenEdit(false)}
                group={selectedGroup}
                onSubmit={handleEditGroup}
            />
            {/* Add Member */}
            <AddMemberModal
                open={openAssign}
                loading={assigning}
                onClose={() => setOpenAssign(false)}
                group={selectedGroup}
                onSubmit={handleAssignUsers}
            />
            {/* ViewGroupModal */}
            <ViewGroupModal
                open={openView}
                groupv={selectedvGroup}
                onClose={() => setOpenView(false)}
                onRefresh={refreshGroup}
            />
            {/* assign group permission */}
            <AssignPermissionModal
                open={openAssignPermission}
                loading={assigningPermission}
                groupv={selectedvGroup}
                onClose={() => setOpenAssignPermission(false)}
                onSubmit={handleAssignPermissions}
            />
            {/* DeleteGroupModal */}
            <DeleteGroupDialog
                open={openDelete}
                loading={deleting}
                group={selectedGroup}
                onClose={() => setOpenDelete(false)}
                onConfirm={handleDeleteGroup}
            />
        </>
    );
}