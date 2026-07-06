import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogActions, DialogContent, Divider, Fade, Grid, IconButton,
    InputAdornment, Paper, Skeleton, Stack, Tab, Tabs, TextField, Tooltip,
    Typography,
} from '@mui/material';
import {
    Api as ApiIcon, Close, ContentCopy, History, Login as LoginIcon,
    Refresh, Search, FilterList, CheckCircle, ErrorOutline, Fingerprint,
    Public, DevicesOther, Storage, Edit, AddCircle, DeleteForever,
    VerifiedUser, ExpandMore,
} from '@mui/icons-material';
import {
    auditService, extractAuditError,
    ApiLogEntry, LoginLogEntry, AuditTrailEntry,
} from '../../services/Auditservice';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (v?: string) => {
    const d = new Date(v || Date.now());
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};
const timeAgo = (v?: string) => {
    if (!v) return '';
    const diffMs = Date.now() - new Date(v).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};
const methodColor = (m?: string) => {
    switch ((m || '').toUpperCase()) {
        case 'GET': return { bg: '#eff6ff', fg: '#1e3a8a' };
        case 'POST': return { bg: '#f0fdf4', fg: '#16a34a' };
        case 'PUT': case 'PATCH': return { bg: '#fffbeb', fg: '#d97706' };
        case 'DELETE': return { bg: '#fef2f2', fg: '#dc2626' };
        default: return { bg: '#f1f5f9', fg: '#475569' };
    }
};
const statusChipColor = (code?: number): 'success' | 'warning' | 'error' | 'default' => {
    if (!code) return 'default';
    if (code < 300) return 'success';
    if (code < 400) return 'warning';
    return 'error';
};
const actionIcon = (action?: string) => {
    const a = (action || '').toLowerCase();
    if (a.includes('create') || a.includes('add')) return <AddCircle sx={{ fontSize: 16 }} />;
    if (a.includes('delete') || a.includes('remove')) return <DeleteForever sx={{ fontSize: 16 }} />;
    if (a.includes('approve') || a.includes('verify')) return <VerifiedUser sx={{ fontSize: 16 }} />;
    return <Edit sx={{ fontSize: 16 }} />;
};
const actionColor = (action?: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    const a = (action || '').toLowerCase();
    if (a.includes('create') || a.includes('add') || a.includes('approve')) return 'success';
    if (a.includes('delete') || a.includes('remove') || a.includes('reject')) return 'error';
    if (a.includes('update') || a.includes('edit')) return 'warning';
    return 'primary';
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, bgcolor: '#f8faff',
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a8a' },
    },
};

/** A single key/value row inside the detail modal */
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.9, borderBottom: '1px solid #f1f5f9' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-all', maxWidth: '68%' }}>{value}</Typography>
    </Stack>
);

/** Mini stat pill used across all three sub-tabs */
const MiniStat = ({ label, value, icon, color = 'primary', loading }: {
    label: string; value: React.ReactNode; icon: React.ReactNode;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info'; loading?: boolean;
}) => (
    <Card sx={{ borderRadius: 3, border: '1px solid #f1f5f9', height: '100%' }}>
        <CardContent sx={{ p: '16px !important' }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                    {loading ? <Skeleton width={50} height={30} /> : (
                        <Typography variant="h6" fontWeight={800} mt={0.25}>{value}</Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 40, height: 40 }}>{icon}</Avatar>
            </Stack>
        </CardContent>
    </Card>
);

/** Filter bar shared by all three sub-tabs */
const FilterBar = ({
    search, setSearch, startDate, setStartDate, endDate, setEndDate, onReset, hasFilters,
}: {
    search: string; setSearch: (v: string) => void;
    startDate: string; setStartDate: (v: string) => void;
    endDate: string; setEndDate: (v: string) => void;
    onReset: () => void; hasFilters: boolean;
}) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2.5, bgcolor: '#fff' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, pt: 0.25 }}>
                <FilterList fontSize="small" sx={{ color: '#64748b' }} />
                <Typography variant="body2" fontWeight={700} color="text.secondary">Filters</Typography>
            </Stack>
            <Grid container spacing={1.5} sx={{ flex: 1 }}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth size="small" placeholder="Search by user, endpoint, IP…"
                        value={search} onChange={e => setSearch(e.target.value)} sx={inputSx}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField fullWidth size="small" type="date" label="From" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField fullWidth size="small" type="date" label="To" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                </Grid>
            </Grid>
        </Stack>
        {hasFilters && (
            <Box mt={1.25}>
                <Button size="small" onClick={onReset} sx={{ textTransform: 'none', color: '#64748b' }}>Clear filters ×</Button>
            </Box>
        )}
    </Paper>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB 1 — API LOGS
