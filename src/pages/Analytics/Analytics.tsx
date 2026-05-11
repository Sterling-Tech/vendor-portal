import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
} from '@mui/material';
import { Refresh, TrendingUp, AccountBalance, Assessment } from '@mui/icons-material';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';

const ROLE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#ff9800'];

const Analytics: React.FC = () => {
    const { tenantId } = useVendorHierarchy();
    const { overview, loading, error, refresh } = useDashboardSummary(tenantId);

    const chartData = useMemo(() => {
        if (!overview) return [];
        return overview.daily.map((point) => ({
            date: point.date,
            transactions: point.total,
            value: Number(point.amount),
        }));
    }, [overview]);

    const pieData = useMemo(() => {
        if (!overview) return [];
        return Object.entries(overview.role_breakdown).map(([role, count]) => ({
            name: role.replace('_', ' '),
            value: count,
        }));
    }, [overview]);

    const statsCards = useMemo(() => {
        if (!overview) return [];
        return [
            {
                title: 'Total Organisations',
                value: overview.totals.orgs,
                icon: <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />,
            },
            {
                title: 'Wallets',
                value: overview.totals.wallets,
                icon: <AccountBalance sx={{ fontSize: 40, color: 'success.main' }} />,
                detail: `Balance ₦${Number(overview.totals.wallet_balance).toLocaleString()}`,
            },
            {
                title: 'Transactions (7d)',
                value: overview.totals.transactions,
                icon: <TrendingUp sx={{ fontSize: 40, color: 'secondary.main' }} />,
                detail: `Value ₦${Number(overview.totals.transaction_value).toLocaleString()}`,
            },
        ];
    }, [overview]);

    if (loading && !overview) {
        return (
            <Box sx={{ p: 3 }} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4">Analytics</Typography>
                    {overview?.tenant && (
                        <Typography color="text.secondary" variant="body2">
                            Tenant: {overview.tenant.name ?? overview.tenant.id}
                        </Typography>
                    )}
                </Box>
                <Button variant="outlined" startIcon={<Refresh />} onClick={refresh}>
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {statsCards.length > 0 && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    {statsCards.map((card) => (
                        <Grid item xs={12} md={4} key={card.title}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography color="text.secondary" gutterBottom>
                                                {card.title}
                                            </Typography>
                                            <Typography variant="h5">{card.value.toLocaleString()}</Typography>
                                            {card.detail && (
                                                <Typography color="text.secondary" variant="body2">
                                                    {card.detail}
                                                </Typography>
                                            )}
                                        </Box>
                                        {card.icon}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Transactions – Last 7 Days
                            </Typography>
                            {chartData.length ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" hide />
                                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="transactions"
                                            stroke="#1976d2"
                                            fill="#1976d2"
                                            fillOpacity={0.25}
                                        />
                                        <Area
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#2e7d32"
                                            fill="#2e7d32"
                                            fillOpacity={0.15}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Typography color="text.secondary">Insufficient data for trend visualisation.</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Role Distribution
                            </Typography>
                            {pieData.length ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
                                            {pieData.map((entry, index) => (
                                                <Cell key={entry.name} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Typography color="text.secondary">No role assignments available.</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Transactions
                    </Typography>
                    {overview?.recent_transactions?.length ? (
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
                                {overview.recent_transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.reference}</TableCell>
                                        <TableCell>{tx.status}</TableCell>
                                        <TableCell>{tx.org_name ?? '—'}</TableCell>
                                        <TableCell align="right">{Number(tx.value).toLocaleString()}</TableCell>
                                        <TableCell align="right">{new Date(tx.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography color="text.secondary">No recent transactions logged.</Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default Analytics;

