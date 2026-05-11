import React from 'react';
import {
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
    Button,
} from '@mui/material';
import { DashboardSummary } from '../../../../types/dashboard';

interface CashierDashboardProps {
    summary: DashboardSummary;
    onRequestTransfer?: () => void;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ summary, onRequestTransfer }) => {
    const walletBalance = Number(summary.wallets.total_balance);

    return (
        <Stack spacing={3}>
            <Card>
                <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                        Current Float
                    </Typography>
                    <Typography variant="h4">₦{walletBalance.toLocaleString()}</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        Wallets managed: {summary.wallets.count}
                    </Typography>
                    {onRequestTransfer && (
                        <Button sx={{ mt: 2 }} variant="contained" onClick={onRequestTransfer}>
                            Request Top-up
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Latest Transactions
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
                        <Typography color="text.secondary">No transactions recorded yet.</Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
};

export default CashierDashboard;