// ═══════════════════════════════════════════════════════════════════════════════
const ApiLogsPanel: React.FC = () => {
    const [logs, setLogs] = useState<ApiLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selected, setSelected] = useState<ApiLogEntry | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await auditService.getApiLogs({ page_size: 100 });
            setLogs(res?.results ?? []);
        } catch (err: any) { setError(extractAuditError(err)); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return logs.filter(l => {
            const matchSearch = !term ||
                l.endpoint?.toLowerCase().includes(term) ||
                l.actor?.toLowerCase().includes(term) ||
                l.actor_email?.toLowerCase().includes(term) ||
                l.ip_address?.toLowerCase().includes(term);
            const ts = new Date(l.created_at).getTime();
            const matchStart = !startDate || ts >= new Date(`${startDate}T00:00:00`).getTime();
            const matchEnd = !endDate || ts <= new Date(`${endDate}T23:59:59`).getTime();
            return matchSearch && matchStart && matchEnd;
        });
    }, [logs, search, startDate, endDate]);

    const stats = useMemo(() => ({
        total: filtered.length,
        errors: filtered.filter(l => (l.status_code || 0) >= 400).length,
        avgMs: filtered.length ? Math.round(filtered.reduce((s, l) => s + (l.duration_ms || 0), 0) / filtered.length) : 0,
    }), [filtered]);

    const hasFilters = Boolean(search || startDate || endDate);
    const resetFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); };

    return (
        <Box>
            <Grid container spacing={2} mb={2.5}>
                <Grid item xs={4}><MiniStat label="Total Calls" value={stats.total} icon={<ApiIcon />} color="primary" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Errors" value={stats.errors} icon={<ErrorOutline />} color="error" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Avg Duration" value={`${stats.avgMs}ms`} icon={<Storage />} color="info" loading={loading} /></Grid>
            </Grid>

            <FilterBar search={search} setSearch={setSearch} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onReset={resetFilters} hasFilters={hasFilters} />

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8faff' }}>
                    <Typography variant="subtitle2" fontWeight={700}>API Call Log</Typography>
                    <IconButton size="small" onClick={fetchLogs}><Refresh fontSize="small" /></IconButton>
                </Stack>
                <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                    {loading && !filtered.length ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} height={54} sx={{ mx: 2, my: 1 }} />)
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <ApiIcon sx={{ fontSize: 40, color: '#cbd5e1' }} />
                            <Typography color="text.secondary" fontWeight={600} mt={1}>No API calls found</Typography>
                        </Box>
                    ) : filtered.map((log, idx) => {
                        const mc = methodColor(log.method);
                        return (
                            <Fade in key={log.id} timeout={200 + idx * 25}>
                                <Box
                                    onClick={() => setSelected(log)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4,
                                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        '&:hover': { bgcolor: '#f0f7ff' },
                                    }}
                                >
                                    <Chip
                                        label={log.method?.toUpperCase()}
                                        size="small"
                                        sx={{ bgcolor: mc.bg, color: mc.fg, fontWeight: 800, width: 68, fontSize: 11 }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                                            {log.endpoint}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {log.actor || log.actor_email || 'System'} · {log.ip_address || 'unknown IP'}
                                        </Typography>
                                    </Box>
                                    <Chip label={log.status_code} size="small" color={statusChipColor(log.status_code)} sx={{ fontWeight: 700, minWidth: 52 }} />
                                    <Box sx={{ textAlign: 'right', minWidth: 90 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">{timeAgo(log.created_at)}</Typography>
                                        <Typography variant="caption" color="text.secondary">{log.duration_ms ? `${log.duration_ms}ms` : ''}</Typography>
                                    </Box>
                                </Box>
                            </Fade>
                        );
                    })}
                </Box>
            </Paper>

            {/* Detail modal */}
            <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {selected && (
                    <Box>
                        <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)' }}><ApiIcon /></Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: 'monospace' }}>{selected.endpoint}</Typography>
                                        <Typography variant="caption" sx={{ color: '#93c5fd' }}>API Call #{selected.id}</Typography>
                                    </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                            </Stack>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <DetailRow label="Method" value={<Chip label={selected.method} size="small" sx={{ bgcolor: methodColor(selected.method).bg, color: methodColor(selected.method).fg, fontWeight: 800 }} />} />
                                <DetailRow label="Status Code" value={<Chip label={selected.status_code} size="small" color={statusChipColor(selected.status_code)} sx={{ fontWeight: 800 }} />} />
                                <DetailRow label="Actor" value={selected.actor || selected.actor_email || 'System'} />
                                <DetailRow label="IP Address" value={selected.ip_address || '—'} />
                                <DetailRow label="User Agent" value={selected.user_agent || '—'} />
                                <DetailRow label="Duration" value={selected.duration_ms ? `${selected.duration_ms}ms` : '—'} />
                                <DetailRow label="Timestamp" value={formatDateTime(selected.created_at)} />
                            </Stack>
                            {selected.request_body && (
                                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>REQUEST BODY</Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {JSON.stringify(selected.request_body, null, 2)}
                                    </Typography>
                                </Box>
                            )}
                            {selected.response_body && (
                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>RESPONSE BODY</Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {JSON.stringify(selected.response_body, null, 2)}
                                    </Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button fullWidth variant="contained" onClick={() => setSelected(null)} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}>Close</Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB 2 — LOGIN LOGS
// ═══════════════════════════════════════════════════════════════════════════════
const LoginLogsPanel: React.FC = () => {
    const [logs, setLogs] = useState<LoginLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selected, setSelected] = useState<LoginLogEntry | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await auditService.getLoginLogs({ page_size: 100 });
            setLogs(res?.results ?? []);
        } catch (err: any) { setError(extractAuditError(err)); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return logs.filter(l => {
            const matchSearch = !term ||
                l.user_email?.toLowerCase().includes(term) ||
                l.user_name?.toLowerCase().includes(term) ||
                l.ip_address?.toLowerCase().includes(term) ||
                l.location?.toLowerCase().includes(term);
            const ts = new Date(l.created_at).getTime();
            const matchStart = !startDate || ts >= new Date(`${startDate}T00:00:00`).getTime();
            const matchEnd = !endDate || ts <= new Date(`${endDate}T23:59:59`).getTime();
            return matchSearch && matchStart && matchEnd;
        });
    }, [logs, search, startDate, endDate]);

    const stats = useMemo(() => ({
        total: filtered.length,
        success: filtered.filter(l => (l.status || '').toLowerCase() === 'success').length,
        failed: filtered.filter(l => (l.status || '').toLowerCase() === 'failed').length,
    }), [filtered]);

    const hasFilters = Boolean(search || startDate || endDate);
    const resetFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); };

    return (
        <Box>
            <Grid container spacing={2} mb={2.5}>
                <Grid item xs={4}><MiniStat label="Total Logins" value={stats.total} icon={<LoginIcon />} color="primary" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Successful" value={stats.success} icon={<CheckCircle />} color="success" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Failed" value={stats.failed} icon={<ErrorOutline />} color="error" loading={loading} /></Grid>
            </Grid>

            <FilterBar search={search} setSearch={setSearch} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onReset={resetFilters} hasFilters={hasFilters} />

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8faff' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Login Activity</Typography>
                    <IconButton size="small" onClick={fetchLogs}><Refresh fontSize="small" /></IconButton>
                </Stack>
                <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                    {loading && !filtered.length ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} height={54} sx={{ mx: 2, my: 1 }} />)
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <LoginIcon sx={{ fontSize: 40, color: '#cbd5e1' }} />
                            <Typography color="text.secondary" fontWeight={600} mt={1}>No login activity found</Typography>
                        </Box>
                    ) : filtered.map((log, idx) => {
                        const isSuccess = (log.status || '').toLowerCase() === 'success';
                        return (
                            <Fade in key={log.id} timeout={200 + idx * 25}>
                                <Box
                                    onClick={() => setSelected(log)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4,
                                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        '&:hover': { bgcolor: '#f0f7ff' },
                                    }}
                                >
                                    <Avatar sx={{
                                        width: 34, height: 34,
                                        bgcolor: isSuccess ? '#f0fdf4' : '#fef2f2',
                                        color: isSuccess ? '#16a34a' : '#dc2626',
                                    }}>
                                        {isSuccess ? <CheckCircle sx={{ fontSize: 18 }} /> : <ErrorOutline sx={{ fontSize: 18 }} />}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={700} noWrap>{log.user_name || log.user_email}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {log.ip_address || 'unknown IP'} · {log.device || 'unknown device'}{log.location ? ` · ${log.location}` : ''}
                                        </Typography>
                                    </Box>
                                    <Chip label={isSuccess ? 'Success' : 'Failed'} size="small" color={isSuccess ? 'success' : 'error'} sx={{ fontWeight: 700 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>{timeAgo(log.created_at)}</Typography>
                                </Box>
                            </Fade>
                        );
                    })}
                </Box>
            </Paper>

            <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {selected && (
                    <Box>
                        <Box sx={{
                            background: (selected.status || '').toLowerCase() === 'success'
                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            px: 3, pt: 3.5, pb: 2.5, textAlign: 'center', position: 'relative',
                        }}>
                            <IconButton size="small" onClick={() => setSelected(null)} sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.8)' }}><Close fontSize="small" /></IconButton>
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.18)', mx: 'auto', mb: 1 }}>
                                {(selected.status || '').toLowerCase() === 'success' ? <CheckCircle sx={{ fontSize: 30 }} /> : <ErrorOutline sx={{ fontSize: 30 }} />}
                            </Avatar>
                            <Typography variant="h6" fontWeight={800} color="#fff">
                                {(selected.status || '').toLowerCase() === 'success' ? 'Successful Login' : 'Failed Login Attempt'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                                {selected.user_name || selected.user_email}
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <DetailRow label="Email" value={selected.user_email} />
                                <DetailRow label="IP Address" value={selected.ip_address || '—'} />
                                <DetailRow label="Device" value={selected.device || '—'} />
                                <DetailRow label="Location" value={selected.location || '—'} />
                                {selected.failure_reason && <DetailRow label="Failure Reason" value={selected.failure_reason} />}
                                <DetailRow label="Timestamp" value={formatDateTime(selected.created_at)} />
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button fullWidth variant="contained" onClick={() => setSelected(null)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}>Close</Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB 3 — AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════
const AuditTrailPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditTrailEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selected, setSelected] = useState<AuditTrailEntry | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await auditService.getAuditTrail({ page_size: 100 });
            setLogs(res?.results ?? []);
        } catch (err: any) { setError(extractAuditError(err)); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return logs.filter(l => {
            const matchSearch = !term ||
                l.resource_type?.toLowerCase().includes(term) ||
                l.resource_name?.toLowerCase().includes(term) ||
                l.actor?.toLowerCase().includes(term) ||
                l.actor_email?.toLowerCase().includes(term) ||
                l.action?.toLowerCase().includes(term);
            const ts = new Date(l.created_at).getTime();
            const matchStart = !startDate || ts >= new Date(`${startDate}T00:00:00`).getTime();
            const matchEnd = !endDate || ts <= new Date(`${endDate}T23:59:59`).getTime();
            return matchSearch && matchStart && matchEnd;
        });
    }, [logs, search, startDate, endDate]);

    const stats = useMemo(() => ({
        total: filtered.length,
        creates: filtered.filter(l => (l.action || '').toLowerCase().includes('creat')).length,
        deletes: filtered.filter(l => (l.action || '').toLowerCase().includes('delet')).length,
    }), [filtered]);

    const hasFilters = Boolean(search || startDate || endDate);
    const resetFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); };

    return (
        <Box>
            <Grid container spacing={2} mb={2.5}>
                <Grid item xs={4}><MiniStat label="Total Events" value={stats.total} icon={<History />} color="primary" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Created" value={stats.creates} icon={<AddCircle />} color="success" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Deleted" value={stats.deletes} icon={<DeleteForever />} color="error" loading={loading} /></Grid>
            </Grid>

            <FilterBar search={search} setSearch={setSearch} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onReset={resetFilters} hasFilters={hasFilters} />

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8faff' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Audit Trail</Typography>
                    <IconButton size="small" onClick={fetchLogs}><Refresh fontSize="small" /></IconButton>
                </Stack>
                <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                    {loading && !filtered.length ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} height={54} sx={{ mx: 2, my: 1 }} />)
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <History sx={{ fontSize: 40, color: '#cbd5e1' }} />
                            <Typography color="text.secondary" fontWeight={600} mt={1}>No audit events found</Typography>
                        </Box>
                    ) : filtered.map((log, idx) => (
                        <Fade in key={log.id} timeout={200 + idx * 25}>
                            <Box
                                onClick={() => setSelected(log)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4,
                                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                    transition: 'background 0.15s',
                                    '&:hover': { bgcolor: '#f0f7ff' },
                                }}
                            >
                                <Avatar sx={{ width: 34, height: 34, bgcolor: `${actionColor(log.action)}.light`, color: `${actionColor(log.action)}.main` }}>
                                    {actionIcon(log.action)}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {log.actor || log.actor_email || 'System'}{' '}
                                        <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                                            {log.action} {log.resource_type}
                                        </Typography>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {log.resource_name || `#${log.resource_id}`}
                                    </Typography>
                                </Box>
                                <Chip label={log.action} size="small" color={actionColor(log.action)} variant="outlined" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>{timeAgo(log.created_at)}</Typography>
                            </Box>
                        </Fade>
                    ))}
                </Box>
            </Paper>

            <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {selected && (
                    <Box>
                        <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)' }}>{actionIcon(selected.action)}</Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'capitalize' }}>
                                            {selected.action} · {selected.resource_type}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#93c5fd' }}>Event #{selected.id}</Typography>
                                    </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                            </Stack>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <DetailRow label="Resource" value={selected.resource_name || `#${selected.resource_id}`} />
                                <DetailRow label="Actor" value={selected.actor || selected.actor_email || 'System'} />
                                <DetailRow label="IP Address" value={selected.ip_address || '—'} />
                                <DetailRow label="Timestamp" value={formatDateTime(selected.created_at)} />
                            </Stack>
                            {selected.changes && Object.keys(selected.changes).length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                                        FIELD CHANGES
                                    </Typography>
                                    <Stack spacing={1}>
                                        {Object.entries(selected.changes).map(([field, diff]) => (
                                            <Box key={field} sx={{ p: 1.25, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                <Typography variant="caption" fontWeight={700} color="primary.main">{field}</Typography>
                                                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                                    <Chip label={String(diff?.old ?? '—')} size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', textDecoration: 'line-through' }} />
                                                    <Typography variant="caption">→</Typography>
                                                    <Chip label={String(diff?.new ?? '—')} size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700 }} />
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button fullWidth variant="contained" onClick={() => setSelected(null)} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}>Close</Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Audit Logs (with 3 animated inner tabs)
// ═══════════════════════════════════════════════════════════════════════════════
const AuditLogs: React.FC = () => {
    const [innerTab, setInnerTab] = useState(0);

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Audit Logs & Trails</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Full visibility into API activity, login events, and resource-level changes across the platform.
            </Typography>

            <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
                <Tabs
                    value={innerTab}
                    onChange={(_, v) => setInnerTab(v)}
                    sx={{
                        minHeight: 44,
                        '& .MuiTab-root': {
                            textTransform: 'none', fontWeight: 600, minHeight: 44,
                            transition: 'color 0.2s',
                        },
                        '& .MuiTabs-indicator': {
                            height: 3, borderRadius: 3,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        },
                    }}
                >
                    <Tab icon={<ApiIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="API Logs" />
                    <Tab icon={<LoginIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Logins" />
                    <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label="Audit Trail" />
                </Tabs>
            </Box>

            <Fade in key={innerTab} timeout={280}>
                <Box>
                    {innerTab === 0 && <ApiLogsPanel />}
                    {innerTab === 1 && <LoginLogsPanel />}
                    {innerTab === 2 && <AuditTrailPanel />}
                </Box>
            </Fade>
        </Box>
    );
};

export default AuditLogs;