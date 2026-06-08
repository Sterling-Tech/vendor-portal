import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {
    AccountBalanceWallet,
    Download,
    Receipt,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    TrendingDown,
    TrendingUp,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';

type TransactionStatus = 'success' | 'pending' | 'failed';
type TransactionDirection = 'credit' | 'debit';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type Transaction = {
    id: string;
    reference: string;
    status: TransactionStatus;
    org_name: string;
    wallet_key: string;
    category: string;
    channel: string;
    direction: TransactionDirection;
    value: number;
    created_at: string;
};

type LedgerEntry = {
    id: string;
    ledger_ref: string;
    transaction_ref: string;
    account: string;
    org_name: string;
    wallet_key: string;
    direction: TransactionDirection;
    amount: number;
    balance_after: number;
    narration: string;
    status: TransactionStatus;
    created_at: string;
};

type LedgerSummary = {
    total_debits: number;
    total_credits: number;
};

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const formatDateTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
};

const statusColor = (status: string): ChipColor => {
    if (status === 'success') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'failed') return 'error';
    return 'default';
};

const directionColor = (direction: string): ChipColor => {
    if (direction === 'credit') return 'success';
    if (direction === 'debit') return 'error';
    return 'default';
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const API_BASE_URL = 'http://188.166.161.13:8061/vendor';

const buildHeaders = (): HeadersInit => {
    const token =
        typeof window !== 'undefined'
            ? localStorage.getItem('token') ||
              localStorage.getItem('access_token') ||
              localStorage.getItem('accessToken')
            : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const TransactionManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);

    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all');

    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 14);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(fmt(past));
    const [endDate, setEndDate] = useState(fmt(tomorrow));

    // Transaction pagination state (0-indexed for MUI, 1-indexed for API)
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(5);
    const [transactionTotal, setTransactionTotal] = useState(0);

    // Ledger pagination state
    const [ledgerPage, setLedgerPage] = useState(0);
    const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(5);
    const [ledgerTotal, setLedgerTotal] = useState(0);

    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [success, setSuccess] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<LedgerSummary>({ total_debits: 0, total_credits: 0 });

    // ─── Fetch transactions (server-side page) ────────────────────────────────
    const fetchTransactions = useCallback(
        async (page: number, pageSize: number) => {
            if (!startDate || !endDate) return;
            try {
                setLoading(true);
                const url =
                    `${API_BASE_URL}/transactions/?start_date=${startDate}&end_date=${endDate}` +
                    `&vendor_id=${user?.id}&page=${page + 1}&page_size=${pageSize}`;

                const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
                if (!res.ok) throw new Error('Transaction API failed');
                const data = await res.json();

                // API returns { count, next, previous, results }
                setTransactionTotal(data.count ?? 0);

                const mapped: Transaction[] = (data.results ?? []).map((item: any) => ({
                    id: item.transaction_ref,
                    reference: item.transaction_ref,
                    status: item.status || 'success',
                    org_name: item.vendor_name || item.org_name || 'Vendor',
                    wallet_key: item.wallet_key || '-',
                    category: item.category || 'Transaction',
                    channel: item.channel || '-',
                    direction: Number(item.amount) >= 0 ? 'credit' : 'debit',
                    value: Math.abs(Number(item.amount || 0)),
                    created_at: item.timestamp,
                }));

                setTransactions(mapped);
            } catch (err) {
                console.error('Transaction fetch error:', err);
            } finally {
                setLoading(false);
            }
        },
        [startDate, endDate, user?.id]
    );

    // ─── Fetch ledger (server-side page) ──────────────────────────────────────
    const fetchLedger = useCallback(
        async (page: number, pageSize: number) => {
            if (!startDate || !endDate) return;
            try {
                setLoading(true);
                const url =
                    `${API_BASE_URL}/ledger/?start_date=${startDate}&end_date=${endDate}` +
                    `&vendor_id=${user?.id}&page=${page + 1}&page_size=${pageSize}`;

                const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
                if (!res.ok) throw new Error('Ledger API failed');
                const data = await res.json();

                setLedgerTotal(data.count ?? 0);

                const mapped: LedgerEntry[] = (data.results ?? []).map((item: any, index: number) => ({
                    id: item.transaction_ref || `ledger-${index}`,
                    ledger_ref: item.ledger_ref || `LEDGER-${index + 1}`,
                    transaction_ref: item.transaction_ref,
                    account: item.account || '-',
                    org_name: item.vendor_name || item.org_name || 'Vendor',
                    wallet_key: item.wallet_key || '-',
                    direction: Number(item.credit_amount) > 0 ? 'credit' : 'debit',
                    amount:
                        Number(item.credit_amount || 0) ||
                        Number(item.debit_amount || 0),
                    balance_after: Number(item.balance_after || 0),
                    narration: item.narration || '-',
                    status: item.status || 'success',
                    created_at: item.timestamp,
                }));

                setLedgerEntries(mapped);

                setSummary({
                    total_credits: Number(data.summary?.total_credits || 0),
                    total_debits: Number(data.summary?.total_debits || 0),
                });

                setLastUpdated(new Date());
            } catch (err) {
                console.error('Ledger fetch error:', err);
            } finally {
                setLoading(false);
            }
        },
        [startDate, endDate, user?.id]
    );

    // ─── Initial load & refetch when dates change ─────────────────────────────
    useEffect(() => {
        setTransactionPage(0);
        setLedgerPage(0);
        fetchTransactions(0, transactionRowsPerPage);
        fetchLedger(0, ledgerRowsPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, user?.id]);

    // ─── Transaction page / pageSize change ───────────────────────────────────
    const handleTransactionPageChange = (_: unknown, newPage: number) => {
        setTransactionPage(newPage);
        fetchTransactions(newPage, transactionRowsPerPage);
    };

    const handleTransactionRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = Number(event.target.value);
        setTransactionRowsPerPage(newSize);
        setTransactionPage(0);
        fetchTransactions(0, newSize);
    };

    // ─── Ledger page / pageSize change ────────────────────────────────────────
    const handleLedgerPageChange = (_: unknown, newPage: number) => {
        setLedgerPage(newPage);
        fetchLedger(newPage, ledgerRowsPerPage);
    };

    const handleLedgerRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = Number(event.target.value);
        setLedgerRowsPerPage(newSize);
        setLedgerPage(0);
        fetchLedger(0, newSize);
    };

    // ─── Client-side search/status/direction filter on current page ───────────
    const filteredTransactions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return transactions.filter((tx) => {
            const matchesSearch =
                !term ||
                tx.reference.toLowerCase().includes(term) ||
                tx.org_name.toLowerCase().includes(term) ||
                tx.wallet_key.toLowerCase().includes(term) ||
                tx.category.toLowerCase().includes(term) ||
                tx.channel.toLowerCase().includes(term);
            const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
            const matchesDirection = directionFilter === 'all' || tx.direction === directionFilter;
            return matchesSearch && matchesStatus && matchesDirection;
        });
    }, [transactions, searchTerm, statusFilter, directionFilter]);

    const filteredLedger = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return ledgerEntries.filter((entry) => {
            const matchesSearch =
                !term ||
                entry.ledger_ref.toLowerCase().includes(term) ||
                entry.transaction_ref.toLowerCase().includes(term) ||
                entry.account.toLowerCase().includes(term) ||
                entry.org_name.toLowerCase().includes(term) ||
                entry.wallet_key.toLowerCase().includes(term) ||
                entry.narration.toLowerCase().includes(term);
            return matchesSearch;
        });
    }, [ledgerEntries, searchTerm]);

    // ─── Refresh button ───────────────────────────────────────────────────────
    const handleRefresh = () => {
        fetchTransactions(transactionPage, transactionRowsPerPage);
        fetchLedger(ledgerPage, ledgerRowsPerPage);
    };

    // ─── Reset filters ────────────────────────────────────────────────────────
    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDirectionFilter('all');
        setStartDate(fmt(past));
        setEndDate(fmt(tomorrow));
        setTransactionPage(0);
        setLedgerPage(0);
    };

    // ─── Export ───────────────────────────────────────────────────────────────
    const exportRows = useCallback(() => {
        const isLedger = tabValue === 1;
        const headers = isLedger
            ? ['Date', 'Ledger Ref', 'Transaction Ref', 'Account', 'Organisation', 'Wallet', 'Direction', 'Amount', 'Balance After', 'Status', 'Narration']
            : ['Date', 'Reference', 'Organisation', 'Wallet', 'Direction', 'Category', 'Channel', 'Amount', 'Status'];

        const rows = isLedger
            ? filteredLedger.map((e) => [
                  formatDateTime(e.created_at), e.ledger_ref, e.transaction_ref,
                  e.account, e.org_name, e.wallet_key, e.direction,
                  e.amount, e.balance_after, e.status, e.narration,
              ])
            : filteredTransactions.map((tx) => [
                  formatDateTime(tx.created_at), tx.reference, tx.org_name,
                  tx.wallet_key, tx.direction, tx.category, tx.channel,
                  tx.value, tx.status,
              ]);

        const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${isLedger ? 'transaction-ledger' : 'transactions'}-${startDate}-${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setSuccess(`Exported ${rows.length} ${isLedger ? 'ledger entries' : 'transactions'} (current page)`);
    }, [tabValue, filteredLedger, filteredTransactions, startDate, endDate]);

    const totalCredits = Number(summary.total_credits || 0);
    const totalDebits = Number(summary.total_debits || 0);
    const netSum = totalCredits - totalDebits;

    const handleFilterChange = (action: () => void) => {
        action();
        setTransactionPage(0);
        setLedgerPage(0);
    };

    return (
        <Box p={{ xs: 2, md: 3 }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                spacing={2}
                mb={3}
            >
                <Box>
                    <Typography variant="h4">Transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Transaction records and ledger entries — updated {lastUpdated.toLocaleTimeString()}
                        {loading && ' · Loading…'}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<Download />} onClick={exportRows}>
                        Export
                    </Button>
                </Stack>
            </Stack>

            {/* Summary cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Total Credits</Typography>
                                    <Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(totalCredits)}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}><TrendingUp /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Total Debits</Typography>
                                    <Typography variant="h5" fontWeight={700} color="error.main">{formatCurrency(totalDebits)}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}><TrendingDown /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Net Sum</Typography>
                                    <Typography variant="h5" fontWeight={700} color={netSum >= 0 ? 'success.main' : 'error.main'}>
                                        {formatCurrency(netSum)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}><AccountBalanceWallet /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Records</Typography>
                                    <Typography variant="h5" fontWeight={700}>{transactionTotal}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ledgerTotal} ledger entries
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}><Receipt /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Card sx={{ mb: 3, borderRadius: 1 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth size="small"
                                placeholder="Search ref, org, wallet, category"
                                value={searchTerm}
                                onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter} label="Status"
                                    onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value as TransactionStatus | 'all'))}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="success">Success</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Credit/Debit</InputLabel>
                                <Select
                                    value={directionFilter} label="Credit/Debit"
                                    onChange={(e) => handleFilterChange(() => setDirectionFilter(e.target.value as TransactionDirection | 'all'))}
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="credit">Credit</MenuItem>
                                    <MenuItem value="debit">Debit</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth size="small" type="date" label="Start Date"
                                value={startDate}
                                onChange={(e) => handleFilterChange(() => setStartDate(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth size="small" type="date" label="End Date"
                                value={endDate}
                                onChange={(e) => handleFilterChange(() => setEndDate(e.target.value))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={1}>
                            <Button fullWidth onClick={resetFilters}>Reset</Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`${transactionTotal} transactions`} color="primary" variant="outlined" />
                                <Chip label={`${ledgerTotal} ledger rows`} color="info" variant="outlined" />
                                <Chip label={`Credits: ${formatCurrency(totalCredits)}`} color="success" variant="outlined" />
                                <Chip label={`Debits: ${formatCurrency(totalDebits)}`} color="error" variant="outlined" />
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tables */}
            <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                <Box px={2} pt={2}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
                        <Tab label={`Transactions (${transactionTotal})`} />
                        <Tab label={`Transaction Ledger (${ledgerTotal})`} />
                    </Tabs>
                </Box>

                {/* ── Transactions tab ── */}
                {tabValue === 0 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Page {transactionPage + 1} · showing {filteredTransactions.length} of {transactionRowsPerPage} per page · {transactionTotal} total
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Date / Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTransactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                {loading ? 'Loading…' : 'No transactions found'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTransactions.map((tx) => (
                                            <TableRow key={tx.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">{tx.reference}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{tx.channel}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={tx.status} size="small" color={statusColor(tx.status)} />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={tx.direction} size="small" color={directionColor(tx.direction)} />
                                                </TableCell>
                                                <TableCell>{tx.category}</TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight={700} color={tx.direction === 'credit' ? 'success.main' : 'error.main'}>
                                                        {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.value)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">{formatDateTime(tx.created_at)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* count = total from API so MUI knows there are more pages */}
                        <TablePagination
                            component="div"
                            count={transactionTotal}
                            page={transactionPage}
                            onPageChange={handleTransactionPageChange}
                            rowsPerPage={transactionRowsPerPage}
                            onRowsPerPageChange={handleTransactionRowsPerPageChange}
                            rowsPerPageOptions={[5,
                                //  10, 20, 50
                            ]}
                        />
                    </Box>
                )}

                {/* ── Ledger tab ── */}
                {tabValue === 1 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Page {ledgerPage + 1} · showing {filteredLedger.length} of {ledgerRowsPerPage} per page · {ledgerTotal} total
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ledger Ref</TableCell>
                                        <TableCell>Transaction Ref</TableCell>
                                        <TableCell>Organisation</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Date / Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredLedger.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                {loading ? 'Loading…' : 'No ledger entries found'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLedger.map((entry) => (
                                            <TableRow key={entry.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">{entry.ledger_ref}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{entry.narration}</Typography>
                                                </TableCell>
                                                <TableCell>{entry.transaction_ref}</TableCell>
                                                <TableCell>{entry.org_name}</TableCell>
                                                <TableCell>
                                                    <Chip label={entry.direction} size="small" color={directionColor(entry.direction)} />
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                                                <TableCell>
                                                    <Chip label={entry.status} size="small" color={statusColor(entry.status)} />
                                                </TableCell>
                                                <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={ledgerTotal}
                            page={ledgerPage}
                            onPageChange={handleLedgerPageChange}
                            rowsPerPage={ledgerRowsPerPage}
                            onRowsPerPageChange={handleLedgerRowsPerPageChange}
                            rowsPerPageOptions={[5, 10, 20, 50]}
                        />
                    </Box>
                )}
            </Paper>

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

export default TransactionManagement;