import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Collapse, Dialog, DialogContent, DialogActions, Divider, FormControl,
    Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab,
    Table, TableBody, TableCell, TableHead, TablePagination, TableRow,
    Tabs, TextField, Typography, ListItemButton, ListItemText,
} from '@mui/material';
import {
    AccountBalance, ArrowBack, ArrowDropDown, ArrowForward, Business,
    CheckCircle, ChevronRight, Close, ContentCopy, Domain, ErrorOutline,
    Key, People, Receipt, Refresh, Settings, AccountBalanceWallet,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    dashboardService, extractError,
    FundWalletResult,
} from '../../../services/dashboardService';

// ─── Types ────────────────────────────────────────────────────────────────────
type Hierarchy  = 'vendor' | 'sub_vendor' | 'agent' | 'cashier' | 'pos';
type GroupId    = 'vendors' | 'sub_vendors' | 'agents' | 'cashiers' | 'pos';
type ChipColor  = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type MuiColor   = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type RelatedVendorLite = { id: number; email: string; business_name: string; account_status: string; hierachy: string };
type RelatedVendor = {
    id: number; business_name: string; email: string; phone_number?: string;
    address?: string; city?: string; state?: string; country?: string; postal_code?: string;
    account_status: string; hierachy: string; related_vendor?: RelatedVendorLite | null;
    token?: string;
    wallet?: { wallet_type?: { name: string; description: string }; balance: string } | null;
    created_at?: string;
};
type VendorTransaction = { transaction_ref: string; amount: string; timestamp: string };
type LedgerEntry = { transaction_ref: string; debit_amount: string; credit_amount: string; timestamp: string };
type LedgerSummary = { total_debits: number; total_credits: number };
type DashboardGroup = { id: GroupId; label: string; tableTitle: string; description: string; hierarchy: Hierarchy; color: MuiColor; icon: React.ReactNode };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNumber = (v: number | string | null | undefined) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const defaultStartDate = () => { const d = new Date(); d.setDate(d.getDate() - 14); return toDateInput(d); };
const defaultEndDate = () => { const d = new Date(); d.setDate(d.getDate() + 1); return toDateInput(d); };

const formatCurrency = (v: number | string | null | undefined) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(toNumber(v));
const formatNumber = (v: number | string | null | undefined) =>
    new Intl.NumberFormat('en-NG').format(toNumber(v));
const formatDate = (v?: string | null) => {
    const d = new Date(v || Date.now());
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};
const statusColor = (s?: string): ChipColor => {
    switch ((s || '').toLowerCase()) {
        case 'active': case 'success': case 'approved': case 'completed': return 'success';
        case 'pending': case 'review': return 'warning';
        case 'failed': case 'inactive': case 'suspended': case 'rejected': return 'error';
        default: return 'default';
    }
};
const hierarchyColor = (h?: string): ChipColor => {
    switch ((h || '').toLowerCase()) {
        case 'vendor': return 'primary'; case 'sub_vendor': return 'success';
        case 'agent': return 'warning'; case 'cashier': return 'info'; case 'pos': return 'secondary';
        default: return 'default';
    }
};
const hierarchyLabel = (h?: string) => {
    switch ((h || '').toLowerCase()) {
        case 'vendor': return 'Vendor'; case 'sub_vendor': return 'Sub-vendor';
        case 'agent': return 'Agent'; case 'cashier': return 'Cashier'; case 'pos': return 'POS';
        default: return h || 'Vendor';
    }
};
const normalizeHierarchy = (h?: string): Hierarchy => {
    const v = (h || '').toLowerCase();
    if (v === 'sub_vendor') return 'sub_vendor';
    if (v === 'agent') return 'agent';
    if (v === 'cashier') return 'cashier';
    if (v === 'pos') return 'pos';
    return 'vendor';
};
const getWalletBalance = (v?: RelatedVendor | null) => toNumber(v?.wallet?.balance);
const getWalletType = (v?: RelatedVendor | null) => v?.wallet?.wallet_type?.name || 'Wallet';
const getLocation = (v: RelatedVendor) =>
    [v.city, v.state, v.country].filter(Boolean).join(', ') || v.address || 'Not provided';

