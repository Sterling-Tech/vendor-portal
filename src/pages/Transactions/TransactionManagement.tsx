import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogContent, FormControl, Grid, IconButton, InputAdornment,
    InputLabel, MenuItem, Paper, Select, Snackbar, Stack,
    Tab, Table, TableBody, TableCell, TableContainer, TableHead,
    TablePagination, TableRow, Tabs, TextField, Typography, Tooltip,
} from '@mui/material';
import {
    AccountBalanceWallet, Assessment, Close, Download, Receipt,
    Refresh as RefreshIcon, Search as SearchIcon, TrendingDown, TrendingUp,
    CheckCircle, RadioButtonUnchecked, RestartAlt,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useAppSelector } from '../../store/hooks';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TransactionStatus = 'success' | 'pending' | 'failed';
type TransactionDirection = 'credit' | 'debit';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

// Transaction record — GET /vendor/transactions/
// Sample: { transaction_ref, amount, account_no, timestamp }
type Transaction = {
    id: string;
    reference: string;
    status: TransactionStatus;
    account_no: string;
    direction: TransactionDirection;
    value: number;
    created_at: string;
};

// Ledger record — GET /vendor/ledger/
// Sample: { transaction_ref, category, debit_amount, credit_amount, closing_balance, timestamp }
type LedgerEntry = {
    id: string;
    transaction_ref: string;
    category: string;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    created_at: string;
};
type LedgerSummary = { total_debits: number; total_credits: number };

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(value || 0));
const formatDateTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};
const statusColor = (s: string): ChipColor => s === 'success' ? 'success' : s === 'pending' ? 'warning' : s === 'failed' ? 'error' : 'default';
const directionColor = (d: string): ChipColor => d === 'credit' ? 'success' : d === 'debit' ? 'error' : 'default';
const categoryLabel = (c: string) => (c || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '—';
const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const API_BASE_URL = 'http://188.166.161.13:8061/vendor';
const buildHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('accessToken')
        : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// ─── Category options (used for ledger filter + report filter) ────────────────
const CATEGORY_OPTIONS = [
    { label: 'All Categories',      value: 'all' },
    { label: 'Vending',             value: 'vending' },
    { label: 'Wallet Funding',      value: 'wallet_funding' },
    { label: 'Wallet Debit',        value: 'wallet_debit' },
    { label: 'Wallet Credit',       value: 'wallet_credit' },
    { label: 'Payment Reversal',    value: 'payment_reversal' },
    { label: 'Commission',          value: 'commission' },
];

// ─── Report export column definitions ──────────────────────────────────────────
type ReportColumnKey = 'date' | 'reference' | 'category' | 'account_number' | 'debit' | 'credit' | 'closing_balance';
const REPORT_COLUMNS: { key: ReportColumnKey; label: string; header: string }[] = [
    { key: 'date',            label: 'Date',            header: 'Date' },
    { key: 'reference',       label: 'Reference',       header: 'Reference' },
    { key: 'category',        label: 'Category',        header: 'Category' },
    { key: 'account_number',  label: 'Account No.',     header: 'account_number' },
    { key: 'debit',           label: 'Debit',           header: 'Debit' },
    { key: 'credit',          label: 'Credit',           header: 'Credit' },
    { key: 'closing_balance', label: 'Closing Balance', header: 'closing_balance' },
];

// ─── Main component ─────────────────────────────────────────────────────────────
const TransactionManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);

    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const today = new Date();
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(today.getFullYear() - 1);
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(fmt(oneYearAgo));
    const [endDate, setEndDate] = useState(fmt(tomorrow));

    // pagination
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(5);
    const [transactionTotal, setTransactionTotal] = useState(0);
    const [ledgerPage, setLedgerPage] = useState(0);
    const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(5);
    const [ledgerTotal, setLedgerTotal] = useState(0);

    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [success, setSuccess] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<LedgerSummary>({ total_debits: 0, total_credits: 0 });

    // ── Generate Report dialog ───────────────────────────────────────────────────
    const [reportOpen, setReportOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportForm, setReportForm] = useState({
        start_date: fmt(oneYearAgo),
        end_date: fmt(tomorrow),
        category: 'all',
        // search filters against transaction_ref / account number
        search: '',
    });

    // Which export columns are included — defaults to all ON, user can toggle off/on
    const [reportColumns, setReportColumns] = useState<Record<ReportColumnKey, boolean>>({
        date: true, reference: true, category: true, account_number: true,
        debit: true, credit: true, closing_balance: true,
    });
    const toggleReportColumn = (key: ReportColumnKey) => setReportColumns(p => ({ ...p, [key]: !p[key] }));
    const resetReportColumns = () => setReportColumns({ date: true, reference: true, category: true, account_number: true, debit: true, credit: true, closing_balance: true });

    // ── Fetch transactions (server-side paginated) — GET /vendor/transactions/ ───
    const fetchTransactions = useCallback(async (page: number, pageSize: number) => {
        if (!startDate || !endDate) return;
        try {
            setLoading(true);
            const url = `${API_BASE_URL}/transactions/?start_date=${startDate}&end_date=${endDate}&vendor_id=${user?.id}&page=${page + 1}&page_size=${pageSize}`;
            const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
            if (!res.ok) throw new Error('Transaction API failed');
            const data = await res.json();
            setTransactionTotal(data.count ?? 0);
            const mapped: Transaction[] = (data.results ?? []).map((item: any) => ({
                id: item.transaction_ref,
                reference: item.transaction_ref,
                status: item.status || 'success',
                account_no: item.account_no ?? '',
                direction: Number(item.amount) >= 0 ? 'credit' : 'debit',
                value: Math.abs(Number(item.amount || 0)),
                created_at: item.timestamp,
            }));
            setTransactions(mapped);
        } catch (err) { console.error('Transaction fetch error:', err); }
        finally { setLoading(false); }
    }, [startDate, endDate, user?.id]);

    // ── Fetch ledger (server-side paginated) — GET /vendor/ledger/ ───────────────
    const fetchLedger = useCallback(async (page: number, pageSize: number) => {
        if (!startDate || !endDate) return;
        try {
            setLoading(true);
            const url = `${API_BASE_URL}/ledger/?start_date=${startDate}&end_date=${endDate}&vendor_id=${user?.id}&page=${page + 1}&page_size=${pageSize}`;
            const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
            if (!res.ok) throw new Error('Ledger API failed');
            const data = await res.json();
            setLedgerTotal(data.count ?? 0);
            const mapped: LedgerEntry[] = (data.results ?? []).map((item: any, index: number) => ({
                id: item.transaction_ref || `ledger-${index}`,
                transaction_ref: item.transaction_ref,
                category: item.category || '',
                debit_amount: Number(item.debit_amount || 0),
                credit_amount: Number(item.credit_amount || 0),
                closing_balance: Number(item.closing_balance || 0),
                created_at: item.timestamp,
            }));
            setLedgerEntries(mapped);
            setSummary({ total_credits: Number(data.summary?.total_credits || 0), total_debits: Number(data.summary?.total_debits || 0) });
            setLastUpdated(new Date());
        } catch (err) { console.error('Ledger fetch error:', err); }
        finally { setLoading(false); }
    }, [startDate, endDate, user?.id]);

    // ── Fetch ALL ledger pages for the report (loops through pagination) ─────────
    const fetchAllLedgerForReport = async (params: typeof reportForm): Promise<LedgerEntry[]> => {
        const allResults: LedgerEntry[] = [];
        let page = 1; let hasNext = true;
        while (hasNext) {
            const url = `${API_BASE_URL}/ledger/?start_date=${params.start_date}&end_date=${params.end_date}&vendor_id=${user?.id}&page=${page}&page_size=200`;
            const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
            if (!res.ok) throw new Error(`Ledger API failed (page ${page})`);
            const data = await res.json();
            const mapped: LedgerEntry[] = (data.results ?? []).map((item: any, index: number) => ({
                id: item.transaction_ref || `ledger-${page}-${index}`,
                transaction_ref: item.transaction_ref,
                category: item.category || '',
                debit_amount: Number(item.debit_amount || 0),
                credit_amount: Number(item.credit_amount || 0),
                closing_balance: Number(item.closing_balance || 0),
                created_at: item.timestamp,
            }));
            allResults.push(...mapped);
            hasNext = Boolean(data.next);
            page++;
            if (page > 50) break; // safety limit
        }
        return allResults;
    };

    // ── Fetch ALL transaction pages, just to build a transaction_ref → account_no map
    //    (the ledger API doesn't carry account numbers, so we merge it in for the report)
    const fetchAccountNumberMap = async (params: typeof reportForm): Promise<Record<string, string>> => {
        const map: Record<string, string> = {};
        let page = 1; let hasNext = true;
        while (hasNext) {
            const url = `${API_BASE_URL}/transactions/?start_date=${params.start_date}&end_date=${params.end_date}&vendor_id=${user?.id}&page=${page}&page_size=200`;
            const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
            if (!res.ok) break;
            const data = await res.json();
            (data.results ?? []).forEach((item: any) => {
                if (item.transaction_ref) map[item.transaction_ref] = item.account_no ?? '';
            });
            hasNext = Boolean(data.next);
            page++;
            if (page > 50) break;
        }
        return map;
    };

    useEffect(() => {
        setTransactionPage(0); setLedgerPage(0);
        fetchTransactions(0, transactionRowsPerPage);
        fetchLedger(0, ledgerRowsPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, user?.id]);

    const handleTransactionPageChange = (_: unknown, p: number) => { setTransactionPage(p); fetchTransactions(p, transactionRowsPerPage); };
    const handleTransactionRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const n = Number(e.target.value); setTransactionRowsPerPage(n); setTransactionPage(0); fetchTransactions(0, n); };
    const handleLedgerPageChange = (_: unknown, p: number) => { setLedgerPage(p); fetchLedger(p, ledgerRowsPerPage); };
    const handleLedgerRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const n = Number(e.target.value); setLedgerRowsPerPage(n); setLedgerPage(0); fetchLedger(0, n); };

    const filteredTransactions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return transactions.filter((tx) => {
            const matchesSearch = !term || tx.reference.toLowerCase().includes(term) || (tx.account_no || '').toLowerCase().includes(term);
            return matchesSearch && (statusFilter === 'all' || tx.status === statusFilter) && (directionFilter === 'all' || tx.direction === directionFilter);
        });
    }, [transactions, searchTerm, statusFilter, directionFilter]);

    const filteredLedger = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return ledgerEntries.filter((entry) => {
            const matchesSearch = !term || entry.transaction_ref.toLowerCase().includes(term) || entry.category.toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [ledgerEntries, searchTerm, categoryFilter]);

    const handleRefresh = () => { fetchTransactions(transactionPage, transactionRowsPerPage); fetchLedger(ledgerPage, ledgerRowsPerPage); };

    const resetFilters = () => { setSearchTerm(''); setStatusFilter('all'); setDirectionFilter('all'); setCategoryFilter('all'); setStartDate(fmt(oneYearAgo)); setEndDate(fmt(tomorrow)); setTransactionPage(0); setLedgerPage(0); };

    const exportRows = useCallback(() => {
        const isLedger = tabValue === 1;
        const headers = isLedger
            ? ['Date', 'Transaction Ref', 'Category', 'Debit', 'Credit', 'Closing Balance']
            : ['Date', 'Reference', 'Account No.', 'Type', 'Amount', 'Status'];
        const rows = isLedger
            ? filteredLedger.map((e) => [formatDateTime(e.created_at), e.transaction_ref, categoryLabel(e.category), e.debit_amount, e.credit_amount, e.closing_balance])
            : filteredTransactions.map((tx) => [formatDateTime(tx.created_at), tx.reference, tx.account_no, tx.direction, tx.value, tx.status]);
        const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${isLedger ? 'ledger' : 'transactions'}-${startDate}-${endDate}.csv`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        setSuccess(`Exported ${rows.length} ${isLedger ? 'ledger entries' : 'transactions'}`);
    }, [tabValue, filteredLedger, filteredTransactions, startDate, endDate]);

    // ─────────────────────────────────────────────────────────────────────────────
    // GENERATE REPORT — sourced from the Ledger API, with toggleable columns
    // ─────────────────────────────────────────────────────────────────────────────
    const handleGenerateReport = async () => {
        setGenerating(true); setReportError(null);
        try {
            // 1. Fetch all ledger pages
            let allEntries = await fetchAllLedgerForReport(reportForm);

            // 2. Client-side filters
            if (reportForm.category !== 'all') {
                allEntries = allEntries.filter(e => e.category === reportForm.category);
            }
            if (reportForm.search.trim()) {
                const term = reportForm.search.trim().toLowerCase();
                allEntries = allEntries.filter(e => e.transaction_ref.toLowerCase().includes(term));
            }

            if (allEntries.length === 0) {
                setReportError('No ledger entries match the selected filters. Try adjusting your criteria.');
                return;
            }

            // 3. Merge in account numbers if that column is included (always useful for "vend")
            let accountMap: Record<string, string> = {};
            if (reportColumns.account_number) {
                accountMap = await fetchAccountNumberMap(reportForm);
            }

            // 4. Build columns dynamically based on what's toggled on
            const activeColumns = REPORT_COLUMNS.filter(c => reportColumns[c.key]);
            if (activeColumns.length === 0) {
                setReportError('Select at least one column to include in the report.');
                return;
            }

            const buildRow = (e: LedgerEntry) => activeColumns.map(col => {
                switch (col.key) {
                    case 'date': return formatDateTime(e.created_at);
                    case 'reference': return e.transaction_ref;
                    case 'category': return categoryLabel(e.category);
                    case 'account_number': return accountMap[e.transaction_ref] || '';
                    case 'debit': return e.debit_amount || '';
                    case 'credit': return e.credit_amount || '';
                    case 'closing_balance': return e.closing_balance;
                    default: return '';
                }
            });

            // ── Meta info rows ──
            const meta = [
                ['TRANSACTION LEDGER REPORT'],
                [],
                ['Period',          `${reportForm.start_date}  →  ${reportForm.end_date}`],
                ['Generated',       new Date().toLocaleString()],
                ['Category',        CATEGORY_OPTIONS.find(c => c.value === reportForm.category)?.label || 'All'],
                ['Search Filter',   reportForm.search.trim() || 'None'],
                ['Total Records',   allEntries.length],
                [],
            ];

            const colHeaders = activeColumns.map(c => c.header);
            const dataRows = allEntries.map(buildRow);

            const totalCredit = allEntries.reduce((s, e) => s + e.credit_amount, 0);
            const totalDebit = allEntries.reduce((s, e) => s + e.debit_amount, 0);
            const pad = (arr: any[]) => [...arr, ...Array(Math.max(0, activeColumns.length - arr.length)).fill('')];
            const summaryRows = [
                [],
                pad(['SUMMARY']),
                pad(['Total Records', allEntries.length]),
                pad(['Total Credit', totalCredit]),
                pad(['Total Debit', totalDebit]),
                pad(['Net', totalCredit - totalDebit]),
            ];

            // 5. Assemble worksheet
            const wsData = [...meta, colHeaders, ...dataRows, ...summaryRows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = activeColumns.map(c => ({ wch: c.key === 'reference' ? 40 : c.key === 'closing_balance' ? 20 : 20 }));
            ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(activeColumns.length - 1, 0) } }];

            // 6. Second sheet: clean Summary
            const summarySheetData = [
                ['TRANSACTION LEDGER REPORT — SUMMARY'],
                [],
                ['Date Range',     `${reportForm.start_date} to ${reportForm.end_date}`],
                ['Category',       CATEGORY_OPTIONS.find(c => c.value === reportForm.category)?.label || 'All'],
                ['Generated At',   new Date().toLocaleString()],
                [],
                ['Metric', 'Value'],
                ['Total Records', allEntries.length],
                ['Total Credit', totalCredit],
                ['Total Debit', totalDebit],
                ['Net', totalCredit - totalDebit],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
            wsSummary['!cols'] = [{ wch: 26 }, { wch: 36 }];
            wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

            // 7. Build workbook & download
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            const fileName = `ledger-report-${reportForm.start_date}-to-${reportForm.end_date}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setSuccess(`✓ Report generated — ${allEntries.length} entries exported`);
            setReportOpen(false);
        } catch (err: any) {
            setReportError(err?.message || 'Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const resetReportForm = () => {
        setReportForm({ start_date: fmt(oneYearAgo), end_date: fmt(tomorrow), category: 'all', search: '' });
        resetReportColumns();
        setReportError(null);
    };

    const totalCredits = Number(summary.total_credits || 0);
    const totalDebits  = Number(summary.total_debits  || 0);
    const netSum = totalCredits - totalDebits;
    const handleFilterChange = (action: () => void) => { action(); setTransactionPage(0); setLedgerPage(0); };

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <Box p={{ xs: 2, md: 3 }}>
            {/* ── Page header ── */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Records &amp; ledger entries · updated {lastUpdated.toLocaleTimeString()}
                        {loading && ' · Loading…'}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>Refresh</Button>
                    <Button variant="outlined" startIcon={<Download />} onClick={exportRows}>Export</Button>
                    <Button
                        variant="contained"
                        startIcon={<Assessment />}
                        onClick={() => { setReportOpen(true); setReportError(null); }}
                        sx={{ bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                    >
                        Generate Report
                    </Button>
                </Stack>
            </Stack>

            {/* ── Summary cards ── */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="body2" color="text.secondary">Total Credits</Typography><Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(totalCredits)}</Typography></Box>
                                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}><TrendingUp /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="body2" color="text.secondary">Total Debits</Typography><Typography variant="h5" fontWeight={700} color="error.main">{formatCurrency(totalDebits)}</Typography></Box>
                                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}><TrendingDown /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="body2" color="text.secondary">Net Sum</Typography><Typography variant="h5" fontWeight={700} color={netSum >= 0 ? 'success.main' : 'error.main'}>{formatCurrency(netSum)}</Typography></Box>
                                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}><AccountBalanceWallet /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="body2" color="text.secondary">Records</Typography><Typography variant="h5" fontWeight={700}>{transactionTotal}</Typography><Typography variant="caption" color="text.secondary">{ledgerTotal} ledger entries</Typography></Box>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}><Receipt /></Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* ── Filters ── */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField fullWidth size="small" placeholder="Search ref, account, category…" value={searchTerm}
                                onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Grid>
                        {tabValue === 0 ? (
                            <>
                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                        <InputLabel>Status</InputLabel>
                                        <Select value={statusFilter} label="Status" onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value as any))}>
                                            <MenuItem value="all">All Status</MenuItem>
                                            <MenuItem value="success">Success</MenuItem>
                                            <MenuItem value="pending">Pending</MenuItem>
                                            <MenuItem value="failed">Failed</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                        <InputLabel>Type</InputLabel>
                                        <Select value={directionFilter} label="Type" onChange={(e) => handleFilterChange(() => setDirectionFilter(e.target.value as any))}>
                                            <MenuItem value="all">All Types</MenuItem>
                                            <MenuItem value="credit">Credit</MenuItem>
                                            <MenuItem value="debit">Debit</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        ) : (
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                    <InputLabel>Category</InputLabel>
                                    <Select value={categoryFilter} label="Category" onChange={(e) => handleFilterChange(() => setCategoryFilter(e.target.value as string))}>
                                        {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} md={2}>
                            <TextField fullWidth size="small" type="date" label="Start Date" value={startDate}
                                onChange={(e) => handleFilterChange(() => setStartDate(e.target.value))} InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField fullWidth size="small" type="date" label="End Date" value={endDate}
                                onChange={(e) => handleFilterChange(() => setEndDate(e.target.value))} InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Grid>
                        <Grid item xs={12} md={1}>
                            <Button fullWidth onClick={resetFilters} sx={{ borderRadius: 2, textTransform: 'none' }}>Reset</Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`${transactionTotal} transactions`} color="primary" variant="outlined" size="small" />
                                <Chip label={`${ledgerTotal} ledger rows`} color="info" variant="outlined" size="small" />
                                <Chip label={`Credits: ${formatCurrency(totalCredits)}`} color="success" variant="outlined" size="small" />
                                <Chip label={`Debits: ${formatCurrency(totalDebits)}`} color="error" variant="outlined" size="small" />
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* ── Tables ── */}
            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Box px={2} pt={2}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto"
                        sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }, '& .MuiTabs-indicator': { height: 3, borderRadius: 2 } }}>
                        <Tab label={`Transactions (${transactionTotal})`} />
                        <Tab label={`Transaction Ledger (${ledgerTotal})`} />
                    </Tabs>
                </Box>

                {/* Transactions tab */}
                {tabValue === 0 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Page {transactionPage + 1} · {filteredTransactions.length} shown · {transactionTotal} total
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8faff', borderBottom: '2px solid #e2e8f0' } }}>
                                        <TableCell>Date / Time</TableCell>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Account No.</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell align="right">Credit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTransactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>{loading ? 'Loading…' : 'No transactions found'}</TableCell></TableRow>
                                    ) : filteredTransactions.map((tx) => (
                                        <TableRow key={tx.id} hover sx={{ '&:hover': { bgcolor: '#f8faff' } }}>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(tx.created_at)}</TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={12}>{tx.reference}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{tx.account_no || '—'}</Typography></TableCell>
                                            <TableCell><Chip label={tx.status} size="small" color={statusColor(tx.status)} sx={{ fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell><Chip label={tx.direction} size="small" color={directionColor(tx.direction)} variant="outlined" sx={{ fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell align="right">
                                                {tx.direction === 'credit' ? (
                                                    <Typography fontWeight={700} color="success.main">+{formatCurrency(tx.value)}</Typography>
                                                ) : <Typography color="text.disabled">—</Typography>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination component="div" count={transactionTotal} page={transactionPage}
                            onPageChange={handleTransactionPageChange} rowsPerPage={transactionRowsPerPage}
                            onRowsPerPageChange={handleTransactionRowsPerPageChange} rowsPerPageOptions={[5, 10, 20, 50]} />
                    </Box>
                )}

                {/* Ledger tab */}
                {tabValue === 1 && (
                    <Box p={2}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Page {ledgerPage + 1} · {filteredLedger.length} shown · {ledgerTotal} total
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8faff', borderBottom: '2px solid #e2e8f0' } }}>
                                        <TableCell>Date / Time</TableCell>
                                        <TableCell>Transaction Ref</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Debit</TableCell>
                                        <TableCell align="right">Credit</TableCell>
                                        <TableCell align="right">Closing Balance</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredLedger.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>{loading ? 'Loading…' : 'No ledger entries found'}</TableCell></TableRow>
                                    ) : filteredLedger.map((entry) => (
                                        <TableRow key={entry.id} hover sx={{ '&:hover': { bgcolor: '#f8faff' } }}>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.created_at)}</TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={12}>{entry.transaction_ref}</Typography></TableCell>
                                            <TableCell><Chip label={categoryLabel(entry.category)} size="small" variant="outlined" color="primary" /></TableCell>
                                            <TableCell align="right">
                                                {entry.debit_amount > 0
                                                    ? <Typography fontWeight={700} color="error.main">-{formatCurrency(entry.debit_amount)}</Typography>
                                                    : <Typography color="text.disabled">₦0.00</Typography>}
                                            </TableCell>
                                            <TableCell align="right">
                                                {entry.credit_amount > 0
                                                    ? <Typography fontWeight={700} color="success.main">+{formatCurrency(entry.credit_amount)}</Typography>
                                                    : <Typography color="text.disabled">₦0.00</Typography>}
                                            </TableCell>
                                            <TableCell align="right"><Typography fontWeight={600}>{formatCurrency(entry.closing_balance)}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination component="div" count={ledgerTotal} page={ledgerPage}
                            onPageChange={handleLedgerPageChange} rowsPerPage={ledgerRowsPerPage}
                            onRowsPerPageChange={handleLedgerRowsPerPageChange} rowsPerPageOptions={[5, 10, 20, 50]} />
                    </Box>
                )}
            </Paper>

            <Snackbar open={Boolean(success)} autoHideDuration={4000} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{success}</Alert>
            </Snackbar>

            {/* ══════════════════════════════════════════════════════════════════════
                GENERATE REPORT DIALOG — sourced from the Ledger API
            ══════════════════════════════════════════════════════════════════════ */}
            <Dialog open={reportOpen} onClose={() => { if (!generating) setReportOpen(false); }} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

                {/* Header */}
                <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, py: 2.5, color: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Assessment sx={{ fontSize: 26 }} />
                            <Box>
                                <Typography variant="h6" fontWeight={700} color="#fff">Generate Report</Typography>
                                <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                                    Sourced from the transaction ledger
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={() => { if (!generating) setReportOpen(false); }} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Stack>
                </Box>

                <DialogContent sx={{ pt: 3, pb: 1 }}>
                    {reportError && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setReportError(null)}>
                            {reportError}
                        </Alert>
                    )}

                    <Grid container spacing={2.5}>
                        {/* Date range */}
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth type="date" label="Start Date" value={reportForm.start_date}
                                onChange={e => setReportForm(p => ({ ...p, start_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth type="date" label="End Date" value={reportForm.end_date}
                                onChange={e => setReportForm(p => ({ ...p, end_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }} />
                        </Grid>

                        {/* Category (was Purpose) */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}>
                                <InputLabel>Category</InputLabel>
                                <Select value={reportForm.category} label="Category" onChange={e => setReportForm(p => ({ ...p, category: e.target.value }))}>
                                    {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Search by reference / account */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Search Reference"
                                placeholder="Filter by transaction ref…"
                                value={reportForm.search}
                                onChange={e => setReportForm(p => ({ ...p, search: e.target.value }))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                                    ),
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}
                            />
                        </Grid>

                        {/* ── Toggleable report columns ── */}
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="body2" color="primary.main" fontWeight={700}>
                                        Report columns — tap to include or remove
                                    </Typography>
                                    <Tooltip title="Reset to all columns" arrow>
                                        <IconButton size="small" onClick={resetReportColumns}>
                                            <RestartAlt fontSize="small" sx={{ color: '#1e3a8a' }} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                    {REPORT_COLUMNS.map(col => {
                                        const active = reportColumns[col.key];
                                        return (
                                            <Chip
                                                key={col.key}
                                                label={col.label}
                                                onClick={() => toggleReportColumn(col.key)}
                                                icon={active ? <CheckCircle sx={{ fontSize: 16 }} /> : <RadioButtonUnchecked sx={{ fontSize: 16 }} />}
                                                sx={{
                                                    cursor: 'pointer', fontWeight: 600,
                                                    bgcolor: active ? '#1e3a8a' : '#fff',
                                                    color: active ? '#fff' : '#64748b',
                                                    border: '1px solid', borderColor: active ? '#1e3a8a' : '#cbd5e1',
                                                    '& .MuiChip-icon': { color: active ? '#fff' : '#94a3b8' },
                                                    '&:hover': { bgcolor: active ? '#1e40af' : '#f1f5f9' },
                                                    transition: 'all 0.15s ease',
                                                }}
                                            />
                                        );
                                    })}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                                    Unchecked columns are left out of the exported file entirely — click a column to add it back.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>

                {/* Footer */}
                <Box sx={{ px: 3, py: 2.5, bgcolor: '#f8faff', borderTop: '1px solid #e8edf5' }}>
                    <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                        <Button variant="text" onClick={resetReportForm} disabled={generating}
                            sx={{ textTransform: 'none', color: '#64748b', borderRadius: 2 }}>
                            Reset All
                        </Button>
                        <Stack direction="row" spacing={1.5}>
                            <Button variant="outlined" onClick={() => setReportOpen(false)} disabled={generating}
                                sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleGenerateReport}
                                disabled={generating || !reportForm.start_date || !reportForm.end_date}
                                sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, fontWeight: 700, minWidth: 170 }}
                            >
                                {generating ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CircularProgress size={16} color="inherit" />
                                        <span>Generating…</span>
                                    </Stack>
                                ) : (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Assessment fontSize="small" />
                                        <span>Generate Report</span>
                                    </Stack>
                                )}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Dialog>
        </Box>
    );
};

export default TransactionManagement;