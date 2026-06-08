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
    Grid,
    IconButton,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Typography,
    ListItemButton,
    ListItemText,
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
    Key,
    People,
    Receipt,
    Refresh,
    Settings,
    Speed,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

type Hierarchy = 'vendor' | 'sub_vendor' | 'agent' | 'cashier' | 'pos';
type GroupId = 'vendors' | 'sub_vendors' | 'agents' | 'cashiers' | 'pos';
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
    phone_number?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
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
    created_at?: string;
};

type VendorTransaction = {
    transaction_ref: string;
    amount: string;
    timestamp: string;
};

type LedgerEntry = {
    transaction_ref: string;
    debit_amount: string;
    credit_amount: string;
    timestamp: string;
};

type LedgerSummary = {
    total_debits: number;
    total_credits: number;
};

type DashboardGroup = {
    id: GroupId;
    label: string;
    tableTitle: string;
    description: string;
    hierarchy: Hierarchy;
    color: MuiColor;
    icon: React.ReactNode;
};
const WALLET_ENDPOINT = 'http://188.166.161.13:8061/vendor/wallet/';
const RELATED_CHILDREN_ENDPOINT = 'http://188.166.161.13:8061/vendor/retrieve/related-children/';
const CHILDREN_TRANSACTIONS_ENDPOINT = 'http://188.166.161.13:8061/vendor/retrieve-children/transactions/';
const LEDGER_ENDPOINT = 'http://188.166.161.13:8061/vendor/ledger/';

const toNumber = (value: number | string | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const defaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toDateInput(date);
};

const formatCurrency = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(toNumber(value));

const formatNumber = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('en-NG').format(toNumber(value));

const formatDate = (value: string | null | undefined) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
};

const statusColor = (status?: string): ChipColor => {
    switch ((status || '').toLowerCase()) {
        case 'active':
        case 'success':
        case 'online':
            return 'success';
        case 'pending':
        case 'review':
            return 'warning';
        case 'failed':
        case 'inactive':
        case 'offline':
        case 'suspended':
            return 'error';
        default:
            return 'default';
    }
};

