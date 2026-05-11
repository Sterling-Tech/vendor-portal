import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Alert,
    Grid,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { DashboardRecentTransaction } from '../../types/dashboard';

const TransactionManagement: React.FC = () => {
    const { tenantId } = useVendorHierarchy();
    const { summaries, overview, loading, error, refresh } = useDashboardSummary(tenantId);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const combinedTransactions = useMemo(() => {
        const transactions: DashboardRecentTransaction[] = [];
        summaries.forEach((summary) => {
            summary.transactions.recent.forEach((tx) => {
                transactions.push({ ...tx, org_name: tx.org_name ?? summary.org.name });
            });
        });
        if (overview?.recent_transactions) {
            overview.recent_transactions.forEach((tx) => {
                transactions.push(tx);
            });
        }
        const byId = new Map<string, DashboardRecentTransaction>();
        transactions.forEach((tx) => byId.set(tx.id, tx));
        return Array.from(byId.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [summaries, overview]);

    const filteredTransactions = combinedTransactions.filter((txn) => {
        const matchesSearch =
            txn.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.org_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || txn.status?.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading && combinedTransactions.length === 0) {
        return (
            <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Transactions</Typography>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search by reference or organisation"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="success">Success</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reference</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Organisation</TableCell>
                                    <TableCell align="right">Amount (₦)</TableCell>
                                    <TableCell align="right">Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTransactions.length ? (
                                    filteredTransactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{tx.reference}</TableCell>
                                            <TableCell>
                                                <Chip label={tx.status} size="small" />
                                            </TableCell>
                                            <TableCell>{tx.org_name ?? '—'}</TableCell>
                                            <TableCell align="right">{Number(tx.value).toLocaleString()}</TableCell>
                                            <TableCell align="right">{new Date(tx.created_at).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="text.secondary">No transactions found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default TransactionManagement;