const getCurrentVendorId = () => {
    if (typeof window === 'undefined') return '1';
    const direct = localStorage.getItem('vendor_id') || localStorage.getItem('vendorId');
    if (direct) return direct;
    try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return String(u?.vendor_id || u?.vendor?.id || u?.id || 1); }
    catch { return '1'; }
};
const getCurrentVendorName = () => {
    try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u?.business_name || u?.vendor?.business_name || 'Current Vendor'; }
    catch { return 'Current Vendor'; }
};
const parseVendorList = (p: unknown): RelatedVendor[] => {
    if (Array.isArray(p)) return p as RelatedVendor[];
    if (p && typeof p === 'object' && Array.isArray((p as any).results)) return (p as any).results as RelatedVendor[];
    return [];
};
const uniqueById = (vendors: RelatedVendor[]) => {
    const map = new Map<number, RelatedVendor>();
    vendors.forEach(v => map.set(v.id, v));
    return Array.from(map.values());
};
const vendorFromLite = (v: RelatedVendorLite): RelatedVendor => ({
    id: v.id, business_name: v.business_name, email: v.email, phone_number: '',
    address: '', city: '', state: '', country: '', postal_code: '',
    account_status: v.account_status, hierachy: v.hierachy, related_vendor: null, wallet: null, created_at: '',
});
const vendorsForHierarchy = (vendors: RelatedVendor[], hierarchy: Hierarchy) => {
    const direct = vendors.filter(v => normalizeHierarchy(v.hierachy) === hierarchy);
    if (hierarchy !== 'vendor') return uniqueById(direct);
    const parents = vendors.map(v => v.related_vendor).filter(Boolean)
        .filter(v => normalizeHierarchy(v?.hierachy) === 'vendor')
        .map(v => vendorFromLite(v as RelatedVendorLite));
    return uniqueById([...direct, ...parents]);
};
const buildVendorTree = (vendors: RelatedVendor[]) => {
    const map = new Map<number, RelatedVendor & { children: RelatedVendor[] }>();
    vendors.forEach(v => map.set(v.id, { ...v, children: [] }));
    const roots: Array<RelatedVendor & { children: RelatedVendor[] }> = [];
    vendors.forEach(v => {
        const node = map.get(v.id); const pid = v.related_vendor?.id;
        if (!node) return;
        if (pid && map.has(pid)) map.get(pid)?.children.push(node); else roots.push(node);
    });
    return roots;
};

