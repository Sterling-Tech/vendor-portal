import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Collapse,
    FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
    Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
    TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import {
    AddCircle, ChevronRight, DeleteForever, Edit, FilterList, History,
    Receipt, Refresh, Search, Update,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
    vendorManagementService,
    extractBackendError,
    VendorHistoryEntry,
} from './../../../services/vendormanagementservice';

// ─── Types ────────────────────────────────────────────────────────────────────
type MuiColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type ActionFilter = 'all' | 'create' | 'update' | 'delete';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (v?: string) => {
    const d = new Date(v || Date.now());
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};
const formatNumber = (v: number) => new Intl.NumberFormat('en-NG').format(v);

/** Fields we never surface in a diff, even if they technically changed */
const SENSITIVE_FIELDS = new Set(['password', 'token']);
/** Fields that are noisy/redundant in a diff view */
const SKIPPED_FIELDS = new Set(['last_updated']);

const actionIcon = (action?: string) => {
    const a = (action || '').toLowerCase();
    if (a === 'create') return <AddCircle sx={{ fontSize: 16 }} />;
    if (a === 'delete') return <DeleteForever sx={{ fontSize: 16 }} />;
    if (a === 'update') return <Update sx={{ fontSize: 16 }} />;
    return <Edit sx={{ fontSize: 16 }} />;
};
const actionColor = (action?: string): MuiColor => {
    const a = (action || '').toLowerCase();
    if (a === 'create') return 'success';
    if (a === 'delete') return 'error';
    if (a === 'update') return 'warning';
    return 'primary';
};
const formatValue = (v: any): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};
/** Diff two vendor snapshots, skipping sensitive/noisy fields. `previous` may be null (CREATE events). */
const computeChanges = (previous: Record<string, any> | null, present: Record<string, any> | null) => {
    const changes: { field: string; oldVal: any; newVal: any }[] = [];
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(present || {})]);
    keys.forEach((key) => {
        if (SENSITIVE_FIELDS.has(key) || SKIPPED_FIELDS.has(key)) return;
        const oldVal = previous ? previous[key] : undefined;
        const newVal = present ? present[key] : undefined;
        if (previous === null) {
            if (newVal !== null && newVal !== undefined && newVal !== '') changes.push({ field: key, oldVal: undefined, newVal });
            return;
        }
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changes.push({ field: key, oldVal, newVal });
    });
    return changes;
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, bgcolor: '#f3f4f8',
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a8a' },
    },
    '& .MuiOutlinedInput-input': { bgcolor: 'transparent' },
};

