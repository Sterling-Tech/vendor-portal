import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Stack,
    Chip,
    Divider,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import { GroupDetails, removeGroupMembers, revokeGroupPermissions } from "../../services/roleService";

interface ViewGroupModalProps {
    open: boolean;
    groupv: GroupDetails | null;
    onClose: () => void;
    onRefresh?: (groupId: number) => Promise<void>;
}

export default function ViewGroupModal({
    open,
    groupv,
    onClose,
    onRefresh,
}: ViewGroupModalProps) {
    const [memberToRemove, setMemberToRemove] =
        useState<GroupDetails["members"][number] | null>(null);
    const [removing, setRemoving] = useState(false);

    const [permissionToRevoke, setPermissionToRevoke] =
        useState<GroupDetails["permissions"][number] | null>(null);

    const [revokingPermission, setRevokingPermission] =
        useState(false);

    if (!groupv) return null;

    const handleRemoveMember = (
        member: GroupDetails["members"][number]
    ) => {
        setMemberToRemove(member);
    };

    const handleConfirmRemove = async () => {
        if (!memberToRemove || !groupv) return;

        try {
            setRemoving(true);

            await removeGroupMembers({
                group: groupv.id,
                members: [memberToRemove.id],
            });

            toast.success("Member removed");

            setMemberToRemove(null);

            if (groupv) {
                await onRefresh?.(groupv.id);
            }

        } catch (err: any) {
            toast.error(err.message || "Failed to remove member");
        } finally {
            setRemoving(false);
        }
    };

    const handleRevokePermission = (
        permission: GroupDetails["permissions"][number]
    ) => {
        setPermissionToRevoke(permission);
    };
    const handleConfirmRevokePermission = async () => {
        if (!permissionToRevoke || !groupv) return;

        try {
            setRevokingPermission(true);

            await revokeGroupPermissions({
                group: groupv.id,
                permissions: [permissionToRevoke.permission.id],
            });

            toast.success("Permission revoked successfully");

            setPermissionToRevoke(null);

            if (groupv) {
                await onRefresh?.(groupv.id);
            }
        } catch (err: any) {
            toast.error(
                err.message || "Failed to revoke permission"
            );
        } finally {
            setRevokingPermission(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        overflow: "hidden",
                    },
                }}
            >
                {/* Header */}
                <DialogTitle
                    sx={{
                        bgcolor: "#0F2D6B",
                        color: "#fff",
                        py: 2,
                        px: 3,
                    }}
                >
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Box>
                            <Typography
                                fontSize={20}
                                fontWeight={700}
                            >
                                View User Group
                            </Typography>

                            <Typography
                                fontSize={13}
                                sx={{ opacity: 0.85 }}
                            >
                                Group details, permissions and assigned members
                            </Typography>
                        </Box>

                        <IconButton
                            onClick={onClose}
                            sx={{ color: "#fff" }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 4 }}>

                    {/* Name */}
                    <Typography
                        fontWeight={700}
                        color="#0F172A"
                    >
                        {groupv.name}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    {/* Description */}
                    <Typography
                        fontWeight={600}
                        color="text.secondary"
                        mb={1}
                    >
                        Description
                    </Typography>

                    <Typography mb={3}>
                        {groupv.description}
                    </Typography>

                    {/* Created */}
                    <Typography
                        fontWeight={600}
                        color="text.secondary"
                        mb={1}
                    >
                        Created
                    </Typography>

                    <Typography mb={3}>
                        {new Date(groupv.created_at).toLocaleDateString()}
                    </Typography>

                    {/* Permissions */}

                    <Typography
                        fontWeight={600}
                        color="text.secondary"
                        mb={2}
                    >
                        Permissions
                    </Typography>

                    {groupv.permissions.length === 0 ? (
                        <Box
                            sx={{
                                py: 3,
                                textAlign: "center",
                                bgcolor: "#F8FAFC",
                                borderRadius: 2,
                                border: "1px dashed #CBD5E1",
                            }}
                        >
                            <Typography color="text.secondary">
                                No permissions have been assigned to this group.
                            </Typography>
                        </Box>
                    ) : (
                        // <Stack
                        //     direction="row"
                        //     spacing={1}
                        //     useFlexGap
                        //     flexWrap="wrap"
                        //     mb={4}
                        // >
                        //     {groupv.permissions.map((permission) => (
                        //         <Chip
                        //             key={permission.permission.id}
                        //             icon={<CheckCircleRoundedIcon />}
                        //             label={permission.permission.name}
                        //             color="success"
                        //             variant="outlined"
                        //             onDelete={() =>
                        //                 handleRevokePermission(permission)
                        //             }
                        //             deleteIcon={
                        //                 <DeleteOutlineIcon color="error" />
                        //             }
                        //         />
                        //     ))}
                        // </Stack>
                        <Stack spacing={1}>
                            {groupv.permissions.map((permission) => (
                                <Box
                                    key={permission.permission.id}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 2,
                                        border: "1px solid #E2E8F0",
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box display="flex" gap={1.5}>
                                        <CheckCircleRoundedIcon color="success" />

                                        <Box>
                                            <Typography fontWeight={600}>
                                                {permission.permission.name}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {permission.permission.code}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Button
                                        color="error"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DeleteOutlineIcon />}
                                        onClick={() =>
                                            handleRevokePermission(permission)
                                        }
                                    >
                                        Revoke
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    )}


                    {/* Members */}

                    <Typography
                        fontWeight={600}
                        color="text.secondary"
                        mb={2}
                    >
                        Members
                    </Typography>

                    {groupv.members.length === 0 ? (
                        <Box
                            sx={{
                                py: 3,
                                textAlign: "center",
                                bgcolor: "#F8FAFC",
                                borderRadius: 2,
                                border: "1px dashed #CBD5E1",
                            }}
                        >
                            <Typography color="text.secondary">
                                No users belong to this group.
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1}>
                            {groupv.members.map((member) => (
                                <Box
                                    key={member.id}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 2,
                                        border: "1px solid #E2E8F0",
                                        borderRadius: 2,
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <CheckCircleRoundedIcon
                                            color="primary"
                                            fontSize="small"
                                        />

                                        <Box>
                                            <Typography fontWeight={600}>
                                                {member.name}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {member.email}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Button
                                        color="error"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DeleteOutlineIcon />}
                                        onClick={() => handleRemoveMember(member)}
                                    >
                                        Remove
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #E5E7EB",
                    }}
                >
                    <Button
                        variant="contained"
                        onClick={onClose}
                        sx={{
                            bgcolor: "#0F2D6B",
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>


            {/* remove member modal */}
            <Dialog
                open={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
            >
                <DialogTitle>
                    Remove Member
                </DialogTitle>

                <DialogContent>
                    <Typography>
                        Are you sure you want to remove
                        <strong>
                            {" "}{memberToRemove?.name}
                        </strong>
                        {" "}from this group?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setMemberToRemove(null)}
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        disabled={removing}
                        onClick={handleConfirmRemove}
                    >
                        {removing ? "Removing..." : "Remove"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* revoke permission modal */}
            <Dialog
                open={!!permissionToRevoke}
                onClose={() => setPermissionToRevoke(null)}
            >
                <DialogTitle>
                    Revoke Permission
                </DialogTitle>

                <DialogContent>
                    <Typography>
                        Are you sure you want to revoke
                        <strong>
                            {" "}
                            {permissionToRevoke?.permission.name}
                        </strong>
                        {" "}from this group?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() =>
                            setPermissionToRevoke(null)
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        disabled={revokingPermission}
                        onClick={
                            handleConfirmRevokePermission
                        }
                    >
                        {revokingPermission
                            ? "Revoking..."
                            : "Revoke"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}