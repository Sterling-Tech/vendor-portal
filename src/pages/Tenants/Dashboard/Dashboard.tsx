import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Stack,
    Chip,
    Divider,
    Avatar,
    LinearProgress,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Autocomplete,
    InputAdornment,
} from '@mui/material';
import {
    Refresh,
    Business,
    AccountBalance,
    Key,
    ViewModule,
    TrendingUp,
    TrendingDown,
    People,
    Receipt,
    Speed,
    Settings,
    Add,
    ArrowForward,
    Domain,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useVendorHierarchy } from '../../../contexts/VendorContext';
import { useDashboardSummary } from '../../../hooks/useDashboardSummary';
import { useTenants } from '../../../hooks/useTenants';
import VendorAdminDashboard from './RoleDashboards/VendorAdminDashboard';
import SubVendorDashboard from './RoleDashboards/SubVendorDashboard';
import AgentDashboard from './RoleDashboards/AgentDashboard';
import CashierDashboard from './RoleDashboards/CashierDashboard';
import { DashboardSummary } from '../../../types/dashboard';

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(Number(value));

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { tenantId, setTenantId, tree, selectedOrg } = useVendorHierarchy();
    const { tenants, loading: tenantsLoading, selectTenant, selectedTenantId, selectedTenant } = useTenants();
    const { summaries, overview, loading, error, refresh } = useDashboardSummary(tenantId);
    const [activeIndex, setActiveIndex] = useState(0);
    const [tenantSearchTerm, setTenantSearchTerm] = useState('');
    const [quickActionDialogOpen, setQuickActionDialogOpen] = useState(false);
    const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);

    // Sync tenant selection
    useEffect(() => {
        if (selectedTenantId && selectedTenantId !== tenantId) {
            setTenantId(selectedTenantId);
        }
    }, [selectedTenantId, tenantId, setTenantId]);

    // Auto-select first tenant if none selected
    useEffect(() => {
        if (!tenantId && tenants.length > 0) {
            const firstTenant = tenants[0];
            selectTenant(firstTenant.id);
            setTenantId(firstTenant.id);
        }
    }, [tenantId, tenants, selectTenant, setTenantId]);

    useEffect(() => {
        if (summaries.length === 0) {
            setActiveIndex(0);
        } else if (activeIndex >= summaries.length) {
            setActiveIndex(0);
        }
    }, [summaries, activeIndex]);

    const activeSummary = summaries[activeIndex] ?? null;

    // Filtered tenants for search
    const filteredTenants = useMemo(() => {
        if (!tenantSearchTerm.trim()) return tenants;
        const term = tenantSearchTerm.toLowerCase();
        return tenants.filter(
            (t) =>
                t.name.toLowerCase().includes(term) ||
                t.domain.toLowerCase().includes(term) ||
                t.slug.toLowerCase().includes(term)
        );
    }, [tenants, tenantSearchTerm]);

    // Statistics cards with enhanced data
    const statsCards = useMemo(() => {
        if (!overview) {
            return [
                { title: 'Organisations', value: tree?.length ?? 0, detail: 'No data loaded', icon: <Business />, color: 'primary', trend: null },
                { title: 'Wallets', value: 0, detail: 'No data loaded', icon: <AccountBalance />, color: 'success', trend: null },
                { title: 'Transactions', value: 0, detail: 'No data loaded', icon: <Receipt />, color: 'warning', trend: null },
                { title: 'Team Members', value: summaries.length, detail: 'Your assignments', icon: <People />, color: 'info', trend: null },
            ];
        }
        return [
            {
                title: 'Organisations',
                value: overview.totals.orgs,
                detail: `${Object.keys(overview.role_breakdown).length} role types`,
                icon: <Business />,
                color: 'primary',
                trend: null,
            },
            {
                title: 'Total Balance',
                value: formatCurrency(overview.totals.wallet_balance),
                detail: `${overview.totals.wallets} wallets`,
                icon: <AccountBalance />,
                color: 'success',
                trend: 12,
            },
            {
                title: 'Transactions (7d)',
                value: overview.totals.transactions.toLocaleString(),
                detail: formatCurrency(overview.totals.transaction_value),
                icon: <Receipt />,
                color: 'warning',
                trend: 8,
            },
            {
                title: 'Active Roles',
                value: summaries.length,
                detail: 'Your assignments',
                icon: <People />,
                color: 'info',
                trend: null,
            },
        ];
    }, [overview, tree?.length, summaries.length]);

    // Quick actions
    const quickActions = useMemo(() => [
        {
            id: 'manage-orgs',
            title: 'Manage Organisations',
            description: 'Create, edit, and manage vendor organisations',
            icon: <Business />,
            path: '/tenants/vendors',
            color: 'primary.main',
        },
        {
            id: 'wallet-ops',
            title: 'Wallet Operations',
            description: 'View balances, transfer funds, manage wallets',
            icon: <AccountBalance />,
            path: '/tenants/wallets',
            color: 'success.main',
        },
        {
            id: 'prepaid',
            title: 'Prepaid Services',
            description: 'Buy airtime, data, pay bills',
            icon: <Speed />,
            path: '/prepaid',
            color: 'warning.main',
        },
        {
            id: 'api-keys',
            title: 'API Keys & Security',
            description: 'Manage API keys and security settings',
            icon: <Key />,
            path: '/settings',
            color: 'info.main',
        },
    ], []);

    const handleQuickAction = useCallback((action: typeof quickActions[0]) => {
        navigate(action.path);
    }, [navigate]);

    const renderRoleDashboard = (summary: DashboardSummary | null) => {
        if (!summary) {
            return (
                <Card>
                    <CardContent>
                        <Typography color="text.secondary">No role assignments found for this user.</Typography>
                    </CardContent>
                </Card>
            );
        }

        switch (summary.role) {
            case 'vendor_admin':
            case 'tenant_admin':
                return <VendorAdminDashboard summary={summary} overview={overview ?? null} />;
            case 'sub_vendor':
                return <SubVendorDashboard summary={summary} />;
            case 'agent':
                return <AgentDashboard summary={summary} />;
            case 'cashier':
                return <CashierDashboard summary={summary} />;
            default:
                return <VendorAdminDashboard summary={summary} overview={overview ?? null} />;
        }
    };

    return (
        <Box p={3}>
            {/* Header with Tenant Selection */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4" component="h1">
                        Vendor Dashboard
                    </Typography>
                    {selectedTenant && (
                        <Typography variant="body2" color="text.secondary">
                            Tenant: {selectedTenant.name}
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button variant="outlined" startIcon={<Refresh />} onClick={refresh} disabled={loading}>
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {/* Tenant Selection Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={2}>
                        <Typography variant="h6">Select Tenant</Typography>
                        <Autocomplete
                            options={filteredTenants}
                            getOptionLabel={(option) => `${option.name} (${option.domain})`}
                            value={tenants.find((t) => t.id === tenantId) || null}
                            onChange={(_, newValue) => {
                                if (newValue) {
                                    selectTenant(newValue.id);
                                    setTenantId(newValue.id);
                                }
                            }}
                            onInputChange={(_, newValue) => setTenantSearchTerm(newValue)}
                            loading={tenantsLoading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Search tenants..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <InputAdornment position="start">
                                                    <Domain />
                                                </InputAdornment>
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            noOptionsText={tenantSearchTerm.length > 0 ? 'No tenants found' : 'No tenants available'}
                        />
                        {selectedTenant && (
                            <Alert severity="success">
                                Managing: <strong>{selectedTenant.name}</strong> ({selectedTenant.domain})
                            </Alert>
                        )}
                        {!tenantId && (
                            <Alert severity="info">
                                Please select a tenant to view dashboard data
                            </Alert>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading && !overview && (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            )}

            {/* Statistics Cards */}
            {tenantId && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    {statsCards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography color="text.secondary" variant="body2" gutterBottom>
                                                {card.title}
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                                            </Typography>
                                            {card.detail && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {card.detail}
                                                </Typography>
                                            )}
                                            {card.trend !== null && (
                                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                                                    {card.trend >= 0 ? (
                                                        <TrendingUp fontSize="small" color="success" />
                                                    ) : (
                                                        <TrendingDown fontSize="small" color="error" />
                                                    )}
                                                    <Typography
                                                        variant="caption"
                                                        color={card.trend >= 0 ? 'success.main' : 'error.main'}
                                                    >
                                                        {card.trend >= 0 ? '+' : ''}{card.trend}% this week
                                                    </Typography>
                                                </Stack>
                                            )}
                                        </Box>
                                        <Avatar
                                            sx={{
                                                bgcolor: `${card.color}.light`,
                                                color: `${card.color}.main`,
                                            }}
                                        >
                                            {card.icon}
                                        </Avatar>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Role Tabs and Dashboard */}
            {tenantId && summaries.length > 0 && (
                <>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Your Role Assignments
                            </Typography>
                            <Tabs
                                value={activeIndex}
                                onChange={(_, index) => setActiveIndex(index)}
                                variant="scrollable"
                                scrollButtons="auto"
                                aria-label="Role dashboards"
                            >
                                {summaries.map((summary, index) => (
                                    <Tab
                                        key={summary.binding_id ?? summary.org.id}
                                        value={index}
                                        label={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label={summary.role_label}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                                <Typography variant="body2">{summary.org.name}</Typography>
                                            </Stack>
                                        }
                                    />
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>

                    {activeSummary && (
                        <Box mb={3}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                                {activeSummary.path.map((node) => (
                                    <Chip
                                        key={node.id}
                                        label={node.name}
                                        icon={<ViewModule fontSize="small" />}
                                        variant="outlined"
                                        onClick={() => navigate(`/tenants/vendors/${node.id}`)}
                                    />
                                ))}
                            </Stack>
                            {renderRoleDashboard(activeSummary)}
                        </Box>
                    )}
                </>
            )}

            {tenantId && summaries.length === 0 && !loading && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                            <People sx={{ fontSize: 60, color: 'text.secondary' }} />
                            <Typography variant="h6" color="text.secondary">
                                No Role Assignments Found
                            </Typography>
                            <Typography color="text.secondary" textAlign="center">
                                You don't have any vendor role bindings for this tenant.
                                Contact your administrator to get assigned to an organisation.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Business />}
                                onClick={() => navigate('/tenants/vendors')}
                            >
                                View Organisations
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Quick Actions
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {quickActions.map((action) => (
                            <Grid item xs={12} sm={6} md={3} key={action.id}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: action.color,
                                            bgcolor: 'action.hover',
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                    onClick={() => handleQuickAction(action)}
                                >
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: action.color }}>
                                            {action.icon}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2">{action.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {action.description}
                                            </Typography>
                                        </Box>
                                        <ArrowForward color="action" />
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            {overview?.recent_transactions && overview.recent_transactions.length > 0 && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Recent Transactions</Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/transactions')}
                            >
                                View All
                            </Button>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            {overview.recent_transactions.slice(0, 5).map((tx) => (
                                <Paper key={tx.id} variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar sx={{ bgcolor: tx.status === 'success' ? 'success.light' : 'warning.light' }}>
                                                <Receipt />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2">{tx.reference}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {tx.org_name || 'Unknown'} • {new Date(tx.created_at).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack alignItems="flex-end">
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {formatCurrency(tx.value)}
                                            </Typography>
                                            <Chip
                                                label={tx.status}
                                                size="small"
                                                color={tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                                            />
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default Dashboard;