// ─── Dashboard groups ─────────────────────────────────────────────────────────
const DASHBOARD_GROUPS: DashboardGroup[] = [
    { id: 'vendors',     label: 'Vendors',     tableTitle: 'Recent Vendors',     description: 'All vendors in your hierarchy.',          hierarchy: 'vendor',     color: 'primary',   icon: <Business /> },
    { id: 'sub_vendors', label: 'Sub-vendors', tableTitle: 'Recent Sub-vendors', description: 'Sub-vendors in your hierarchy.',           hierarchy: 'sub_vendor', color: 'success',   icon: <Domain /> },
    { id: 'agents',      label: 'Agents',      tableTitle: 'Recent Agents',      description: 'Agents under this vendor hierarchy.',      hierarchy: 'agent',      color: 'warning',   icon: <People /> },
    { id: 'cashiers',    label: 'Cashiers',    tableTitle: 'Recent Cashiers',    description: 'Cashiers under this vendor hierarchy.',    hierarchy: 'cashier',    color: 'info',      icon: <Receipt /> },
    { id: 'pos',         label: 'POS',         tableTitle: 'Recent POS',         description: 'POS records under this vendor hierarchy.', hierarchy: 'pos',        color: 'secondary', icon: <AccountBalance /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const MetricTile = ({ title, value, detail, icon, color = 'primary' }: {
    title: string; value: React.ReactNode; detail?: string;
    icon: React.ReactNode; color?: MuiColor;
}) => (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 1 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
                <Typography color="text.secondary" variant="body2" gutterBottom>{title}</Typography>
                <Typography variant="h5" fontWeight={700}>{value}</Typography>
                {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
        </Stack>
    </Paper>
);

/** A single labelled row inside the result dialogs */
const ResultRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack
        direction="row" justifyContent="space-between" spacing={2}
        sx={{ py: 0.9, borderBottom: '1px solid #f1f5f9' }}
    >
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
            {value}
        </Typography>
    </Stack>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const [allVendors, setAllVendors] = useState<RelatedVendor[]>([]);
    const [groupVendors, setGroupVendors] = useState<RelatedVendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<RelatedVendor | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<RelatedVendor[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<VendorTransaction[]>([]);
    const [globalLedgerEntries, setGlobalLedgerEntries] = useState<LedgerEntry[]>([]);
    const [globalLedgerSummary, setGlobalLedgerSummary] = useState<LedgerSummary>({ total_debits: 0, total_credits: 0 });
    const [selectedLedgerSummary, setSelectedLedgerSummary] = useState<LedgerSummary>({ total_debits: 0, total_credits: 0 });
    const [selectedTransactionCount, setSelectedTransactionCount] = useState(0);
    const [walletData, setWalletData] = useState<any>(null);
    const [activeGroup, setActiveGroup] = useState<GroupId>('vendors');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [groupLoading, setGroupLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [ledgerStartDate, setLedgerStartDate] = useState(defaultStartDate());
    const [ledgerEndDate, setLedgerEndDate] = useState(defaultEndDate());

    // ── Fund Wallet dialog ────────────────────────────────────────────────────
    const [fundOpen, setFundOpen] = useState(false);
    const [fundAmount, setFundAmount] = useState('');
    const [fundLoading, setFundLoading] = useState(false);
    // null = no result yet; object = show result (success or error)
    const [fundResult, setFundResult] = useState<
        | { kind: 'success'; data: FundWalletResult }
        | { kind: 'error'; message: string }
        | null
    >(null);

    const openFundDialog = () => { setFundAmount(''); setFundResult(null); setFundOpen(true); };
    const closeFundDialog = () => { setFundOpen(false); setFundAmount(''); setFundResult(null); };
    const closeFundResult = () => setFundResult(null);

    const copyText = (text: string) => {
        navigator.clipboard?.writeText(text).catch(() => {});
    };

    const handleFundSubmit = async () => {
        if (!fundAmount.trim() || isNaN(Number(fundAmount)) || Number(fundAmount) <= 0) {
            setFundResult({ kind: 'error', message: 'Please enter a valid amount greater than zero.' });
            return;
        }
        setFundLoading(true);
        try {
            const data = await dashboardService.requestWalletFunding({ amount: fundAmount });
            setFundOpen(false);                  // close the input dialog
            setFundResult({ kind: 'success', data }); // open the result modal
            setFundAmount('');
        } catch (err: any) {
            setFundOpen(false);
            setFundResult({ kind: 'error', message: extractError(err) });
        } finally {
            setFundLoading(false);
        }
    };

    const currentVendorId = getCurrentVendorId();
    const currentVendorName = getCurrentVendorName();
    const currentGroup = DASHBOARD_GROUPS.find(g => g.id === activeGroup) || DASHBOARD_GROUPS[0];

    // ── Fetches ───────────────────────────────────────────────────────────────
    const fetchWallet = useCallback(async () => {
        setWalletLoading(true);
        try { setWalletData(await dashboardService.getWallet()); }
        catch { setWalletData({ balance: '0.00', wallet_type: { name: 'Wallet', description: '' } }); }
        finally { setWalletLoading(false); }
    }, []);

    const fetchRelatedVendors = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const data = parseVendorList(await dashboardService.getRelatedVendors());
            setAllVendors(data); setLastUpdated(new Date());
        } catch (err: any) { setError(extractError(err)); setAllVendors([]); }
        finally { setLoading(false); }
    }, []);

    const fetchGroupVendors = useCallback(async (hierarchy: Hierarchy) => {
        setGroupLoading(true);
        try { setGroupVendors(parseVendorList(await dashboardService.getGroupVendors(hierarchy))); }
        catch { setGroupVendors([]); }
        finally { setGroupLoading(false); }
    }, []);

    const fetchVendorChildren = useCallback(async (vendorId: number) => {
        setDetailLoading(true);
        try { setSelectedChildren(parseVendorList(await dashboardService.getVendorChildren(vendorId))); }
        catch { setSelectedChildren([]); }
        finally { setDetailLoading(false); }
    }, []);

    const fetchVendorTransactions = useCallback(async (vendorId: number) => {
        setTransactionsLoading(true);
        try {
            const payload = await dashboardService.getVendorTransactions({ vendor_id: vendorId, page_size: 5 });
            const results = Array.isArray(payload?.results) ? payload.results : [];
            setSelectedTransactionCount(Number(payload?.count || results.length || 0));
            setSelectedTransactions([...results].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5));
        } catch { setSelectedTransactionCount(0); setSelectedTransactions([]); }
        finally { setTransactionsLoading(false); }
    }, []);

    const fetchLedger = useCallback(async (
        vendorId: string | number,
        onDone: (entries: LedgerEntry[], summary: LedgerSummary, count: number) => void
    ) => {
        const payload = await dashboardService.getLedger({ vendor_id: vendorId, start_date: ledgerStartDate, end_date: ledgerEndDate });
        const results: LedgerEntry[] = Array.isArray(payload?.results) ? payload.results : [];
        const summary = payload?.summary || { total_debits: 0, total_credits: 0 };
        onDone(
            [...results].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            { total_debits: toNumber(summary.total_debits), total_credits: toNumber(summary.total_credits) },
            Number(payload?.count || results.length || 0)
        );
    }, [ledgerStartDate, ledgerEndDate]);

    const fetchGlobalLedger = useCallback(async () => {
        setLedgerLoading(true);
        try {
            await fetchLedger(currentVendorId, (entries, summary) => {
                setGlobalLedgerEntries(entries.slice(0, 5)); setGlobalLedgerSummary(summary);
            });
        } catch { setGlobalLedgerEntries([]); setGlobalLedgerSummary({ total_debits: 0, total_credits: 0 }); }
        finally { setLedgerLoading(false); }
    }, [currentVendorId, fetchLedger]);

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchRelatedVendors();
        fetchGroupVendors(currentGroup.hierarchy);
        setSelectedVendor(null);
        fetchGlobalLedger();
        fetchWallet();
        setPage(0);
    }, [currentGroup.hierarchy, fetchGroupVendors, fetchRelatedVendors, fetchGlobalLedger, fetchWallet]);

    useEffect(() => {
        if (!selectedVendor) return;
        fetchVendorChildren(selectedVendor.id);
        fetchVendorTransactions(selectedVendor.id);
        fetchLedger(selectedVendor.id, (_entries, summary, count) => {
            setSelectedLedgerSummary(summary);
            setSelectedTransactionCount(prev => Math.max(prev, count));
        }).catch(() => setSelectedLedgerSummary({ total_debits: 0, total_credits: 0 }));
    }, [fetchLedger, fetchVendorChildren, fetchVendorTransactions, selectedVendor]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const tabCounts = useMemo(() => ({
        vendors:     vendorsForHierarchy(allVendors, 'vendor').length,
        sub_vendors: vendorsForHierarchy(allVendors, 'sub_vendor').length,
        agents:      vendorsForHierarchy(allVendors, 'agent').length,
        cashiers:    vendorsForHierarchy(allVendors, 'cashier').length,
        pos:         vendorsForHierarchy(allVendors, 'pos').length,
    }), [allVendors]);

    const currentVendors = useMemo(() => {
        const fromGroup = vendorsForHierarchy(groupVendors, currentGroup.hierarchy);
        const fromAll   = vendorsForHierarchy(allVendors,   currentGroup.hierarchy);
        return uniqueById([...fromGroup, ...fromAll]);
    }, [allVendors, currentGroup.hierarchy, groupVendors]);

    const selectedChildrenTree = useMemo(() => buildVendorTree(selectedChildren), [selectedChildren]);

    const globalWalletBalance   = toNumber(walletData?.balance);
    const selectedNetBalance    = selectedLedgerSummary.total_credits - selectedLedgerSummary.total_debits;
    const selectedWalletBalance = selectedNetBalance || getWalletBalance(selectedVendor);
    const selectedChildrenCount = selectedChildren.length;

    const handleSelectVendor = useCallback((vendor: RelatedVendor) => {
        setSelectedVendor(vendor); setShowFullDetails(false); setExpandedIds(new Set([vendor.id]));
        if (typeof window !== 'undefined')
            window.setTimeout(() => document.getElementById('dashboard-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }, []);

    const getGroupPreviewLabel = useCallback((group: DashboardGroup) => {
        const first = vendorsForHierarchy(allVendors, group.hierarchy)[0]?.business_name || group.label;
        const extra = tabCounts[group.id] > 1 ? ` +${tabCounts[group.id] - 1}` : '';
        return `${first}${extra}`;
    }, [allVendors, tabCounts]);

    const quickActions = useMemo(() => [
        { id: 'manage-orgs',  title: 'Manage Organisations', description: 'Create and manage vendor organisations', icon: <Business />,        path: '/tenants/vendors', color: 'primary.main' },
        { id: 'wallet-ops',   title: 'Wallet Operations',    description: 'Balances, transfers, and settlement',   icon: <AccountBalance />,  path: '/transactions',    color: 'success.main' },
        { id: 'api-keys',     title: 'API Keys',             description: 'Keys, webhooks, and access controls',   icon: <Key />,             path: '/settings',        color: 'info.main' },
        { id: 'settings',     title: 'Settings',             description: 'Vendor profile and platform settings',  icon: <Settings />,        path: '/settings',        color: 'secondary.main' },
        { id: 'create',       title: 'Create New',           description: 'Vendor, sub-vendor, agent…',            icon: <Business />,        path: '/tenants/vendors', color: 'error.main' },
    ], []);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Box p={{ xs: 2, md: 3 }} sx={{
            '@keyframes tableSlideIn':  { from: { opacity: 0, transform: 'translateX(-28px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
            '@keyframes detailSlideIn': { from: { opacity: 0, transform: 'translateX(36px)'  }, to: { opacity: 1, transform: 'translateX(0)' } },
            '@keyframes popIn': { '0%': { opacity: 0, transform: 'scale(0.85)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        }}>

            {/* ── Page header ── */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Vendor Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live hierarchy data · updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => { fetchRelatedVendors(); fetchGroupVendors(currentGroup.hierarchy); fetchGlobalLedger(); }}
                        disabled={loading || groupLoading || ledgerLoading}
                    >
                        Refresh
                    </Button>
                    {/* ── Fund Wallet button ── */}
                    <Button
                        variant="contained"
                        startIcon={<AccountBalanceWallet />}
                        onClick={openFundDialog}
                        sx={{ bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                    >
                      Request Vendor Funding
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Metric tiles ── */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Total Subordinates" value={formatNumber(allVendors.length)} detail="All related children" icon={<Business />} color="primary" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile
                        title="Wallet Balance"
                        value={walletLoading ? <CircularProgress size={20} /> : formatCurrency(globalWalletBalance)}
                        detail={walletData?.wallet_type?.name || 'Wallet'}
                        icon={<AccountBalance />} color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Recent Ledger" value={formatNumber(globalLedgerEntries.length)}
                        detail={`Debits ${formatCurrency(globalLedgerSummary.total_debits)}`} icon={<Receipt />} color="warning" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Active Vendors" value={formatNumber(allVendors.filter(v => v.account_status === 'active').length)}
                        detail={`${tabCounts.cashiers} cashiers, ${tabCounts.pos} POS`} icon={<People />} color="info" />
                </Grid>
            </Grid>

            {/* ── Group tabs ── */}
            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Tabs value={activeGroup} onChange={(_, v: GroupId) => setActiveGroup(v)} variant="scrollable" scrollButtons="auto"
                        sx={{ '& .MuiTab-root': { alignItems: 'flex-start', minHeight: 58 }, '& .MuiTab-root.Mui-selected': { bgcolor: 'action.selected' } }}>
                        {DASHBOARD_GROUPS.map(g => (
                            <Tab key={g.id} value={g.id} label={
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={`${g.label} (${tabCounts[g.id]})`} size="small" color={g.color} variant="outlined" />
                                    <Typography variant="body2">{getGroupPreviewLabel(g)}</Typography>
                                </Stack>
                            } />
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            {/* ── Main table / detail ── */}
            <Box sx={{ mb: 3 }}>
                {!selectedVendor ? (
                    <Box key={`${activeGroup}-table`} sx={{ animation: 'tableSlideIn 340ms ease' }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: `${currentGroup.color}.light`, color: `${currentGroup.color}.main` }}>{currentGroup.icon}</Avatar>
                                    <Box>
                                        <Typography variant="h6">{currentGroup.tableTitle}</Typography>
                                        <Typography variant="body2" color="text.secondary">{currentGroup.description}</Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={`${currentVendors.length} records`} color={currentGroup.color} variant="outlined" />
                                    {groupLoading && <CircularProgress size={22} />}
                                </Stack>
                            </Stack>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Business</TableCell><TableCell>Hierarchy</TableCell>
                                            <TableCell>Status</TableCell><TableCell>Contact</TableCell>
                                            <TableCell>Location</TableCell><TableCell align="right">Wallet</TableCell>
                                            <TableCell>Created</TableCell><TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {currentVendors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(vendor => (
                                            <TableRow key={vendor.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectVendor(vendor)}>
                                                <TableCell>
                                                    <Typography variant="subtitle2">{vendor.business_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">Parent: {vendor.related_vendor?.business_name || 'None'}</Typography>
                                                </TableCell>
                                                <TableCell><Chip label={hierarchyLabel(vendor.hierachy)} size="small" color={hierarchyColor(vendor.hierachy)} variant="outlined" /></TableCell>
                                                <TableCell><Chip label={vendor.account_status || 'unknown'} size="small" color={statusColor(vendor.account_status)} /></TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{vendor.email || 'Not provided'}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{vendor.phone_number || ''}</Typography>
                                                </TableCell>
                                                <TableCell>{getLocation(vendor)}</TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="subtitle2">{formatCurrency(getWalletBalance(vendor))}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{getWalletType(vendor)}</Typography>
                                                </TableCell>
                                                <TableCell>{vendor.created_at ? formatDate(vendor.created_at) : 'N/A'}</TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" endIcon={<ArrowForward />} onClick={e => { e.stopPropagation(); handleSelectVendor(vendor); }}>View</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                            <TablePagination component="div" count={currentVendors.length} page={page} rowsPerPage={rowsPerPage}
                                onPageChange={(_, p) => setPage(p)}
                                onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                                rowsPerPageOptions={[5, 8, 12, 20, 50]} />
                        </Paper>
                    </Box>
                ) : (
                    <Box id="dashboard-detail-panel" key={selectedVendor.id} sx={{ animation: 'detailSlideIn 380ms ease' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                            <Box>
                                <Typography variant="h6">Selected Details</Typography>
                                <Typography variant="body2" color="text.secondary">{selectedVendor.business_name}</Typography>
                            </Box>
                            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setSelectedVendor(null)}>
                                Back to {currentGroup.tableTitle}
                            </Button>
                        </Stack>
                        <Card sx={{ borderRadius: 1 }}>
                            <CardContent>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                    <Stack spacing={0.75}>
                                        <Typography variant="h5">{selectedVendor.business_name}</Typography>
                                        <Typography color="text.secondary">{selectedVendor.email || 'No email'}</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip label={hierarchyLabel(selectedVendor.hierachy)} color={hierarchyColor(selectedVendor.hierachy)} />
                                            <Chip label={selectedVendor.account_status} color={statusColor(selectedVendor.account_status)} />
                                            <Chip label={getLocation(selectedVendor)} variant="outlined" />
                                        </Stack>
                                    </Stack>
                                </Stack>
                                <Grid container spacing={2} mb={2}>
                                    <Grid item xs={12} sm={6} md={3}><MetricTile title="Wallet Balance" value={formatCurrency(selectedWalletBalance)} detail={getWalletType(selectedVendor)} icon={<AccountBalance />} color="success" /></Grid>
                                    <Grid item xs={12} sm={6} md={3}><MetricTile title="Transactions" value={formatNumber(selectedTransactionCount)} detail="Related vendor transactions" icon={<Receipt />} color="warning" /></Grid>
                                    <Grid item xs={12} sm={6} md={3}><MetricTile title="Total Children" value={formatNumber(selectedChildrenCount)} detail="Under selected vendor" icon={<People />} color="info" /></Grid>
                                    <Grid item xs={12} sm={6} md={3}><MetricTile title="Net Ledger" value={formatCurrency(selectedNetBalance)} detail={`Credits ${formatCurrency(selectedLedgerSummary.total_credits)}`} icon={<Business />} color="primary" /></Grid>
                                </Grid>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={7}>
                                        <Stack spacing={2}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Phone</Typography><Typography>{selectedVendor.phone_number || 'Not provided'}</Typography></Grid>
                                                    <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Created</Typography><Typography>{selectedVendor.created_at ? formatDate(selectedVendor.created_at) : 'N/A'}</Typography></Grid>
                                                    <Grid item xs={12}><Button size="small" onClick={() => setShowFullDetails(p => !p)}>{showFullDetails ? 'View Less' : 'View Full Details'}</Button></Grid>
                                                </Grid>
                                                <Collapse in={showFullDetails} timeout={260}>
                                                    <Divider sx={{ my: 2 }} />
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Vendor ID</Typography><Typography>{selectedVendor.id}</Typography></Grid>
                                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Postal Code</Typography><Typography>{selectedVendor.postal_code || 'N/A'}</Typography></Grid>
                                                        <Grid item xs={12}><Typography variant="body2" color="text.secondary">Address</Typography><Typography>{selectedVendor.address || 'N/A'}</Typography></Grid>
                                                        <Grid item xs={4}><Typography variant="body2" color="text.secondary">City</Typography><Typography>{selectedVendor.city || 'N/A'}</Typography></Grid>
                                                        <Grid item xs={4}><Typography variant="body2" color="text.secondary">State</Typography><Typography>{selectedVendor.state || 'N/A'}</Typography></Grid>
                                                        <Grid item xs={4}><Typography variant="body2" color="text.secondary">Country</Typography><Typography>{selectedVendor.country || 'N/A'}</Typography></Grid>
                                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Parent</Typography><Typography>{selectedVendor.related_vendor?.business_name || 'None'}</Typography></Grid>
                                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Wallet Type</Typography><Typography>{getWalletType(selectedVendor)}</Typography></Grid>
                                                    </Grid>
                                                </Collapse>
                                            </Paper>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Typography variant="subtitle1" fontWeight={700}>Recent Transactions</Typography>
                                                    {transactionsLoading && <CircularProgress size={20} />}
                                                </Stack>
                                                <Box sx={{ overflowX: 'auto' }}>
                                                    <Table size="small">
                                                        <TableHead><TableRow><TableCell>Reference</TableCell><TableCell>Status</TableCell><TableCell align="right">Amount</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
                                                        <TableBody>
                                                            {selectedTransactions.map(tx => (
                                                                <TableRow key={tx.transaction_ref} hover>
                                                                    <TableCell>{tx.transaction_ref}</TableCell>
                                                                    <TableCell><Chip label="success" color="success" size="small" /></TableCell>
                                                                    <TableCell align="right">{formatCurrency(tx.amount)}</TableCell>
                                                                    <TableCell>{formatDate(tx.timestamp)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Paper>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={5}>
                                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="subtitle1" fontWeight={700}>Hierarchy Under This Vendor</Typography>
                                                {detailLoading && <CircularProgress size={20} />}
                                            </Stack>
                                            <Box sx={{ maxHeight: 340, overflow: 'auto' }}>
                                                {selectedChildrenTree.length ? selectedChildrenTree.map(node => (
                                                    <ListItemButton key={node.id} onClick={() => handleSelectVendor(node)}>
                                                        <ListItemText primary={node.business_name} secondary={
                                                            <Stack direction="row" spacing={1} mt={0.5}>
                                                                <Chip label={hierarchyLabel(node.hierachy)} size="small" color={hierarchyColor(node.hierachy)} variant="outlined" />
                                                                <Chip label={node.account_status} size="small" color={statusColor(node.account_status)} />
                                                            </Stack>
                                                        } />
                                                    </ListItemButton>
                                                )) : <Typography color="text.secondary" p={2}>No hierarchy found.</Typography>}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Box>

            {/* ── Quick actions ── */}
            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {quickActions.map(action => (
                            <Grid item xs={12} sm={6} md={4} key={action.id}>
                                <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer', borderRadius: 1, transition: 'all 0.2s ease', '&:hover': { borderColor: action.color, bgcolor: 'action.hover', transform: 'translateY(-2px)' } }} onClick={() => navigate(action.path)}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: action.color }}>{action.icon}</Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2">{action.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{action.description}</Typography>
                                        </Box>
                                        <ArrowForward color="action" />
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* ── Ledger summary ── */}
            <Card sx={{ borderRadius: 1 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                        <Box>
                            <Typography variant="h6">Recent Activity Summary</Typography>
                            <Typography variant="body2" color="text.secondary">Ledger from {ledgerStartDate} to {ledgerEndDate}</Typography>
                        </Box>
                        <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/transactions')}>View All</Button>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Reference</TableCell><TableCell>Vendor</TableCell><TableCell>Status</TableCell><TableCell align="right">Credit</TableCell><TableCell align="right">Debit</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
                            <TableBody>
                                {globalLedgerEntries.map(e => (
                                    <TableRow key={e.transaction_ref} hover>
                                        <TableCell>{e.transaction_ref}</TableCell>
                                        <TableCell>{currentVendorName}</TableCell>
                                        <TableCell><Chip label="success" color="success" size="small" /></TableCell>
                                        <TableCell align="right">{formatCurrency(e.credit_amount)}</TableCell>
                                        <TableCell align="right">{formatCurrency(e.debit_amount)}</TableCell>
                                        <TableCell>{formatDate(e.timestamp)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════════════════════
                FUND WALLET INPUT DIALOG
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog
                open={fundOpen}
                onClose={closeFundDialog}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                {/* Header */}
                <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <AccountBalanceWallet sx={{ fontSize: 22 }} />
                                <Typography variant="h6" fontWeight={700} color="#fff">Fund Wallet</Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                                This sends a funding request — no funds move until approved.
                            </Typography>
                        </Box>
                        <IconButton onClick={closeFundDialog} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Stack>
                </Box>

                <DialogContent sx={{ pt: 3, pb: 1 }}>
                    <Stack spacing={2.5}>
                        <TextField
                            fullWidth required
                            label="Amount (₦)"
                            type="number"
                            placeholder="e.g. 10000"
                            value={fundAmount}
                            onChange={e => setFundAmount(e.target.value)}
                            autoFocus
                            inputProps={{ min: 1 }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f3f4f8' } }}
                            helperText="Enter the amount you want to request for your wallet"
                        />
                        {fundAmount && Number(fundAmount) > 0 && (
                            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="body2" color="primary.main" fontWeight={700}>
                                    You are requesting{' '}
                                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(fundAmount))}
                                    {' '}for your wallet.
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={closeFundDialog} sx={{ borderRadius: 2, textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        fullWidth variant="contained"
                        onClick={handleFundSubmit}
                        disabled={fundLoading || !fundAmount || Number(fundAmount) <= 0}
                        sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, fontWeight: 700 }}
                    >
                        {fundLoading ? <CircularProgress size={18} color="inherit" /> : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                FUND WALLET RESULT MODAL — success or error
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog
                open={Boolean(fundResult)}
                onClose={closeFundResult}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                {/* ── SUCCESS ── */}
                {fundResult?.kind === 'success' && (
                    <Box>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            px: 3, pt: 4, pb: 3, textAlign: 'center', position: 'relative',
                        }}>
                            <IconButton
                                onClick={closeFundResult} size="small"
                                sx={{ position: 'absolute', top: 12, right: 12, color: '#bbf7d0' }}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                            <Box sx={{
                                width: 68, height: 68, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mx: 'auto', mb: 1.5,
                                animation: 'popIn 320ms ease',
                            }}>
                                <CheckCircle sx={{ fontSize: 38, color: '#fff' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} color="#fff">
                                Funding Request Submitted!
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#bbf7d0', mt: 0.5 }}>
                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(fundResult.data.amount))} requested for {fundResult.data.vendor?.business_name}
                            </Typography>
                        </Box>

                        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                            {/* Amount hero */}
                            <Box sx={{ textAlign: 'center', py: 1.5, mb: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Requested Amount
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="success.main">
                                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(fundResult.data.amount))}
                                </Typography>
                                <Chip label={fundResult.data.status.toUpperCase()} size="small" color={statusColor(fundResult.data.status)} sx={{ fontWeight: 800, mt: 0.5 }} />
                            </Box>

                            <Stack spacing={0}>
                                <ResultRow label="Request ID" value={`#${fundResult.data.id}`} />
                                <ResultRow label="Vendor" value={fundResult.data.vendor?.business_name} />
                                <ResultRow label="Email" value={fundResult.data.vendor?.email} />
                                <ResultRow
                                    label="Vendor Status"
                                    value={<Chip label={fundResult.data.vendor?.account_status} size="small" color={statusColor(fundResult.data.vendor?.account_status)} />}
                                />
                                <ResultRow
                                    label="Hierarchy"
                                    value={<Chip label={hierarchyLabel(fundResult.data.vendor?.hierachy)} size="small" color={hierarchyColor(fundResult.data.vendor?.hierachy)} variant="outlined" />}
                                />
                                <ResultRow label="Requested At" value={formatDate(fundResult.data.request_time)} />
                            </Stack>

                            {/* Transaction ref with copy */}
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                                    TRANSACTION REFERENCE
                                </Typography>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all', flex: 1 }}>
                                        {fundResult.data.transaction_ref}
                                    </Typography>
                                    <IconButton size="small" onClick={() => copyText(fundResult.data.transaction_ref)}>
                                        <ContentCopy sx={{ fontSize: 14, color: '#94a3b8' }} />
                                    </IconButton>
                                </Stack>
                            </Box>

                            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="caption" color="primary.main">
                                    Your request is <strong>{fundResult.data.status}</strong>. No funds have moved yet — a system admin will review and approve the request.
                                </Typography>
                            </Box>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button
                                fullWidth variant="contained" onClick={closeFundResult}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                            >
                                Done
                            </Button>
                        </DialogActions>
                    </Box>
                )}

                {/* ── ERROR ── */}
                {fundResult?.kind === 'error' && (
                    <Box>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            px: 3, pt: 4, pb: 3, textAlign: 'center', position: 'relative',
                        }}>
                            <IconButton
                                onClick={closeFundResult} size="small"
                                sx={{ position: 'absolute', top: 12, right: 12, color: '#fecaca' }}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                            <Box sx={{
                                width: 68, height: 68, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mx: 'auto', mb: 1.5,
                                animation: 'popIn 320ms ease',
                            }}>
                                <ErrorOutline sx={{ fontSize: 38, color: '#fff' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} color="#fff">
                                Funding Request Failed
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#fecaca', mt: 0.5 }}>
                                The server rejected your request.
                            </Typography>
                        </Box>

                        <DialogContent sx={{ pt: 2.5 }}>
                            <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca', mb: 2 }}>
                                <Typography variant="body2" color="error.dark" fontWeight={700} mb={0.5}>
                                    Reason from server:
                                </Typography>
                                <Typography variant="body2" color="error.main">
                                    {fundResult.message}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Please check the amount or your account status and try again.
                            </Typography>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button
                                fullWidth variant="outlined" color="error"
                                onClick={() => { closeFundResult(); setFundAmount(''); setFundOpen(true); }}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                Try Again
                            </Button>
                            <Button
                                fullWidth variant="contained" onClick={closeFundResult}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default Dashboard;