const StatCard = ({ title, value, icon, color = 'primary' }: { title: string; value: React.ReactNode; icon: React.ReactNode; color?: MuiColor }) => (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="body2" color="text.secondary">{title}</Typography>
                    <Typography variant="h5" fontWeight={700}>{value}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
            </Stack>
        </CardContent>
    </Card>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — My Vendor History
// GET /audit/history/vendor/?vendor_id={id}  (vendor_id comes from the logged-in user)
// ═══════════════════════════════════════════════════════════════════════════════
const VendorHistory: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const vendorId = user?.related_vendor?.id;

    const [entries, setEntries] = useState<VendorHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async () => {
        if (!vendorId) {
            setError('No vendor account is linked to your profile, so history cannot be loaded.');
            setEntries([]);
            return;
        }
        setLoading(true); setError(null);
        try {
            const res = await vendorManagementService.getVendorHistory(vendorId);
            const sorted = [...(Array.isArray(res) ? res : [])].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setEntries(sorted);
        } catch (err: any) {
            setError(extractBackendError(err));
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [vendorId]);

    // Pull it instantly as soon as the logged-in vendor id is available
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const toggleExpanded = (id: number) => {
        setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const changesByEntry = useMemo(() => {
        const map = new Map<number, { field: string; oldVal: any; newVal: any }[]>();
        entries.forEach(e => map.set(e.id, computeChanges(e.previous, e.present)));
        return map;
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const term = search.trim().toLowerCase();
        return entries.filter(e => {
            const action = (e.action || '').toLowerCase();
            const matchesFilter = actionFilter === 'all' || action === actionFilter;
            if (!term) return matchesFilter;
            const changes = changesByEntry.get(e.id) || [];
            const matchesTerm =
                action.includes(term) ||
                changes.some(c =>
                    c.field.toLowerCase().includes(term) ||
                    formatValue(c.newVal).toLowerCase().includes(term) ||
                    formatValue(c.oldVal).toLowerCase().includes(term)
                );
            return matchesFilter && matchesTerm;
        });
    }, [entries, search, actionFilter, changesByEntry]);

    const paginatedEntries = useMemo(
        () => filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredEntries, page, rowsPerPage]
    );

    const stats = useMemo(() => {
        const created = entries.filter(e => (e.action || '').toLowerCase() === 'create').length;
        const updated = entries.filter(e => (e.action || '').toLowerCase() === 'update').length;
        const mostRecent = entries[0]?.timestamp;
        return { total: entries.length, created, updated, mostRecent: mostRecent ? formatDateTime(mostRecent) : '—' };
    }, [entries]);

    // Vendor display name, pulled from whichever snapshot has it
    const vendorName = useMemo(() => {
        const withName = entries.find(e => e.present?.business_name || e.previous?.business_name);
        return withName?.present?.business_name || withName?.previous?.business_name || null;
    }, [entries]);

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <Box p={{ xs: 2}}>
            {/* ── Page header ── */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">My Vendor History</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {vendorName ? `Every recorded change to ${vendorName}` : 'Every recorded change to your vendor account'}
                    </Typography>
                </Box>
                <IconButton onClick={fetchHistory} disabled={loading} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    {loading ? <CircularProgress size={18} /> : <Refresh fontSize="small" />}
                </IconButton>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Stat cards ── */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} md={3}><StatCard title="Total Events" value={loading ? '—' : formatNumber(stats.total)} icon={<History />} color="primary" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Created" value={loading ? '—' : formatNumber(stats.created)} icon={<AddCircle />} color="success" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Updated" value={loading ? '—' : formatNumber(stats.updated)} icon={<Update />} color="warning" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Most Recent" value={loading ? '—' : stats.mostRecent} icon={<Receipt />} color="info" /></Grid>
            </Grid>

            {/* ── Filters ── */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
                <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <TextField
                            fullWidth size="small" placeholder="Search by field name, value, or action…"
                            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                            sx={inputSx}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <FormControl fullWidth size="small" sx={inputSx}>
                            <InputLabel>Action Type</InputLabel>
                            <Select
                                label="Action Type" value={actionFilter}
                                onChange={e => { setActionFilter(e.target.value as ActionFilter); setPage(0); }}
                                startAdornment={<InputAdornment position="start"><FilterList fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment>}
                            >
                                <MenuItem value="all">All Actions</MenuItem>
                                <MenuItem value="create">Created</MenuItem>
                                <MenuItem value="update">Updated</MenuItem>
                                <MenuItem value="delete">Deleted</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* ── History table ── */}
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell>Action</TableCell>
                                <TableCell>Fields Changed</TableCell>
                                <TableCell align="right">Timestamp</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && !filteredEntries.length ? (
                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>Loading…</TableCell></TableRow>
                            ) : filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                        <History sx={{ fontSize: 36, color: '#cbd5e1' }} />
                                        <Typography color="text.secondary" fontWeight={600} mt={1}>
                                            {vendorId ? 'No history events found' : 'No vendor linked to your account'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedEntries.map(entry => {
                                const changes = changesByEntry.get(entry.id) || [];
                                const isExpanded = expandedIds.has(entry.id);
                                const isCreate = (entry.action || '').toLowerCase() === 'create';
                                return (
                                    <React.Fragment key={entry.id}>
                                        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleExpanded(entry.id)}>
                                            <TableCell>
                                                <ChevronRight sx={{ fontSize: 18, color: '#94a3b8', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar sx={{ width: 28, height: 28, bgcolor: `${actionColor(entry.action)}.light`, color: `${actionColor(entry.action)}.main` }}>
                                                        {actionIcon(entry.action)}
                                                    </Avatar>
                                                    <Chip label={entry.action} size="small" color={actionColor(entry.action)} variant="outlined" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {changes.length} field{changes.length === 1 ? '' : 's'} {isCreate ? 'set' : 'changed'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color="text.secondary">{formatDateTime(entry.timestamp)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                                                <Collapse in={isExpanded} timeout={220}>
                                                    <Box sx={{ px: 2, py: 2, bgcolor: '#fafbfe' }}>
                                                        {changes.length === 0 ? (
                                                            <Typography variant="body2" color="text.secondary">No visible field changes for this event.</Typography>
                                                        ) : (
                                                            <Grid container spacing={1}>
                                                                {changes.map(({ field, oldVal, newVal }) => (
                                                                    <Grid item xs={12} sm={6} md={4} key={field}>
                                                                        <Box sx={{ p: 1.25, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                                            <Typography variant="caption" fontWeight={700} color="primary.main">{field}</Typography>
                                                                            {isCreate ? (
                                                                                <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25, wordBreak: 'break-all' }}>{formatValue(newVal)}</Typography>
                                                                            ) : (
                                                                                <Stack direction="row" spacing={0.75} alignItems="center" mt={0.5} flexWrap="wrap">
                                                                                    <Chip label={formatValue(oldVal)} size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', textDecoration: 'line-through', maxWidth: 160 }} />
                                                                                    <Typography variant="caption">→</Typography>
                                                                                    <Chip label={formatValue(newVal)} size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700, maxWidth: 160 }} />
                                                                                </Stack>
                                                                            )}
                                                                        </Box>
                                                                    </Grid>
                                                                ))}
                                                            </Grid>
                                                        )}
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
                <TablePagination
                    component="div" count={filteredEntries.length} page={page}
                    onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Paper>
        </Box>
    );
};

export default VendorHistory;