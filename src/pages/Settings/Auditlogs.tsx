import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogActions, DialogContent, Fade, Grid, IconButton,
    InputAdornment, Paper, Skeleton, Stack, Tab, Tabs, TextField,
    Typography,
} from '@mui/material';
import {
    History, Refresh, Search, FilterList, PersonSearch,
    Edit, AddCircle, DeleteForever, VerifiedUser, Close,
    Groups, EventNote, LockPerson,
} from '@mui/icons-material';
import {
    auditService, extractAuditError,
    AuditLogEntry, UserHistoryEntry,
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
const isoDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};
const actionIcon = (action?: string) => {
    const a = (action || '').toLowerCase();
    if (a.includes('create') || a.includes('add')) return <AddCircle sx={{ fontSize: 16 }} />;
    if (a.includes('delete') || a.includes('remove')) return <DeleteForever sx={{ fontSize: 16 }} />;
    if (a.includes('approve') || a.includes('verify')) return <VerifiedUser sx={{ fontSize: 16 }} />;
    if (a.includes('log in') || a.includes('login')) return <LockPerson sx={{ fontSize: 16 }} />;
    if (a.includes('group')) return <Groups sx={{ fontSize: 16 }} />;
    return <Edit sx={{ fontSize: 16 }} />;
};
const actionColor = (action?: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    const a = (action || '').toLowerCase();
    if (a.includes('create') || a.includes('add') || a.includes('approve') || a.includes('log in')) return 'success';
    if (a.includes('delete') || a.includes('remove') || a.includes('reject') || a.includes('suspend')) return 'error';
    if (a.includes('update') || a.includes('edit') || a.includes('configure')) return 'warning';
    return 'primary';
};
/** Fields we never want to surface in a diff view, even if they technically changed */
const SENSITIVE_FIELDS = new Set(['password']);

const formatValue = (v: any): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

const computeChanges = (previous: Record<string, any> = {}, present: Record<string, any> = {}) => {
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(present || {})]);
    const changes: { field: string; oldVal: any; newVal: any }[] = [];
    keys.forEach((key) => {
        if (SENSITIVE_FIELDS.has(key)) return;
        const oldVal = previous?.[key];
        const newVal = present?.[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field: key, oldVal, newVal });
        }
    });
    return changes;
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

