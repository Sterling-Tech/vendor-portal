import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AccountBalanceWallet,
    Download,
    History,
    Info,
    Lock,
    LockOpen,
    Refresh,
    Search,
    TrendingDown,
    TrendingUp,
} from '@mui/icons-material';

type WalletType = 'settlement' | 'operations' | 'commission' | 'collection' | 'trading';
type TransactionType = 'credit' | 'debit';
type TransactionStatus = 'success' | 'pending' | 'failed';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type Wallet = {
    id: string;
    key: string;
    owner_name: string;
    owner_level: string;
    type: WalletType;
    balance: number;
    is_locked: boolean;
    daily_limit: number;
    daily_spent: number;
    monthly_limit: number;
    created_at: string;
};

type WalletTransaction = {
    id: string;
    wallet_id: string;
    wallet_key: string;
    vendor_name: string;
    vendor_level: string;
    wallet_type: WalletType;
    type: TransactionType;
    category: string;
    amount: number;
    reference: string;
    description: string;
    counterparty: string;
    status: TransactionStatus;
    balance_after: number;
    created_at: string;
};

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const formatNumber = (value: number | string) => new Intl.NumberFormat('en-NG').format(Number(value || 0));

const daysAgo = (days: number, hours = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(date.getHours() - hours);
    return date.toISOString();
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
};

const walletTypeLabel = (type: WalletType) =>
    ({
        settlement: 'Settlement',
        operations: 'Operations',
        commission: 'Commission',
        collection: 'Collection',
        trading: 'Trading',
    })[type];

const chipColor = (status: string): ChipColor => {
    switch (status) {
        case 'success':
        case 'active':
        case 'credit':
            return 'success';
        case 'pending':
        case 'operations':
            return 'warning';
        case 'failed':
        case 'debit':
            return 'error';
        case 'settlement':
            return 'primary';
        case 'commission':
            return 'info';
        case 'collection':
            return 'secondary';
        default:
            return 'default';
    }
};

const WALLETS: Wallet[] = [
    {
        id: 'wallet-apx-settlement',
        key: 'apexpay-settlement',
        owner_name: 'ApexPay Vendor HQ',
        owner_level: 'Vendor Admin',
        type: 'settlement',
        balance: 126500000,
        is_locked: false,
        daily_limit: 50000000,
        daily_spent: 12600000,
        monthly_limit: 500000000,
        created_at: daysAgo(48),
    },
    {
        id: 'wallet-apx-ops',
        key: 'apexpay-operations',
        owner_name: 'ApexPay Vendor HQ',
        owner_level: 'Vendor Admin',
        type: 'operations',
        balance: 38950000,
        is_locked: false,
        daily_limit: 20000000,
        daily_spent: 7400000,
        monthly_limit: 220000000,
        created_at: daysAgo(47),
    },
    {
        id: 'wallet-apx-commission',
        key: 'apexpay-commission',
        owner_name: 'ApexPay Vendor HQ',
        owner_level: 'Vendor Admin',
        type: 'commission',
        balance: 17000000,
        is_locked: false,
        daily_limit: 8000000,
        daily_spent: 1250000,
        monthly_limit: 80000000,
        created_at: daysAgo(46),
    },
    {
        id: 'wallet-lagos-settlement',
        key: 'lagos-settlement',
        owner_name: 'Lagos Distribution Network',
        owner_level: 'Sub-vendor',
        type: 'settlement',
        balance: 31800000,
        is_locked: false,
        daily_limit: 15000000,
        daily_spent: 4200000,
        monthly_limit: 140000000,
        created_at: daysAgo(34),
    },
    {
        id: 'wallet-lagos-collection',
        key: 'lagos-collection',
        owner_name: 'Lagos Distribution Network',
        owner_level: 'Sub-vendor',
        type: 'collection',
        balance: 15500000,
        is_locked: false,
        daily_limit: 10000000,
        daily_spent: 3100000,
        monthly_limit: 90000000,
        created_at: daysAgo(31),
    },
    {
        id: 'wallet-ikeja-trading',
        key: 'ikeja-trading',
        owner_name: 'Ikeja Express Agent',
        owner_level: 'Agent',
        type: 'trading',
        balance: 5200000,
        is_locked: false,
        daily_limit: 4500000,
        daily_spent: 900000,
        monthly_limit: 45000000,
        created_at: daysAgo(22),
    },
    {
        id: 'wallet-ikeja-commission',
        key: 'ikeja-commission',
        owner_name: 'Ikeja Express Agent',
        owner_level: 'Agent',
        type: 'commission',
        balance: 1100000,
        is_locked: false,
        daily_limit: 1500000,
        daily_spent: 210000,
        monthly_limit: 12000000,
        created_at: daysAgo(21),
    },
    {
        id: 'wallet-counter-01',
        key: 'counter-01-till',
        owner_name: 'Counter 01 - Ikeja',
        owner_level: 'Cashier',
        type: 'collection',
        balance: 1150000,
        is_locked: false,
        daily_limit: 2500000,
        daily_spent: 540000,
        monthly_limit: 18000000,
        created_at: daysAgo(12),
    },
    {
        id: 'wallet-northbridge-settlement',
        key: 'northbridge-settlement',
        owner_name: 'Northbridge Commerce HQ',
        owner_level: 'Vendor Admin',
        type: 'settlement',
        balance: 76500000,
        is_locked: false,
        daily_limit: 28000000,
        daily_spent: 5200000,
        monthly_limit: 250000000,
        created_at: daysAgo(42),
    },
    {
        id: 'wallet-rivermart-settlement',
        key: 'rivermart-settlement',
        owner_name: 'RiverMart Distribution HQ',
        owner_level: 'Vendor Admin',
        type: 'settlement',
        balance: 28400000,
        is_locked: true,
        daily_limit: 12000000,
        daily_spent: 0,
        monthly_limit: 95000000,
        created_at: daysAgo(36),
    },
];

