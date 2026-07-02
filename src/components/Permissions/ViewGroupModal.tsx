import { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Button, Box, Stack, Divider, IconButton,
    Alert, CircularProgress, Chip, Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import VpnKeyIcon from "@mui/icons-material/VpnKeyOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import { GroupDetails, removeGroupMembers, revokeGroupPermissions } from "../../services/roleService";

interface ViewGroupModalProps {
    open: boolean;
    groupv: GroupDetails | null;
    onClose: () => void;
    onRefresh?: (groupId: number) => Promise<void>;
}

const extractError = (err: any): string => {
    if (!err) return "Something went wrong. Please try again.";
    if (typeof err === "string") return err;
    if (err instanceof TypeError) return `Network error: ${err.message}`;
    const body = err?.response?.data ?? err;
    if (typeof body === "string") return body;
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.message === "string") return body.message;
    if (Array.isArray(body.non_field_errors) && body.non_field_errors.length) return body.non_field_errors.join(" ");
    const msgs: string[] = [];
    try { for (const [k, v] of Object.entries(body)) if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`); } catch { }
    return msgs.length ? msgs.join(" | ") : "Something went wrong. Please try again.";
};

export default function ViewGroupModal({ open, groupv, onClose, onRefresh }: ViewGroupModalProps) {
    const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);
    const [permissionToRevoke, setPermissionToRevoke] = useState<any | null>(null);
    const [revoking, setRevoking] = useState(false);
    const [revokeError, setRevokeError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    if (!open) return null;

    const permissions = Array.isArray(groupv?.permissions) ? groupv!.permissions : [];
    const members = Array.isArray(groupv?.members) ? groupv!.members : [];

    const handleConfirmRemove = async () => {
        if (!memberToRemove || !groupv) return;
        setRemoving(true); setRemoveError(null);
        try {
            await removeGroupMembers({ group: groupv.id, members: [memberToRemove.id] });
            setSuccessMsg(`${memberToRemove.name ?? "Member"} removed successfully`);
            setMemberToRemove(null);
            await onRefresh?.(groupv.id);
        } catch (err: any) { setRemoveError(extractError(err)); }
        finally { setRemoving(false); }
    };

    const handleConfirmRevoke = async () => {
        if (!permissionToRevoke || !groupv) return;
        setRevoking(true); setRevokeError(null);
        try {
            await revokeGroupPermissions({ group: groupv.id, permissions: [permissionToRevoke?.permission?.id ?? permissionToRevoke?.id] });
            setSuccessMsg(`Permission revoked successfully`);
            setPermissionToRevoke(null);
            await onRefresh?.(groupv.id);
        } catch (err: any) { setRevokeError(extractError(err)); }
        finally { setRevoking(false); }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
                <DialogTitle sx={{ background: "linear-gradient(135deg, #0F2D6B 0%, #1A3F8F 100%)", color: "#fff", py: 2.5, px: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <GroupsIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Typography fontSize={18} fontWeight={700}>{groupv?.name ?? "Group Details"}</Typography>
                                <Typography fontSize={12} sx={{ opacity: 0.8 }}>Permissions and assigned members</Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } }}><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    {successMsg && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

                    {/* Description */}
                    {groupv?.description && (
                        <Box sx={{ mb: 2.5, p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                            <Typography variant="body2" color="text.secondary">{groupv.description}</Typography>
                        </Box>
                    )}

                    {groupv?.created_at && (
                        <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
                            Created: {new Date(groupv.created_at).toLocaleDateString()}
                        </Typography>
                    )}

                    {/* Permissions */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <VpnKeyIcon fontSize="small" color="action" />
                            <Typography fontWeight={700}>Permissions</Typography>
                        </Stack>
                        <Chip label={permissions.length} size="small" color="primary" variant="outlined" />
                    </Stack>

                    {permissions.length === 0 ? (
                        <Box sx={{ py: 3, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: 2, border: "1px dashed #CBD5E1", mb: 3 }}>
                            <Typography color="text.secondary" fontSize={13}>No permissions assigned to this group.</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1} mb={3}>
                            {permissions.map((perm: any, i: number) => {
                                const p = perm?.permission ?? perm ?? {};
                                return (
                                    <Box key={p?.id ?? i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, border: "1px solid #E2E8F0", borderRadius: 2, "&:hover": { bgcolor: "#F8FAFC" } }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <CheckCircleRoundedIcon color="success" fontSize="small" />
                                            <Box>
                                                <Typography fontWeight={600} fontSize={13}>{p?.name ?? "—"}</Typography>
                                                {p?.code && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{p.code}</Typography>}
                                            </Box>
                                        </Stack>
                                        <Button color="error" variant="outlined" size="small" startIcon={<DeleteOutlineIcon />}
                                            onClick={() => setPermissionToRevoke(perm)}
                                            sx={{ borderRadius: 2, textTransform: "none", fontSize: 12 }}>
                                            Revoke
                                        </Button>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}

                    <Divider sx={{ mb: 2.5 }} />

                    {/* Members */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography fontWeight={700}>Members</Typography>
                        </Stack>
                        <Chip label={members.length} size="small" color="secondary" variant="outlined" />
                    </Stack>

                    {members.length === 0 ? (
                        <Box sx={{ py: 3, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: 2, border: "1px dashed #CBD5E1" }}>
                            <Typography color="text.secondary" fontSize={13}>No users belong to this group.</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1}>
                            {members.map((member: any, i: number) => (
                                <Box key={member?.id ?? i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, border: "1px solid #E2E8F0", borderRadius: 2, "&:hover": { bgcolor: "#F8FAFC" } }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: "#EEF2FF", color: "#0F2D6B", fontSize: 13, fontWeight: 700 }}>
                                            {(member?.name ?? member?.email ?? "?").charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight={600} fontSize={13}>{member?.name ?? "—"}</Typography>
                                            <Typography variant="caption" color="text.secondary">{member?.email ?? ""}</Typography>
                                        </Box>
                                    </Stack>
                                    <Button color="error" variant="outlined" size="small" startIcon={<DeleteOutlineIcon />}
                                        onClick={() => setMemberToRemove(member)}
                                        sx={{ borderRadius: 2, textTransform: "none", fontSize: 12 }}>
                                        Remove
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, borderTop: "1px solid #E5E7EB", bgcolor: "#FAFBFC" }}>
                    <Button variant="contained" onClick={onClose}
                        sx={{ bgcolor: "#0F2D6B", borderRadius: 2, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#0c2456" } }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm remove member */}
            <Dialog open={!!memberToRemove} onClose={removing ? undefined : () => setMemberToRemove(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Remove Member</DialogTitle>
                <DialogContent>
                    {removeError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setRemoveError(null)}>{removeError}</Alert>}
                    <Typography>Remove <strong>{memberToRemove?.name ?? "this user"}</strong> from the group?</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setMemberToRemove(null)} disabled={removing} sx={{ borderRadius: 2, textTransform: "none" }}>Cancel</Button>
                    <Button color="error" variant="contained" disabled={removing} onClick={handleConfirmRemove}
                        startIcon={removing ? <CircularProgress size={14} color="inherit" /> : undefined}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                        {removing ? "Removing…" : "Remove"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm revoke permission */}
            <Dialog open={!!permissionToRevoke} onClose={revoking ? undefined : () => setPermissionToRevoke(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Revoke Permission</DialogTitle>
                <DialogContent>
                    {revokeError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setRevokeError(null)}>{revokeError}</Alert>}
                    <Typography>Revoke <strong>{permissionToRevoke?.permission?.name ?? permissionToRevoke?.name ?? "this permission"}</strong>?</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setPermissionToRevoke(null)} disabled={revoking} sx={{ borderRadius: 2, textTransform: "none" }}>Cancel</Button>
                    <Button color="error" variant="contained" disabled={revoking} onClick={handleConfirmRevoke}
                        startIcon={revoking ? <CircularProgress size={14} color="inherit" /> : undefined}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                        {revoking ? "Revoking…" : "Revoke"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}