/** Mini stat pill used across both sub-tabs */
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB 1 — AUDIT LOGS  (GET /audit/logs/?start_date=&end_date=)
// ═══════════════════════════════════════════════════════════════════════════════
const AuditLogsPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState(isoDaysAgo(7));
    const [endDate, setEndDate] = useState(isoDaysAgo(0));
    const [selected, setSelected] = useState<AuditLogEntry | null>(null);

    const fetchLogs = useCallback(async (start: string, end: string) => {
        if (!start || !end) {
            setError('Start date and end date are both required.');
            return;
        }
        if (new Date(start).getTime() > new Date(end).getTime()) {
            setError('Start date must be before the end date.');
            return;
        }
        setLoading(true); setError(null);
        try {
            const res = await auditService.getAuditLogs({ start_date: start, end_date: end, page_size: 100 });
            setLogs(res?.results ?? []);
        } catch (err: any) { setError(extractAuditError(err)); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    // Fetch on mount, and whenever the date range changes (both dates required by the API)
    useEffect(() => { fetchLogs(startDate, endDate); }, [startDate, endDate, fetchLogs]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return logs;
        return logs.filter((l) =>
            l.action?.toLowerCase().includes(term) ||
            l.summary?.toLowerCase().includes(term) ||
            l.actor?.name?.toLowerCase().includes(term) ||
            l.actor_email?.toLowerCase().includes(term) ||
            l.ip_address?.toLowerCase().includes(term)
        );
    }, [logs, search]);

    const stats = useMemo(() => {
        const uniqueActors = new Set(filtered.map((l) => l.actor_email || l.actor?.email).filter(Boolean));
        const mostRecent = filtered[0]?.timestamp;
        return {
            total: filtered.length,
            actors: uniqueActors.size,
            mostRecent: mostRecent ? timeAgo(mostRecent) : '—',
        };
    }, [filtered]);

    return (
        <Box>
            <Grid container spacing={2} mb={2.5}>
                <Grid item xs={4}><MiniStat label="Total Events" value={stats.total} icon={<History />} color="primary" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Unique Actors" value={stats.actors} icon={<Groups />} color="info" loading={loading} /></Grid>
                <Grid item xs={4}><MiniStat label="Most Recent" value={stats.mostRecent} icon={<EventNote />} color="success" loading={loading} /></Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2.5, bgcolor: '#fff' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, pt: 0.25 }}>
                        <FilterList fontSize="small" sx={{ color: '#64748b' }} />
                        <Typography variant="body2" fontWeight={700} color="text.secondary">Filters</Typography>
                    </Stack>
                    <Grid container spacing={1.5} sx={{ flex: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" placeholder="Search by actor, action, summary, IP…"
                                value={search} onChange={(e) => setSearch(e.target.value)} sx={inputSx}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField
                                fullWidth size="small" type="date" label="From" required
                                value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={inputSx}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField
                                fullWidth size="small" type="date" label="To" required
                                value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={inputSx}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8faff' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Audit Log</Typography>
                    <IconButton size="small" onClick={() => fetchLogs(startDate, endDate)} disabled={loading}>
                        {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                    </IconButton>
                </Stack>
                <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                    {loading && !filtered.length ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} height={54} sx={{ mx: 2, my: 1 }} />)
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <History sx={{ fontSize: 40, color: '#cbd5e1' }} />
                            <Typography color="text.secondary" fontWeight={600} mt={1}>No audit events found for this range</Typography>
                        </Box>
                    ) : filtered.map((log, idx) => (
                        <Fade in key={`${log.timestamp}-${idx}`} timeout={200 + idx * 25}>
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
                                        {log.actor?.name && log.actor.name !== 'N/A' ? log.actor.name : (log.actor_email || log.actor?.email || 'System')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                        {log.summary}
                                    </Typography>
                                </Box>
                                <Chip label={log.action} size="small" color={actionColor(log.action)} variant="outlined" sx={{ fontWeight: 700, maxWidth: 160 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>{timeAgo(log.timestamp)}</Typography>
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
                                        <Typography variant="subtitle1" fontWeight={800}>{selected.action}</Typography>
                                        <Typography variant="caption" sx={{ color: '#93c5fd' }}>Audit Event</Typography>
                                    </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                            </Stack>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <DetailRow label="Summary" value={selected.summary} />
                                <DetailRow label="Actor" value={selected.actor?.name && selected.actor.name !== 'N/A' ? selected.actor.name : '—'} />
                                <DetailRow label="Actor Email" value={selected.actor_email || selected.actor?.email || '—'} />
                                <DetailRow label="IP Address" value={selected.ip_address || '—'} />
                                <DetailRow label="Timestamp" value={formatDateTime(selected.timestamp)} />
                            </Stack>
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
// SUB-TAB 2 — USER HISTORY  (GET /audit/history/user/?user_id=)
// ═══════════════════════════════════════════════════════════════════════════════
const UserHistoryPanel: React.FC = () => {
    const [userIdInput, setUserIdInput] = useState('');
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [logs, setLogs] = useState<UserHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<UserHistoryEntry | null>(null);

    const fetchHistory = useCallback(async (userId: string) => {
        if (!userId.trim()) {
            setError('Enter a user ID to look up their history.');
            return;
        }
        setLoading(true); setError(null);
        try {
            const res = await auditService.getUserHistory({ user_id: userId.trim() });
            setLogs(Array.isArray(res) ? res : []);
            setActiveUserId(userId.trim());
        } catch (err: any) { setError(extractAuditError(err)); setLogs([]); }
        finally { setLoading(false); }
    }, []);

    const changesByEntry = useMemo(() => {
        const map = new Map<number, { field: string; oldVal: any; newVal: any }[]>();
        logs.forEach((l) => map.set(l.id, computeChanges(l.previous, l.present)));
        return map;
    }, [logs]);

    const stats = useMemo(() => {
        const totalFieldChanges = Array.from(changesByEntry.values()).reduce((s, c) => s + c.length, 0);
        return { total: logs.length, fieldChanges: totalFieldChanges };
    }, [logs, changesByEntry]);

    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2.5, bgcolor: '#fff' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                        fullWidth size="small" label="User ID" placeholder="e.g. 2310"
                        value={userIdInput}
                        onChange={(e) => setUserIdInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') fetchHistory(userIdInput); }}
                        sx={inputSx}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonSearch fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                    />
                    <Button
                        variant="contained" disableElevation onClick={() => fetchHistory(userIdInput)}
                        disabled={loading}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, flexShrink: 0 }}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Search fontSize="small" />}
                    >
                        {loading ? 'Loading…' : 'Look up'}
                    </Button>
                </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {activeUserId && !error && (
                <>
                    <Grid container spacing={2} mb={2.5}>
                        <Grid item xs={6}><MiniStat label="Total Changes" value={stats.total} icon={<History />} color="primary" loading={loading} /></Grid>
                        <Grid item xs={6}><MiniStat label="Fields Changed" value={stats.fieldChanges} icon={<Edit />} color="warning" loading={loading} /></Grid>
                    </Grid>

                    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8faff' }}>
                            <Typography variant="subtitle2" fontWeight={700}>History for User #{activeUserId}</Typography>
                            <IconButton size="small" onClick={() => fetchHistory(activeUserId)} disabled={loading}>
                                {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                            </IconButton>
                        </Stack>
                        <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                            {loading && !logs.length ? (
                                [...Array(4)].map((_, i) => <Skeleton key={i} height={54} sx={{ mx: 2, my: 1 }} />)
                            ) : logs.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <History sx={{ fontSize: 40, color: '#cbd5e1' }} />
                                    <Typography color="text.secondary" fontWeight={600} mt={1}>No history found for this user</Typography>
                                </Box>
                            ) : logs.map((log, idx) => {
                                const changes = changesByEntry.get(log.id) || [];
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
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: `${actionColor(log.action)}.light`, color: `${actionColor(log.action)}.main` }}>
                                                {actionIcon(log.action)}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap sx={{ textTransform: 'capitalize' }}>{log.action.toLowerCase()}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {changes.length} field{changes.length === 1 ? '' : 's'} changed
                                                </Typography>
                                            </Box>
                                            <Chip label={log.action} size="small" color={actionColor(log.action)} variant="outlined" sx={{ fontWeight: 700 }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>{timeAgo(log.timestamp)}</Typography>
                                        </Box>
                                    </Fade>
                                );
                            })}
                        </Box>
                    </Paper>
                </>
            )}

            {!activeUserId && !error && !loading && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <PersonSearch sx={{ fontSize: 44, color: '#cbd5e1' }} />
                    <Typography color="text.secondary" fontWeight={600} mt={1}>Enter a user ID above to view their change history</Typography>
                </Box>
            )}

            <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {selected && (
                    <Box>
                        <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)' }}>{actionIcon(selected.action)}</Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'capitalize' }}>{selected.action.toLowerCase()}</Typography>
                                        <Typography variant="caption" sx={{ color: '#93c5fd' }}>User #{selected.object_id}</Typography>
                                    </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                            </Stack>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <DetailRow label="Timestamp" value={formatDateTime(selected.timestamp)} />
                            </Stack>
                            {(changesByEntry.get(selected.id) || []).length > 0 ? (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                                        FIELD CHANGES
                                    </Typography>
                                    <Stack spacing={1}>
                                        {(changesByEntry.get(selected.id) || []).map(({ field, oldVal, newVal }) => (
                                            <Box key={field} sx={{ p: 1.25, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                <Typography variant="caption" fontWeight={700} color="primary.main">{field}</Typography>
                                                <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                                                    <Chip label={formatValue(oldVal)} size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', textDecoration: 'line-through', maxWidth: 220 }} />
                                                    <Typography variant="caption">→</Typography>
                                                    <Chip label={formatValue(newVal)} size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700, maxWidth: 220 }} />
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary" mt={2}>No visible field changes for this event.</Typography>
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
// MAIN COMPONENT — Audit Logs (2 real, API-backed inner tabs)
// ═══════════════════════════════════════════════════════════════════════════════
const AuditLogs: React.FC = () => {
    const [innerTab, setInnerTab] = useState(0);

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Audit Logs & History</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Platform-wide activity by date range, and field-level change history for a specific user.
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
                    <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label="Audit Logs" />
                    <Tab icon={<PersonSearch sx={{ fontSize: 18 }} />} iconPosition="start" label="User History" />
                </Tabs>
            </Box>

            <Fade in key={innerTab} timeout={280}>
                <Box>
                    {innerTab === 0 && <AuditLogsPanel />}
                    {innerTab === 1 && <UserHistoryPanel />}
                </Box>
            </Fade>
        </Box>
    );
};

export default AuditLogs;