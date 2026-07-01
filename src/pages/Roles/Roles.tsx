import { useEffect, useMemo, useState } from "react";
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip,
    CircularProgress, Divider, Grid, IconButton, InputAdornment,
    Menu, MenuItem, Paper, Skeleton, Snackbar, Stack, TextField,
    Tooltip, Typography,
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
import FilterListIcon from "@mui/icons-material/FilterList";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SecurityIcon from "@mui/icons-material/Security";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import {
    DataGrid, GridColDef,
} from "@mui/x-data-grid";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const extractError = (err: any): string => {
    if (!err) return "Something went wrong. Please try again.";
    if (typeof err === "string") return err;
    const d = err?.response?.data ?? err?.data ?? err;
    if (typeof d?.detail === "string") return d.detail;
    if (typeof d?.message === "string") return d.message;
    if (Array.isArray(d?.non_field_errors) && d.non_field_errors.length)
        return d.non_field_errors.join(" ");
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(d ?? {}))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`);
    return msgs.length ? msgs.join(" | ") : "Something went wrong. Please try again.";
};

const inputSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        bgcolor: "#f3f4f8",
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0F2D6B" },
    },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
    label, value, icon, color = "primary", loading = false,
}: {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    color?: "primary" | "success" | "warning" | "info" | "error";
    loading?: boolean;
}) => (
    <Card sx={{ borderRadius: 3, border: "1px solid #f1f5f9", height: "100%" }}>
        <CardContent sx={{ p: "20px !important" }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}
                    >
                        {label}
                    </Typography>
                    {loading ? (
                        <Skeleton width={60} height={36} />
                    ) : (
                        <Typography variant="h5" fontWeight={800} mt={0.25}>
                            {value}
                        </Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 48, height: 48 }}>
                    {icon}
                </Avatar>
            </Stack>
        </CardContent>
    </Card>
);

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortKey = "name" | "created_at";
type SortDir = "asc" | "desc";

const SortIcon = ({ field, active, dir }: { field: SortKey; active: SortKey; dir: SortDir }) => {
    if (field !== active) return <UnfoldMoreIcon sx={{ fontSize: 14, color: "#94a3b8" }} />;
    return dir === "asc"
        ? <ArrowUpwardIcon sx={{ fontSize: 14, color: "#0F2D6B" }} />
        : <ArrowDownwardIcon sx={{ fontSize: 14, color: "#0F2D6B" }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function GroupManagement() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    // ── Modal states ──────────────────────────────────────────────────────────
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

    // ── Toast ─────────────────────────────────────────────────────────────────
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<"success" | "error">("success");
    const showToast = (msg: string, severity: "success" | "error" = "success") => {
        setToastMsg(msg); setToastSeverity(severity);
    };
    const [pageError, setPageError] = useState<string | null>(null);

    // ── Row menu ──────────────────────────────────────────────────────────────
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedvGroup, setSelectedvGroup] = useState<GroupDetails | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // ── Sort ──────────────────────────────────────────────────────────────────
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // ── Pagination ────────────────────────────────────────────────────────────
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);

    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => { loadGroups(); }, []);

    const loadGroups = async () => {
        try {
            setLoading(true); setPageError(null);
            const data = await retriveGroups();
            setGroups(data);
            setLastRefreshed(new Date());
        } catch (err: any) {
            setPageError(extractError(err));
        } finally {
            setLoading(false);
        }
    };

    // ── Derived / filtered data ───────────────────────────────────────────────
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return groups.filter(g => {
            const matchSearch =
                !term ||
                g.name?.toLowerCase().includes(term) ||
                (g as any).description?.toLowerCase().includes(term);
            const ts = new Date((g as any).created_at).getTime();
            const matchStart = !startDate || ts >= new Date(`${startDate}T00:00:00`).getTime();
            const matchEnd = !endDate || ts <= new Date(`${endDate}T23:59:59`).getTime();
            return matchSearch && matchStart && matchEnd;
        });
    }, [groups, search, startDate, endDate]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let va: any, vb: any;
            if (sortKey === "name") { va = a.name || ""; vb = b.name || ""; }
            else { va = new Date((a as any).created_at).getTime(); vb = new Date((b as any).created_at).getTime(); }
            if (va < vb) return sortDir === "asc" ? -1 : 1;
            if (va > vb) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [filtered, sortKey, sortDir]);

    const paginated = useMemo(
        () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sorted, page, rowsPerPage]
    );

    const stats = useMemo(() => ({
        total: groups.length,
        filtered: filtered.length,
        thisWeek: groups.filter(g => {
            const d = new Date((g as any).created_at);
            const now = new Date();
            return now.getTime() - d.getTime() < 7 * 24 * 3600 * 1000;
        }).length,
    }), [groups, filtered]);

    const hasFilters = search || startDate || endDate;

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const resetFilters = () => { setSearch(""); setStartDate(""); setEndDate(""); setPage(0); };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleViewGroup = async (groupId: number) => {
        try {
            setLoading(true);
            const group = await viewGroup(groupId);
            setSelectedvGroup(group); setSelectedGroup(group); setOpenView(true);
        } catch (err: any) { showToast(extractError(err), "error"); }
        finally { setLoading(false); }
    };

    const handleCreateGroup = async (payload: { name: string; description: string }) => {
        setCreating(true);
        try {
            await createGroup(payload);
            showToast("Group created successfully");
            setOpenCreate(false); loadGroups();
        } catch (err: any) { throw err; }
        finally { setCreating(false); }
    };

    const handleEditGroup = async (group_id: string | number, payload: { name: string; description: string }) => {
        setEditing(true);
        try {
            await editGroup(payload, group_id);
            showToast("Group updated successfully");
            setOpenEdit(false); loadGroups();
        } catch (err: any) { throw err; }
        finally { setEditing(false); }
    };

    const handleAssignUsers = async (groupId: number, members: number[]) => {
        setAssigning(true);
        try {
            await addMemberToGroup({ group: groupId, members });
            showToast("Users assigned successfully");
            setOpenAssign(false);
            await viewGroup(groupId.toString());
        } catch (err: any) { throw err; }
        finally { setAssigning(false); }
    };

    const handleAssignPermissions = async (groupId: number, permissions: number[]) => {
        setAssigningPermission(true);
        try {
            await grantGroupPermissions({ group: groupId, permissions });
            showToast("Permissions assigned successfully");
            setOpenAssignPermission(false);
            await viewGroup(groupId.toString());
        } catch (err: any) { throw err; }
        finally { setAssigningPermission(false); }
    };

    const handleDeleteGroup = async (groupId: number) => {
        setDeleting(true);
        try {
            await deleteGroup(groupId);
            showToast("Group deleted successfully");
            setOpenDelete(false); loadGroups();
        } catch (err: any) { throw err; }
        finally { setDeleting(false); }
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, row: Group) => {
        setAnchorEl(e.currentTarget); setSelectedGroup(row);
    };
    const handleMenuClose = () => setAnchorEl(null);

    const refreshGroup = async (groupId: number) => {
        try {
            const updated = await viewGroup(groupId.toString());
            setSelectedvGroup(updated);
        } catch (err: any) { showToast(extractError(err), "error"); }
    };

    // ── Sort header helper ────────────────────────────────────────────────────
    const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
        <Box
            component="span"
            onClick={() => toggleSort(field)}
            sx={{
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 0.5,
                userSelect: "none", transition: "color 0.15s",
                "&:hover": { color: "#0F2D6B" },
                fontWeight: sortKey === field ? 800 : 700,
                color: sortKey === field ? "#0F2D6B" : "#64748b",
                fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
            }}
        >
            {label}
            <SortIcon field={field} active={sortKey} dir={sortDir} />
        </Box>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Box p={{ xs: 2, md: 3 }} sx={{ bgcolor: "#f8faff", minHeight: "100vh" }}>

            {/* ── Page header ── */}
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                spacing={2} mb={3}
            >
                <Box>
                    <Typography variant="h4" fontWeight={800}>User Groups</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage roles and permissions · refreshed {lastRefreshed.toLocaleTimeString()}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Tooltip title="Refresh" arrow>
                        <Button
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={loadGroups}
                            disabled={loading}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                    <Button
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={() => setOpenCreate(true)}
                        sx={{
                            bgcolor: "#0F2D6B", borderRadius: 2,
                            textTransform: "none", fontWeight: 700, px: 3,
                            "&:hover": { bgcolor: "#0c2456" },
                        }}
                    >
                        Create Group
                    </Button>
                </Stack>
            </Stack>

            {/* ── Stat cards ── */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        label="Total Groups" value={groups.length}
                        icon={<GroupsIcon />} color="primary" loading={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        label="Showing (filtered)" value={filtered.length}
                        icon={<PeopleAltIcon />} color="info" loading={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        label="Created This Week" value={stats.thisWeek}
                        icon={<SecurityIcon />} color="success" loading={loading}
                    />
                </Grid>
            </Grid>

            {pageError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setPageError(null)}>
                    {pageError}
                </Alert>
            )}

            {/* ── Filter bar ── */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2.5, bgcolor: "#fff" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, pt: 0.25 }}>
                        <FilterListIcon fontSize="small" sx={{ color: "#64748b" }} />
                        <Typography variant="body2" fontWeight={700} color="text.secondary">Filters</Typography>
                    </Stack>
                    <Grid container spacing={1.5} sx={{ flex: 1 }}>
                        <Grid item xs={12} md={5}>
                            <TextField
                                fullWidth size="small"
                                placeholder="Search by group name or description…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(0); }}
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2.5}>
                            <TextField
                                fullWidth size="small" type="date" label="Created From"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setPage(0); }}
                                InputLabelProps={{ shrink: true }}
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CalendarTodayIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2.5}>
                            <TextField
                                fullWidth size="small" type="date" label="Created To"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setPage(0); }}
                                InputLabelProps={{ shrink: true }}
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CalendarTodayIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        {hasFilters && (
                            <Grid item xs={12} md={2} sx={{ display: "flex", alignItems: "center" }}>
                                <Button
                                    size="small" onClick={resetFilters}
                                    sx={{ color: "#64748b", textTransform: "none", borderRadius: 1.5 }}
                                >
                                    Clear filters ×
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Stack>
                {hasFilters && (
                    <Box mt={1.5}>
                        <Typography variant="caption" color="primary.main" fontWeight={700}>
                            Showing {filtered.length} of {groups.length} groups
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* ── Main table ── */}
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", bgcolor: "#fff" }}>
                {/* Table header strip */}
                <Stack
                    direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid #f1f5f9" }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: "#EEF2FF", color: "#0F2D6B", width: 36, height: 36 }}>
                            <GroupsIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>All Groups</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Click the ⋮ menu to manage any group
                            </Typography>
                        </Box>
                    </Stack>
                    {loading && <CircularProgress size={20} sx={{ color: "#0F2D6B" }} />}
                </Stack>

                <Box sx={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8faff" }}>
                                {[
                                    { label: "Group", key: "name" as SortKey, width: "22%" },
                                    { label: "Description", key: null, width: "35%" },
                                    { label: "Members", key: null, width: "12%" },
                                    { label: "Created", key: "created_at" as SortKey, width: "16%" },
                                    { label: "Action", key: null, width: "15%" },
                                ].map(col => (
                                    <th
                                        key={col.label}
                                        style={{
                                            width: col.width, padding: "12px 16px",
                                            textAlign: "left", borderBottom: "2px solid #e2e8f0",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {col.key ? (
                                            <SortHeader label={col.label} field={col.key} />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}
                                                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                                                {col.label}
                                            </Typography>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && paginated.length === 0 ? (
                                [...Array(rowsPerPage)].map((_, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        {[...Array(5)].map((__, j) => (
                                            <td key={j} style={{ padding: "14px 16px" }}>
                                                <Skeleton height={24} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "60px 16px" }}>
                                        <Stack spacing={1.5} alignItems="center">
                                            <Avatar sx={{ width: 56, height: 56, bgcolor: "#f1f5f9" }}>
                                                <GroupsIcon sx={{ fontSize: 28, color: "#cbd5e1" }} />
                                            </Avatar>
                                            <Typography color="text.secondary" fontWeight={600}>
                                                {hasFilters ? "No groups match your filters" : "No groups created yet"}
                                            </Typography>
                                            {hasFilters ? (
                                                <Button size="small" onClick={resetFilters} sx={{ textTransform: "none" }}>
                                                    Clear filters
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="small" variant="contained"
                                                    startIcon={<AddIcon />}
                                                    onClick={() => setOpenCreate(true)}
                                                    sx={{ textTransform: "none", bgcolor: "#0F2D6B", borderRadius: 2 }}
                                                >
                                                    Create your first group
                                                </Button>
                                            )}
                                        </Stack>
                                    </td>
                                </tr>
                            ) : paginated.map((group, idx) => (
                                <tr
                                    key={group.id}
                                    style={{
                                        borderBottom: "1px solid #f1f5f9",
                                        background: idx % 2 === 0 ? "#fff" : "#fafbff",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#f0f4ff")}
                                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbff")}
                                >
                                    {/* Group name */}
                                    <td style={{ padding: "14px 16px" }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ width: 36, height: 36, bgcolor: "#EEF2FF", color: "#0F2D6B", flexShrink: 0 }}>
                                                <GroupsIcon sx={{ fontSize: 18 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography fontWeight={700} fontSize={14} lineHeight={1.2}>
                                                    {group.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID #{group.id}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </td>

                                    {/* Description */}
                                    <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                                        <Typography
                                            variant="body2" color="text.secondary"
                                            sx={{
                                                overflow: "hidden", textOverflow: "ellipsis",
                                                whiteSpace: "nowrap", maxWidth: 280,
                                            }}
                                        >
                                            {(group as any).description || "—"}
                                        </Typography>
                                    </td>

                                    {/* Members */}
                                    <td style={{ padding: "14px 16px" }}>
                                        <Chip
                                            label={`${(group as any).members?.length ?? (group as any).user_count ?? "—"} members`}
                                            size="small"
                                            sx={{
                                                bgcolor: "#EEF2FF", color: "#0F2D6B",
                                                fontWeight: 700, borderRadius: 1.5, fontSize: 11,
                                            }}
                                        />
                                    </td>

                                    {/* Created */}
                                    <td style={{ padding: "14px 16px" }}>
                                        {(group as any).created_at ? (
                                            <Stack spacing={0.25}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {new Date((group as any).created_at).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date((group as any).created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </Typography>
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">—</Typography>
                                        )}
                                    </td>

                                    {/* Action */}
                                    <td style={{ padding: "14px 16px" }}>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Tooltip title="View group" arrow>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewGroup(group.id)}
                                                    sx={{
                                                        color: "#64748b", borderRadius: 1.5,
                                                        "&:hover": { bgcolor: "#eff6ff", color: "#0F2D6B" },
                                                    }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="More actions" arrow>
                                                <IconButton
                                                    size="small"
                                                    onClick={e => handleMenuOpen(e, group)}
                                                    sx={{
                                                        color: "#64748b", borderRadius: 1.5,
                                                        "&:hover": { bgcolor: "#f1f5f9" },
                                                    }}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>

                {/* Pagination footer */}
                <Stack
                    direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #f1f5f9", bgcolor: "#fafbff" }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Showing {Math.min(page * rowsPerPage + 1, sorted.length)}–{Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length} groups
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">Rows per page:</Typography>
                        {[5, 8, 12, 20].map(n => (
                            <Chip
                                key={n}
                                label={n}
                                size="small"
                                onClick={() => { setRowsPerPage(n); setPage(0); }}
                                sx={{
                                    cursor: "pointer", height: 24,
                                    bgcolor: rowsPerPage === n ? "#0F2D6B" : "#f1f5f9",
                                    color: rowsPerPage === n ? "#fff" : "#475569",
                                    fontWeight: rowsPerPage === n ? 700 : 400,
                                    "&:hover": { bgcolor: rowsPerPage === n ? "#0c2456" : "#e2e8f0" },
                                }}
                            />
                        ))}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Button
                            size="small" disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            sx={{ minWidth: 32, px: 1, borderRadius: 1.5, textTransform: "none", fontWeight: 700 }}
                        >
                            ‹ Prev
                        </Button>
                        {[...Array(Math.ceil(sorted.length / rowsPerPage))].map((_, i) => {
                            const cur = i === page;
                            if (Math.abs(i - page) > 1 && i !== 0 && i !== Math.ceil(sorted.length / rowsPerPage) - 1) {
                                if (i === page - 2 || i === page + 2) return <Typography key={i} variant="caption" sx={{ px: 0.5 }}>…</Typography>;
                                return null;
                            }
                            return (
                                <Chip
                                    key={i}
                                    label={i + 1}
                                    size="small"
                                    onClick={() => setPage(i)}
                                    sx={{
                                        cursor: "pointer", height: 26, minWidth: 26,
                                        bgcolor: cur ? "#0F2D6B" : "#f1f5f9",
                                        color: cur ? "#fff" : "#475569",
                                        fontWeight: cur ? 800 : 400,
                                        "&:hover": { bgcolor: cur ? "#0c2456" : "#e2e8f0" },
                                    }}
                                />
                            );
                        })}
                        <Button
                            size="small"
                            disabled={page >= Math.ceil(sorted.length / rowsPerPage) - 1}
                            onClick={() => setPage(p => p + 1)}
                            sx={{ minWidth: 32, px: 1, borderRadius: 1.5, textTransform: "none", fontWeight: 700 }}
                        >
                            Next ›
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* ── Context menu ── */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{ sx: { borderRadius: 2.5, minWidth: 210, boxShadow: "0 12px 32px rgba(0,0,0,0.14)" } }}
            >
                <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #f1f5f9" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {selectedGroup?.name}
                    </Typography>
                </Box>
                <MenuItem onClick={() => { handleMenuClose(); if (selectedGroup) handleViewGroup(selectedGroup.id); }} sx={{ py: 1.25, gap: 1.5 }}>
                    <VisibilityIcon fontSize="small" sx={{ color: "#0F2D6B" }} />
                    <Typography variant="body2" fontWeight={600}>View Details</Typography>
                </MenuItem>
                <MenuItem onClick={() => { setOpenEdit(true); handleMenuClose(); }} sx={{ py: 1.25, gap: 1.5 }}>
                    <EditIcon fontSize="small" sx={{ color: "#0F2D6B" }} />
                    <Typography variant="body2" fontWeight={600}>Edit Group</Typography>
                </MenuItem>
                <MenuItem onClick={() => { setOpenAssignPermission(true); handleMenuClose(); }} sx={{ py: 1.25, gap: 1.5 }}>
                    <VpnKeyIcon fontSize="small" sx={{ color: "#0F2D6B" }} />
                    <Typography variant="body2" fontWeight={600}>Manage Permissions</Typography>
                </MenuItem>
                <MenuItem onClick={() => { setOpenAssign(true); handleMenuClose(); }} sx={{ py: 1.25, gap: 1.5 }}>
                    <PersonAddIcon fontSize="small" sx={{ color: "#0F2D6B" }} />
                    <Typography variant="body2" fontWeight={600}>Assign Members</Typography>
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem sx={{ py: 1.25, gap: 1.5 }} onClick={() => { setOpenDelete(true); handleMenuClose(); }}>
                    <DeleteOutlineIcon fontSize="small" color="error" />
                    <Typography variant="body2" fontWeight={600} color="error.main">Delete Group</Typography>
                </MenuItem>
            </Menu>

            {/* ── Toast ── */}
            <Snackbar
                open={Boolean(toastMsg)}
                autoHideDuration={4000}
                onClose={() => setToastMsg(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert severity={toastSeverity} onClose={() => setToastMsg(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>
                    {toastMsg}
                </Alert>
            </Snackbar>

            {/* ── Modals ── */}
            <CreateGroupModal open={openCreate} loading={creating} onClose={() => setOpenCreate(false)} onSubmit={handleCreateGroup} />
            <EditGroupModal open={openEdit} loading={editing} onClose={() => setOpenEdit(false)} group={selectedGroup} onSubmit={handleEditGroup} />
            <AddMemberModal open={openAssign} loading={assigning} onClose={() => setOpenAssign(false)} group={selectedGroup} onSubmit={handleAssignUsers} />
            <ViewGroupModal open={openView} groupv={selectedvGroup} onClose={() => setOpenView(false)} onRefresh={refreshGroup} />
            <AssignPermissionModal open={openAssignPermission} loading={assigningPermission} groupv={selectedvGroup} onClose={() => setOpenAssignPermission(false)} onSubmit={handleAssignPermissions} />
            <DeleteGroupDialog open={openDelete} loading={deleting} group={selectedGroup} onClose={() => setOpenDelete(false)} onConfirm={handleDeleteGroup} />
        </Box>
    );
}