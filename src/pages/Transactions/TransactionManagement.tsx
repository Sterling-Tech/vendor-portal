import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
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

const daysAgo = (days: number, hours = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(date.getHours() - hours);
    return date.toISOString();
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

const TransactionManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all');
    const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 14);

  const format = (d: Date) => d.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(format(past));
  const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

  const [endDate, setEndDate] = useState(format(tomorrow));
    const [transactionPage, setTransactionPage] = useState(0);
    const [ledgerPage, setLedgerPage] = useState(0);
    const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(8);
    const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(8);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [success, setSuccess] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [vendorId, setVendorId] = useState<string>('1');
    const [summary, setSummary] = useState<LedgerSummary>({
        total_debits: 0,
        total_credits: 0,
    });
    const API_BASE_URL = 'http://188.166.161.13:8061/vendor';
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

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate) return;
    try {
        setLoading(true);

        const transactionUrl = `${API_BASE_URL}/transactions/?start_date=${startDate}&end_date=${endDate}&vendor_id=${user?.id}`;
        const ledgerUrl = `${API_BASE_URL}/ledger/?start_date=${startDate}&end_date=${endDate}&vendor_id=${user?.id}`;

        const [transactionRes, ledgerRes] = await Promise.all([
            fetch(transactionUrl, {
                method: 'GET',
                headers: buildHeaders(),
            }),
            fetch(ledgerUrl, {
                method: 'GET',
                headers: buildHeaders(),
            }),
        ]);

        // ❗ CHECK HTTP ERRORS
        if (!transactionRes.ok) throw new Error('Transaction API failed');
        if (!ledgerRes.ok) throw new Error('Ledger API failed');

        // ✅ PARSE JSON (THIS WAS MISSING)
        const transactionData = await transactionRes.json();
        const ledgerData = await ledgerRes.json();

        const transactionResults = transactionData?.results || [];
        const ledgerResults = ledgerData?.results || [];

        const mappedTransactions: Transaction[] = transactionResults.map(
            (item: any, index: number) => ({
                id: `${index}`,
                reference: item.transaction_ref,
                status: item.status || 'success',
                org_name: item.vendor_name || item.org_name || 'Vendor',
                wallet_key: item.wallet_key || '-',
                category: item.category || 'Transaction',
                channel: item.channel || '-',
                direction: Number(item.amount) >= 0 ? 'credit' : 'debit',
                value: Number(item.amount || 0),
                created_at: item.timestamp,
            })
        );

        const mappedLedger: LedgerEntry[] = ledgerResults.map(
            (item: any, index: number) => ({
                id: `${index}`,
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
            })
        );

        setTransactions(mappedTransactions);
        setLedgerEntries(mappedLedger);

        setSummary({
            total_credits: Number(ledgerData?.summary?.total_credits || 0),
            total_debits: Number(ledgerData?.summary?.total_debits || 0),
        });

        setLastUpdated(new Date());
    } catch (error) {
        console.error('Fetch error:', error);
    } finally {
        setLoading(false);
    }
}, [startDate, endDate, user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

            const created = new Date(tx.created_at).getTime();
            const matchesStart = !startDate || created >= new Date(`${startDate}T00:00:00`).getTime();
            const matchesEnd = !endDate || created <= new Date(`${endDate}T23:59:59`).getTime();

            return matchesSearch && matchesStatus && matchesDirection && matchesStart && matchesEnd;
        });
    }, [directionFilter, endDate, searchTerm, startDate, statusFilter]);

    const filteredLedger = useMemo(() => {
        const transactionRefs = new Set(filteredTransactions.map((tx) => tx.reference));
        const term = searchTerm.trim().toLowerCase();

        return ledgerEntries.filter((entry) => {
            const matchesTransactionFilter = transactionRefs.has(entry.transaction_ref);
            const matchesSearch =
                !term ||
                entry.ledger_ref.toLowerCase().includes(term) ||
                entry.transaction_ref.toLowerCase().includes(term) ||
                entry.account.toLowerCase().includes(term) ||
                entry.org_name.toLowerCase().includes(term) ||
                entry.wallet_key.toLowerCase().includes(term) ||
                entry.narration.toLowerCase().includes(term);

            return matchesTransactionFilter && matchesSearch;
        });
    }, [filteredTransactions, searchTerm]);

    const paginatedTransactions = useMemo(
        () =>
            filteredTransactions.slice(
                transactionPage * transactionRowsPerPage,
                transactionPage * transactionRowsPerPage + transactionRowsPerPage
            ),
        [filteredTransactions, transactionPage, transactionRowsPerPage]
    );

    const paginatedLedger = useMemo(
        () => filteredLedger.slice(ledgerPage * ledgerRowsPerPage, ledgerPage * ledgerRowsPerPage + ledgerRowsPerPage),
        [filteredLedger, ledgerPage, ledgerRowsPerPage]
    );

    const totalCredits = Number(summary.total_credits || 0);

    const totalDebits = Number(summary.total_debits || 0);

    const netSum = totalCredits - totalDebits;

    const totalTransactionsAmount =
        totalCredits + totalDebits;

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDirectionFilter('all');
        setStartDate('');
        setEndDate('');
        setTransactionPage(0);
        setLedgerPage(0);
    };

    const exportRows = useCallback(() => {
        const isLedger = tabValue === 1;
        const headers = isLedger
            ? ['Date', 'Ledger Ref', 'Transaction Ref', 'Account', 'Organisation', 'Wallet', 'Direction', 'Amount', 'Balance After', 'Status', 'Narration']
            : ['Date', 'Reference', 'Organisation', 'Wallet', 'Direction', 'Category', 'Channel', 'Amount', 'Status'];

        const rows = isLedger
            ? filteredLedger.map((entry) => [
                  formatDateTime(entry.created_at),
                  entry.ledger_ref,
                  entry.transaction_ref,
                  entry.account,
                  entry.org_name,
                  entry.wallet_key,
                  entry.direction,
                  entry.amount,
                  entry.balance_after,
                  entry.status,
                  entry.narration,
              ])
            : filteredTransactions.map((tx) => [
                  formatDateTime(tx.created_at),
                  tx.reference,
                  tx.org_name,
                  tx.wallet_key,
                  tx.direction,
                  tx.category,
                  tx.channel,
                  tx.value,
                  tx.status,
              ]);

        const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${isLedger ? 'transaction-ledger' : 'transactions'}-${startDate || 'all'}-${endDate || 'all'}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setSuccess(`Exported ${rows.length} ${isLedger ? 'ledger entries' : 'transactions'}`);
    }, [endDate, filteredLedger, filteredTransactions, startDate, tabValue]);

    const handleFilterChange = (action: () => void) => {
        action();
        setTransactionPage(0);
        setLedgerPage(0);
    };

    return (
        <Box p={{ xs: 2, md: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Transaction records and ledger entries - updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setLastUpdated(new Date())}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<Download />} onClick={exportRows}>
                        Export
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Total Credits</Typography>
                                    <Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(totalCredits)}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                                    <TrendingUp />
                                </Avatar>
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
                                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                                    <TrendingDown />
                                </Avatar>
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
                                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                                    <AccountBalanceWallet />
                                </Avatar>
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
                                    <Typography variant="h5" fontWeight={700}>{filteredTransactions.length}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {filteredLedger.length} ledger entries
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                                    <Receipt />
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
                                placeholder="Search ref, org, wallet, category"
                                value={searchTerm}
                                onChange={(event) => handleFilterChange(() => setSearchTerm(event.target.value))}
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

                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Credit/Debit</InputLabel>
                                <Select
                                    value={directionFilter}
                                    label="Credit/Debit"
                                    onChange={(event) => handleFilterChange(() => setDirectionFilter(event.target.value as TransactionDirection | 'all'))}
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="credit">Credit</MenuItem>
                                    <MenuItem value="debit">Debit</MenuItem>
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
                                onChange={(event) => handleFilterChange(() => setStartDate(event.target.value))}
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
                                onChange={(event) => handleFilterChange(() => setEndDate(event.target.value))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} md={1}>
                            <Button fullWidth onClick={resetFilters}>
                                Reset
                            </Button>
                        </Grid>

                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`${filteredTransactions.length} transactions`} color="primary" variant="outlined" />
                                <Chip label={`${filteredLedger.length} ledger rows`} color="info" variant="outlined" />
                                <Chip label={`Credits: ${formatCurrency(totalCredits)}`} color="success" variant="outlined" />
                                <Chip label={`Debits: ${formatCurrency(totalDebits)}`} color="error" variant="outlined" />
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                <Box px={2} pt={2}>
                    <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} variant="scrollable" scrollButtons="auto">
                        <Tab label={`Transactions (${filteredTransactions.length})`} />
                        <Tab label={`Transaction Ledger (${filteredLedger.length})`} />
                    </Tabs>
                </Box>

                {tabValue === 0 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Showing {filteredTransactions.length ? transactionPage * transactionRowsPerPage + 1 : 0}-
                            {Math.min(filteredTransactions.length, transactionPage * transactionRowsPerPage + transactionRowsPerPage)} of {filteredTransactions.length}
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Status Code</TableCell>
                                        <TableCell>Vendor Name</TableCell>
                                        <TableCell>Wallet</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Date</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedTransactions.map((tx) => (
                                        <TableRow key={tx.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{tx.reference}</Typography>
                                                <Typography variant="caption" color="text.secondary">{tx.channel}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={tx.status} size="small" color={statusColor(tx.status)} />
                                            </TableCell>
                                            <TableCell>{tx.org_name}</TableCell>
                                            <TableCell>{tx.wallet_key}</TableCell>
                                            <TableCell>
                                                <Chip label={tx.direction} size="small" color={directionColor(tx.direction)} />
                                            </TableCell>
                                            <TableCell>{tx.category}</TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight={700} color={tx.direction === 'credit' ? 'success.main' : 'error.main'}>
                                                    {tx.direction === 'credit' ? '+' : '-'}
                                                    {formatCurrency(tx.value)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatDateTime(tx.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={filteredTransactions.length}
                            page={transactionPage}
                            onPageChange={(_, nextPage) => setTransactionPage(nextPage)}
                            rowsPerPage={transactionRowsPerPage}
                            onRowsPerPageChange={(event) => {
                                setTransactionRowsPerPage(Number(event.target.value));
                                setTransactionPage(0);
                            }}
                            rowsPerPageOptions={[5, 8, 12, 20, 50]}
                        />
                    </Box>
                )}

                {tabValue === 1 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Showing {filteredLedger.length ? ledgerPage * ledgerRowsPerPage + 1 : 0}-
                            {Math.min(filteredLedger.length, ledgerPage * ledgerRowsPerPage + ledgerRowsPerPage)} of {filteredLedger.length}
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ledger Ref</TableCell>
                                        <TableCell>Transaction Ref</TableCell>
                                        <TableCell>Account</TableCell>
                                        <TableCell>Organisation</TableCell>
                                        <TableCell>Wallet</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Balance After</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Date</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedLedger.map((entry) => (
                                        <TableRow key={entry.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{entry.ledger_ref}</Typography>
                                                <Typography variant="caption" color="text.secondary">{entry.narration}</Typography>
                                            </TableCell>
                                            <TableCell>{entry.transaction_ref}</TableCell>
                                            <TableCell>{entry.account}</TableCell>
                                            <TableCell>{entry.org_name}</TableCell>
                                            <TableCell>{entry.wallet_key}</TableCell>
                                            <TableCell>
                                                <Chip label={entry.direction} size="small" color={directionColor(entry.direction)} />
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                                            <TableCell align="right">{formatCurrency(entry.balance_after)}</TableCell>
                                            <TableCell>
                                                <Chip label={entry.status} size="small" color={statusColor(entry.status)} />
                                            </TableCell>
                                            <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={filteredLedger.length}
                            page={ledgerPage}
                            onPageChange={(_, nextPage) => setLedgerPage(nextPage)}
                            rowsPerPage={ledgerRowsPerPage}
                            onRowsPerPageChange={(event) => {
                                setLedgerRowsPerPage(Number(event.target.value));
                                setLedgerPage(0);
                            }}
                            rowsPerPageOptions={[5, 8, 12, 20, 50]}
                        />
                    </Box>
                )}
            </Paper>

            <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TransactionManagement;
