import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    AccountBalance,
    ArrowBack,
    ArrowDropDown,
    ArrowForward,
    Business,
    CheckCircle,
    ChevronRight,
    Domain,
    Download,
    People,
    Receipt,
    Refresh,
    Search,
    Delete
} from '@mui/icons-material';

type VendorLevel = 'vendor' | 'sub_vendor' | 'agent' | 'cashier' | 'pos';
type VendorLevelFilter = VendorLevel | 'all';
type VendorStatusFilter = 'all' | 'active' | 'inactive' | 'suspended' | 'pending' | 'review';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type MuiColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type RelatedVendorLite = {
    id: number;
    email: string;
    business_name: string;
    account_status: string;
    hierachy: string;
};

type RelatedVendor = {
    id: number;
    business_name: string;
    email: string;
    phone_number: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    account_status: string;
    hierachy: string;
    related_vendor?: RelatedVendorLite | null;
    token?: string;
    wallet?: {
        wallet_type?: {
            name: string;
            description: string;
        };
        balance: string;
    } | null;
    created_at: string;
};

type VendorTransaction = {
    transaction_ref: string;
    amount: string;
    timestamp: string;
    status?: string;
    transaction_type?: 'credit' | 'debit';
    vendor_name?: string;
    vendor?: {
        business_name?: string;
    };
};
type VendorAnalytics = {
    total_balance: number;
    total_transactions: number;
    processed_today: number;
    active: number;
};
type TransactionResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: VendorTransaction[];
};

type VendorTreeNode = RelatedVendor & {
    children: VendorTreeNode[];
};

const RELATED_CHILDREN_ENDPOINT = '/vendor/retrieve/related-children/';
const RELATED_VENDOR_TRANSACTIONS_ENDPOINT = '/vendor/retrieve-children/transactions/';
const RELATED_CHILDREN_BY_VENDOR_ENDPOINT =
    '/vendor/retrieve/related-children/?vendor_id=';
const VENDOR_ANALYTICS_ENDPOINT =
    '/vendor/children/analytics/';

const LEVEL_OPTIONS: { label: string; value: VendorLevel }[] = [
    { label: 'Vendor', value: 'vendor' },
    { label: 'Sub-vendor', value: 'sub_vendor' },
    { label: 'Agent', value: 'agent' },
    { label: 'Cashier', value: 'cashier' },
    { label: 'POS', value: 'pos' },
];

const STATUS_OPTIONS: { label: string; value: Exclude<VendorStatusFilter, 'all'> }[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Pending', value: 'pending' },
    { label: 'Review', value: 'review' },
];

const formatCurrency = (value: number | string | undefined | null) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const formatNumber = (value: number | string | undefined | null) =>
    new Intl.NumberFormat('en-NG').format(Number(value || 0));

const formatDate = (value?: string) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toLocaleDateString() : date.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
};

const normalizeLevel = (value?: string): VendorLevel => {
    const level = (value || '').toLowerCase();
    if (level === 'sub_vendor') return 'sub_vendor';
    if (level === 'agent') return 'agent';
    if (level === 'cashier') return 'cashier';
    if (level === 'pos') return 'pos';
    return 'vendor';
};

const levelLabel = (value?: string) => {
    const level = normalizeLevel(value);
    return LEVEL_OPTIONS.find((option) => option.value === level)?.label || value || 'Vendor';
};

const levelColor = (value?: string): ChipColor => {
    switch (normalizeLevel(value)) {
        case 'vendor':
            return 'primary';
        case 'sub_vendor':
            return 'success';
        case 'agent':
            return 'warning';
        case 'cashier':
            return 'info';
        case 'pos':
            return 'secondary';
        default:
            return 'default';
    }
};

const statusColor = (status?: string): ChipColor => {
    switch ((status || '').toLowerCase()) {
        case 'active':
            return 'success';
        case 'inactive':
        case 'suspended':
            return 'warning';
        case 'pending':
        case 'review':
            return 'info';
        default:
            return 'default';
    }
};

