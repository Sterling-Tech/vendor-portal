import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Collapse,
    FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
    Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
    TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import {
    AccountTree, Business, CheckCircle, ChevronRight, ErrorOutline,
    FilterList, People, Refresh, Search,
} from '@mui/icons-material';
import {
    schemeService, extractSchemeError, AssignedScheme,
} from '../../services/Schemeservice';

// ─── Types ────────────────────────────────────────────────────────────────────
type MuiColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type StatusFilter = 'all' | 'active' | 'inactive';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (v?: string) => {
    const d = new Date(v || Date.now());
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};
const formatNumber = (v: number) => new Intl.NumberFormat('en-NG').format(v);

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, bgcolor: '#f3f4f8',
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a8a' },
    },
};

const StatCard = ({ title, value, icon, color = 'primary' }: {
    title: string; value: React.ReactNode; icon: React.ReactNode; color?: MuiColor;
}) => (
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
// MAIN COMPONENT — Scheme Reference
// GET /scheme/my-schemes/ — the ring-fence schemes assigned to this vendor
// (assignment is at the org root and inherits to the whole hierarchy)
// ═══════════════════════════════════════════════════════════════════════════════
const SchemeReference: React.FC = () => {
    const [schemes, setSchemes] = useState<AssignedScheme[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchSchemes = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const data = await schemeService.getMySchemes();
            setSchemes(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(extractSchemeError(err));
            setSchemes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

    const toggleExpanded = (id: number) => {
        setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const supplierOptions = useMemo(() => {
        const map = new Map<string, string>();
        schemes.forEach(s => { if (s.supplier?.name) map.set(s.supplier.name, s.supplier.name); });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }, [schemes]);

    const filteredSchemes = useMemo(() => {
        const term = search.trim().toLowerCase();
        return schemes.filter(s => {
            const matchesTerm = !term ||
                s.name?.toLowerCase().includes(term) ||
                s.code?.toLowerCase().includes(term) ||
                s.description?.toLowerCase().includes(term) ||
                s.supplier?.name?.toLowerCase().includes(term) ||
                s.supplier?.code?.toLowerCase().includes(term);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' ? s.scheme_active : !s.scheme_active);
            const matchesSupplier = supplierFilter === 'all' || s.supplier?.name === supplierFilter;
            return matchesTerm && matchesStatus && matchesSupplier;
        });
    }, [schemes, search, statusFilter, supplierFilter]);

    const paginatedSchemes = useMemo(
        () => filteredSchemes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredSchemes, page, rowsPerPage]
    );

    const stats = useMemo(() => {
        const active = schemes.filter(s => s.scheme_active).length;
        const uniqueSuppliers = new Set(schemes.map(s => s.supplier?.id).filter(Boolean)).size;
        return { total: schemes.length, active, inactive: schemes.length - active, suppliers: uniqueSuppliers };
    }, [schemes]);

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <Box p={{ xs: 2, md: 3 }}>
            {/* ── Page header ── */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">My Schemes</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Ring-fence schemes assigned to your vendor hierarchy
                        {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString()}` : ''}
                    </Typography>
                </Box>
                <IconButton onClick={fetchSchemes} disabled={loading} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    {loading ? <CircularProgress size={18} /> : <Refresh fontSize="small" />}
                </IconButton>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Stat cards ── */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} md={3}><StatCard title="Total Schemes" value={loading ? '—' : formatNumber(stats.total)} icon={<AccountTree />} color="primary" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Active" value={loading ? '—' : formatNumber(stats.active)} icon={<CheckCircle />} color="success" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Inactive" value={loading ? '—' : formatNumber(stats.inactive)} icon={<ErrorOutline />} color="error" /></Grid>
                <Grid item xs={6} md={3}><StatCard title="Suppliers" value={loading ? '—' : formatNumber(stats.suppliers)} icon={<Business />} color="info" /></Grid>
            </Grid>

            {/* ── Filters ── */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
                <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth size="small" placeholder="Search by scheme name, code, or supplier…"
                            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                            sx={inputSx}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3.5}>
                        <FormControl fullWidth size="small" sx={inputSx}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                label="Status" value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
                                startAdornment={<InputAdornment position="start"><FilterList fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment>}
                            >
                                <MenuItem value="all">All Statuses</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={3.5}>
                        <FormControl fullWidth size="small" sx={inputSx}>
                            <InputLabel>Supplier</InputLabel>
                            <Select
                                label="Supplier" value={supplierFilter}
                                onChange={e => { setSupplierFilter(e.target.value); setPage(0); }}
                                startAdornment={<InputAdornment position="start"><Business fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment>}
                            >
                                <MenuItem value="all">All Suppliers</MenuItem>
                                {supplierOptions.map(name => (
                                    <MenuItem key={name} value={name}>{name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* ── Schemes table ── */}
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell>Scheme</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Assigned</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && !filteredSchemes.length ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>Loading…</TableCell></TableRow>
                            ) : filteredSchemes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <AccountTree sx={{ fontSize: 36, color: '#cbd5e1' }} />
                                        <Typography color="text.secondary" fontWeight={600} mt={1}>
                                            {schemes.length === 0 && !loading ? 'No schemes are assigned to your vendor yet' : 'No schemes match your filters'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedSchemes.map(s => {
                                const isExpanded = expandedIds.has(s.scheme);
                                return (
                                    <React.Fragment key={s.scheme}>
                                        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleExpanded(s.scheme)}>
                                            <TableCell>
                                                <ChevronRight sx={{ fontSize: 18, color: '#94a3b8', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2">{s.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.code}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{s.supplier?.name || 'Unknown'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.supplier?.code}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={s.scheme_active ? 'Active' : 'Inactive'} size="small"
                                                    color={s.scheme_active ? 'success' : 'default'}
                                                    variant={s.scheme_active ? 'filled' : 'outlined'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color="text.secondary">{formatDateTime(s.assigned_at)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                                                <Collapse in={isExpanded} timeout={220}>
                                                    <Box sx={{ px: 2, py: 2, bgcolor: '#fafbfe' }}>
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                                                                    DESCRIPTION
                                                                </Typography>
                                                                <Typography variant="body2">{s.description || 'No description provided.'}</Typography>
                                                            </Grid>
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                                                                    SUPPLIER CONTACT
                                                                </Typography>
                                                                <Stack spacing={0.5}>
                                                                    <Typography variant="body2">{s.supplier?.contact_name || 'Not provided'}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">{s.supplier?.contact_email || '—'}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">{s.supplier?.contact_phone || '—'}</Typography>
                                                                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                                                        <Chip
                                                                            label={s.supplier?.is_active ? 'Supplier Active' : 'Supplier Inactive'}
                                                                            size="small" color={s.supplier?.is_active ? 'success' : 'default'} variant="outlined"
                                                                        />
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Onboarded {formatDateTime(s.supplier?.created_at)}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>
                                                            </Grid>
                                                        </Grid>
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
                    component="div" count={filteredSchemes.length} page={page}
                    onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Paper>
        </Box>
    );
};

export default SchemeReference;