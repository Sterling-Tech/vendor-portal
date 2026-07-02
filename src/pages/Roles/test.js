import { useEffect, useState } from "react";
import {
    Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    IconButton, Menu, MenuItem, Snackbar, Alert, Stack, Typography,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    TablePagination, Paper, InputAdornment, TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import GroupsIcon from "@mui/icons-material/Groups";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import VpnKeyIcon from "@mui/icons-material/VpnKeyOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
    addMemberToGroup, deleteGroup, grantGroupPermissions,
    Group, GroupDetails, retriveGroups, viewGroup,
    createGroup, editGroup,
} from "../../services/roleService";
import CreateGroupModal from "../../components/Permissions/CreateGroupModal";
import EditGroupModal from "../../components/Permissions/EditGroupModal";
import AddMemberModal from "../../components/Permissions/AddMember";
import ViewGroupModal from "../../components/Permissions/ViewGroupModal";
import AssignPermissionModal from "../../components/Permissions/AssignGroupPermission";
import DeleteGroupDialog from "../../components/Permissions/DeleteGroupModal";

// ── Robust error extractor ────────────────────────────────────────────────────
const extractError = (err: any): string => {
    if (!err) return "Something went wrong. Please try again.";
    if (typeof err === "string") return err;
    // Network / fetch errors
    if (err instanceof TypeError && err.message) return `Network error: ${err.message}`;
    // Axios-style response body
    const body = err?.response?.data ?? err;
    if (typeof body === "string") return body;
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
    if (Array.isArray(body.non_field_errors) && body.non_field_errors.length)
        return body.non_field_errors.join(" ");
    // Field-keyed DRF errors { email: ["already exists"] }
    const msgs: string[] = [];
    try {
        for (const [k, v] of Object.entries(body))
            if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`);
    } catch { /* ignore */ }
    return msgs.length ? msgs.join(" | ") : "Something went wrong. Please try again.";
};

// Safely normalize whatever the API returns into a Group array
const toGroupArray = (raw: any): Group[] => {
    if (Array.isArray(raw)) return raw as Group[];
    if (raw && Array.isArray(raw.results)) return raw.results as Group[];
    if (raw && Array.isArray(raw.data)) return raw.data as Group[];
    return [];
};

export default function GroupManagement() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // pagination (client-side — groups list usually small)
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // dialogs
    const [openCreate, setOpenCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editing, setEditing] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [openAssignPermission, setOpenAssignPermission] = useState(false);
    const [assigningPermission, setAssigningPermission] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // selected row
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedvGroup, setSelectedvGroup] = useState<GroupDetails | null>(null);

    // feedback
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<"success" | "error">("success");
    const [pageError, setPageError] = useState<string | null>(null);

    const showToast = (msg: string, severity: "success" | "error" = "success") => {
        setToastMsg(msg); setToastSeverity(severity);
    };

    // ── Load groups ─────────────────────────────────────────────────────────────
    const loadGroups = async () => {
        try {
            setLoading(true);
            setPageError(null);
            const raw = await retriveGroups();
            setGroups(toGroupArray(raw));
        } catch (err: any) {
            const msg = extractError(err);
            setPageError(msg);
            setGroups([]); // ensure never undefined
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadGroups(); }, []);

    // ── Filtered rows (safe — groups is always []) ───────────────────────────────
    const filteredGroups = (Array.isArray(groups) ? groups : []).filter(g =>
        !search.trim() ||
        (g?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (g?.description ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const paginatedGroups = filteredGroups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // ── View group ──────────────────────────────────────────────────────────────
    const handleViewGroup = async (groupId: number) => {
        try {
            setLoading(true);
            const grp = await viewGroup(groupId);
            setSelectedvGroup(grp ?? null);
            setSelectedGroup((grp as any) ?? null);
            setOpenView(true);
        } catch (err: any) {
            showToast(extractError(err), "error");
        } finally {
            setLoading(false);
        }
    };

    // ── Create — rethrows so modal shows inline error ────────────────────────────
    const handleCreateGroup = async (payload: { name: string; description: string }) => {
        setCreating(true);
        try {
            await createGroup(payload);
            showToast("Group created successfully");
            setOpenCreate(false);
            loadGroups();
        } catch (err: any) {
            throw err; // CreateGroupModal catches and shows inline
        } finally {
            setCreating(false);
        }
    };

    // ── Edit ────────────────────────────────────────────────────────────────────
    const handleEditGroup = async (group_id: string | number, payload: { name: string; description: string }) => {
        setEditing(true);
        try {
            await editGroup(payload, group_id);
            showToast("Group updated successfully");
            setOpenEdit(false);
            loadGroups();
        } catch (err: any) {
            throw err;
        } finally {
            setEditing(false);
        }
    };

    // ── Assign members ──────────────────────────────────────────────────────────
    const handleAssignUsers = async (groupId: number, members: number[]) => {
        setAssigning(true);
        try {
            await addMemberToGroup({ group: groupId, members });
            showToast("Users assigned successfully");
            setOpenAssign(false);
        } catch (err: any) {
            throw err;
        } finally {
            setAssigning(false);
        }
    };

    // ── Assign permissions ──────────────────────────────────────────────────────
    const handleAssignPermissions = async (groupId: number, permissions: number[]) => {
        setAssigningPermission(true);
        try {
            await grantGroupPermissions({ group: groupId, permissions });
            showToast("Permissions assigned successfully");
            setOpenAssignPermission(false);
        } catch (err: any) {
            throw err;
        } finally {
            setAssigningPermission(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDeleteGroup = async (groupId: number) => {
        setDeleting(true);
        try {
            await deleteGroup(groupId);
            showToast("Group deleted successfully");
            setOpenDelete(false);
            setSelectedGroup(null);
            loadGroups();
        } catch (err: any) {
            throw err;
        } finally {
            setDeleting(false);
        }
    };

    const refreshGroup = async (groupId: number) => {
        try {
            const updated = await viewGroup(groupId.toString());
            setSelectedvGroup(updated ?? null);
        } catch (err: any) {
            showToast(extractError(err), "error");
        }
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, row: Group) => {
        setAnchorEl(e.currentTarget); setSelectedGroup(row);
    };
    const handleMenuClose = () => setAnchorEl(null);

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <>
            <Card sx={{ borderRadius: 3, boxShadow: "0 4px 24px rgba(15,23,42,0.07)", overflow: "hidden" }}>
                <CardContent sx={{ p: 0 }}>
                    {/* ── Header ── */}
                    <Box
                        sx={{
                            px: 3, py: 2.5,
                            background: "linear-gradient(135deg, #0F2D6B 0%, #1A3F8F 100%)",
                        }}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <GroupsIcon sx={{ color: "#fff", fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="#fff">User Groups</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
                                        Manage roles and permissions · {Array.isArray(groups) ? groups.length : 0} groups
                                    </Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
                                    onClick={loadGroups}
                                    disabled={loading}
                                    sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", borderRadius: 2, textTransform: "none", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="contained"
                                    onClick={() => setOpenCreate(true)}
                                    sx={{ bgcolor: "#fff", color: "#0F2D6B", borderRadius: 2, textTransform: "none", fontWeight: 700, "&:hover": { bgcolor: "#EEF2FF" } }}
                                >
                                    Create Group
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
                        {/* ── Page error ── */}
                        {pageError && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPageError(null)}>
                                {pageError}
                            </Alert>
                        )}

                        {/* ── Search ── */}
                        <TextField
                            size="small"
                            placeholder="Search groups…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
                            sx={{ mb: 2, maxWidth: 360, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />

                        {/* ── Table ── */}
                        {loading && groups.length === 0 ? (
                            <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={8}>
                                <CircularProgress size={40} sx={{ color: "#0F2D6B" }} />
                                <Typography color="text.secondary">Loading groups…</Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: "#64748B", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Group</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: "#64748B", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: "#64748B", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Created</TableCell>
                                            <TableCell sx={{ fontWeight: 700, py: 1.5, color: "#64748B", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, width: 64 }} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedGroups.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 7 }}>
                                                    <Stack alignItems="center" spacing={1}>
                                                        <GroupsIcon sx={{ fontSize: 40, color: "#CBD5E1" }} />
                                                        <Typography color="text.secondary" fontWeight={500}>
                                                            {search ? "No groups match your search" : "No groups created yet"}
                                                        </Typography>
                                                        {!search && (
                                                            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}
                                                                sx={{ borderRadius: 2, textTransform: "none", mt: 1 }}>
                                                                Create First Group
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedGroups.map((row) => (
                                            <TableRow key={row?.id ?? Math.random()} hover
                                                sx={{ "&:hover": { bgcolor: "#F8FAFC" }, "&:last-child td": { border: 0 } }}>
                                                <TableCell sx={{ py: 2 }}>
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <Avatar sx={{ width: 34, height: 34, bgcolor: "#EEF2FF", color: "#0F2D6B", fontSize: 14, fontWeight: 700 }}>
                                                            {(row?.name ?? "?").charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        <Typography fontWeight={600} fontSize={14}>{row?.name ?? "—"}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {row?.description ?? "—"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={row?.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                                                        size="small" variant="outlined"
                                                        sx={{ borderRadius: 1.5, fontSize: 11 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                                                        <MoreVertIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        <TablePagination
                            component="div"
                            count={filteredGroups.length}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={(_, p) => setPage(p)}
                            onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[5, 10, 25]}
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* ── Row action menu ── */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 210, boxShadow: "0 8px 24px rgba(0,0,0,0.13)" } }}>
                <MenuItem onClick={() => { handleMenuClose(); if (selectedGroup) handleViewGroup(selectedGroup.id); }} sx={{ py: 1.3, gap: 1.5 }}>
                    <VisibilityIcon fontSize="small" color="action" /> View Details
                </MenuItem>
                <MenuItem onClick={() => { setOpenEdit(true); handleMenuClose(); }} sx={{ py: 1.3, gap: 1.5 }}>
                    <EditIcon fontSize="small" color="action" /> Edit Group
                </MenuItem>
                <MenuItem onClick={() => { setOpenAssignPermission(true); handleMenuClose(); }} sx={{ py: 1.3, gap: 1.5 }}>
                    <VpnKeyIcon fontSize="small" color="action" /> Manage Permissions
                </MenuItem>
                <MenuItem onClick={() => { setOpenAssign(true); handleMenuClose(); }} sx={{ py: 1.3, gap: 1.5 }}>
                    <PersonAddIcon fontSize="small" color="action" /> Assign Members
                </MenuItem>
                <MenuItem sx={{ color: "error.main", py: 1.3, gap: 1.5 }} onClick={() => { setOpenDelete(true); handleMenuClose(); }}>
                    <DeleteOutlineIcon fontSize="small" color="error" /> Delete Group
                </MenuItem>
            </Menu>

            {/* ── Toast ── */}
            <Snackbar open={Boolean(toastMsg)} autoHideDuration={4500} onClose={() => setToastMsg(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
                <Alert severity={toastSeverity} onClose={() => setToastMsg(null)} sx={{ borderRadius: 2, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                    {toastMsg}
                </Alert>
            </Snackbar>

            {/* ── Dialogs ── */}
            <CreateGroupModal open={openCreate} loading={creating} onClose={() => setOpenCreate(false)} onSubmit={handleCreateGroup} />
            <EditGroupModal open={openEdit} loading={editing} onClose={() => setOpenEdit(false)} group={selectedGroup} onSubmit={handleEditGroup} />
            <AddMemberModal open={openAssign} loading={assigning} onClose={() => setOpenAssign(false)} group={selectedGroup} onSubmit={handleAssignUsers} />
            <ViewGroupModal open={openView} groupv={selectedvGroup} onClose={() => setOpenView(false)} onRefresh={refreshGroup} />
            <AssignPermissionModal open={openAssignPermission} loading={assigningPermission} groupv={selectedvGroup} onClose={() => setOpenAssignPermission(false)} onSubmit={handleAssignPermissions} />
            <DeleteGroupDialog open={openDelete} loading={deleting} group={selectedGroup} onClose={() => setOpenDelete(false)} onConfirm={handleDeleteGroup} />
        </>
    );
}