const getWalletBalance = (vendor?: RelatedVendor | null) => Number(vendor?.wallet?.balance || 0);
const getWalletTypeName = (vendor?: RelatedVendor | null) => vendor?.wallet?.wallet_type?.name || 'Wallet';
const getLocation = (vendor: RelatedVendor) =>
    [vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ') || vendor.address || 'Not provided';

const parseVendorList = (payload: unknown): RelatedVendor[] => {
    if (Array.isArray(payload)) return payload as RelatedVendor[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as RelatedVendor[];
    }
    return [];
};

const buildHeaders = (): HeadersInit => {
    const token =
        typeof window !== 'undefined'
            ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('accessToken')
            : null;

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildVendorTree = (vendors: RelatedVendor[]): VendorTreeNode[] => {
    const map = new Map<number, VendorTreeNode>();

    vendors.forEach((vendor) => {
        map.set(vendor.id, { ...vendor, children: [] });
    });

    const roots: VendorTreeNode[] = [];

    vendors.forEach((vendor) => {
        const node = map.get(vendor.id);
        const parentId = vendor.related_vendor?.id;

        if (!node) return;

        if (parentId && map.has(parentId)) {
            map.get(parentId)?.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
};

const StatCard = ({
    title,
    value,
    icon,
    color = 'primary',
}: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    color?: MuiColor;
}) => (
    <Card sx={{ height: '100%', borderRadius: 1 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        {title}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                        {value}
                    </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
            </Stack>
        </CardContent>
    </Card>
);

const VendorManagement: React.FC = () => {
    // const today = new Date().toISOString().split('T')[0];
    const today = new Date();
    const past = new Date();
            past.setDate(today.getDate() - 14);
    
    const format = (d: Date) => d.toISOString().split("T")[0];
        const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

    const [vendors, setVendors] = useState<RelatedVendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<RelatedVendor | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<RelatedVendor[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<VendorTransaction[]>([]);
    const [selectedTransactionCount, setSelectedTransactionCount] = useState(0);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [showFullDetails, setShowFullDetails] = useState(false);

    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<VendorLevelFilter>('all');
    const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('all');
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(5);
    const [transactionSearch, setTransactionSearch] = useState('');

    
    const [transactionStartDate, setTransactionStartDate] = useState(format(past));
    const [transactionEndDate, setTransactionEndDate] = useState(format(tomorrow));

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [cardstartDate, setCardStartDate] = useState(format(past));
    const [cardendDate, setCardEndDate] = useState(format(tomorrow));

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [analytics, setAnalytics] =
        useState<VendorAnalytics>({
            total_balance: 0,
            total_transactions: 0,
            processed_today: 0,
            active: 0,
        });
    const [analyticsLoading, setAnalyticsLoading] =
        useState(false);

    const fetchVendorAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);

        try {
            const params = new URLSearchParams({
                start_date: cardstartDate,
                end_date: cardendDate,
            });

            const response = await fetch(
                `http://188.166.161.13:8061${VENDOR_ANALYTICS_ENDPOINT}?${params.toString()}`,
                {
                    method: 'GET',
                    headers: buildHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error('Failed analytics');
            }

            const payload = await response.json();

            setAnalytics({
                total_balance: Number(payload.total_balance || 0),
                total_transactions: Number(payload.total_transactions || 0),
                processed_today: Number(payload.processed_today || 0),
                active: Number(payload.active || 0),
            });
        } catch (error) {
            console.error(error);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [cardstartDate, cardendDate]);

    const handleDeleteVendor = async (
        vendorId: number
    ) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this vendor?'
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `http://188.166.161.13:8061/vendor/delete/${vendorId}/`,
                {
                    method: 'DELETE',
                    headers: buildHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete vendor');
            }

            setSuccess('Vendor deleted successfully');

            setSelectedVendor(null);

            fetchRelatedVendors();
        } catch (error) {
            console.error(error);
            setError('Failed to delete vendor');
        }
    };
    const fetchRelatedVendors = useCallback(async () => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (levelFilter !== 'all') params.set('hierachy', levelFilter);
        if (statusFilter !== 'all') {
            params.set('account_status', statusFilter);
            params.set('status', statusFilter);
        }
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);

        try {
            const query = params.toString();
            const response = await fetch(`http://188.166.161.13:8061${RELATED_CHILDREN_ENDPOINT}${query ? `?${query}` : ''}`, {
                method: 'GET',
                headers: buildHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to retrieve related vendors (${response.status})`);
            }

            const payload = await response.json();
            setVendors(parseVendorList(payload));
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err?.message || 'Failed to retrieve related vendors');
            setVendors([]);
        } finally {
            setLoading(false);
        }
    }, [endDate, levelFilter, searchTerm, startDate, statusFilter]);

    const fetchVendorTransactions = useCallback(
        async (
            vendorId: number,
            page = 1,
            pageSize = 5
        ) => {
            setTransactionLoading(true);

            try {
                const params = new URLSearchParams({
                    vendor_id: String(vendorId),
                    page: String(page),
                    page_size: String(pageSize),
                    start_date: transactionStartDate,
                    end_date: transactionEndDate,
                });

                if (transactionSearch.trim()) {
                    params.set('search', transactionSearch);
                }

                const response = await fetch(
                    `http://188.166.161.13:8061${RELATED_VENDOR_TRANSACTIONS_ENDPOINT}?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: buildHeaders(),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to retrieve vendor transactions (${response.status})`
                    );
                }

                const payload =
                    (await response.json()) as TransactionResponse;

                const sorted = [...(payload.results || [])].sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                );

                const enriched = sorted.map((trx) => ({
                    ...trx,
                    vendor_name:
                        trx.vendor?.business_name ||
                        selectedVendor?.business_name ||
                        'Unknown Vendor',
                }));

                setSelectedTransactions(enriched);
                setSelectedTransactionCount(
                    Number(payload.count || 0)
                );
            } catch (error) {
                console.error(error);
                setSelectedTransactions([]);
                setSelectedTransactionCount(0);
            } finally {
                setTransactionLoading(false);
            }
        },
        [
            transactionSearch,
            transactionStartDate,
            transactionEndDate,
            selectedVendor,
        ]
    );

    const fetchVendorChildren = useCallback(
        async (vendorId: number) => {
            setDetailLoading(true);

            try {
                const response = await fetch(
                    `http://188.166.161.13:8061${RELATED_CHILDREN_BY_VENDOR_ENDPOINT}${vendorId}`,
                    {
                        method: 'GET',
                        headers: buildHeaders(),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to retrieve vendor hierarchy`
                    );
                }

                const payload = await response.json();

                const children = parseVendorList(payload);

                setSelectedChildren(children);
            } catch (error) {
                console.error(error);
                setSelectedChildren([]);
            } finally {
                setDetailLoading(false);
            }
        },
        []
    );
useEffect(() => {
        if (selectedVendor) {
            fetchVendorTransactions(
                selectedVendor.id,
                transactionPage + 1,
                transactionRowsPerPage
            );
        }
    }, [
        selectedVendor,
        transactionPage,
        transactionRowsPerPage,
        transactionSearch,
        transactionStartDate,
        transactionEndDate,
        fetchVendorTransactions,
    ]);
    useEffect(() => {
        fetchRelatedVendors();
        fetchVendorAnalytics();
    }, [fetchRelatedVendors, fetchVendorAnalytics]);

    const filteredVendors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return vendors.filter((vendor) => {
            const level = normalizeLevel(vendor.hierachy);
            const status = (vendor.account_status || '').toLowerCase();

            const matchesSearch =
                !term ||
                vendor.business_name?.toLowerCase().includes(term) ||
                vendor.email?.toLowerCase().includes(term) ||
                vendor.phone_number?.toLowerCase().includes(term) ||
                vendor.city?.toLowerCase().includes(term) ||
                vendor.state?.toLowerCase().includes(term) ||
                vendor.related_vendor?.business_name?.toLowerCase().includes(term);

            const matchesLevel = levelFilter === 'all' || level === levelFilter;
            const matchesStatus = statusFilter === 'all' || status === statusFilter;

            const created = new Date(vendor.created_at).getTime();
            const matchesStart = !startDate || created >= new Date(`${startDate}T00:00:00`).getTime();
            const matchesEnd = !endDate || created <= new Date(`${endDate}T23:59:59`).getTime();

            return matchesSearch && matchesLevel && matchesStatus && matchesStart && matchesEnd;
        });
    }, [endDate, levelFilter, searchTerm, startDate, statusFilter, vendors]);

    const paginatedVendors = useMemo(
        () => filteredVendors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredVendors, page, rowsPerPage]
    );

    const stats = useMemo(() => {
        const idsByLevel = (level: VendorLevel) => {
            const ids = new Set<number>();

            vendors.forEach((vendor) => {
                if (normalizeLevel(vendor.hierachy) === level) ids.add(vendor.id);
                if (vendor.related_vendor && normalizeLevel(vendor.related_vendor.hierachy) === level) {
                    ids.add(vendor.related_vendor.id);
                }
            });

            return ids.size;
        };

        return {
            total: vendors.length,
            vendors: idsByLevel('vendor'),
            subVendors: idsByLevel('sub_vendor'),
            agents: idsByLevel('agent'),
            cashiers: idsByLevel('cashier'),
            pos: idsByLevel('pos'),
            active: vendors.filter((vendor) => vendor.account_status?.toLowerCase() === 'active').length,
            walletBalance: vendors.reduce((sum, vendor) => sum + getWalletBalance(vendor), 0),
        };
    }, [vendors]);

    const selectedVendorTree = useMemo(() => buildVendorTree(selectedChildren), [selectedChildren]);

    const selectedDirectChildrenCount = selectedVendor
        ? selectedChildren.filter((child) => child.related_vendor?.id === selectedVendor.id).length || selectedChildren.length
        : 0;

    const getDirectChildCount = (vendorId: number) =>
        vendors.filter((vendor) => vendor.related_vendor?.id === vendorId).length;

    const resetFilters = () => {
        setSearchTerm('');
        setLevelFilter('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(0);
    };

    const toggleExpanded = (id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectVendor = useCallback(
        (vendor: RelatedVendor) => {
            setSelectedVendor(vendor);
            setShowFullDetails(false);
            setExpandedIds(new Set([vendor.id]));
            fetchVendorChildren(vendor.id);
            fetchVendorTransactions(
                vendor.id,
                1,
                transactionRowsPerPage
            );

            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                window.setTimeout(() => {
                    document.getElementById('vendor-detail-panel')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }, 80);
            }
        },
        [fetchVendorChildren, fetchVendorTransactions]
    );

    const exportVendors = () => {
        if (typeof document === 'undefined') return;

        const headers = [
            'ID',
            'Business Name',
            'Email',
            'Phone',
            'Hierarchy',
            'Status',
            'Wallet Type',
            'Wallet Balance',
            'City',
            'State',
            'Country',
            'Related Vendor',
            'Created At',
            'Children Count',
        ];

        const rows = filteredVendors.map((vendor) => [
            vendor.id,
            vendor.business_name,
            vendor.email,
            vendor.phone_number,
            levelLabel(vendor.hierachy),
            vendor.account_status,
            getWalletTypeName(vendor),
            getWalletBalance(vendor),
            vendor.city,
            vendor.state,
            vendor.country,
            vendor.related_vendor?.business_name || '',
            vendor.created_at,
            getDirectChildCount(vendor.id),
        ]);

        const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `related-vendors-${startDate || 'all'}-${endDate || 'all'}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setSuccess(`Exported ${rows.length} vendors`);
    };

    const renderVendorTree = (nodes: VendorTreeNode[], depth = 0): React.ReactNode => (
        <List disablePadding>
            {nodes.map((node) => {
                const hasChildren = Boolean(node.children?.length);
                const isExpanded = expandedIds.has(node.id);

                return (
                    <Box key={node.id}>
                        <ListItemButton
                            selected={selectedVendor?.id === node.id}
                            onClick={() => handleSelectVendor(node)}
                            sx={{ pl: 2 + depth * 2 }}
                        >
                            {hasChildren ? (
                                <IconButton
                                    size="small"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleExpanded(node.id);
                                    }}
                                >
                                    {isExpanded ? <ArrowDropDown /> : <ChevronRight />}
                                </IconButton>
                            ) : (
                                <Box sx={{ width: 32 }} />
                            )}
                            <ListItemText
                                primary={node.business_name}
                                secondary={
                                    <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                                        <Chip label={levelLabel(node.hierachy)} size="small" color={levelColor(node.hierachy)} variant="outlined" />
                                        <Chip label={node.account_status} size="small" color={statusColor(node.account_status)} />
                                        <Chip label={formatCurrency(getWalletBalance(node))} size="small" variant="outlined" />
                                    </Stack>
                                }
                            />
                        </ListItemButton>
                        {hasChildren && isExpanded && renderVendorTree(node.children, depth + 1)}
                    </Box>
                );
            })}
        </List>
    );

    return (
        <Box
            p={{ xs: 2, md: 3 }}
            sx={{
                '@keyframes tableSlideIn': {
                    from: { opacity: 0, transform: 'translateX(-28px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                },
                '@keyframes detailSlideIn': {
                    from: { opacity: 0, transform: 'translateX(36px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                },
            }}
        >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Vendor Hierarchy</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live related vendors - updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>
                <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
            >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="Start Date"
                        type="date"
                        size="small"
                        value={cardstartDate}
                        onChange={(e) => setCardStartDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />

                    <TextField
                        label="End Date"
                        type="date"
                        size="small"
                        value={cardendDate}
                        onChange={(e) => setCardEndDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => {
                            fetchRelatedVendors();
                            fetchVendorAnalytics();
                        }}
                        disabled={loading || analyticsLoading}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={exportVendors}
                        disabled={!filteredVendors.length}
                    >
                        Export
                    </Button>
                </Stack>
            </Stack>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Today’s Processed Volume"
                        value={formatCurrency(analytics.processed_today)} icon={<Business />} color="primary" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Active Vendors" value={formatNumber(analytics.active)} icon={<CheckCircle />} color="success" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Total Balance" value={formatCurrency(analytics.total_balance)} icon={<AccountBalance />} color="info" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Transactions" value={formatNumber(analytics.total_transactions)} icon={<Receipt />} color="warning" />
                </Grid>
            </Grid>

            {!selectedVendor ? (
                <Box key="vendor-table" sx={{ animation: 'tableSlideIn 340ms ease' }}>
                    <Card sx={{ mb: 3, borderRadius: 1 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Search business, email, phone, city"
                                        value={searchTerm}
                                        onChange={(event) => {
                                            setSearchTerm(event.target.value);
                                            setPage(0);
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Hierarchy</InputLabel>
                                        <Select
                                            value={levelFilter}
                                            label="Hierarchy"
                                            onChange={(event) => {
                                                setLevelFilter(event.target.value as VendorLevelFilter);
                                                setPage(0);
                                            }}
                                        >
                                            <MenuItem value="all">All Hierarchy</MenuItem>
                                            {LEVEL_OPTIONS.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={statusFilter}
                                            label="Status"
                                            onChange={(event) => {
                                                setStatusFilter(event.target.value as VendorStatusFilter);
                                                setPage(0);
                                            }}
                                        >
                                            <MenuItem value="all">All Status</MenuItem>
                                            {STATUS_OPTIONS.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        label="Start Date"
                                        value={startDate}
                                        onChange={(event) => {
                                            setStartDate(event.target.value);
                                            setPage(0);
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        label="End Date"
                                        value={endDate}
                                        onChange={(event) => {
                                            setEndDate(event.target.value);
                                            setPage(0);
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>


                                <Grid item xs={12}>
                                     <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                        <Chip label={`${stats.active} active`} color="success" variant="outlined" />
                                         <Chip label={`${stats.vendors} vendors`} size="small" />
                                        <Chip label={`${stats.subVendors} sub-vendors`} size="small" />
                                        <Chip label={`${stats.agents} agents`} size="small" />
                                        <Chip label={`${stats.cashiers} cashiers`} size="small" />
                                        <Chip label={`${stats.pos} pos`} size="small" />
                                         <Button size="small" onClick={resetFilters}>Reset Filters</Button>
                                     </Stack>
                                 </Grid>                               
                                
                            </Grid>
                        </CardContent>
                    </Card>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                                    <Domain />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Vendors</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Click any row to slide into the full  management details.
                                    </Typography>
                                </Box>
                            </Stack>
                            {loading && <CircularProgress size={24} />}
                        </Stack>

                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Business</TableCell>
                                        <TableCell>Hierarchy</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Contact</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Wallet</TableCell>
                                        <TableCell>Created</TableCell>
                                        {/* <TableCell align="right">Children</TableCell> */}
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedVendors.map((vendor) => (
                                        <TableRow key={vendor.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectVendor(vendor)}>
                                            <TableCell>
                                                <Stack spacing={0.25}>
                                                    <Typography variant="subtitle2">{vendor.business_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Parent: {vendor.related_vendor?.business_name || 'None'}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={levelLabel(vendor.hierachy)} size="small" color={levelColor(vendor.hierachy)} variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={vendor.account_status} size="small" color={statusColor(vendor.account_status)} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{vendor.email}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {vendor.phone_number}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{getLocation(vendor)}</TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2">{formatCurrency(getWalletBalance(vendor))}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {getWalletTypeName(vendor)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(vendor.created_at)}</TableCell>
                                            {/* <TableCell align="right">{formatNumber(getDirectChildCount(vendor.id))}</TableCell> */}
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    endIcon={<ArrowForward />}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleSelectVendor(vendor);
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>

                        <TablePagination
                            component="div"
                            count={filteredVendors.length}
                            page={page}
                            onPageChange={(_, nextPage) => setPage(nextPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(event) => {
                                setRowsPerPage(Number(event.target.value));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 8, 12, 20, 50]}
                        />
                    </Paper>
                </Box>
            ) : (
                <Box id="vendor-detail-panel" key={selectedVendor.id} sx={{ animation: 'detailSlideIn 380ms ease' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                        <Box>
                            <Typography variant="h6">Selected Vendor Details</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedVendor.business_name}
                            </Typography>
                        </Box>
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setSelectedVendor(null)}>
                            Back to Recent Vendors
                        </Button>
                    </Stack>

                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} md={3}>
                            <StatCard title="Wallet Balance" value={formatCurrency(getWalletBalance(selectedVendor))} icon={<AccountBalance />} color="success" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard title="Transactions" value={formatNumber(selectedTransactionCount)} icon={<Receipt />} color="warning" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard title="Children" value={formatNumber(selectedDirectChildrenCount)} icon={<Business />} color="primary" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <StatCard title="Status" value={selectedVendor.account_status} icon={<CheckCircle />} color="info" />
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <Stack spacing={3}>
                                <Card sx={{ borderRadius: 1 }}>
                                    <CardContent>
                                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                            
                                            <Stack spacing={0.5}>
                                                <Typography variant="h5">{selectedVendor.business_name}</Typography>
                                                <Typography color="text.secondary">{selectedVendor.email}</Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    <Chip label={levelLabel(selectedVendor.hierachy)} color={levelColor(selectedVendor.hierachy)} />
                                                    <Chip label={selectedVendor.account_status} color={statusColor(selectedVendor.account_status)} />
                                                    <Chip label={getLocation(selectedVendor)} variant="outlined" />
                                                </Stack>
                                            </Stack>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                sx={{
                                                height: 36,
                                                textTransform: "none",
                                                borderRadius: 2,
                                                // bgcolor: "#1e3a8a",
                                                "&:hover": { bgcolor: "#1e40af" },
                                                }}
                                                startIcon={<Delete />}
                                                onClick={() =>
                                                    handleDeleteVendor(selectedVendor.id)
                                                }
                                            >
                                                Delete Vendor
                                            </Button>
                                        </Stack>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">Phone</Typography>
                                                <Typography>{selectedVendor.phone_number || 'Not provided'}</Typography>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">Created</Typography>
                                                <Typography>{formatDate(selectedVendor.created_at)}</Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Button size="small" onClick={() => setShowFullDetails((prev) => !prev)}>
                                                    {showFullDetails ? 'View Less' : 'View Full Details'}
                                                </Button>
                                            </Grid>
                                        </Grid>

                                        <Collapse in={showFullDetails} timeout={260}>
                                            <Divider sx={{ my: 2 }} />
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="body2" color="text.secondary">Vendor ID</Typography>
                                                    <Typography>{selectedVendor.id}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="body2" color="text.secondary">Postal Code</Typography>
                                                    <Typography>{selectedVendor.postal_code || 'Not provided'}</Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">Address</Typography>
                                                    <Typography>{selectedVendor.address || 'Not provided'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Typography variant="body2" color="text.secondary">City</Typography>
                                                    <Typography>{selectedVendor.city || 'Not provided'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Typography variant="body2" color="text.secondary">State</Typography>
                                                    <Typography>{selectedVendor.state || 'Not provided'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Typography variant="body2" color="text.secondary">Country</Typography>
                                                    <Typography>{selectedVendor.country || 'Not provided'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="body2" color="text.secondary">Wallet Type</Typography>
                                                    <Typography>{getWalletTypeName(selectedVendor)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {selectedVendor.wallet?.wallet_type?.description || ''}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="body2" color="text.secondary">Related Vendor</Typography>
                                                    <Typography>{selectedVendor.related_vendor?.business_name || 'None'}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {selectedVendor.related_vendor?.email || ''}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Collapse>
                                    </CardContent>
                                </Card>

                                <Card sx={{ borderRadius: 1 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6">Recent Transactions</Typography>
                                            {transactionLoading && <CircularProgress size={22} />}
                                        </Stack>
                                        <Grid container spacing={2} mb={2}>
    <Grid item xs={12} md={4}>
        <TextField
            fullWidth
            size="small"
            placeholder="Search transaction"
            value={transactionSearch}
            onChange={(e) => {
                setTransactionSearch(e.target.value);
                setTransactionPage(0);
            }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search fontSize="small" />
                    </InputAdornment>
                ),
            }}
        />
    </Grid>

    <Grid item xs={12} md={3}>
        <TextField
            fullWidth
            size="small"
            type="date"
            label="Start Date"
            value={transactionStartDate}
            onChange={(e) => {
                setTransactionStartDate(e.target.value);
                setTransactionPage(0);
            }}
            InputLabelProps={{ shrink: true }}
        />
    </Grid>

    <Grid item xs={12} md={3}>
        <TextField
            fullWidth
            size="small"
            type="date"
            label="End Date"
            value={transactionEndDate}
            onChange={(e) => {
                setTransactionEndDate(e.target.value);
                setTransactionPage(0);
            }}
            InputLabelProps={{ shrink: true }}
        />
    </Grid>
</Grid>
                                        <Divider sx={{ mb: 2 }} />
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Reference</TableCell>
                                                        {/* <TableCell>Vendor</TableCell> */}
                                                        <TableCell>Status</TableCell>
                                                        <TableCell align="right">Amount</TableCell>
                                                        <TableCell>Date</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {selectedTransactions.map((transaction) => (
                                                        <TableRow
                                                    key={transaction.transaction_ref}
                                                    hover
                                                >
                                                    <TableCell>
                                                        {transaction.transaction_ref}
                                                    </TableCell>

                                                    {/* <TableCell>
                                                        {transaction.vendor_name}
                                                    </TableCell> */}

                                                    <TableCell>
                                                        <Chip
                                                            label={transaction.status || 'success'}
                                                            size="small"
                                                            color={
                                                                transaction.status === 'failed'
                                                                    ? 'error'
                                                                    : transaction.status === 'pending'
                                                                    ? 'warning'
                                                                    : 'success'
                                                            }
                                                        />
                                                    </TableCell>

                                                    <TableCell align="right">
                                                        <Typography
                                                            fontWeight={700}
                                                            sx={{
                                                                color:
                                                                    transaction.transaction_type ===
                                                                    'debit'
                                                                        ? 'error.main'
                                                                        : 'success.main',
                                                            }}
                                                        >
                                                            {transaction.transaction_type ===
                                                            'debit'
                                                                ? '- '
                                                                : '+ '}
                                                            {formatCurrency(transaction.amount)}
                                                        </Typography>
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatDateTime(transaction.timestamp)}
                                                    </TableCell>
                                                </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <TablePagination
    component="div"
    count={selectedTransactionCount}
    page={transactionPage}
    onPageChange={(_, newPage) => {
        setTransactionPage(newPage);
    }}
    rowsPerPage={transactionRowsPerPage}
    onRowsPerPageChange={(e) => {
        setTransactionRowsPerPage(
            Number(e.target.value)
        );
        setTransactionPage(0);
    }}
    rowsPerPageOptions={[5, 10, 20]}
/>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Stack spacing={3}>
                                <Card sx={{ borderRadius: 1 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6">Hierarchy Under This Vendor</Typography>
                                            {detailLoading && <CircularProgress size={22} />}
                                        </Stack>
                                        <Paper variant="outlined" sx={{ maxHeight: 340, overflow: 'auto', borderRadius: 1 }}>
                                            {selectedVendorTree.length ? (
                                                renderVendorTree(selectedVendorTree)
                                            ) : (
                                                <Box p={2}>
                                                    <Typography color="text.secondary">No child vendors found.</Typography>
                                                </Box>
                                            )}
                                        </Paper>
                                    </CardContent>
                                </Card>

                                {/* <Card sx={{ borderRadius: 1 }}>
                                    <CardContent>
                                        <Typography variant="h6" mb={2}>Wallet Summary</Typography>
                                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1 }}>
                                            <Typography variant="caption">Total Balance</Typography>
                                            <Typography variant="h5" fontWeight={700}>{formatCurrency(getWalletBalance(selectedVendor))}</Typography>
                                        </Paper>
                                        <Stack spacing={1}>
                                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                                <Typography variant="body2" color="text.secondary">Wallet Type</Typography>
                                                <Typography variant="subtitle2">{getWalletTypeName(selectedVendor)}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                                <Typography variant="body2" color="text.secondary">Account Status</Typography>
                                                <Chip label={selectedVendor.account_status} size="small" color={statusColor(selectedVendor.account_status)} />
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                                <Typography variant="body2" color="text.secondary">Total Transactions</Typography>
                                                <Typography variant="subtitle2">{formatNumber(selectedTransactionCount)}</Typography>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card> //*/}
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            )}

            <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Paper sx={{ p: 1.5, bgcolor: 'success.main', color: 'success.contrastText' }}>
                    {success}
                </Paper>
            </Snackbar>
        </Box>
    );
};

export default VendorManagement;