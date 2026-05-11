import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Stack,
    List,
    ListItemButton,
    ListItemText,
    Divider,
    Autocomplete,
    InputAdornment,
    Paper,
    Tooltip,
    Snackbar,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    ChevronRight,
    ArrowDropDown,
    PersonAdd,
    Refresh,
    Save as SaveIcon,
    Warning as WarningIcon,
    Domain,
    Search,
    CheckCircle,
    Business,
    AccountBalance,
    People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useVendorHierarchy } from '../../../contexts/VendorContext';
import { useOrgBindings } from '../../../hooks/useOrgBindings';
import { useOrgWallets } from '../../../hooks/useOrgWallets';
import { useTenants } from '../../../hooks/useTenants';
import { VendorOrgForm, VendorRole } from '../../../types/vendor';

const LEVEL_OPTIONS: { label: string; value: VendorOrgForm['level']; description: string }[] = [
    { label: 'Vendor Admin', value: 'vendor', description: 'Top-level organisation within the tenant' },
    { label: 'Sub-vendor', value: 'sub_vendor', description: 'Secondary vendor managed by a vendor admin' },
    { label: 'Agent', value: 'agent', description: 'Supervises cashiers and field operations' },
    { label: 'Cashier', value: 'cashier', description: 'Performs transactions at the point of sale' },
];

const ROLE_OPTIONS: { label: string; value: VendorRole }[] = [
    { label: 'Vendor Admin', value: 'vendor' },
    { label: 'Sub-vendor', value: 'sub_vendor' },
    { label: 'Agent', value: 'agent' },
    { label: 'Cashier', value: 'cashier' },
];

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
    }).format(Number(value));

