import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Stack,
    Divider,
    Button,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Paper,
    Tabs,
    Tab,
    Avatar,
    LinearProgress,
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Delete,
    PersonAdd,
    Refresh,
    AccountBalance,
    Receipt,
    People,
    Settings,
    Key,
    CheckCircle,
    Warning,
    TrendingUp,
    TrendingDown,
    ContentCopy,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useVendorHierarchy } from '../../../contexts/VendorContext';
import { useOrgBindings } from '../../../hooks/useOrgBindings';
import { useOrgWallets } from '../../../hooks/useOrgWallets';
import { VendorOrgStatus, VendorRole } from '../../../types/vendor';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value));

const VendorDetails: React.FC = () => {
    const navigate = useNavigate();
    const { vendorId } = useParams<{ vendorId: string }>();
    const { tree, selectedOrg, selectOrg, updateOrg, removeOrg, refresh } = useVendorHierarchy();
    const { bindings, loading: bindingsLoading, createBinding, updateBinding, removeBinding } = useOrgBindings(vendorId || null);
    const { wallets, loading: walletsLoading, totalBalance } = useOrgWallets(vendorId || null);

    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState<{ name: string; status: VendorOrgStatus }>({ name: '', status: 'active' });

    // Add user dialog state
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [addUserForm, setAddUserForm] = useState<{ user: string; role: VendorRole }>({ user: '', role: 'vendor' });

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Find the vendor in the tree
    const vendor = useMemo(() => {
        const findVendor = (nodes: typeof tree, id: string): typeof tree[0] | null => {
            if (!nodes || !Array.isArray(nodes)) return null;
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.children?.length) {
                    const found = findVendor(node.children, id);
                    if (found) return found;
                }
            }
            return null;
        };
        return vendorId ? findVendor(tree, vendorId) : null;
    }, [tree, vendorId]);

    // Mock statistics
    const stats = useMemo(() => ({
        totalTransactions: Math.floor(Math.random() * 1000) + 100,
        monthlyVolume: Math.floor(Math.random() * 10000000) + 500000,
        averageTransactionValue: Math.floor(Math.random() * 50000) + 5000,
        growth: Math.floor(Math.random() * 40) - 10,
    }), [vendorId]);

    // Mock recent transactions
    const recentTransactions = useMemo(() => [
        { id: '1', reference: 'TXN001', amount: 15000, status: 'success', date: new Date().toISOString() },
        { id: '2', reference: 'TXN002', amount: 8500, status: 'success', date: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', reference: 'TXN003', amount: 25000, status: 'pending', date: new Date(Date.now() - 7200000).toISOString() },
        { id: '4', reference: 'TXN004', amount: 3200, status: 'failed', date: new Date(Date.now() - 10800000).toISOString() },
    ], []);

    useEffect(() => {
        if (vendorId) {
            selectOrg(vendorId);
        }
    }, [vendorId, selectOrg]);

    useEffect(() => {
        if (vendor) {
            setEditForm({ name: vendor.name, status: vendor.status });
        }
    }, [vendor]);

    const handleEdit = async () => {
        if (!vendorId) return;
        setLoading(true);
        try {
            await updateOrg(vendorId, editForm);
            setEditDialogOpen(false);
            setSuccess('Vendor updated successfully');
            refresh();
        } catch (err: any) {
            setError(err?.message || 'Failed to update vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!vendorId) return;
        setLoading(true);
        try {
            await removeOrg(vendorId);
            setSuccess('Vendor deleted successfully');
            navigate('/tenants/vendors');
        } catch (err: any) {
            setError(err?.message || 'Failed to delete vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!vendorId) return;
        setLoading(true);
        try {
            await createBinding(addUserForm);
            setAddUserDialogOpen(false);
            setAddUserForm({ user: '', role: 'vendor' });
            setSuccess('User added successfully');
        } catch (err: any) {
            setError(err?.message || 'Failed to add user');
        } finally {
            setLoading(false);
        }
    };

    if (!vendor) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    Vendor not found. <Button onClick={() => navigate('/tenants/vendors')}>Go back</Button>
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <IconButton onClick={() => navigate('/tenants/vendors')}>
                    <ArrowBack />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4">{vendor.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                            label={vendor.level.replace('_', ' ')}
                            size="small"
                            variant="outlined"
                        />
                        <Chip
                            label={vendor.status}
                            size="small"
                            color={vendor.status === 'active' ? 'success' : 'warning'}
                        />
                    </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={refresh}>
                        Refresh
                    </Button>
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditDialogOpen(true)}>
                        Edit
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteDialogOpen(true)}>
                        Delete
                    </Button>
                </Stack>
            </Stack>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Wallet Balance
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {formatCurrency(totalBalance)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.light' }}>
                                    <AccountBalance />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Total Transactions
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {stats.totalTransactions.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.light' }}>
                                    <Receipt />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Monthly Volume
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {formatCurrency(stats.monthlyVolume)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'warning.light' }}>
                                    {stats.growth >= 0 ? <TrendingUp /> : <TrendingDown />}
                                </Avatar>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(100, Math.abs(stats.growth) * 2.5)}
                                color={stats.growth >= 0 ? 'success' : 'error'}
                                sx={{ mt: 2, borderRadius: 1 }}
                            />
                            <Typography variant="caption" color={stats.growth >= 0 ? 'success.main' : 'error.main'}>
                                {stats.growth >= 0 ? '+' : ''}{stats.growth}% from last month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Team Members
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {bindings.length}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'info.light' }}>
                                    <People />
                                </Avatar>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content Tabs */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab icon={<Settings />} label="Details" iconPosition="start" />
                        <Tab icon={<AccountBalance />} label="Wallets" iconPosition="start" />
                        <Tab icon={<People />} label="Team" iconPosition="start" />
                        <Tab icon={<Receipt />} label="Transactions" iconPosition="start" />
                    </Tabs>
                </Box>

                {/* Details Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Basic Information</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Name</TableCell>
                                            <TableCell>{vendor.name}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Slug</TableCell>
                                            <TableCell>{vendor.slug}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Level</TableCell>
                                            <TableCell>
                                                <Chip label={vendor.level.replace('_', ' ')} size="small" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vendor.status}
                                                    size="small"
                                                    color={vendor.status === 'active' ? 'success' : 'warning'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                                                        {vendor.id}
                                                    </Typography>
                                                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(vendor.id)}>
                                                        <ContentCopy fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Hierarchy</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Parent</TableCell>
                                            <TableCell>{vendor.parent || 'Root Organization'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Children</TableCell>
                                            <TableCell>{vendor.children?.length || 0} sub-organizations</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {vendor.children && vendor.children.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>Child Organizations</Typography>
                                    <Stack spacing={1}>
                                        {vendor.children.map((child) => (
                                            <Paper
                                                key={child.id}
                                                variant="outlined"
                                                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                onClick={() => navigate(`/tenants/vendors/${child.id}`)}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2">{child.name}</Typography>
                                                    <Chip label={child.level.replace('_', ' ')} size="small" variant="outlined" />
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Wallets Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">Wallets</Typography>
                        <Chip
                            label={`Total: ${formatCurrency(totalBalance)}`}
                            color="primary"
                        />
                    </Stack>
                    {walletsLoading ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <CircularProgress />
                        </Box>
                    ) : wallets.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Key</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell align="right">Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {wallets.map((wallet) => (
                                        <TableRow key={wallet.id}>
                                            <TableCell>{wallet.key}</TableCell>
                                            <TableCell>
                                                <Chip label={wallet.type} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                {wallet.role ? <Chip label={wallet.role} size="small" variant="outlined" /> : '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="bold">
                                                    {formatCurrency(wallet.balance)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={wallet.is_locked ? 'Locked' : 'Active'}
                                                    size="small"
                                                    color={wallet.is_locked ? 'error' : 'success'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Alert severity="info">No wallets found for this organization.</Alert>
                    )}
                </TabPanel>

                {/* Team Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">Team Members</Typography>
                        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddUserDialogOpen(true)}>
                            Add User
                        </Button>
                    </Stack>
                    {bindingsLoading ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <CircularProgress />
                        </Box>
                    ) : bindings.length > 0 ? (
                        <Stack spacing={2}>
                            {bindings.map((binding) => (
                                <Paper key={binding.id} variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar>
                                                {binding.user_email?.charAt(0).toUpperCase() || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1">{binding.user_email}</Typography>
                                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                    <Chip label={binding.role.replace('_', ' ')} size="small" />
                                                    <Chip
                                                        label={binding.status}
                                                        size="small"
                                                        color={binding.status === 'active' ? 'success' : 'warning'}
                                                    />
                                                </Stack>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => updateBinding(binding.id, {
                                                    status: binding.status === 'active' ? 'suspended' : 'active'
                                                })}
                                            >
                                                {binding.status === 'active' ? 'Suspend' : 'Activate'}
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => removeBinding(binding.id)}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        <Alert severity="info">No team members assigned yet.</Alert>
                    )}
                </TabPanel>

                {/* Transactions Tab */}
                <TabPanel value={tabValue} index={3}>
                    <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reference</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {tx.reference}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight="bold">
                                                {formatCurrency(tx.amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={tx.status}
                                                size="small"
                                                color={tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                                                icon={tx.status === 'success' ? <CheckCircle /> : <Warning />}
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button variant="outlined" onClick={() => navigate('/transactions')}>
                            View All Transactions
                        </Button>
                    </Box>
                </TabPanel>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Vendor</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Status"
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as VendorOrgStatus })}
                            SelectProps={{ native: true }}
                        >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="invited">Invited</option>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleEdit} disabled={loading}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add User Dialog */}
            <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="User ID"
                            value={addUserForm.user}
                            onChange={(e) => setAddUserForm({ ...addUserForm, user: e.target.value })}
                            helperText="Enter the UUID of the user to add"
                        />
                        <TextField
                            fullWidth
                            select
                            label="Role"
                            value={addUserForm.role}
                            onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as VendorRole })}
                            SelectProps={{ native: true }}
                        >
                            <option value="vendor">Vendor Admin</option>
                            <option value="sub_vendor">Sub-vendor</option>
                            <option value="agent">Agent</option>
                            <option value="cashier">Cashier</option>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddUser} disabled={loading || !addUserForm.user}>
                        Add User
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle color="error">Delete Vendor</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This action cannot be undone!
                    </Alert>
                    <Typography>
                        Are you sure you want to delete <strong>{vendor.name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will also delete all child organizations, role bindings, and wallet associations.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>
                        Delete Permanently
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VendorDetails;