const TRANSACTIONS: WalletTransaction[] = [
    {
        id: 'txn-001',
        wallet_id: 'wallet-apx-settlement',
        wallet_key: 'apexpay-settlement',
        vendor_name: 'ApexPay Vendor HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'settlement',
        type: 'credit',
        category: 'Wallet Funding',
        amount: 12500000,
        reference: 'WLT-APX-001',
        description: 'Main wallet funding',
        counterparty: 'Platform Settlement',
        status: 'success',
        balance_after: 126500000,
        created_at: daysAgo(0, 1),
    },
    {
        id: 'txn-002',
        wallet_id: 'wallet-apx-settlement',
        wallet_key: 'apexpay-settlement',
        vendor_name: 'ApexPay Vendor HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'settlement',
        type: 'debit',
        category: 'Transfer',
        amount: 6800000,
        reference: 'WLT-APX-002',
        description: 'Transfer to Lagos Distribution Network',
        counterparty: 'Lagos Distribution Network',
        status: 'success',
        balance_after: 119700000,
        created_at: daysAgo(0, 2),
    },
    {
        id: 'txn-003',
        wallet_id: 'wallet-apx-ops',
        wallet_key: 'apexpay-operations',
        vendor_name: 'ApexPay Vendor HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'operations',
        type: 'debit',
        category: 'Bill Payment',
        amount: 1850000,
        reference: 'WLT-APX-003',
        description: 'Bulk bill settlement',
        counterparty: 'Utility Switch',
        status: 'success',
        balance_after: 38950000,
        created_at: daysAgo(1),
    },
    {
        id: 'txn-004',
        wallet_id: 'wallet-apx-commission',
        wallet_key: 'apexpay-commission',
        vendor_name: 'ApexPay Vendor HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'commission',
        type: 'credit',
        category: 'Commission',
        amount: 245000,
        reference: 'WLT-APX-004',
        description: 'Weekly commission settlement',
        counterparty: 'System',
        status: 'success',
        balance_after: 17000000,
        created_at: daysAgo(1, 3),
    },
    {
        id: 'txn-005',
        wallet_id: 'wallet-lagos-settlement',
        wallet_key: 'lagos-settlement',
        vendor_name: 'Lagos Distribution Network',
        vendor_level: 'Sub-vendor',
        wallet_type: 'settlement',
        type: 'credit',
        category: 'Transfer In',
        amount: 6800000,
        reference: 'WLT-LAG-001',
        description: 'Funding from ApexPay Vendor HQ',
        counterparty: 'ApexPay Vendor HQ',
        status: 'success',
        balance_after: 31800000,
        created_at: daysAgo(0, 2),
    },
    {
        id: 'txn-006',
        wallet_id: 'wallet-lagos-collection',
        wallet_key: 'lagos-collection',
        vendor_name: 'Lagos Distribution Network',
        vendor_level: 'Sub-vendor',
        wallet_type: 'collection',
        type: 'credit',
        category: 'Collection',
        amount: 920000,
        reference: 'WLT-LAG-002',
        description: 'Cash collection from agents',
        counterparty: 'Agent Network',
        status: 'pending',
        balance_after: 15500000,
        created_at: daysAgo(2),
    },
    {
        id: 'txn-007',
        wallet_id: 'wallet-lagos-settlement',
        wallet_key: 'lagos-settlement',
        vendor_name: 'Lagos Distribution Network',
        vendor_level: 'Sub-vendor',
        wallet_type: 'settlement',
        type: 'debit',
        category: 'Transfer',
        amount: 2500000,
        reference: 'WLT-LAG-003',
        description: 'Transfer to Ikeja Express Agent',
        counterparty: 'Ikeja Express Agent',
        status: 'success',
        balance_after: 29300000,
        created_at: daysAgo(2, 4),
    },
    {
        id: 'txn-008',
        wallet_id: 'wallet-ikeja-trading',
        wallet_key: 'ikeja-trading',
        vendor_name: 'Ikeja Express Agent',
        vendor_level: 'Agent',
        wallet_type: 'trading',
        type: 'credit',
        category: 'Transfer In',
        amount: 2500000,
        reference: 'WLT-IKJ-001',
        description: 'Agent float funding',
        counterparty: 'Lagos Distribution Network',
        status: 'success',
        balance_after: 5200000,
        created_at: daysAgo(2, 4),
    },
    {
        id: 'txn-009',
        wallet_id: 'wallet-ikeja-trading',
        wallet_key: 'ikeja-trading',
        vendor_name: 'Ikeja Express Agent',
        vendor_level: 'Agent',
        wallet_type: 'trading',
        type: 'debit',
        category: 'Airtime Purchase',
        amount: 185000,
        reference: 'WLT-IKJ-002',
        description: 'Airtime vending',
        counterparty: 'VTU Provider',
        status: 'success',
        balance_after: 5015000,
        created_at: daysAgo(3),
    },
    {
        id: 'txn-010',
        wallet_id: 'wallet-ikeja-trading',
        wallet_key: 'ikeja-trading',
        vendor_name: 'Ikeja Express Agent',
        vendor_level: 'Agent',
        wallet_type: 'trading',
        type: 'debit',
        category: 'Data Bundle',
        amount: 92000,
        reference: 'WLT-IKJ-003',
        description: 'Customer data bundle',
        counterparty: 'Data Switch',
        status: 'pending',
        balance_after: 4923000,
        created_at: daysAgo(3, 5),
    },
    {
        id: 'txn-011',
        wallet_id: 'wallet-ikeja-commission',
        wallet_key: 'ikeja-commission',
        vendor_name: 'Ikeja Express Agent',
        vendor_level: 'Agent',
        wallet_type: 'commission',
        type: 'credit',
        category: 'Commission',
        amount: 68000,
        reference: 'WLT-IKJ-004',
        description: 'Agent commission',
        counterparty: 'System',
        status: 'success',
        balance_after: 1100000,
        created_at: daysAgo(4),
    },
    {
        id: 'txn-012',
        wallet_id: 'wallet-counter-01',
        wallet_key: 'counter-01-till',
        vendor_name: 'Counter 01 - Ikeja',
        vendor_level: 'Cashier',
        wallet_type: 'collection',
        type: 'credit',
        category: 'Cash Collection',
        amount: 540000,
        reference: 'WLT-CSH-001',
        description: 'Till cash collection',
        counterparty: 'Walk-in Customers',
        status: 'success',
        balance_after: 1150000,
        created_at: daysAgo(4, 2),
    },
    {
        id: 'txn-013',
        wallet_id: 'wallet-counter-01',
        wallet_key: 'counter-01-till',
        vendor_name: 'Counter 01 - Ikeja',
        vendor_level: 'Cashier',
        wallet_type: 'collection',
        type: 'debit',
        category: 'Bill Payment',
        amount: 46000,
        reference: 'WLT-CSH-002',
        description: 'Electricity token purchase',
        counterparty: 'Utility Switch',
        status: 'success',
        balance_after: 1104000,
        created_at: daysAgo(5),
    },
    {
        id: 'txn-014',
        wallet_id: 'wallet-northbridge-settlement',
        wallet_key: 'northbridge-settlement',
        vendor_name: 'Northbridge Commerce HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'settlement',
        type: 'credit',
        category: 'Wallet Funding',
        amount: 8900000,
        reference: 'WLT-NBG-001',
        description: 'Settlement top-up',
        counterparty: 'Bank Transfer',
        status: 'success',
        balance_after: 76500000,
        created_at: daysAgo(5, 4),
    },
    {
        id: 'txn-015',
        wallet_id: 'wallet-northbridge-settlement',
        wallet_key: 'northbridge-settlement',
        vendor_name: 'Northbridge Commerce HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'settlement',
        type: 'debit',
        category: 'Transfer',
        amount: 3100000,
        reference: 'WLT-NBG-002',
        description: 'Regional float transfer',
        counterparty: 'Kano Wholesale Network',
        status: 'success',
        balance_after: 73400000,
        created_at: daysAgo(6),
    },
    {
        id: 'txn-016',
        wallet_id: 'wallet-rivermart-settlement',
        wallet_key: 'rivermart-settlement',
        vendor_name: 'RiverMart Distribution HQ',
        vendor_level: 'Vendor Admin',
        wallet_type: 'settlement',
        type: 'credit',
        category: 'Wallet Funding',
        amount: 4200000,
        reference: 'WLT-RVM-001',
        description: 'Manual settlement funding',
        counterparty: 'Bank Transfer',
        status: 'failed',
        balance_after: 28400000,
        created_at: daysAgo(7),
    },
];

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const WalletManagement: React.FC = () => {
    const [wallets] = useState<Wallet[]>(WALLETS);
    const [transactions] = useState<WalletTransaction[]>(TRANSACTIONS);
    const [searchTerm, setSearchTerm] = useState('');
    const [transactionType, setTransactionType] = useState<TransactionType | 'all'>('all');
    const [walletType, setWalletType] = useState<WalletType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

    const filteredTransactions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return transactions.filter((tx) => {
            const matchesSearch =
                !term ||
                tx.reference.toLowerCase().includes(term) ||
                tx.vendor_name.toLowerCase().includes(term) ||
                tx.wallet_key.toLowerCase().includes(term) ||
                tx.description.toLowerCase().includes(term) ||
                tx.counterparty.toLowerCase().includes(term);

            const matchesTransactionType = transactionType === 'all' || tx.type === transactionType;
            const matchesWalletType = walletType === 'all' || tx.wallet_type === walletType;
            const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;

            const created = new Date(tx.created_at).getTime();
            const matchesStart = !startDate || created >= new Date(`${startDate}T00:00:00`).getTime();
            const matchesEnd = !endDate || created <= new Date(`${endDate}T23:59:59`).getTime();

            return matchesSearch && matchesTransactionType && matchesWalletType && matchesStatus && matchesStart && matchesEnd;
        });
    }, [endDate, searchTerm, startDate, statusFilter, transactionType, transactions, walletType]);

    const paginatedTransactions = useMemo(
        () => filteredTransactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredTransactions, page, rowsPerPage]
    );

    const walletBalance = useMemo(() => wallets.reduce((sum, wallet) => sum + wallet.balance, 0), [wallets]);
    const creditBalance = useMemo(
        () => filteredTransactions.filter((tx) => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0),
        [filteredTransactions]
    );
    const debitBalance = useMemo(
        () => filteredTransactions.filter((tx) => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0),
        [filteredTransactions]
    );
    const netBalance = creditBalance - debitBalance;

    const activeWallets = wallets.filter((wallet) => !wallet.is_locked).length;
    const lockedWallets = wallets.filter((wallet) => wallet.is_locked).length;

    const selectedWalletTransactions = selectedWallet
        ? transactions.filter((tx) => tx.wallet_id === selectedWallet.id)
        : [];

    const resetFilters = () => {
        setSearchTerm('');
        setTransactionType('all');
        setWalletType('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(0);
    };

    const exportTransactions = useCallback(() => {
        if (typeof document === 'undefined') return;

        const headers = [
            'Date',
            'Reference',
            'Vendor',
            'Vendor Level',
            'Wallet Key',
            'Wallet Type',
            'Transaction Type',
            'Category',
            'Amount',
            'Counterparty',
            'Status',
            'Balance After',
            'Description',
        ];

        const rows = filteredTransactions.map((tx) => [
            formatDateTime(tx.created_at),
            tx.reference,
            tx.vendor_name,
            tx.vendor_level,
            tx.wallet_key,
            walletTypeLabel(tx.wallet_type),
            tx.type,
            tx.category,
            tx.amount,
            tx.counterparty,
            tx.status,
            tx.balance_after,
            tx.description,
        ]);

        const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `wallet-transactions-${startDate || 'all'}-${endDate || 'all'}-${transactionType}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setSuccess(`Exported ${filteredTransactions.length} wallet transactions`);
    }, [endDate, filteredTransactions, startDate, transactionType]);

    const handleFilterChange = (action: () => void) => {
        action();
        setPage(0);
    };

    return (
        <Box
            p={{ xs: 2, md: 3 }}
            sx={{
                '@keyframes tableSlideIn': {
                    from: { opacity: 0, transform: 'translateX(-24px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                },
                '@keyframes cardRise': {
                    from: { opacity: 0, transform: 'translateY(14px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
            }}
        >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Wallet Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        All vendor wallets and filtered wallet transactions - updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={() => setLastUpdated(new Date())}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<Download />} onClick={exportTransactions} disabled={!filteredTransactions.length}>
                        Export
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1, animation: 'cardRise 260ms ease' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Wallet Balance</Typography>
                                    <Typography variant="h5" fontWeight={700}>{formatCurrency(walletBalance)}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {activeWallets} active, {lockedWallets} locked
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                                    <AccountBalanceWallet />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1, animation: 'cardRise 300ms ease' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Credit Balance</Typography>
                                    <Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(creditBalance)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Filtered credits</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                                    <TrendingUp />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1, animation: 'cardRise 340ms ease' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Debit Balance</Typography>
                                    <Typography variant="h5" fontWeight={700} color="error.main">{formatCurrency(debitBalance)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Filtered debits</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                                    <TrendingDown />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1, animation: 'cardRise 380ms ease' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Net Total</Typography>
                                    <Typography variant="h5" fontWeight={700} color={netBalance >= 0 ? 'success.main' : 'error.main'}>
                                        {formatCurrency(netBalance)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {filteredTransactions.length} filtered records
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                                    <History />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search reference, vendor, wallet"
                                value={searchTerm}
                                onChange={(event) => handleFilterChange(() => setSearchTerm(event.target.value))}
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
                                <InputLabel>Credit/Debit</InputLabel>
                                <Select
                                    value={transactionType}
                                    label="Credit/Debit"
                                    onChange={(event) => handleFilterChange(() => setTransactionType(event.target.value as TransactionType | 'all'))}
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="credit">Credit</MenuItem>
                                    <MenuItem value="debit">Debit</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Wallet Type</InputLabel>
                                <Select
                                    value={walletType}
                                    label="Wallet Type"
                                    onChange={(event) => handleFilterChange(() => setWalletType(event.target.value as WalletType | 'all'))}
                                >
                                    <MenuItem value="all">All Wallets</MenuItem>
                                    <MenuItem value="settlement">Settlement</MenuItem>
                                    <MenuItem value="operations">Operations</MenuItem>
                                    <MenuItem value="commission">Commission</MenuItem>
                                    <MenuItem value="collection">Collection</MenuItem>
                                    <MenuItem value="trading">Trading</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(event) => handleFilterChange(() => setStatusFilter(event.target.value as TransactionStatus | 'all'))}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="success">Success</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Start Date"
                                value={startDate}
                                onChange={(event) => handleFilterChange(() => setStartDate(event.target.value))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="End Date"
                                value={endDate}
                                onChange={(event) => handleFilterChange(() => setEndDate(event.target.value))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                <Chip label={`${filteredTransactions.length} transactions`} color="primary" variant="outlined" />
                                <Chip label={`Credit: ${formatCurrency(creditBalance)}`} color="success" variant="outlined" />
                                <Chip label={`Debit: ${formatCurrency(debitBalance)}`} color="error" variant="outlined" />
                                <Button size="small" onClick={resetFilters}>Reset Filters</Button>
                                <Button size="small" startIcon={<Download />} onClick={exportTransactions} disabled={!filteredTransactions.length}>
                                    Export Filtered
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, animation: 'tableSlideIn 340ms ease' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                            <Box>
                                <Typography variant="h6">Wallet Transactions</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Showing {filteredTransactions.length ? page * rowsPerPage + 1 : 0}-
                                    {Math.min(filteredTransactions.length, page * rowsPerPage + rowsPerPage)} of {filteredTransactions.length}
                                </Typography>
                            </Box>
                            <Chip label={`${rowsPerPage} per page`} variant="outlined" />
                        </Stack>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Vendor</TableCell>
                                        <TableCell>Wallet</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Balance After</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedTransactions.map((tx) => (
                                        <TableRow key={tx.id} hover>
                                            <TableCell>{formatDateTime(tx.created_at)}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{tx.reference}</Typography>
                                                <Typography variant="caption" color="text.secondary">{tx.counterparty}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2">{tx.vendor_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{tx.vendor_level}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{tx.wallet_key}</Typography>
                                                <Chip label={walletTypeLabel(tx.wallet_type)} size="small" color={chipColor(tx.wallet_type)} variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={tx.type}
                                                    size="small"
                                                    color={chipColor(tx.type)}
                                                    icon={tx.type === 'credit' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                                                />
                                            </TableCell>
                                            <TableCell>{tx.category}</TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight={700} color={tx.type === 'credit' ? 'success.main' : 'error.main'}>
                                                    {tx.type === 'credit' ? '+' : '-'}
                                                    {formatCurrency(tx.amount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(tx.balance_after)}</TableCell>
                                            <TableCell>
                                                <Chip label={tx.status} size="small" color={chipColor(tx.status)} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={filteredTransactions.length}
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
                </Grid>

                {/* <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 1 }}>
                        <CardContent>
                            <Typography variant="h6" mb={2}>Wallet Balances</Typography>
                            <Stack spacing={1.5}>
                                {wallets.map((wallet) => (
                                    <Paper key={wallet.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="subtitle2">{wallet.owner_name}</Typography>
                                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                                    {wallet.key}
                                                </Typography>
                                                <Stack direction="row" spacing={1} mt={0.75} flexWrap="wrap">
                                                    <Chip label={walletTypeLabel(wallet.type)} size="small" variant="outlined" />
                                                    <Chip
                                                        label={wallet.is_locked ? 'Locked' : 'Active'}
                                                        size="small"
                                                        color={wallet.is_locked ? 'error' : 'success'}
                                                        icon={wallet.is_locked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                                                    />
                                                </Stack>
                                            </Box>

                                            <Stack alignItems="flex-end" spacing={0.5}>
                                                <Typography variant="subtitle2">{formatCurrency(wallet.balance)}</Typography>
                                                <Tooltip title="View wallet details">
                                                    <IconButton size="small" onClick={() => setSelectedWallet(wallet)}>
                                                        <Info fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid> */}
            </Grid>

            <Dialog open={Boolean(selectedWallet)} onClose={() => setSelectedWallet(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AccountBalanceWallet color="primary" />
                        <Typography variant="h6">Wallet Details</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedWallet && (
                        <Stack spacing={3} mt={1}>
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
                                <Typography variant="caption">Wallet Balance</Typography>
                                <Typography variant="h4" fontWeight={700}>{formatCurrency(selectedWallet.balance)}</Typography>
                                <Typography variant="body2">{selectedWallet.owner_name}</Typography>
                            </Paper>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">Wallet Key</Typography>
                                    <Typography fontFamily="monospace">{selectedWallet.key}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">Wallet Type</Typography>
                                    <Box mt={0.5}>
                                        <Chip label={walletTypeLabel(selectedWallet.type)} color={chipColor(selectedWallet.type)} />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">Daily Limit</Typography>
                                    <Typography>{formatCurrency(selectedWallet.daily_limit)}</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, (selectedWallet.daily_spent / selectedWallet.daily_limit) * 100)}
                                        sx={{ mt: 1, borderRadius: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">Monthly Limit</Typography>
                                    <Typography>{formatCurrency(selectedWallet.monthly_limit)}</Typography>
                                </Grid>
                            </Grid>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                                    Wallet Transactions ({selectedWalletTransactions.length})
                                </Typography>
                                <Stack spacing={1}>
                                    {selectedWalletTransactions.slice(0, 5).map((tx) => (
                                        <Paper key={tx.id} variant="outlined" sx={{ p: 1.5 }}>
                                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                                <Box>
                                                    <Typography variant="subtitle2">{tx.reference}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {tx.category} - {formatDateTime(tx.created_at)}
                                                    </Typography>
                                                </Box>
                                                <Typography fontWeight={700} color={tx.type === 'credit' ? 'success.main' : 'error.main'}>
                                                    {tx.type === 'credit' ? '+' : '-'}
                                                    {formatCurrency(tx.amount)}
                                                </Typography>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedWallet(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(success)}
                autoHideDuration={3000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WalletManagement;