interface UserOption {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

const VendorManagement: React.FC = () => {
    const navigate = useNavigate();
    const {
        tenantId,
        setTenantId,
        tree,
        loading,
        error,
        selectedOrg,
        selectedOrgId,
        selectOrg,
        createOrg,
        updateOrg,
        removeOrg,
        refresh,
    } = useVendorHierarchy();

    const { tenants, loading: tenantsLoading, selectTenant, selectedTenantId, selectedTenant } = useTenants();
    const { bindings, loading: bindingsLoading, createBinding, updateBinding, removeBinding, refresh: refreshBindings } = useOrgBindings(selectedOrgId);
    const { wallets, loading: walletsLoading, totalBalance } = useOrgWallets(selectedOrgId);

    // UI States
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [formState, setFormState] = useState<VendorOrgForm>({ name: '', level: 'vendor', parent: null, status: 'active' });
    const [bindingForm, setBindingForm] = useState({ user: '', role: 'vendor' as VendorRole });
    const [actionError, setActionError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [tenantSearchTerm, setTenantSearchTerm] = useState('');
    const [orgSearchTerm, setOrgSearchTerm] = useState('');

    // User search for binding
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userOptions, setUserOptions] = useState<UserOption[]>([]);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

    // Sync tenant selection
    useEffect(() => {
        if (selectedTenantId && selectedTenantId !== tenantId) {
            setTenantId(selectedTenantId);
        }
    }, [selectedTenantId, tenantId, setTenantId]);

    // Auto-select first tenant
    useEffect(() => {
        if (!tenantId && tenants.length > 0) {
            const firstTenant = tenants[0];
            selectTenant(firstTenant.id);
            setTenantId(firstTenant.id);
        }
    }, [tenantId, tenants, selectTenant, setTenantId]);

    // Auto-select first org
    useEffect(() => {
        if (!selectedOrgId && tree && tree.length > 0) {
            selectOrg(tree[0].id);
        }
    }, [selectedOrgId, tree, selectOrg]);

    // User search API call
    useEffect(() => {
        const searchUsers = async () => {
            if (userSearchTerm.length < 2) {
                setUserOptions([]);
                return;
            }
            setUserSearchLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `http://localhost:8001/api/v1/users/?search=${encodeURIComponent(userSearchTerm)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    const users = Array.isArray(data) ? data : data.results || [];
                    setUserOptions(users.slice(0, 10));
                }
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setUserSearchLoading(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [userSearchTerm]);

    // Filtered tenants
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

    // Filtered tree for search
    const filteredTree = useMemo(() => {
        if (!tree || !Array.isArray(tree)) return [];
        if (!orgSearchTerm.trim()) return tree;
        const term = orgSearchTerm.toLowerCase();
        const filterNodes = (nodes: typeof tree): typeof tree => {
            if (!nodes || !Array.isArray(nodes)) return [];
            return nodes.reduce((acc, node) => {
                const matches = node.name.toLowerCase().includes(term);
                const filteredChildren = node.children ? filterNodes(node.children) : [];
                if (matches || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children,
                    });
                }
                return acc;
            }, [] as typeof tree);
        };
        return filterNodes(tree);
    }, [tree, orgSearchTerm]);

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

    const handleCreateClick = (parentId: string | null = null, level: VendorOrgForm['level'] = 'vendor') => {
        if (!tenantId) {
            setActionError('Select a tenant before managing organisations.');
            return;
        }
        setFormState({ name: '', level, parent: parentId, status: 'active' });
        setActionError(null);
        setCreateDialogOpen(true);
    };

    const handleEditClick = () => {
        if (!selectedOrg) return;
        setFormState({
            name: selectedOrg.name,
            level: selectedOrg.level,
            parent: selectedOrg.parent,
            status: selectedOrg.status,
        });
        setActionError(null);
        setEditDialogOpen(true);
    };

    const handleCreateSubmit = async () => {
        if (!tenantId) {
            setActionError('Select a tenant before creating organisations.');
            return;
        }
        try {
            await createOrg(formState);
            setCreateDialogOpen(false);
            setSuccess('Organisation created successfully!');
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || 'Failed to create organisation');
        }
    };

    const handleEditSubmit = async () => {
        if (!selectedOrg) return;
        try {
            await updateOrg(selectedOrg.id, formState);
            setEditDialogOpen(false);
            setSuccess('Organisation updated successfully!');
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || 'Failed to update organisation');
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedOrg) return;
        try {
            await removeOrg(selectedOrg.id);
            setDeleteDialogOpen(false);
            setSuccess('Organisation deleted successfully!');
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || 'Failed to delete organisation');
        }
    };

    const handleBindingSubmit = async () => {
        if (!selectedOrgId) return;
        const userId = selectedUser?.id || bindingForm.user;
        if (!userId) {
            setActionError('Please select or enter a user');
            return;
        }
        try {
            await createBinding({ user: userId, role: bindingForm.role });
            setBindingDialogOpen(false);
            setBindingForm({ user: '', role: 'vendor' });
            setSelectedUser(null);
            setUserSearchTerm('');
            setSuccess('User assigned successfully!');
            refreshBindings();
        } catch (err: any) {
            console.error(err);
            setActionError(err?.message || 'Failed to assign user');
        }
    };

    const treeStats = useMemo(() => {
        const totals = { total: 0, active: 0, suspended: 0 };
        const traverse = (nodes: typeof tree) => {
            if (!nodes || !Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                totals.total += 1;
                if (node.status === 'active') totals.active += 1;
                if (node.status === 'suspended') totals.suspended += 1;
                if (node.children?.length) traverse(node.children);
            });
        };
        traverse(tree);
        return totals;
    }, [tree]);

    const renderTree = (nodes: typeof tree, depth = 0) => {
        if (!nodes || !Array.isArray(nodes)) return null;
        return (
            <List disablePadding>
                {nodes.map((node) => {
                    const hasChildren = Boolean(node.children?.length);
                    const isExpanded = expandedIds.has(node.id);
                    return (
                        <Box key={node.id}>
                            <ListItemButton
                                selected={node.id === selectedOrgId}
                                onClick={() => selectOrg(node.id)}
                                sx={{ pl: depth * 2 + 2 }}
                            >
                                {hasChildren && (
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}>
                                        {isExpanded ? <ArrowDropDown /> : <ChevronRight />}
                                    </IconButton>
                                )}
                                {!hasChildren && <Box sx={{ width: 28 }} />}
                                <ListItemText
                                    primary={node.name}
                                    secondary={
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                            <Chip label={node.level.replace('_', ' ')} size="small" variant="outlined" />
                                            <Chip label={node.status} size="small" color={node.status === 'active' ? 'success' : 'warning'} />
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
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Vendor Hierarchy</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={refresh} disabled={!tenantId || loading}>
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleCreateClick(null, 'vendor')}
                        disabled={!tenantId}
                    >
                        Add Vendor Admin
                    </Button>
                </Stack>
            </Stack>

            {/* Alerts */}
            {Boolean(error) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {Boolean(actionError) && (
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
                {/* Left Panel - Tenant & Org Selection */}
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
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder="Search tenants..."
                                                size="small"
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
                                    {selectedTenant && (
                                        <Alert severity="success" icon={<CheckCircle />}>
                                            {selectedTenant.name}
                                        </Alert>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Organisation Tree */}
                        <Card>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6">
                                            Organisations ({treeStats.total})
                                        </Typography>
                                        <Stack direction="row" spacing={0.5}>
                                            <Chip label={`${treeStats.active} active`} size="small" color="success" variant="outlined" />
                                        </Stack>
                                    </Stack>
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
                                        <Alert severity="info">
                                            Select a tenant to load its vendor hierarchy.
                                        </Alert>
                                    ) : loading && (!tree || !tree.length) ? (
                                        <Box display="flex" justifyContent="center" py={4}>
                                            <CircularProgress />
                                        </Box>
                                    ) : filteredTree.length ? (
                                        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                            {renderTree(filteredTree)}
                                        </Box>
                                    ) : (
                                        <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                                            <Business sx={{ fontSize: 48, color: 'text.secondary' }} />
                                            <Typography color="text.secondary" textAlign="center">
                                                No organisations found.
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<Add />}
                                                onClick={() => handleCreateClick(null, 'vendor')}
                                            >
                                                Create First Organisation
                                            </Button>
                                        </Stack>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Panel - Details */}
                <Grid item xs={12} md={8}>
                    <Stack spacing={3}>
                        {/* Organisation Details */}
                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">Organisation Details</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title={!selectedOrg ? 'Select an organisation first' : 'Add child organisation'}>
                                            <span>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Add />}
                                                    onClick={() => handleCreateClick(selectedOrg?.id ?? null, 'sub_vendor')}
                                                    disabled={!selectedOrg}
                                                >
                                                    Add Child
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={!selectedOrg ? 'Select an organisation first' : 'Edit organisation'}>
                                            <span>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Edit />}
                                                    onClick={handleEditClick}
                                                    disabled={!selectedOrg}
                                                >
                                                    Edit
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={!selectedOrg ? 'Select an organisation first' : 'Delete organisation'}>
                                            <span>
                                                <Button
                                                    color="error"
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Delete />}
                                                    onClick={() => setDeleteDialogOpen(true)}
                                                    disabled={!selectedOrg}
                                                >
                                                    Delete
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                                {selectedOrg ? (
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Typography color="text.secondary" variant="body2">Name</Typography>
                                            <Typography variant="subtitle1" fontWeight="medium">{selectedOrg.name}</Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography color="text.secondary" variant="body2">Slug</Typography>
                                            <Typography variant="subtitle1" fontFamily="monospace">{selectedOrg.slug}</Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography color="text.secondary" variant="body2">Level</Typography>
                                            <Chip label={selectedOrg.level.replace('_', ' ')} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography color="text.secondary" variant="body2">Status</Typography>
                                            <Chip label={selectedOrg.status} size="small" color={selectedOrg.status === 'active' ? 'success' : 'warning'} sx={{ mt: 0.5 }} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={() => navigate(`/tenants/vendors/${selectedOrg.id}`)}
                                            >
                                                View Full Details →
                                            </Button>
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Alert severity="info">Select an organisation from the tree to view details.</Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Role Bindings */}
                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <People />
                                        <Typography variant="h6">Role Bindings ({bindings.length})</Typography>
                                    </Stack>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<PersonAdd />}
                                        onClick={() => {
                                            setActionError(null);
                                            setBindingDialogOpen(true);
                                        }}
                                        disabled={!selectedOrg}
                                    >
                                        Assign User
                                    </Button>
                                </Stack>
                                {bindingsLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : bindings.length ? (
                                    <Stack spacing={2}>
                                        {bindings.map((binding) => (
                                            <Paper key={binding.id} variant="outlined" sx={{ p: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box>
                                                        <Typography variant="subtitle1">{binding.user_email}</Typography>
                                                        <Stack direction="row" spacing={1} mt={0.5}>
                                                            <Chip label={binding.role.replace('_', ' ')} size="small" color="primary" />
                                                            <Chip label={binding.status} size="small" color={binding.status === 'active' ? 'success' : 'warning'} />
                                                        </Stack>
                                                    </Box>
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                updateBinding(binding.id, { status: binding.status === 'active' ? 'suspended' : 'active' });
                                                                setSuccess(`User ${binding.status === 'active' ? 'suspended' : 'activated'}`);
                                                            }}
                                                        >
                                                            {binding.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                removeBinding(binding.id);
                                                                setSuccess('User removed from organisation');
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : selectedOrg ? (
                                    <Alert severity="info">No users assigned to this organisation yet.</Alert>
                                ) : (
                                    <Alert severity="info">Select an organisation to view role bindings.</Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Wallet Summary */}
                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AccountBalance />
                                        <Typography variant="h6">Wallet Summary</Typography>
                                    </Stack>
                                    {selectedOrg && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => navigate('/tenants/wallets')}
                                        >
                                            Manage Wallets
                                        </Button>
                                    )}
                                </Stack>
                                {walletsLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : wallets.length ? (
                                    <Stack spacing={2}>
                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                            <Typography variant="caption">Total Balance</Typography>
                                            <Typography variant="h4" fontWeight="bold">
                                                {formatCurrency(totalBalance)}
                                            </Typography>
                                        </Paper>
                                        <Divider />
                                        {wallets.map((wallet) => (
                                            <Stack key={wallet.id} direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="subtitle2">{wallet.key}</Typography>
                                                    <Stack direction="row" spacing={1} mt={0.5}>
                                                        <Chip label={wallet.type} size="small" />
                                                        {wallet.role && <Chip label={wallet.role} size="small" variant="outlined" />}
                                                    </Stack>
                                                </Box>
                                                <Typography variant="subtitle1" fontWeight="medium">
                                                    {formatCurrency(wallet.balance)}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                ) : selectedOrg ? (
                                    <Alert severity="info">No wallets found for this organisation.</Alert>
                                ) : (
                                    <Alert severity="info">Select an organisation to view wallet summary.</Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Add color="primary" />
                        <Typography variant="h6">Create Organisation</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {actionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                            {actionError}
                        </Alert>
                    )}
                    <Stack spacing={3} mt={1}>
                        <TextField
                            label="Organisation Name"
                            value={formState.name}
                            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                            fullWidth
                            autoFocus
                            placeholder="Enter organisation name"
                            helperText="Choose a unique name for this organisation"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Organisation Level</InputLabel>
                            <Select
                                value={formState.level}
                                label="Organisation Level"
                                onChange={(e) => setFormState((prev) => ({ ...prev, level: e.target.value as VendorOrgForm['level'] }))}
                            >
                                {LEVEL_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Box>
                                            <Typography variant="subtitle2">{option.label}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {formState.parent && (
                            <Alert severity="info">
                                This organisation will be created as a child of the selected parent.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateSubmit} disabled={!formState.name.trim()} startIcon={<Add />}>
                        Create Organisation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Edit color="primary" />
                        <Typography variant="h6">Edit Organisation</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {actionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                            {actionError}
                        </Alert>
                    )}
                    <Stack spacing={3} mt={1}>
                        <TextField
                            label="Organisation Name"
                            value={formState.name}
                            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                            fullWidth
                            autoFocus
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formState.status ?? 'active'}
                                label="Status"
                                onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as VendorOrgForm['status'] }))}
                            >
                                <MenuItem value="active">
                                    <Chip label="Active" size="small" color="success" />
                                </MenuItem>
                                <MenuItem value="suspended">
                                    <Chip label="Suspended" size="small" color="warning" />
                                </MenuItem>
                                <MenuItem value="invited">
                                    <Chip label="Invited" size="small" color="info" />
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleEditSubmit} disabled={!formState.name.trim()} startIcon={<SaveIcon />}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <WarningIcon color="error" />
                        <Typography variant="h6" color="error">Delete Organisation</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This action cannot be undone!
                    </Alert>
                    <Typography variant="body1" gutterBottom>
                        Are you sure you want to delete <strong>{selectedOrg?.name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will permanently delete the organisation, all child organisations, role bindings, and wallet associations.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteSubmit} startIcon={<Delete />}>
                        Delete Permanently
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Binding Dialog with User Search */}
            <Dialog open={bindingDialogOpen} onClose={() => setBindingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PersonAdd color="primary" />
                        <Typography variant="h6">Assign User to Organisation</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {actionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                            {actionError}
                        </Alert>
                    )}
                    <Stack spacing={3} mt={1}>
                        {selectedOrg && (
                            <Alert severity="info">
                                Assigning user to: <strong>{selectedOrg.name}</strong>
                            </Alert>
                        )}
                        <Autocomplete
                            options={userOptions}
                            getOptionLabel={(option) => `${option.email}${option.first_name ? ` (${option.first_name} ${option.last_name || ''})` : ''}`}
                            value={selectedUser}
                            onChange={(_, newValue) => {
                                setSelectedUser(newValue);
                                if (newValue) {
                                    setBindingForm((prev) => ({ ...prev, user: newValue.id }));
                                }
                            }}
                            onInputChange={(_, newValue) => setUserSearchTerm(newValue)}
                            loading={userSearchLoading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search User by Email"
                                    placeholder="Type to search users..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <InputAdornment position="start">
                                                    <Search />
                                                </InputAdornment>
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            noOptionsText={userSearchTerm.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
                        />
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                            — or enter User ID directly —
                        </Typography>
                        <TextField
                            label="User ID (UUID)"
                            value={bindingForm.user}
                            onChange={(e) => {
                                setBindingForm((prev) => ({ ...prev, user: e.target.value }));
                                setSelectedUser(null);
                            }}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>User Role</InputLabel>
                            <Select
                                value={bindingForm.role}
                                label="User Role"
                                onChange={(e) => setBindingForm((prev) => ({ ...prev, role: e.target.value as VendorRole }))}
                            >
                                {ROLE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => {
                        setBindingDialogOpen(false);
                        setSelectedUser(null);
                        setUserSearchTerm('');
                        setBindingForm({ user: '', role: 'vendor' });
                    }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleBindingSubmit}
                        disabled={!bindingForm.user && !selectedUser}
                        startIcon={<PersonAdd />}
                    >
                        Assign User
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VendorManagement;
