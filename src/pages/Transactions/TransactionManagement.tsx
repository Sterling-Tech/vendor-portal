import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogContent, FormControl, Grid, IconButton, InputAdornment,
    InputLabel, MenuItem, Paper, Select, Snackbar, Stack,
    Tab, Table, TableBody, TableCell, TableContainer, TableHead,
    TablePagination, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import {
    AccountBalanceWallet, Assessment, Close, Download, Receipt,
    Refresh as RefreshIcon, Search as SearchIcon, TrendingDown, TrendingUp,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useAppSelector } from '../../store/hooks';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TransactionStatus = 'success' | 'pending' | 'failed';
type TransactionDirection = 'credit' | 'debit';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type Transaction = {
    id: string;
    reference: string;
    status: TransactionStatus;
    org_name: string;      // vendor name
    wallet_key: string;
    category: string;
    channel: string;
    direction: TransactionDirection;
    value: number;
    created_at: string;
    account_number?: string;  // captured from API if present
    closing_balance?: number; // captured from API if present
    reversal?: string;        // captured from API if present
};
type LedgerEntry = {
    id: string; ledger_ref: string; transaction_ref: string; account: string;
    org_name: string; wallet_key: string; direction: TransactionDirection;
    amount: number; balance_after: number; narration: string;
    status: TransactionStatus; created_at: string;
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
const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const API_BASE_URL = 'http://188.166.161.13:8061/vendor';
const buildHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('accessToken')
        : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// ─── Purpose options ────────────────────────────────────────────────────────────
const PURPOSE_OPTIONS = [
    { label: 'All Purposes',        value: 'all' },
    { label: 'Payment',             value: 'payment' },
    { label: 'Commission',          value: 'commission' },
    { label: 'Commission Report',   value: 'commission_report' },
    { label: 'Payment Reversal',    value: 'payment_reversal' },
    { label: 'Settlement',          value: 'settlement' },
    { label: 'Refund',              value: 'refund' },
    { label: 'Transfer',            value: 'transfer' },
    { label: 'Withdrawal',          value: 'withdrawal' },
];

// ─── Main component ─────────────────────────────────────────────────────────────
const TransactionManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);

    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all');

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
        purpose: 'all',
        status: 'all',
        direction: 'all',
        // ── CHANGED: was "transaction_ref", now "vendor" search ──────────────────
        vendor: '',
    });

    // ── Fetch transactions (server-side paginated) ───────────────────────────────
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
                org_name: item.vendor_name || item.org_name || item.vendor?.business_name || 'Vendor',
                wallet_key: item.wallet_key || '-',
                category: item.category || 'Transaction',
                channel: item.channel || '-',
                direction: Number(item.amount) >= 0 ? 'credit' : 'debit',
                value: Math.abs(Number(item.amount || 0)),
                created_at: item.timestamp,
                account_number: item.account_number || item.account || '',
                closing_balance: item.closing_balance || item.balance_after || 0,
                reversal: item.reversal || item.is_reversal ? 'Yes' : 'No',
            }));
            setTransactions(mapped);
        } catch (err) { console.error('Transaction fetch error:', err); }
        finally { setLoading(false); }
    }, [startDate, endDate, user?.id]);

    // ── Fetch ledger (server-side paginated) ─────────────────────────────────────
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
                ledger_ref: item.ledger_ref || `LEDGER-${index + 1}`,
                transaction_ref: item.transaction_ref,
                account: item.account || '-',
                org_name: item.vendor_name || item.org_name || 'Vendor',
                wallet_key: item.wallet_key || '-',
                direction: Number(item.credit_amount) > 0 ? 'credit' : 'debit',
                amount: Number(item.credit_amount || 0) || Number(item.debit_amount || 0),
                balance_after: Number(item.balance_after || 0),
                narration: item.narration || '-',
                status: item.status || 'success',
                created_at: item.timestamp,
            }));
            setLedgerEntries(mapped);
            setSummary({ total_credits: Number(data.summary?.total_credits || 0), total_debits: Number(data.summary?.total_debits || 0) });
            setLastUpdated(new Date());
        } catch (err) { console.error('Ledger fetch error:', err); }
        finally { setLoading(false); }
    }, [startDate, endDate, user?.id]);

    // ── Fetch ALL pages for the report (loops through pagination) ────────────────
    const fetchAllForReport = async (params: typeof reportForm): Promise<Transaction[]> => {
        const allResults: Transaction[] = [];
        let page = 1; let hasNext = true;
        while (hasNext) {
            const url = `${API_BASE_URL}/transactions/?start_date=${params.start_date}&end_date=${params.end_date}&vendor_id=${user?.id}&page=${page}&page_size=200`;
            const res = await fetch(url, { method: 'GET', headers: buildHeaders() });
            if (!res.ok) throw new Error(`Transaction API failed (page ${page})`);
            const data = await res.json();
            const mapped: Transaction[] = (data.results ?? []).map((item: any) => ({
                id: item.transaction_ref, reference: item.transaction_ref,
                status: item.status || 'success',
                org_name: item.vendor_name || item.org_name || item.vendor?.business_name || 'Vendor',
                wallet_key: item.wallet_key || '-',
                category: item.category || 'Transaction',
                channel: item.channel || '-',
                direction: Number(item.amount) >= 0 ? 'credit' : 'debit',
                value: Math.abs(Number(item.amount || 0)),
                created_at: item.timestamp,
                account_number: item.account_number || item.account || '',
                closing_balance: item.closing_balance || item.balance_after || 0,
                reversal: item.reversal || item.is_reversal ? 'Yes' : 'No',
            }));
            allResults.push(...mapped);
            hasNext = Boolean(data.next);
            page++;
            if (page > 50) break; // safety limit
        }
        return allResults;
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
            const matchesSearch = !term || tx.reference.toLowerCase().includes(term) || tx.org_name.toLowerCase().includes(term) || tx.wallet_key.toLowerCase().includes(term) || tx.category.toLowerCase().includes(term);
            return matchesSearch && (statusFilter === 'all' || tx.status === statusFilter) && (directionFilter === 'all' || tx.direction === directionFilter);
        });
    }, [transactions, searchTerm, statusFilter, directionFilter]);

    const filteredLedger = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return ledgerEntries.filter((entry) => !term || entry.ledger_ref.toLowerCase().includes(term) || entry.transaction_ref.toLowerCase().includes(term) || entry.account.toLowerCase().includes(term) || entry.org_name.toLowerCase().includes(term) || entry.narration.toLowerCase().includes(term));
    }, [ledgerEntries, searchTerm]);

    const handleRefresh = () => { fetchTransactions(transactionPage, transactionRowsPerPage); fetchLedger(ledgerPage, ledgerRowsPerPage); };

    const resetFilters = () => { setSearchTerm(''); setStatusFilter('all'); setDirectionFilter('all'); setStartDate(fmt(oneYearAgo)); setEndDate(fmt(tomorrow)); setTransactionPage(0); setLedgerPage(0); };

    const exportRows = useCallback(() => {
        const isLedger = tabValue === 1;
        const headers = isLedger
            ? ['Date', 'Ledger Ref', 'Transaction Ref', 'Account', 'Organisation', 'Wallet', 'Direction', 'Amount', 'Balance After', 'Status', 'Narration']
            : ['Date', 'Reference', 'Organisation', 'Wallet', 'Direction', 'Category', 'Channel', 'Amount', 'Status'];
        const rows = isLedger
            ? filteredLedger.map((e) => [formatDateTime(e.created_at), e.ledger_ref, e.transaction_ref, e.account, e.org_name, e.wallet_key, e.direction, e.amount, e.balance_after, e.status, e.narration])
            : filteredTransactions.map((tx) => [formatDateTime(tx.created_at), tx.reference, tx.org_name, tx.wallet_key, tx.direction, tx.category, tx.channel, tx.value, tx.status]);
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
    // GENERATE REPORT — Excel template with required headers
    // Headers: Date | Vendor | Reference | account_number | Status | Reversal | Credit | Date | closing_balance
    // ─────────────────────────────────────────────────────────────────────────────
    const handleGenerateReport = async () => {
        setGenerating(true); setReportError(null);
        try {
            // 1. Fetch all pages
            let allTx = await fetchAllForReport(reportForm);

            // 2. Client-side filters
            if (reportForm.vendor.trim()) {
                const v = reportForm.vendor.trim().toLowerCase();
                allTx = allTx.filter(tx => tx.org_name.toLowerCase().includes(v));
            }
            if (reportForm.status !== 'all') {
                allTx = allTx.filter(tx => tx.status === reportForm.status);
            }
            if (reportForm.direction !== 'all') {
                allTx = allTx.filter(tx => tx.direction === reportForm.direction);
            }
            if (reportForm.purpose !== 'all') {
                allTx = allTx.filter(tx => tx.category.toLowerCase().includes(reportForm.purpose.replace('_', ' ')));
            }

            if (allTx.length === 0) {
                setReportError('No transactions match the selected filters. Try adjusting your criteria.');
                return;
            }

            // 3. Build the Excel sheet with the required column layout
            //    Required columns: Date | Vendor | Reference | account_number | Status | Reversal | Credit | Date | closing_balance

            // ── Meta info rows ──
            const meta = [
                ['TRANSACTION REPORT'],
                [],
                ['Period',          `${reportForm.start_date}  →  ${reportForm.end_date}`],
                ['Generated',       new Date().toLocaleString()],
                ['Vendor Filter',   reportForm.vendor.trim() || 'All Vendors'],
                ['Purpose',         PURPOSE_OPTIONS.find(p => p.value === reportForm.purpose)?.label || 'All'],
                ['Status',          reportForm.status === 'all' ? 'All' : reportForm.status],
                ['Type',            reportForm.direction === 'all' ? 'Credit & Debit' : reportForm.direction],
                ['Total Records',   allTx.length],
                [],
            ];

            // ── Column header row (exact header names as requested) ──
            const colHeaders = [
                'Date',
                'Vendor',
                'Reference',
                'account_number',
                'Status',
                'Reversal',
                'Credit',
                'Debit',           // second Date column — closing date / settlement date
                'closing_balance',
            ];

            // ── Data rows ──
            const dataRows = allTx.map((tx) => [
                formatDateTime(tx.created_at),                            // Date
                tx.org_name || '',                                         // Vendor
                tx.reference || '',                                        // Reference
                tx.account_number || '',                                   // account_number
                tx.status?.toUpperCase() || '',                            // Status
                tx.reversal || 'No',                                       // Reversal
                tx.direction === 'credit'
                    ? tx.value                                             // Credit (amount if credit)
                    : '',                                                   // blank if debit
                tx.direction === 'debit'
                    ? tx.value                                             // Credit (amount if credit)
                    : '',                                           
                tx.closing_balance !== undefined ? tx.closing_balance : '', // closing_balance
            ]);

            // ── Summary rows ──
            const totalCredit = allTx.filter(t => t.direction === 'credit').reduce((s, t) => s + t.value, 0);
            const summary = [
                [],
                ['', '', '', '', '', '', '', '', ''],
                ['SUMMARY', '', '', '', '', '', '', '', ''],
                ['Total Transactions',  allTx.length,  '', '', '', '', '', '', ''],
                ['Total Credit Amount', totalCredit,             '', '', '', '', '', '', ''],
                ['Successful',          allTx.filter(t => t.status === 'success').length, '', '', '', '', '', '', ''],
                ['Pending',             allTx.filter(t => t.status === 'pending').length,  '', '', '', '', '', '', ''],
                ['Failed',              allTx.filter(t => t.status === 'failed').length,   '', '', '', '', '', '', ''],
            ];

            // 4. Assemble worksheet
            const wsData = [...meta, colHeaders, ...dataRows, ...summary];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Column widths
            ws['!cols'] = [
                { wch: 22 }, // Date
                { wch: 28 }, // Vendor
                { wch: 40 }, // Reference
                { wch: 18 }, // account_number
                { wch: 12 }, // Status
                { wch: 10 }, // Reversal
                { wch: 18 }, // Credit
                { wch: 22 }, // Dabit
                { wch: 20 }, // closing_balance
            ];

            // Merge title cell across all 9 columns
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            ];

            // 5. Second sheet: clean Summary
            const summarySheetData = [
                ['TRANSACTION REPORT — SUMMARY'],
                [],
                ['Date Range',          `${reportForm.start_date} to ${reportForm.end_date}`],
                ['Vendor Filter',       reportForm.vendor.trim() || 'All Vendors'],
                ['Purpose',             PURPOSE_OPTIONS.find(p => p.value === reportForm.purpose)?.label || 'All'],
                ['Status Filter',       reportForm.status === 'all' ? 'All' : reportForm.status],
                ['Generated At',        new Date().toLocaleString()],
                [],
                ['Metric',              'Value'],
                ['Total Records',       allTx.length],
                ['Total Credit',        totalCredit],
                ['Successful',          allTx.filter(t => t.status === 'success').length],
                ['Pending',             allTx.filter(t => t.status === 'pending').length],
                ['Failed',              allTx.filter(t => t.status === 'failed').length],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
            wsSummary['!cols'] = [{ wch: 26 }, { wch: 36 }];
            wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

            // 6. Build workbook & download
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            const fileName = `transaction-report-${reportForm.start_date}-to-${reportForm.end_date}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setSuccess(`✓ Report generated — ${allTx.length} transactions exported`);
            setReportOpen(false);
        } catch (err: any) {
            setReportError(err?.message || 'Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const resetReportForm = () => {
        setReportForm({ start_date: fmt(oneYearAgo), end_date: fmt(tomorrow), purpose: 'all', status: 'all', direction: 'all', vendor: '' });
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
                            <TextField fullWidth size="small" placeholder="Search ref, org, wallet…" value={searchTerm}
                                onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Grid>
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
                                        <TableCell>Organisation</TableCell>
                                        <TableCell>Reference</TableCell>
                                        <TableCell>Account No.</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell align="right">Credit</TableCell>
                                        {/* <TableCell align="right">Closing Balance</TableCell> */}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredTransactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>{loading ? 'Loading…' : 'No transactions found'}</TableCell></TableRow>
                                    ) : filteredTransactions.map((tx) => (
                                        <TableRow key={tx.id} hover sx={{ '&:hover': { bgcolor: '#f8faff' } }}>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(tx.created_at)}</TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{tx.org_name}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={12}>{tx.reference}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{tx.account_number || '—'}</Typography></TableCell>
                                            <TableCell><Chip label={tx.status} size="small" color={statusColor(tx.status)} sx={{ fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell><Chip label={tx.direction} size="small" color={directionColor(tx.direction)} variant="outlined" sx={{ fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell align="right">
                                                {tx.direction === 'credit' ? (
                                                    <Typography fontWeight={700} color="success.main">+{formatCurrency(tx.value)}</Typography>
                                                ) : <Typography color="text.disabled">—</Typography>}
                                            </TableCell>
                                            {/* <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>{tx.closing_balance !== undefined && tx.closing_balance !== 0 ? formatCurrency(tx.closing_balance) : '—'}</Typography>
                                            </TableCell> */}
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
                                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>{loading ? 'Loading…' : 'No ledger entries found'}</TableCell></TableRow>
                                    ) : filteredLedger.map((entry) => (
                                        <TableRow key={entry.id} hover sx={{ '&:hover': { bgcolor: '#f8faff' } }}>
                                            <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={12}>{entry.ledger_ref}</Typography><Typography variant="caption" color="text.secondary">{entry.narration}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={12}>{entry.transaction_ref}</Typography></TableCell>
                                            <TableCell>{entry.org_name}</TableCell>
                                            <TableCell><Chip label={entry.direction} size="small" color={directionColor(entry.direction)}/></TableCell>
                                            <TableCell align="right">{formatCurrency(entry.amount)}</TableCell>
                                            <TableCell><Chip label={entry.status} size="small" color={statusColor(entry.status)} /></TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.created_at)}</TableCell>
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
                GENERATE REPORT DIALOG
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
                                {/* <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                                    Exports: Date · Vendor · Reference · account_number · Status · Reversal · Credit · closing_balance
                                </Typography> */}
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

                        {/* ── Vendor search (CHANGED from Transaction Ref) ── */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Vendor"
                                placeholder="Filter by vendor name…"
                                value={reportForm.vendor}
                                onChange={e => setReportForm(p => ({ ...p, vendor: e.target.value }))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                                    ),
                                }}
                                helperText="Leave empty to include all vendors"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}
                            />
                        </Grid>

                        {/* Purpose */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}>
                                <InputLabel>Purpose</InputLabel>
                                <Select value={reportForm.purpose} label="Purpose" onChange={e => setReportForm(p => ({ ...p, purpose: e.target.value }))}>
                                    {PURPOSE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Status */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}>
                                <InputLabel>Status</InputLabel>
                                <Select value={reportForm.status} label="Status" onChange={e => setReportForm(p => ({ ...p, status: e.target.value }))}>
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="success">✓ Success</MenuItem>
                                    <MenuItem value="pending">⏳ Pending</MenuItem>
                                    <MenuItem value="failed">✕ Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Direction */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}>
                                <InputLabel>Type</InputLabel>
                                <Select value={reportForm.direction} label="Type" onChange={e => setReportForm(p => ({ ...p, direction: e.target.value }))}>
                                    <MenuItem value="all">Credit &amp; Debit</MenuItem>
                                    <MenuItem value="credit">Credit Only</MenuItem>
                                    <MenuItem value="debit">Debit Only</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Template preview */}
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="body2" color="primary.main" fontWeight={700} mb={1}>
                                    Columns that will be exported in the report:
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                    {['Date', 'Vendor', 'Reference', 'account_number', 'Status', 'Reversal', 'Credit', 'Date', 'closing_balance'].map((col, i) => (
                                        <Chip key={`${col}-${i}`} label={col} size="small" variant="outlined"
                                            sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, borderColor: '#93c5fd', color: '#1e3a8a' }} />
                                    ))}
                                </Stack>
                                {/* <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                    Fields not returned by the API will appear as empty cells in the report.
                                </Typography> */}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>

                {/* Footer */}
                <Box sx={{ px: 3, py: 2.5, bgcolor: '#f8faff', borderTop: '1px solid #e8edf5' }}>
                    <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                        <Button variant="text" onClick={resetReportForm} disabled={generating}
                            sx={{ textTransform: 'none', color: '#64748b', borderRadius: 2 }}>
                            Reset Filters
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