const hierarchyColor = (hierarchy?: string): ChipColor => {
    switch ((hierarchy || '').toLowerCase()) {
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

const hierarchyLabel = (hierarchy?: string) => {
    switch ((hierarchy || '').toLowerCase()) {
        case 'vendor':
            return 'Vendor';
        case 'sub_vendor':
            return 'Sub-vendor';
        case 'agent':
            return 'Agent';
        case 'cashier':
            return 'Cashier';
        case 'pos':
            return 'POS';
        default:
            return hierarchy || 'Vendor';
    }
};

const normalizeHierarchy = (hierarchy?: string): Hierarchy => {
    const value = (hierarchy || '').toLowerCase();
    if (value === 'sub_vendor') return 'sub_vendor';
    if (value === 'agent') return 'agent';
    if (value === 'cashier') return 'cashier';
    if (value === 'pos') return 'pos';
    return 'vendor';
};

const getWalletBalance = (vendor?: RelatedVendor | null) => toNumber(vendor?.wallet?.balance);
const getWalletType = (vendor?: RelatedVendor | null) => vendor?.wallet?.wallet_type?.name || 'Wallet';
const getLocation = (vendor: RelatedVendor) =>
    [vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ') || vendor.address || 'Not provided';

const getHeaders = (): HeadersInit => {
    const token =
        typeof window !== 'undefined'
            ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('accessToken')
            : null;

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const getCurrentVendorId = () => {
    if (typeof window === 'undefined') return '1';

    const direct =
        localStorage.getItem('vendor_id') ||
        localStorage.getItem('vendorId') ||
        localStorage.getItem('current_vendor_id');

    if (direct) return direct;

    try {
        const rawUser = localStorage.getItem('user');
        const user = rawUser ? JSON.parse(rawUser) : null;
        return String(user?.vendor_id || user?.vendor?.id || user?.id || 1);
    } catch {
        return '1';
    }
};

const getCurrentVendorName = () => {
    if (typeof window === 'undefined') return 'Current Vendor';

    try {
        const rawUser = localStorage.getItem('user');
        const user = rawUser ? JSON.parse(rawUser) : null;
        return user?.business_name || user?.vendor?.business_name || user?.name || 'Current Vendor';
    } catch {
        return 'Current Vendor';
    }
};

const parseVendorList = (payload: unknown): RelatedVendor[] => {
    if (Array.isArray(payload)) return payload as RelatedVendor[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as RelatedVendor[];
    }
    return [];
};

const uniqueById = (vendors: RelatedVendor[]) => {
    const map = new Map<number, RelatedVendor>();
    vendors.forEach((vendor) => map.set(vendor.id, vendor));
    return Array.from(map.values());
};

const vendorFromLite = (vendor: RelatedVendorLite): RelatedVendor => ({
    id: vendor.id,
    business_name: vendor.business_name,
    email: vendor.email,
    phone_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    account_status: vendor.account_status,
    hierachy: vendor.hierachy,
    related_vendor: null,
    wallet: null,
    created_at: '',
});

const vendorsForHierarchy = (vendors: RelatedVendor[], hierarchy: Hierarchy) => {
    const direct = vendors.filter((vendor) => normalizeHierarchy(vendor.hierachy) === hierarchy);

    if (hierarchy !== 'vendor') return uniqueById(direct);

    const parentVendors = vendors
        .map((vendor) => vendor.related_vendor)
        .filter(Boolean)
        .filter((vendor) => normalizeHierarchy(vendor?.hierachy) === 'vendor')
        .map((vendor) => vendorFromLite(vendor as RelatedVendorLite));

    return uniqueById([...direct, ...parentVendors]);
};

const buildVendorTree = (vendors: RelatedVendor[]) => {
    const map = new Map<number, RelatedVendor & { children: RelatedVendor[] }>();

    vendors.forEach((vendor) => {
        map.set(vendor.id, { ...vendor, children: [] });
    });

    const roots: Array<RelatedVendor & { children: RelatedVendor[] }> = [];

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

const DASHBOARD_GROUPS: DashboardGroup[] = [
    {
        id: 'vendors',
        label: 'Vendors',
        tableTitle: 'Recent Vendors',
        description: 'Vendors retrieved from the related hierarchy endpoint.',
        hierarchy: 'vendor',
        color: 'primary',
        icon: <Business />,
    },
    {
        id: 'sub_vendors',
        label: 'Sub-vendors',
        tableTitle: 'Recent Sub-vendors',
        description: 'Only sub-vendors under this vendor hierarchy.',
        hierarchy: 'sub_vendor',
        color: 'success',
        icon: <Domain />,
    },
    {
        id: 'agents',
        label: 'Agents',
        tableTitle: 'Recent Agents',
        description: 'Only agents under this vendor hierarchy.',
        hierarchy: 'agent',
        color: 'warning',
        icon: <People />,
    },
    {
        id: 'cashiers',
        label: 'Cashiers',
        tableTitle: 'Recent Cashiers',
        description: 'Only cashiers under this vendor hierarchy.',
        hierarchy: 'cashier',
        color: 'info',
        icon: <Receipt />,
    },
    {
        id: 'pos',
        label: 'POS',
        tableTitle: 'Recent POS',
        description: 'Only POS records under this vendor hierarchy.',
        hierarchy: 'pos',
        color: 'secondary',
        icon: <AccountBalance />,
    },
];

const MetricTile = ({
    title,
    value,
    detail,
    icon,
    color = 'primary',
}: {
    title: string;
    value: React.ReactNode;
    detail?: string;
    icon: React.ReactNode;
    color?: MuiColor;
}) => (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 1 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                    {value}
                </Typography>
                {detail && (
                    <Typography variant="caption" color="text.secondary">
                        {detail}
                    </Typography>
                )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
        </Stack>
    </Paper>
);

const DirectoryTable = ({
    group,
    vendors,
    selectedId,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    onSelect,
    loading,
}: {
    group: DashboardGroup;
    vendors: RelatedVendor[];
    selectedId: number | null;
    page: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
    onSelect: (vendor: RelatedVendor) => void;
    loading: boolean;
}) => {
    const paginated = vendors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: `${group.color}.light`, color: `${group.color}.main` }}>{group.icon}</Avatar>
                    <Box>
                        <Typography variant="h6">{group.tableTitle}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {group.description}
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`${vendors.length} records`} color={group.color} variant="outlined" />
                    {loading && <CircularProgress size={22} />}
                </Stack>
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
                            <TableCell align="right">Wallet</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginated.map((vendor) => (
                            <TableRow
                                key={vendor.id}
                                hover
                                selected={vendor.id === selectedId}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => onSelect(vendor)}
                            >
                                <TableCell>
                                    <Typography variant="subtitle2">{vendor.business_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Parent: {vendor.related_vendor?.business_name || 'None'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={hierarchyLabel(vendor.hierachy)} size="small" color={hierarchyColor(vendor.hierachy)} variant="outlined" />
                                </TableCell>
                                <TableCell>
                                    <Chip label={vendor.account_status || 'unknown'} size="small" color={statusColor(vendor.account_status)} />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{vendor.email || 'Not provided'}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {vendor.phone_number || ''}
                                    </Typography>
                                </TableCell>
                                <TableCell>{getLocation(vendor)}</TableCell>
                                <TableCell align="right">
                                    <Typography variant="subtitle2">{formatCurrency(getWalletBalance(vendor))}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {getWalletType(vendor)}
                                    </Typography>
                                </TableCell>
                                <TableCell>{vendor.created_at ? formatDate(vendor.created_at) : 'Not available'}</TableCell>
                                <TableCell align="right">
                                    <Button
                                        size="small"
                                        endIcon={<ArrowForward />}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onSelect(vendor);
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
                count={vendors.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_, nextPage) => onPageChange(nextPage)}
                onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                rowsPerPageOptions={[5, 8, 12, 20, 50]}
            />
        </Paper>
    );
};

const RecentTransactionsPanel = ({
    vendorName,
    transactions,
    loading,
}: {
    vendorName: string;
    transactions: VendorTransaction[];
    loading: boolean;
}) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={700}>
                Recent Transactions
            </Typography>
            {loading && <CircularProgress size={20} />}
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Reference</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Date</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {transactions.map((tx) => (
                        <TableRow key={tx.transaction_ref} hover>
                            <TableCell>{tx.transaction_ref}</TableCell>
                            <TableCell>{vendorName}</TableCell>
                            <TableCell>
                                <Chip label="success" color="success" size="small" />
                            </TableCell>
                            <TableCell align="right">{formatCurrency(tx.amount)}</TableCell>
                            <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    </Paper>
);

const LedgerPanel = ({
    vendorName,
    entries,
}: {
    vendorName: string;
    entries: LedgerEntry[];
}) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Recent Activity Summary
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Reference</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Credit</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell>Date</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.map((entry) => (
                        <TableRow key={entry.transaction_ref} hover>
                            <TableCell>{entry.transaction_ref}</TableCell>
                            <TableCell>{vendorName}</TableCell>
                            <TableCell>
                                <Chip label="success" color="success" size="small" />
                            </TableCell>
                            <TableCell align="right">{formatCurrency(entry.credit_amount)}</TableCell>
                            <TableCell align="right">{formatCurrency(entry.debit_amount)}</TableCell>
                            <TableCell>{formatDate(entry.timestamp)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    </Paper>
);

const VendorTree = ({
    nodes,
    selectedId,
    expandedIds,
    onToggle,
    onSelect,
}: {
    nodes: Array<RelatedVendor & { children: RelatedVendor[] }>;
    selectedId?: number;
    expandedIds: Set<number>;
    onToggle: (id: number) => void;
    onSelect: (vendor: RelatedVendor) => void;
}) => {
    const renderNode = (node: RelatedVendor & { children?: RelatedVendor[] }, depth = 0): React.ReactNode => {
        const children = (node.children || []) as Array<RelatedVendor & { children: RelatedVendor[] }>;
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(node.id);

        return (
            <Box key={node.id}>
                <ListItemButton selected={selectedId === node.id} onClick={() => onSelect(node)} sx={{ pl: 2 + depth * 2 }}>
                    {hasChildren ? (
                        <IconButton
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggle(node.id);
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
                                <Chip label={hierarchyLabel(node.hierachy)} size="small" color={hierarchyColor(node.hierachy)} variant="outlined" />
                                <Chip label={node.account_status} size="small" color={statusColor(node.account_status)} />
                            </Stack>
                        }
                    />
                </ListItemButton>
                {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1))}
            </Box>
        );
    };

    return <>{nodes.map((node) => renderNode(node))}</>;
};

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

    const [activeGroup, setActiveGroup] = useState<GroupId>('vendors');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [walletData, setWalletData] = useState<{
        wallet_type?: {
            name: string;
            description: string;
        };
        balance: string;
    } | null>(null);

    const [walletLoading, setWalletLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [groupLoading, setGroupLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - 14);
    
      const format = (d: Date) => d.toISOString().split("T")[0];
      const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
    
    const [ledgerStartDate, setLedgerStartDate] = useState(format(past));
    const [ledgerEndDate, setLedgerEndDate] = useState(format(tomorrow));

    const currentVendorId = getCurrentVendorId();
    const currentVendorName = getCurrentVendorName();
    const currentGroup = DASHBOARD_GROUPS.find((group) => group.id === activeGroup) || DASHBOARD_GROUPS[0];

    const fetchWallet = useCallback(async () => {
        setWalletLoading(true);

        try {
            const response = await fetch(WALLET_ENDPOINT, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch wallet');
            }

            const data = await response.json();

            setWalletData(data);
        } catch (error) {
            console.error('Wallet fetch error:', error);

            setWalletData({
                balance: '0.00',
                wallet_type: {
                    name: 'Wallet',
                    description: '',
                },
            });
        } finally {
            setWalletLoading(false);
        }
    }, []);
    const fetchRelatedVendors = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(RELATED_CHILDREN_ENDPOINT, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error(`Failed to retrieve vendor hierarchy (${response.status})`);

            const data = parseVendorList(await response.json());
            setAllVendors(data);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err?.message || 'Failed to retrieve vendor hierarchy');
            setAllVendors([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchGroupVendors = useCallback(async (hierarchy: Hierarchy) => {
        setGroupLoading(true);

        try {
            const params = new URLSearchParams({ hierachy: hierarchy });
            const response = await fetch(`${RELATED_CHILDREN_ENDPOINT}?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Group request failed');

            setGroupVendors(parseVendorList(await response.json()));
        } catch {
            setGroupVendors([]);
        } finally {
            setGroupLoading(false);
        }
    }, []);

    const fetchVendorChildren = useCallback(async (vendorId: number) => {
        setDetailLoading(true);

        try {
            const params = new URLSearchParams({ vendor_id: String(vendorId) });
            const response = await fetch(`${RELATED_CHILDREN_ENDPOINT}?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Children request failed');

            setSelectedChildren(parseVendorList(await response.json()));
        } catch {
            setSelectedChildren([]);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const fetchVendorTransactions = useCallback(async (vendorId: number) => {
        setTransactionsLoading(true);

        try {
            const params = new URLSearchParams({ vendor_id: String(vendorId), page_size: '5' });
            const response = await fetch(`${CHILDREN_TRANSACTIONS_ENDPOINT}?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Transactions request failed');

            const payload = await response.json();
            const results = Array.isArray(payload?.results) ? payload.results : [];

            setSelectedTransactionCount(Number(payload?.count || results.length || 0));
            setSelectedTransactions(
                [...results]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5)
            );
        } catch {
            setSelectedTransactionCount(0);
            setSelectedTransactions([]);
        } finally {
            setTransactionsLoading(false);
        }
    }, []);

    const fetchLedger = useCallback(async (vendorId: number | string, onDone: (entries: LedgerEntry[], summary: LedgerSummary, count: number) => void) => {
        const params = new URLSearchParams({
            start_date: ledgerStartDate,
            end_date: ledgerEndDate,
            vendor_id: String(vendorId || 1),
        });

        const response = await fetch(`${LEDGER_ENDPOINT}?${params.toString()}`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) throw new Error('Ledger request failed');

        const payload = await response.json();
        const results = Array.isArray(payload?.results) ? payload.results : [];
        const summary = payload?.summary || { total_debits: 0, total_credits: 0 };

        onDone(
            [...results].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            {
                total_debits: toNumber(summary.total_debits),
                total_credits: toNumber(summary.total_credits),
            },
            Number(payload?.count || results.length || 0)
        );
    }, [ledgerEndDate, ledgerStartDate]);

    const fetchGlobalLedger = useCallback(async () => {
        setLedgerLoading(true);

        try {
            await fetchLedger(currentVendorId, (entries, summary) => {
                setGlobalLedgerEntries(entries.slice(0, 5));
                setGlobalLedgerSummary(summary);
            });
        } catch {
            setGlobalLedgerEntries([]);
            setGlobalLedgerSummary({ total_debits: 0, total_credits: 0 });
        } finally {
            setLedgerLoading(false);
        }
    }, [currentVendorId, fetchLedger]);

    useEffect(() => {
        
    }, []);

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
            setSelectedTransactionCount((prev) => Math.max(prev, count));
        }).catch(() => {
            setSelectedLedgerSummary({ total_debits: 0, total_credits: 0 });
        });
    }, [fetchLedger, fetchVendorChildren, fetchVendorTransactions, selectedVendor]);

    const tabCounts = useMemo(() => {
        const counts: Record<GroupId, number> = {
            vendors: vendorsForHierarchy(allVendors, 'vendor').length,
            sub_vendors: vendorsForHierarchy(allVendors, 'sub_vendor').length,
            agents: vendorsForHierarchy(allVendors, 'agent').length,
            cashiers: vendorsForHierarchy(allVendors, 'cashier').length,
            pos: vendorsForHierarchy(allVendors, 'pos').length,
        };

        return counts;
    }, [allVendors]);

    const currentVendors = useMemo(() => {
        const fromGroup = vendorsForHierarchy(groupVendors, currentGroup.hierarchy);
        const fromAll = vendorsForHierarchy(allVendors, currentGroup.hierarchy);
        return uniqueById([...fromGroup, ...fromAll]);
    }, [allVendors, currentGroup.hierarchy, groupVendors]);

    const selectedChildrenTree = useMemo(() => buildVendorTree(selectedChildren), [selectedChildren]);

    const totalChildren = allVendors.length;
    // const globalNetBalance = globalLedgerSummary.total_credits - globalLedgerSummary.total_debits;
    const globalWalletBalance = toNumber(walletData?.balance);
    const selectedNetBalance = selectedLedgerSummary.total_credits - selectedLedgerSummary.total_debits;
    const selectedWalletBalance = selectedNetBalance || getWalletBalance(selectedVendor);
    const selectedChildrenCount = selectedChildren.length;

    const getGroupPreviewLabel = useCallback(
        (group: DashboardGroup) => {
            const first = vendorsForHierarchy(allVendors, group.hierarchy)[0]?.business_name || group.label;
            const extra = tabCounts[group.id] > 1 ? ` +${tabCounts[group.id] - 1}` : '';
            return `${first}${extra}`;
        },
        [allVendors, tabCounts]
    );

    const handleSelectVendor = useCallback((vendor: RelatedVendor) => {
        setSelectedVendor(vendor);
        setShowFullDetails(false);
        setExpandedIds(new Set([vendor.id]));

        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            window.setTimeout(() => {
                document.getElementById('dashboard-detail-panel')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 80);
        }
    }, []);

    const quickActions = useMemo(
        () => [
            { id: 'manage-orgs', title: 'Manage Organisations', description: 'Create and manage vendor organisations', icon: <Business />, path: '/tenants/vendors', color: 'primary.main' },
            { id: 'wallet-ops', title: 'Wallet Operations', description: 'Balances, transfers, and settlement wallets', icon: <AccountBalance />, path: '/transactions', color: 'success.main' },
            // { id: 'prepaid', title: 'Prepaid Services', description: 'Airtime, data, bills, and utilities', icon: <Speed />, path: '/prepaid', color: 'warning.main' },
            { id: 'api-keys', title: 'API Keys', description: 'Keys, webhooks, and access controls', icon: <Key />, path: '/settings', color: 'info.main' },
            { id: 'settings', title: 'Settings', description: 'Vendor profile and platform settings', icon: <Settings />, path: '/settings', color: 'secondary.main' },
            { id: 'create', title: 'Create New', description: 'Vendor, user', icon: <Business />, path: '/tenants/vendors', color: 'error.main' },
        ],
        []
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
                    <Typography variant="h4" component="h1">
                        Vendor Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live hierarchy data - updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => {
                        fetchRelatedVendors();
                        fetchGroupVendors(currentGroup.hierarchy);
                        fetchGlobalLedger();
                    }}
                    disabled={loading || groupLoading || ledgerLoading}
                >
                    Refresh
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Total Hierarchy" value={formatNumber(totalChildren)} detail="All related children" icon={<Business />} color="primary" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile
                    title="Total Wallet Balance"
                    value={
                        walletLoading ? (
                            <CircularProgress size={20} />
                        ) : (
                            formatCurrency(globalWalletBalance)
                        )
                    }
                    detail={walletData?.wallet_type?.name || 'Wallet'}
                    icon={<AccountBalance />}
                    color="success"
                />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Recent Ledger" value={formatNumber(globalLedgerEntries.length)} detail={`Debits ${formatCurrency(globalLedgerSummary.total_debits)}`} icon={<Receipt />} color="warning" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricTile title="Active Vendors" value={formatNumber(allVendors.filter((vendor) => vendor.account_status === 'active').length)} detail={`${tabCounts.cashiers} cashiers, ${tabCounts.pos} POS`} icon={<People />} color="info" />
                </Grid>
            </Grid>

            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Tabs
                        value={activeGroup}
                        onChange={(_, value: GroupId) => setActiveGroup(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Dashboard pages"
                        sx={{
                            '& .MuiTab-root': {
                                alignItems: 'flex-start',
                                minHeight: 58,
                                transition: 'background-color 180ms ease, color 180ms ease',
                            },
                            '& .MuiTab-root.Mui-selected': {
                                bgcolor: 'action.selected',
                            },
                        }}
                    >
                        {DASHBOARD_GROUPS.map((group) => (
                            <Tab
                                key={group.id}
                                value={group.id}
                                label={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip label={`${group.label} (${tabCounts[group.id]})`} size="small" color={group.color} variant="outlined" />
                                        <Typography variant="body2">{getGroupPreviewLabel(group)}</Typography>
                                    </Stack>
                                }
                            />
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            <Box sx={{ mb: 3, overflow: 'hidden' }}>
                {!selectedVendor ? (
                    <Box key={`${activeGroup}-table`} sx={{ animation: 'tableSlideIn 340ms ease' }}>
                        <DirectoryTable
                            group={currentGroup}
                            vendors={currentVendors}
                            
                            selectedId={null}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setPage}
                            onRowsPerPageChange={(rows) => {
                                setRowsPerPage(rows);
                                setPage(0);
                            }}
                            onSelect={handleSelectVendor}
                            loading={groupLoading}
                        />
                    </Box>
                ) : (
                    <Box id="dashboard-detail-panel" key={selectedVendor.id} sx={{ animation: 'detailSlideIn 380ms ease' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                            <Box>
                                <Typography variant="h6">Selected Details</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedVendor.business_name}
                                </Typography>
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
                                        <Typography color="text.secondary">{selectedVendor.email || 'No email provided'}</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip label={hierarchyLabel(selectedVendor.hierachy)} color={hierarchyColor(selectedVendor.hierachy)} />
                                            <Chip label={selectedVendor.account_status} color={statusColor(selectedVendor.account_status)} />
                                            <Chip label={getLocation(selectedVendor)} variant="outlined" />
                                        </Stack>
                                    </Stack>
                                </Stack>

                                <Grid container spacing={2} mb={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <MetricTile title="Wallet Balance" value={formatCurrency(selectedWalletBalance)} detail={getWalletType(selectedVendor)} icon={<AccountBalance />} color="success" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <MetricTile title="Transactions" value={formatNumber(selectedTransactionCount)} detail="Related vendor transactions" icon={<Receipt />} color="warning" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <MetricTile title="Total Children" value={formatNumber(selectedChildrenCount)} detail="Under selected vendor" icon={<People />} color="info" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <MetricTile title="Net Ledger" value={formatCurrency(selectedNetBalance)} detail={`Credits ${formatCurrency(selectedLedgerSummary.total_credits)}`} icon={<Business />} color="primary" />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={7}>
                                        <Stack spacing={2}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                                                        <Typography>{selectedVendor.phone_number || 'Not provided'}</Typography>
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="body2" color="text.secondary">Created</Typography>
                                                        <Typography>{selectedVendor.created_at ? formatDate(selectedVendor.created_at) : 'Not available'}</Typography>
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
                                                            <Typography variant="body2" color="text.secondary">Related Vendor</Typography>
                                                            <Typography>{selectedVendor.related_vendor?.business_name || 'None'}</Typography>
                                                        </Grid>
                                                        <Grid item xs={12} md={6}>
                                                            <Typography variant="body2" color="text.secondary">Wallet Type</Typography>
                                                            <Typography>{getWalletType(selectedVendor)}</Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Collapse>
                                            </Paper>

                                            <RecentTransactionsPanel
                                                vendorName={selectedVendor.business_name}
                                                transactions={selectedTransactions}
                                                loading={transactionsLoading}
                                            />
                                        </Stack>
                                    </Grid>

                                    <Grid item xs={12} md={5}>
                                        <Stack spacing={2}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Typography variant="subtitle1" fontWeight={700}>
                                                        Hierarchy Under This Vendor
                                                    </Typography>
                                                    {detailLoading && <CircularProgress size={20} />}
                                                </Stack>
                                                <Box sx={{ maxHeight: 340, overflow: 'auto' }}>
                                                    {selectedChildrenTree.length ? (
                                                        <VendorTree
                                                            nodes={selectedChildrenTree}
                                                            selectedId={selectedVendor.id}
                                                            expandedIds={expandedIds}
                                                            onToggle={(id) => {
                                                                setExpandedIds((prev) => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(id)) next.delete(id);
                                                                    else next.add(id);
                                                                    return next;
                                                                });
                                                            }}
                                                            onSelect={handleSelectVendor}
                                                        />
                                                    ) : (
                                                        <Typography color="text.secondary">No hierarchy found under this vendor.</Typography>
                                                    )}
                                                </Box>
                                            </Paper>

                                            {/* <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                                    Ledger Date Range
                                                </Typography>
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                    <TextField
                                                        size="small"
                                                        type="date"
                                                        label="Start Date"
                                                        value={ledgerStartDate}
                                                        onChange={(event) => setLedgerStartDate(event.target.value)}
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        type="date"
                                                        label="End Date"
                                                        value={ledgerEndDate}
                                                        onChange={(event) => setLedgerEndDate(event.target.value)}
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                </Stack>
                                            </Paper> */}
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Box>

            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Quick Actions
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {quickActions.map((action) => (
                            <Grid item xs={12} sm={6} md={4} key={action.id}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        borderRadius: 1,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            borderColor: action.color,
                                            bgcolor: 'action.hover',
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                    onClick={() => navigate(action.path)}
                                >
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: action.color }}>{action.icon}</Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2">{action.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {action.description}
                                            </Typography>
                                        </Box>
                                        <ArrowForward color="action" />
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            <Card sx={{ borderRadius: 1 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                        <Box>
                            <Typography variant="h6">Recent Activity Summary</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ledger from {ledgerStartDate} to {ledgerEndDate}
                            </Typography>
                        </Box>
                        <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/transactions')}>
                            View All
                        </Button>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    <LedgerPanel vendorName={currentVendorName} entries={globalLedgerEntries} />
                </CardContent>
            </Card>
        </Box>
    );
};

export default Dashboard;