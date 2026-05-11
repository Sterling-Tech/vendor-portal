import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Stack,
    Chip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from '@mui/material';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import { DashboardSummary } from '../../../../types/dashboard';

interface SubVendorDashboardProps {
    summary: DashboardSummary;
}

const SubVendorDashboard: React.FC<SubVendorDashboardProps> = ({ summary }) => {
    const chartData = summary.transactions.last_7_days.map((point) => ({
        date: point.date,
        transactions: point.total,
        value: Number(point.amount),
    }));

    return (
        <Stack spacing={3}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Downline Organisations
                            </Typography>
                            <Typography variant="h5">{summary.counts.descendants}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Direct children: {summary.counts.direct_children}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Active Wallets
                            </Typography>
                            <Typography variant="h5">{summary.wallets.count}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Balance ₦{Number(summary.wallets.total_balance).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Transactions (30d)
                            </Typography>
                            <Typography variant="h5">{summary.transactions.total}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Value ₦{Number(summary.transactions.total_value).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Performance Trend
                    </Typography>
                    {chartData.length ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                                <YAxis yAxisId="right" orientation="right" stroke="#ff9800" hide />
                                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="transactions"
                                    stroke="#1976d2"
                                    fill="#1976d2"
                                    fillOpacity={0.2}
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#ff9800"
                                    fill="#ff9800"
                                    fillOpacity={0.1}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <Typography color="text.secondary">No transaction data yet.</Typography>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Transactions
                    </Typography>
                    {summary.transactions.recent.length ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reference</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Amount (₦)</TableCell>
                                    <TableCell align="right">Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summary.transactions.recent.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.reference}</TableCell>
                                        <TableCell>
                                            <Chip label={tx.status} size="small" />
                                        </TableCell>
                                        <TableCell align="right">{Number(tx.value).toLocaleString()}</TableCell>
                                        <TableCell align="right">{new Date(tx.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography color="text.secondary">No transactions recorded.</Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
};

export default SubVendorDashboard;
