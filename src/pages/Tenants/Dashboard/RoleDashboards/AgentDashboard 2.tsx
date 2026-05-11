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
import { DashboardSummary } from '../../../../types/dashboard';

interface AgentDashboardProps {
    summary: DashboardSummary;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ summary }) => {
    const walletBalance = Number(summary.wallets.total_balance);

    return (
        <Stack spacing={3}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Managed Cashiers
                            </Typography>
                            <Typography variant="h5">
                                {summary.counts.descendant_levels.cashier ?? 0}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                Active: {summary.counts.role_breakdown.cashier ?? 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Wallets
                            </Typography>
                            <Typography variant="h5">{summary.wallets.count}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Balance ₦{walletBalance.toLocaleString()}
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
                        Recent Activity
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
                        <Typography color="text.secondary">No recent transactions.</Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
};

export default AgentDashboard;
