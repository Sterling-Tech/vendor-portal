import React, { useState } from 'react';
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
    Button,
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
import {
    Business,
    AccountBalanceWallet,
    Security,
} from '@mui/icons-material';
import { DashboardOverview, DashboardSummary } from '../../../../types/dashboard';
import ManageOrganisationsModal from '../../../../components/QuickActions/ManageOrganisationsModal';
import WalletOperationsModal from '../../../../components/QuickActions/WalletOperationsModal';
import ApiKeysSecurityModal from '../../../../components/QuickActions/ApiKeysSecurityModal';

interface VendorAdminDashboardProps {
    summary: DashboardSummary;
    overview: DashboardOverview | null;
}

const VendorAdminDashboard: React.FC<VendorAdminDashboardProps> = ({ summary, overview }) => {
    const [orgsModalOpen, setOrgsModalOpen] = useState(false);
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
    const chartData = summary.transactions.last_7_days.map((point) => ({
        date: point.date,
        transactions: point.total,
        value: Number(point.amount),
    }));

    const roleBreakdown = overview?.role_breakdown || summary.counts.role_breakdown;

    return (
        <Stack spacing={3}>
            {/* Quick Actions Section */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Quick Actions
                    </Typography>
                    <Grid container spacing={2} mt={1}>
                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={<Business />}
                                onClick={() => setOrgsModalOpen(true)}
                                sx={{
                                    py: 2,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                    },
                                }}
                            >
                                Manage Organisations
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={<AccountBalanceWallet />}
                                onClick={() => setWalletModalOpen(true)}
                                sx={{
                                    py: 2,
                                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                                    },
                                }}
                            >
                                Wallet Operations
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                startIcon={<Security />}
                                onClick={() => setApiKeysModalOpen(true)}
                                sx={{
                                    py: 2,
                                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                                    },
                                }}
                            >
                                API Keys & Security
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Organisations
                            </Typography>
                            <Typography variant="h5">{summary.counts.total_orgs}</Typography>
                            <Stack direction="row" spacing={1} mt={1}>
                                <Chip label={`Active ${summary.counts.active_orgs}`} color="success" size="small" />
                                <Chip label={`Suspended ${summary.counts.suspended_orgs}`} color="warning" size="small" />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Wallet Balance
                            </Typography>
                            <Typography variant="h5">₦{Number(summary.wallets.total_balance).toLocaleString()}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Avg ₦{Number(summary.wallets.avg_balance).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Transactions (7d)
                            </Typography>
                            <Typography variant="h5">{summary.transactions.total}</Typography>
                            <Typography color="text.secondary" variant="body2">
                                Value ₦{Number(summary.transactions.total_value).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Role Distribution
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {Object.entries(roleBreakdown).map(([role, count]) => (
                                    <Chip key={role} label={`${role.replace('_', ' ')} • ${count}`} size="small" />
                                ))}
                                {!Object.keys(roleBreakdown).length && (
                                    <Typography color="text.secondary" variant="body2">
                                        No role assignments yet
                                    </Typography>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Transactions – Last 7 Days
                    </Typography>
                    {chartData.length ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" hide />
                                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="transactions"
                                    stroke="#8884d8"
                                    fill="#8884d8"
                                    fillOpacity={0.25}
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#82ca9d"
                                    fill="#82ca9d"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <Typography color="text.secondary">No transaction activity recorded yet.</Typography>
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
                                    <TableCell>Org</TableCell>
                                    <TableCell align="right">Amount (₦)</TableCell>
                                    <TableCell align="right">Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summary.transactions.recent.map((tx) => (
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
                        <Typography color="text.secondary">No transactions yet.</Typography>
                    )}
                </CardContent>
            </Card>

            {/* Quick Action Modals */}
            <ManageOrganisationsModal
                open={orgsModalOpen}
                onClose={() => setOrgsModalOpen(false)}
            />
            <WalletOperationsModal
                open={walletModalOpen}
                onClose={() => setWalletModalOpen(false)}
            />
            <ApiKeysSecurityModal
                open={apiKeysModalOpen}
                onClose={() => setApiKeysModalOpen(false)}
            />
        </Stack>
    );
};

export default VendorAdminDashboard;
