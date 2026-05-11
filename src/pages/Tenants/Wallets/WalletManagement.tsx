import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Divider,
    Autocomplete,
    InputAdornment,
    Snackbar,
    List,
    ListItemButton,
    ListItemText,
    Avatar,
    LinearProgress,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Refresh,
    Send,
    AccountTree,
    Info,
    AccountBalanceWallet,
    Domain,
    Search,
    ChevronRight,
    ArrowDropDown,
    Add,
    Lock,
    LockOpen,
    History,
    TrendingUp,
    TrendingDown,
} from '@mui/icons-material';
import { useVendorHierarchy } from '../../../contexts/VendorContext';
import { useOrgWallets } from '../../../hooks/useOrgWallets';
import { useTenants } from '../../../hooks/useTenants';
import { WalletTransferPayload, VendorOrg } from '../../../types/vendor';

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value));

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

const WalletManagement: React.FC = () => {
    const { tenantId, setTenantId, selectedOrg, selectedOrgId, selectOrg, tree, refresh } = useVendorHierarchy();
    const { tenants, loading: tenantsLoading, selectTenant, selectedTenant } = useTenants();
    const { wallets, loading, error, transfer, totalBalance, refresh: refreshWallets } = useOrgWallets(selectedOrgId);

    // UI States
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
    const [walletDetailsDialogOpen, setWalletDetailsDialogOpen] = useState(false);
    const [selectedWalletDetails, setSelectedWalletDetails] = useState<typeof wallets[0] | null>(null);
    const [transferForm, setTransferForm] = useState<WalletTransferPayload>({
        destination_owner_type: 'vendor_org',
        destination_owner_id: '',
        amount: 0,
        description: '',
    });
    const [actionError, setActionError] = useState<string | null>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [tenantSearchTerm, setTenantSearchTerm] = useState('');
    const [orgSearchTerm, setOrgSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [tabValue, setTabValue] = useState(0);

    // Mock transaction history (in real app, this would come from backend)
    const [transactionHistory] = useState([
        { id: '1', type: 'transfer_out', amount: 5000, reference: 'TXN001', date: new Date().toISOString(), status: 'success', recipient: 'Sub-vendor A' },
        { id: '2', type: 'transfer_in', amount: 10000, reference: 'TXN002', date: new Date(Date.now() - 3600000).toISOString(), status: 'success', sender: 'Vendor Admin' },
        { id: '3', type: 'commission', amount: 250, reference: 'COM001', date: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
    ]);

    // Sync tenant selection
    useEffect(() => {
        if (selectedTenant?.id && selectedTenant.id !== tenantId) {
            setTenantId(selectedTenant.id);
        }
    }, [selectedTenant, tenantId, setTenantId]);

    // Auto-select first tenant
    useEffect(() => {
        if (!tenantId && tenants.length > 0) {
            selectTenant(tenants[0].id);
            setTenantId(tenants[0].id);
        }
    }, [tenantId, tenants, selectTenant, setTenantId]);

    // Auto-select first org
    useEffect(() => {
        if (!selectedOrgId && tree && tree.length > 0) {
            selectOrg(tree[0].id);
        }
    }, [selectedOrgId, tree, selectOrg]);

    // Filtered tenants
    const filteredTenants = useMemo(() => {
        if (!tenantSearchTerm.trim()) return tenants;
        const term = tenantSearchTerm.toLowerCase();
        return tenants.filter(
            (t) =>
                t.name.toLowerCase().includes(term) ||
                t.domain.toLowerCase().includes(term)
        );
    }, [tenants, tenantSearchTerm]);

    // Filtered tree
    const filteredTree = useMemo(() => {
        if (!orgSearchTerm.trim()) return tree;
        const term = orgSearchTerm.toLowerCase();
        const filterNodes = (nodes: VendorOrg[]): VendorOrg[] => {
            return nodes.reduce((acc: VendorOrg[], node) => {
                const matches = node.name.toLowerCase().includes(term);
                const filteredChildren = node.children ? filterNodes(node.children) : [];
                if (matches || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children,
                    });
                }
                return acc;
            }, []);
        };
        return filterNodes(tree);
    }, [tree, orgSearchTerm]);

    // Org options for transfer
    const orgOptions = useMemo(() => {
        const options: { label: string; value: string; level: string }[] = [];
        const traverse = (nodes: typeof tree, path: string = '') => {
            if (!nodes || !Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                const fullPath = path ? `${path} > ${node.name}` : node.name;
                options.push({ label: fullPath, value: node.id, level: node.level });
                if (node.children?.length) traverse(node.children, fullPath);
            });
        };
        traverse(tree);
        return options;
    }, [tree]);

    // Wallet statistics
    const walletStats = useMemo(() => {
        if (!wallets.length) return null;
        const total = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
        const locked = wallets.filter(w => w.is_locked).length;
        const active = wallets.filter(w => !w.is_locked).length;
        return { total, locked, active, count: wallets.length };
    }, [wallets]);

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const clone = new Set(prev);
            if (clone.has(id)) {
                clone.delete(id);
            } else {
                clone.add(id);
            }
            return clone;
        });
    };

    const handleTransferClick = (walletId: string) => {
        setSelectedWalletId(walletId);
        setTransferForm({ destination_owner_type: 'vendor_org', destination_owner_id: '', amount: 0, description: '' });
        setActionError(null);
        setTransferDialogOpen(true);
    };

    const handleTransferSubmit = async () => {
        if (!selectedWalletId) return;

        const sourceWallet = wallets.find(w => w.id === selectedWalletId);
        if (sourceWallet && transferForm.amount > Number(sourceWallet.balance)) {
            setActionError('Transfer amount exceeds wallet balance');
            return;
        }

        setTransferLoading(true);
        setActionError(null);
        try {
            await transfer(selectedWalletId, transferForm);
            setTransferDialogOpen(false);
            setTransferForm({
                destination_owner_type: 'vendor_org',
                destination_owner_id: '',
                amount: 0,
                description: '',
            });
            setSuccess('Transfer completed successfully!');
            refreshWallets();
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || 'Failed to transfer funds');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleViewWalletDetails = (wallet: typeof wallets[0]) => {
        setSelectedWalletDetails(wallet);
        setWalletDetailsDialogOpen(true);
    };

    const renderTree = (nodes: VendorOrg[], depth = 0) => (
        <List disablePadding dense>
            {nodes.map((node) => {
                const hasChildren = Boolean(node.children?.length);
                const isExpanded = expandedIds.has(node.id);
                const nodeWalletCount = 0; // Would come from backend
                return (
                    <Box key={node.id}>
                        <ListItemButton
                            selected={node.id === selectedOrgId}
                            onClick={() => selectOrg(node.id)}
                            sx={{ pl: depth * 2 + 1, py: 0.5 }}
                        >
                            {hasChildren ? (
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}
                                    sx={{ mr: 0.5 }}
                                >
                                    {isExpanded ? <ArrowDropDown fontSize="small" /> : <ChevronRight fontSize="small" />}
                                </IconButton>
                            ) : (
                                <Box sx={{ width: 28 }} />
                            )}
                            <ListItemText
                                primary={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2">{node.name}</Typography>
                                        <Chip
                                            label={node.level.replace('_', ' ')}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                        />
                                    </Stack>
                                }
                            />
                        </ListItemButton>
                        {hasChildren && isExpanded && node.children && renderTree(node.children, depth + 1)}
                    </Box>
                );
            })}
        </List>
    );

    return (
        <Box p={3}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Wallet Management</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => { refresh(); refreshWallets(); }}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {actionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                    {actionError}
                </Alert>
            )}

            {/* Success Snackbar */}
            <Snackbar
                open={!!success}
                autoHideDuration={4000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>

            <Grid container spacing={3}>
                {/* Left Panel - Tenant & Organisation Selection */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                        {/* Tenant Selection */}
                        <Card>
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
                                        size="small"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder="Search tenants..."
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <>
                                                            <InputAdornment position="start">
                                                                <Domain fontSize="small" />
                                                            </InputAdornment>
                                                            {params.InputProps.startAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Organisation Tree */}
                        <Card>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Typography variant="h6">Select Organisation</Typography>
                                    <TextField
                                        placeholder="Search organisations..."
                                        size="small"
                                        value={orgSearchTerm}
                                        onChange={(e) => setOrgSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    {!tenantId ? (
                                        <Alert severity="info" sx={{ py: 1 }}>
                                            Select a tenant first
                                        </Alert>
                                    ) : loading && (!tree || !tree.length) ? (
                                        <Box display="flex" justifyContent="center" py={2}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : filteredTree.length ? (
                                        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                            {renderTree(filteredTree)}
                                        </Box>
                                    ) : (
                                        <Alert severity="info" sx={{ py: 1 }}>
                                            No organisations found
                                        </Alert>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Selected Org Summary */}
                        {selectedOrg && (
                            <Card>
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Typography variant="h6">Selected Organisation</Typography>
                                        <Stack spacing={1}>
                                            <Typography variant="subtitle1" fontWeight="medium">
                                                {selectedOrg.name}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Chip label={selectedOrg.level.replace('_', ' ')} size="small" variant="outlined" />
                                                <Chip
                                                    label={selectedOrg.status}
                                                    size="small"
                                                    color={selectedOrg.status === 'active' ? 'success' : 'warning'}
                                                />
                                            </Stack>
                                        </Stack>
                                        {walletStats && (
                                            <>
                                                <Divider />
                                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                                    <Typography variant="caption">Total Balance</Typography>
                                                    <Typography variant="h5" fontWeight="bold">
                                                        {formatCurrency(walletStats.total)}
                                                    </Typography>
                                                </Paper>
                                                <Stack direction="row" spacing={1}>
                                                    <Chip
                                                        label={`${walletStats.active} active`}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                    {walletStats.locked > 0 && (
                                                        <Chip
                                                            label={`${walletStats.locked} locked`}
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Stack>
                                            </>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>

                {/* Right Panel - Wallets */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    Wallets {wallets.length > 0 && `(${wallets.length})`}
                                </Typography>
                            </Stack>

                            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                                <Tab label="Wallets" icon={<AccountBalanceWallet />} iconPosition="start" />
                                <Tab label="Transaction History" icon={<History />} iconPosition="start" />
                            </Tabs>

                            <TabPanel value={tabValue} index={0}>
                                {!selectedOrg ? (
                                    <Alert severity="info">
                                        Select an organisation to view its wallets
                                    </Alert>
                                ) : loading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : wallets.length ? (
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Wallet Key</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell>Role</TableCell>
                                                    <TableCell align="right">Balance</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {wallets.map((wallet) => (
                                                    <TableRow key={wallet.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" fontFamily="monospace">
                                                                {wallet.key}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={wallet.type} size="small" color="primary" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>
                                                            {wallet.role ? (
                                                                <Chip label={wallet.role} size="small" variant="outlined" />
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="subtitle2" fontWeight="bold">
                                                                {formatCurrency(wallet.balance)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={wallet.is_locked ? 'Locked' : 'Active'}
                                                                size="small"
                                                                color={wallet.is_locked ? 'error' : 'success'}
                                                                icon={wallet.is_locked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                <Tooltip title="View Details">
                                                                    <IconButton size="small" onClick={() => handleViewWalletDetails(wallet)}>
                                                                        <Info fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<Send />}
                                                                    onClick={() => handleTransferClick(wallet.id)}
                                                                    disabled={Number(wallet.balance) <= 0 || wallet.is_locked}
                                                                >
                                                                    Transfer
                                                                </Button>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                                        <AccountBalanceWallet sx={{ fontSize: 48, color: 'text.secondary' }} />
                                        <Typography color="text.secondary">
                                            No wallets found for this organisation
                                        </Typography>
                                    </Stack>
                                )}
                            </TabPanel>

                            <TabPanel value={tabValue} index={1}>
                                {!selectedOrg ? (
                                    <Alert severity="info">
                                        Select an organisation to view transaction history
                                    </Alert>
                                ) : transactionHistory.length ? (
                                    <Stack spacing={2}>
                                        {transactionHistory.map((tx) => (
                                            <Paper key={tx.id} variant="outlined" sx={{ p: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Avatar
                                                            sx={{
                                                                bgcolor: tx.type === 'transfer_in' || tx.type === 'commission'
                                                                    ? 'success.light'
                                                                    : 'error.light',
                                                            }}
                                                        >
                                                            {tx.type === 'transfer_in' || tx.type === 'commission' ? (
                                                                <TrendingUp />
                                                            ) : (
                                                                <TrendingDown />
                                                            )}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2">
                                                                {tx.type === 'transfer_in' ? 'Received' :
                                                                    tx.type === 'transfer_out' ? 'Sent' : 'Commission'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {tx.reference} • {new Date(tx.date).toLocaleString()}
                                                            </Typography>
                                                            {tx.recipient && (
                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                    To: {tx.recipient}
                                                                </Typography>
                                                            )}
                                                            {tx.sender && (
                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                    From: {tx.sender}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                    <Stack alignItems="flex-end">
                                                        <Typography
                                                            variant="subtitle1"
                                                            fontWeight="bold"
                                                            color={tx.type === 'transfer_in' || tx.type === 'commission' ? 'success.main' : 'error.main'}
                                                        >
                                                            {tx.type === 'transfer_in' || tx.type === 'commission' ? '+' : '-'}
                                                            {formatCurrency(tx.amount)}
                                                        </Typography>
                                                        <Chip label={tx.status} size="small" color="success" />
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Alert severity="info">No transaction history available</Alert>
                                )}
                            </TabPanel>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Transfer Dialog */}
            <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Send color="primary" />
                        <Typography variant="h6">Transfer Funds</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {actionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                            {actionError}
                        </Alert>
                    )}
                    <Stack spacing={3} mt={1}>
                        {selectedWalletId && (
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="caption" color="text.secondary">
                                    Source Wallet
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {wallets.find(w => w.id === selectedWalletId)?.key || '—'}
                                </Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                    Balance: {formatCurrency(wallets.find(w => w.id === selectedWalletId)?.balance || 0)}
                                </Typography>
                            </Paper>
                        )}
                        <Autocomplete
                            options={orgOptions.filter(o => o.value !== selectedOrgId)}
                            getOptionLabel={(option) => option.label}
                            value={orgOptions.find(o => o.value === transferForm.destination_owner_id) || null}
                            onChange={(_, newValue) => {
                                setTransferForm(prev => ({
                                    ...prev,
                                    destination_owner_id: newValue?.value || ''
                                }));
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Destination Organisation"
                                    placeholder="Select destination..."
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props}>
                                    <Stack>
                                        <Typography variant="body2">{option.label}</Typography>
                                        <Chip label={option.level.replace('_', ' ')} size="small" sx={{ width: 'fit-content' }} />
                                    </Stack>
                                </li>
                            )}
                        />
                        <TextField
                            type="number"
                            label="Amount"
                            value={transferForm.amount || ''}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setTransferForm((prev) => ({ ...prev, amount: val > 0 ? val : 0 }));
                            }}
                            fullWidth
                            InputProps={{
                                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                            }}
                            error={!!(selectedWalletId && transferForm.amount > Number(wallets.find(w => w.id === selectedWalletId)?.balance || 0))}
                            helperText={
                                selectedWalletId && transferForm.amount > Number(wallets.find(w => w.id === selectedWalletId)?.balance || 0)
                                    ? 'Amount exceeds wallet balance'
                                    : 'Enter the amount to transfer'
                            }
                        />
                        <TextField
                            label="Description (Optional)"
                            value={transferForm.description || ''}
                            onChange={(e) => setTransferForm((prev) => ({ ...prev, description: e.target.value }))}
                            multiline
                            rows={2}
                            placeholder="Add a note for this transfer..."
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setTransferDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleTransferSubmit}
                        disabled={
                            transferLoading ||
                            !transferForm.destination_owner_id ||
                            transferForm.amount <= 0 ||
                            !!(selectedWalletId && transferForm.amount > Number(wallets.find(w => w.id === selectedWalletId)?.balance || 0))
                        }
                        startIcon={transferLoading ? <CircularProgress size={16} /> : <Send />}
                    >
                        {transferLoading ? 'Transferring...' : 'Transfer'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Wallet Details Dialog */}
            <Dialog open={walletDetailsDialogOpen} onClose={() => setWalletDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AccountBalanceWallet color="primary" />
                        <Typography variant="h6">Wallet Details</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedWalletDetails && (
                        <Stack spacing={3} mt={1}>
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                                <Typography variant="caption">Balance</Typography>
                                <Typography variant="h3" fontWeight="bold">
                                    {formatCurrency(selectedWalletDetails.balance)}
                                </Typography>
                            </Paper>

                            <Divider />

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Wallet Key</Typography>
                                    <Typography variant="body1" fontFamily="monospace">
                                        {selectedWalletDetails.key}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Type</Typography>
                                    <Box mt={0.5}>
                                        <Chip label={selectedWalletDetails.type} color="primary" />
                                    </Box>
                                </Grid>
                                {selectedWalletDetails.role && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Role</Typography>
                                        <Box mt={0.5}>
                                            <Chip label={selectedWalletDetails.role} variant="outlined" />
                                        </Box>
                                    </Grid>
                                )}
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Status</Typography>
                                    <Box mt={0.5}>
                                        <Chip
                                            label={selectedWalletDetails.is_locked ? 'Locked' : 'Active'}
                                            color={selectedWalletDetails.is_locked ? 'error' : 'success'}
                                            icon={selectedWalletDetails.is_locked ? <Lock /> : <LockOpen />}
                                        />
                                    </Box>
                                </Grid>
                                {selectedWalletDetails.daily_limit && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Daily Limit</Typography>
                                        <Typography variant="body1">
                                            {formatCurrency(selectedWalletDetails.daily_limit)}
                                        </Typography>
                                        {selectedWalletDetails.daily_spent && (
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(100, (Number(selectedWalletDetails.daily_spent) / Number(selectedWalletDetails.daily_limit)) * 100)}
                                                sx={{ mt: 1, borderRadius: 1 }}
                                            />
                                        )}
                                    </Grid>
                                )}
                                {selectedWalletDetails.monthly_limit && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Monthly Limit</Typography>
                                        <Typography variant="body1">
                                            {formatCurrency(selectedWalletDetails.monthly_limit)}
                                        </Typography>
                                    </Grid>
                                )}
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Created</Typography>
                                    <Typography variant="body1">
                                        {new Date(selectedWalletDetails.created_at).toLocaleString()}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setWalletDetailsDialogOpen(false)}>
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (selectedWalletDetails) {
                                handleTransferClick(selectedWalletDetails.id);
                                setWalletDetailsDialogOpen(false);
                            }
                        }}
                        disabled={!selectedWalletDetails || Number(selectedWalletDetails.balance) <= 0 || selectedWalletDetails.is_locked}
                        startIcon={<Send />}
                    >
                        Transfer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WalletManagement;
