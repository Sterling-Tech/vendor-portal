import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add,
    Assessment,
    CheckCircle,
    ContentCopy,
    Delete,
    Domain,
    Edit,
    HighlightOff,
    Key,
    Loop,
    People,
    Refresh,
    Settings,
    Security,
    Visibility,
} from '@mui/icons-material';
import { useTenants } from '../../../hooks/useTenants';
import { useVendorHierarchy } from '../../../contexts/VendorContext';
import { useTenantAdminProfile } from '../../../hooks/useTenantAdminProfile';
import { useApiKeys } from '../../../hooks/useApiKeys';
import { useAppSelector } from '../../../store/hooks';
import TenantFormModal, { TenantFormValues } from '../../../components/TenantAdmin/TenantFormModal';
import TenantDomainModal, { TenantDomainFormValues } from '../../../components/TenantAdmin/TenantDomainModal';
import TenantUserRoleModal, { TenantUserRoleFormValues } from '../../../components/TenantAdmin/TenantUserRoleModal';
import ConfirmDialog from '../../../components/TenantAdmin/ConfirmDialog';
import ApiKeyAuditDialog from '../../../components/TenantAdmin/ApiKeyAuditDialog';
import type { Tenant, TenantConfiguration as TenantConfigurationType, TenantUser } from '../../../services/tenantService';

const TenantAdmin: React.FC = () => {
    const {
        tenants,
        summary,
        selectedTenant,
        selectedTenantId,
        stats,
        users,
        domains,
        configuration,
        loading,
        detailLoading,
        mutationLoading,
        error,
        setError,
        refreshTenants,
        selectTenant,
        createTenant,
        updateTenant,
        deleteTenant,
        setTenantActive,
        addDomain,
        updateDomain,
        removeDomain,
        updateConfiguration,
        toggleTenantUserAdmin,
        setTenantUserRole,
        updateTenantUser,
        removeTenantUser,
    } = useTenants();

    const { tree, selectedOrg, selectedOrgId, selectOrg } = useVendorHierarchy();
    const { profile, loading: profileLoading, error: profileError } = useTenantAdminProfile(selectedTenantId);
    const {
        keys,
        loading: keysLoading,
        createKey,
        rotateKey,
        revokeKey,
        removeKey,
        lastIssuedSecret,
        setLastIssuedSecret,
        auditEntries,
        loadAudit,
    } = useApiKeys('vendor_org', selectedOrgId ?? null);

    const user = useAppSelector((state) => state.auth.user);
    const canCreateTenant = useMemo(() => {
        const role = user?.role?.toLowerCase();
        if (!role) return false;
        return ['platform_admin', 'platform', 'super_admin', 'owner'].includes(role);
    }, [user?.role]);
    const tenantCreateDisabledMessage = canCreateTenant
        ? undefined
        : 'Only platform administrators can create new tenants.';

    const [searchTerm, setSearchTerm] = useState('');
    const searchInitializedRef = useRef(false);
    const [tenantModalState, setTenantModalState] = useState<{ open: boolean; mode: 'create' | 'edit'; tenant?: Tenant | null }>({
        open: false,
        mode: 'create',
    });
    const [domainModalOpen, setDomainModalOpen] = useState(false);
    const [userRoleModalState, setUserRoleModalState] = useState<{ open: boolean; user?: TenantUser | null }>({
        open: false,
    });
    const [deleteTenantOpen, setDeleteTenantOpen] = useState(false);
    const [auditModalState, setAuditModalState] = useState<{ open: boolean; keyId?: string | null; keyLabel?: string }>({
        open: false,
    });
    const [configDraft, setConfigDraft] = useState({
        max_users: '',
        api_rate_limit: '',
        billing_cycle: '',
    });

    useEffect(() => {
        if (!searchInitializedRef.current) {
            searchInitializedRef.current = true;
            return;
        }
        const handler = setTimeout(() => {
            const trimmed = searchTerm.trim();
            if (trimmed) {
                refreshTenants({ search: trimmed });
            } else {
                refreshTenants();
            }
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm, refreshTenants]);

    useEffect(() => {
        if (configuration) {
            setConfigDraft({
                max_users: String(configuration.max_users ?? ''),
                api_rate_limit: String(configuration.api_rate_limit ?? ''),
                billing_cycle: configuration.billing_cycle ?? '',
            });
        } else {
            setConfigDraft({
                max_users: '',
                api_rate_limit: '',
                billing_cycle: '',
            });
        }
    }, [configuration]);

    const filteredTenants = useMemo(() => {
        if (!searchTerm) return tenants;
        const term = searchTerm.toLowerCase();
        return tenants.filter(
            (tenant) =>
                tenant.name.toLowerCase().includes(term) ||
                tenant.slug.toLowerCase().includes(term) ||
                tenant.domain.toLowerCase().includes(term) ||
                tenant.subdomain?.toLowerCase().includes(term)
        );
    }, [tenants, searchTerm]);

    const vendorSummary = useMemo(() => {
        const totals = { total: 0, vendors: 0, subVendors: 0, agents: 0, cashiers: 0 };
        const traverse = (nodes: typeof tree) => {
            if (!nodes || !Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                totals.total += 1;
                switch (node.level) {
                    case 'vendor':
                        totals.vendors += 1;
                        break;
                    case 'sub_vendor':
                        totals.subVendors += 1;
                        break;
                    case 'agent':
                        totals.agents += 1;
                        break;
                    case 'cashier':
                        totals.cashiers += 1;
                        break;
                    default:
                        break;
                }
                if (node.children?.length) traverse(node.children);
            });
        };
        traverse(tree);
        return totals;
    }, [tree]);

    const openCreateTenantModal = () => {
        if (!canCreateTenant) {
            setError('You do not have permission to create tenants. Please contact a platform administrator.');
            return;
        }
        setTenantModalState({ open: true, mode: 'create' });
    };

    const openEditTenantModal = () => {
        if (!selectedTenant) return;
        setTenantModalState({ open: true, mode: 'edit', tenant: selectedTenant });
    };

    const closeTenantModal = () => {
        setTenantModalState({ open: false, mode: 'create' });
    };

    const handleTenantModalSubmit = async (values: TenantFormValues) => {
        const sanitizedName = values.name.trim();
        const payload = {
            name: sanitizedName,
            slug: (values.slug && values.slug.trim()) || sanitizedName.toLowerCase().replace(/\s+/g, '-'),
            domain: values.domain.trim(),
            subdomain: values.subdomain?.trim() || undefined,
            is_trial: values.isTrial,
            trial_ends_at: values.trialEndsAt || undefined,
            is_active: values.isActive,
        };

        if (tenantModalState.mode === 'create') {
            if (!canCreateTenant) {
                setError('You do not have permission to create tenants. Please contact a platform administrator.');
                throw new Error('User lacks permission to create tenants.');
            }
            await createTenant({
                ...payload,
                admin_email: values.adminEmail?.trim() || undefined,
                admin_password: values.adminPassword || undefined,
            });
        } else if (tenantModalState.mode === 'edit' && tenantModalState.tenant) {
            await updateTenant(tenantModalState.tenant.id, payload);
        }
    };

    const openDomainModal = () => setDomainModalOpen(true);
    const closeDomainModal = () => setDomainModalOpen(false);

    const handleDomainModalSubmit = async (values: TenantDomainFormValues) => {
        if (!selectedTenant) {
            throw new Error('No tenant selected');
        }
        await addDomain(selectedTenant.id, values.domain.trim(), {
            is_primary: values.isPrimary,
            is_active: values.isActive,
        });
    };

    const openUserRoleModal = (user: TenantUser) => setUserRoleModalState({ open: true, user });
    const closeUserRoleModal = () => setUserRoleModalState({ open: false });

    const handleUserRoleSubmit = async (values: TenantUserRoleFormValues) => {
        if (!userRoleModalState.user) {
            throw new Error('No tenant user selected');
        }
        const { id, is_tenant_admin, is_active, role } = userRoleModalState.user;
        const tasks: Promise<unknown>[] = [];
        if (values.role && values.role !== role) {
            tasks.push(setTenantUserRole(id, values.role));
        }
        if (values.isTenantAdmin !== is_tenant_admin) {
            tasks.push(toggleTenantUserAdmin(id));
        }
        if (values.isActive !== is_active) {
            tasks.push(updateTenantUser(id, { is_active: values.isActive }));
        }
        if (tasks.length) {
            await Promise.all(tasks);
        }
    };

    const openDeleteTenantModal = () => setDeleteTenantOpen(true);
    const closeDeleteTenantModal = () => setDeleteTenantOpen(false);

    const handleDeleteTenant = async () => {
        if (!selectedTenant) {
            return;
        }
        await deleteTenant(selectedTenant.id);
    };

    const handleToggleActive = () => {
        if (!selectedTenant) return;
        setTenantActive(selectedTenant.id, !selectedTenant.is_active);
    };

    const handleToggleTrial = async () => {
        if (!selectedTenant) return;
        await updateTenant(selectedTenant.id, { is_trial: !selectedTenant.is_trial });
    };

    const openAuditDialog = async (keyId: string, keyLabel: string) => {
        await loadAudit(keyId);
        setAuditModalState({ open: true, keyId, keyLabel });
    };

    const closeAuditDialog = () => setAuditModalState({ open: false });

    const handleSaveConfiguration = async () => {
        if (!configuration) return;
        const payload: Partial<TenantConfigurationType> = {};
        if (configDraft.max_users) payload.max_users = Number(configDraft.max_users);
        if (configDraft.api_rate_limit) payload.api_rate_limit = Number(configDraft.api_rate_limit);
        if (configDraft.billing_cycle) payload.billing_cycle = configDraft.billing_cycle;
        try {
            await updateConfiguration(payload);
        } catch {
            // handled in hook
        }
    };

    const handleCreateKey = async (scopes: string[], expires?: string) => {
        try {
            await createKey(scopes, expires || undefined);
        } catch (err) {
            setError(typeof err === 'string' ? err : (err as any)?.message || 'Failed to issue API key');
        }
    };

    const [scopesInput, setScopesInput] = useState('wallet:read,wallet:write');
    const [expiresInput, setExpiresInput] = useState('');

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Tenant Administration</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => refreshTenants()}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={openCreateTenantModal}
                        disabled={!canCreateTenant}
                    >
                        Add Tenant
                    </Button>
                </Stack>
            </Box>

            {!canCreateTenant && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {tenantCreateDisabledMessage}
                </Alert>
            )}

            {(error || profileError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error || profileError}
                </Alert>
            )}

            {summary && (
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Total Tenants
                                </Typography>
                                <Typography variant="h5">{summary.total_tenants}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Active Tenants
                                </Typography>
                                <Typography variant="h5">{summary.active_tenants}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Trial Tenants
                                </Typography>
                                <Typography variant="h5">{summary.trial_tenants}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Active Users
                                </Typography>
                                <Typography variant="h5">{summary.total_users}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    API Calls Today
                                </Typography>
                                <Typography variant="h5">{(summary.today_api_calls ?? 0).toLocaleString()}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Transactions Today
                                </Typography>
                                <Typography variant="h5">{(summary.today_transactions ?? 0).toLocaleString()}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" variant="body2">
                                    Storage Used Today (MB)
                                </Typography>
                                <Typography variant="h5">
                                    {(summary.today_storage_mb ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardHeader title="Tenants" subheader={`${tenants.length} total`} />
                        <CardContent>
                            <TextField
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search tenants"
                                fullWidth
                                size="small"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                                }}
                            />
                            <List dense sx={{ maxHeight: 480, overflowY: 'auto', mt: 2 }}>
                                {loading && !tenants.length ? (
                                    <ListItem>
                                        <ListItemText primary="Loading tenants..." />
                                    </ListItem>
                                ) : filteredTenants.length ? (
                                    filteredTenants.map((tenant) => (
                                        <ListItemButton
                                            key={tenant.id}
                                            selected={tenant.id === selectedTenantId}
                                            onClick={() => selectTenant(tenant.id)}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {tenant.name}
                                                        </Typography>
                                                        <Chip
                                                            label={tenant.is_active ? 'Active' : 'Inactive'}
                                                            size="small"
                                                            color={tenant.is_active ? 'success' : 'default'}
                                                        />
                                                    </Stack>
                                                }
                                                secondary={`${tenant.domain}${tenant.subdomain ? ` • ${tenant.subdomain}` : ''}`}
                                            />
                                            <ListItemSecondaryAction>
                                                {tenant.is_trial && <Chip label="Trial" size="small" color="warning" />}
                                            </ListItemSecondaryAction>
                                        </ListItemButton>
                                    ))
                                ) : (
                                    <ListItem>
                                        <ListItemText primary="No tenants match your search." />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    {selectedTenant ? (
                        <Stack spacing={3}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="h5">{selectedTenant.name}</Typography>
                                            <Typography color="text.secondary">{selectedTenant.domain}</Typography>
                                            {selectedTenant.subdomain && (
                                                <Typography color="text.secondary">Subdomain: {selectedTenant.subdomain}</Typography>
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant={selectedTenant.is_active ? 'outlined' : 'contained'}
                                                color={selectedTenant.is_active ? 'secondary' : 'success'}
                                                startIcon={selectedTenant.is_active ? <HighlightOff /> : <CheckCircle />}
                                                onClick={handleToggleActive}
                                                disabled={mutationLoading}
                                            >
                                                {selectedTenant.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Edit />}
                                                onClick={openEditTenantModal}
                                                disabled={mutationLoading}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Delete />}
                                                onClick={openDeleteTenantModal}
                                                disabled={mutationLoading}
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </Box>

                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                                        <Chip
                                            label={selectedTenant.is_trial ? 'Trial Tenant' : 'Standard Tenant'}
                                            color={selectedTenant.is_trial ? 'warning' : 'default'}
                                            variant={selectedTenant.is_trial ? 'filled' : 'outlined'}
                                        />
                                        <Typography variant="body2">
                                            Trial Ends:{' '}
                                            {selectedTenant.trial_ends_at
                                                ? new Date(selectedTenant.trial_ends_at).toLocaleString()
                                                : 'Not set'}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={handleToggleTrial}
                                                disabled={mutationLoading}
                                            >
                                                {selectedTenant.is_trial ? 'Mark as Paid' : 'Mark as Trial'}
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={openEditTenantModal}
                                                disabled={mutationLoading}
                                            >
                                                Adjust Details
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardHeader
                                            avatar={<Assessment color="primary" />}
                                            title="Tenant Statistics"
                                            subheader={stats ? `Last activity: ${stats.last_activity ? new Date(stats.last_activity).toLocaleString() : 'N/A'}` : 'No data'}
                                        />
                                        <CardContent>
                                            {detailLoading && !stats ? (
                                                <Box display="flex" justifyContent="center" py={4}>
                                                    <CircularProgress size={24} />
                                                </Box>
                                            ) : stats ? (
                                                <Stack spacing={1}>
                                                    <Typography variant="body2">Total Users: {stats.total_users}</Typography>
                                                    <Typography variant="body2">
                                                        Transactions Today: {stats.total_transactions}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        API Calls Today: {stats.api_calls_today}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Storage Used: {stats.total_storage_used_mb.toFixed(2)} MB
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                <Typography color="text.secondary">No statistical data available.</Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardHeader avatar={<People color="primary" />} title="Tenant Admin Profile" />
                                        <CardContent>
                                            {profileLoading ? (
                                                <Box display="flex" justifyContent="center" py={4}>
                                                    <CircularProgress size={24} />
                                                </Box>
                                            ) : profile ? (
                                                <Stack spacing={1}>
                                                    <Typography variant="body2">
                                                        Admin Email: <strong>{profile.user_email}</strong>
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Default Limits: {JSON.stringify(profile.default_limits)}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Onboarding Config: {JSON.stringify(profile.onboarding_config)}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                <Typography color="text.secondary">No admin profile assigned.</Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Card>
                                <CardHeader
                                    avatar={<Settings color="primary" />}
                                    title="Tenant Configuration"
                                    action={
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleSaveConfiguration}
                                            disabled={mutationLoading || !configuration}
                                        >
                                            Save Changes
                                        </Button>
                                    }
                                />
                                <CardContent>
                                    {configuration ? (
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    label="Max Users"
                                                    value={configDraft.max_users}
                                                    onChange={(event) =>
                                                        setConfigDraft((prev) => ({ ...prev, max_users: event.target.value }))
                                                    }
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    label="API Rate Limit"
                                                    value={configDraft.api_rate_limit}
                                                    onChange={(event) =>
                                                        setConfigDraft((prev) => ({ ...prev, api_rate_limit: event.target.value }))
                                                    }
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    label="Billing Cycle"
                                                    value={configDraft.billing_cycle}
                                                    onChange={(event) =>
                                                        setConfigDraft((prev) => ({ ...prev, billing_cycle: event.target.value }))
                                                    }
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Typography color="text.secondary">No configuration found for this tenant.</Typography>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader
                                    avatar={<Domain color="primary" />}
                                    title="Tenant Domains"
                                    action={
                                        <Button
                                            size="small"
                                            startIcon={<Add />}
                                            onClick={openDomainModal}
                                            disabled={!selectedTenant || mutationLoading}
                                        >
                                            Add Domain
                                        </Button>
                                    }
                                />
                                <CardContent>
                                    {domains.length ? (
                                        <List dense>
                                            {domains.map((domain) => (
                                                <ListItem key={domain.id}>
                                                    <ListItemAvatar>
                                                        <Avatar>{domain.domain[0]?.toUpperCase()}</Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={domain.domain}
                                                        secondary={
                                                            <Stack direction="row" spacing={1}>
                                                                <Chip
                                                                    label={domain.is_primary ? 'Primary' : 'Secondary'}
                                                                    color={domain.is_primary ? 'success' : 'default'}
                                                                    size="small"
                                                                />
                                                                <Chip
                                                                    label={domain.is_active ? 'Active' : 'Inactive'}
                                                                    color={domain.is_active ? 'success' : 'default'}
                                                                    size="small"
                                                                />
                                                            </Stack>
                                                        }
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Stack direction="row" spacing={1}>
                                                            {!domain.is_primary && (
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => updateDomain(domain.id, { is_primary: true })}
                                                                    disabled={mutationLoading}
                                                                >
                                                                    Make Primary
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    updateDomain(domain.id, { is_active: !domain.is_active })
                                                                }
                                                                disabled={mutationLoading}
                                                            >
                                                                {domain.is_active ? 'Deactivate' : 'Activate'}
                                                            </Button>
                                                            <IconButton
                                                                edge="end"
                                                                color="error"
                                                                onClick={() => removeDomain(domain.id)}
                                                                disabled={mutationLoading}
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </Stack>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography color="text.secondary">No domains configured.</Typography>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader avatar={<People color="primary" />} title="Tenant Users" />
                                <CardContent>
                                    {users.length ? (
                                        <List dense>
                                            {users.map((user) => (
                                                <ListItem key={user.id} alignItems="flex-start">
                                                    <ListItemAvatar>
                                                        <Avatar>{user.user_email?.[0]?.toUpperCase() ?? '?'}</Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={user.user_email}
                                                        secondary={
                                                            <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                                                                <Chip label={user.role || 'member'} size="small" />
                                                                <Chip
                                                                    label={user.is_tenant_admin ? 'Admin' : 'User'}
                                                                    size="small"
                                                                    color={user.is_tenant_admin ? 'success' : 'default'}
                                                                />
                                                                <Chip
                                                                    label={user.is_active ? 'Active' : 'Inactive'}
                                                                    size="small"
                                                                    color={user.is_active ? 'success' : 'default'}
                                                                />
                                                            </Stack>
                                                        }
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                size="small"
                                                                onClick={() => openUserRoleModal(user)}
                                                            >
                                                                Edit Role
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={() => toggleTenantUserAdmin(user.id)}
                                                                disabled={mutationLoading}
                                                            >
                                                                {user.is_tenant_admin ? 'Revoke Admin' : 'Make Admin'}
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    updateTenantUser(user.id, { is_active: !user.is_active })
                                                                }
                                                                disabled={mutationLoading}
                                                            >
                                                                {user.is_active ? 'Suspend' : 'Activate'}
                                                            </Button>
                                                            <IconButton
                                                                edge="end"
                                                                color="error"
                                                                onClick={() => removeTenantUser(user.id)}
                                                                disabled={mutationLoading}
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </Stack>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography color="text.secondary">No tenant users found.</Typography>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader avatar={<Security color="primary" />} title="Vendor Hierarchy Overview" />
                                <CardContent>
                                    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                                        <Chip label={`Total Orgs: ${vendorSummary.total}`} size="small" />
                                        <Chip label={`Vendors: ${vendorSummary.vendors}`} size="small" />
                                        <Chip label={`Sub-vendors: ${vendorSummary.subVendors}`} size="small" />
                                        <Chip label={`Agents: ${vendorSummary.agents}`} size="small" />
                                        <Chip label={`Cashiers: ${vendorSummary.cashiers}`} size="small" />
                                    </Stack>
                                    {tree.length ? (
                                        <List dense>
                                            {tree.map((org) => (
                                                <ListItemButton
                                                    key={org.id}
                                                    selected={org.id === selectedOrgId}
                                                    onClick={() => selectOrg(org.id)}
                                                >
                                                    <ListItemText
                                                        primary={org.name}
                                                        secondary={
                                                            <Stack direction="row" spacing={1}>
                                                                <Chip label={org.level} size="small" />
                                                                <Chip label={org.status} size="small" />
                                                            </Stack>
                                                        }
                                                    />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography color="text.secondary">
                                            No vendor organisations have been created for this tenant.
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader
                                    avatar={<Key color="primary" />}
                                    title="Vendor API Keys"
                                    subheader={selectedOrg ? selectedOrg.name : 'Select an organisation to manage keys'}
                                />
                                <CardContent>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" mb={2}>
                                        <TextField
                                            label="Scopes"
                                            value={scopesInput}
                                            onChange={(event) => setScopesInput(event.target.value)}
                                            size="small"
                                            helperText="Comma-separated scopes"
                                            fullWidth
                                            disabled={!selectedOrgId}
                                        />
                                        <TextField
                                            label="Expires At"
                                            value={expiresInput}
                                            onChange={(event) => setExpiresInput(event.target.value)}
                                            size="small"
                                            helperText="Optional ISO timestamp"
                                            fullWidth
                                            disabled={!selectedOrgId}
                                        />
                                        <Button
                                            variant="contained"
                                            startIcon={<Add />}
                                            onClick={() =>
                                                handleCreateKey(
                                                    scopesInput
                                                        .split(',')
                                                        .map((scope) => scope.trim())
                                                        .filter(Boolean),
                                                    expiresInput || undefined
                                                )
                                            }
                                            disabled={!selectedOrgId || keysLoading}
                                        >
                                            Issue Key
                                        </Button>
                                    </Stack>
                                    {!selectedOrgId ? (
                                        <Typography color="text.secondary">
                                            Select an organisation in the vendor tree to manage API keys.
                                        </Typography>
                                    ) : keysLoading && !keys.length ? (
                                        <Box display="flex" justifyContent="center" py={4}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : keys.length ? (
                                        <List dense>
                                            {keys.map((key) => (
                                                <React.Fragment key={key.id}>
                                                    <ListItem
                                                        secondaryAction={
                                                            <Stack direction="row" spacing={1}>
                                                                <Tooltip title="Rotate Key">
                                                                    <IconButton onClick={() => rotateKey(key.id)}>
                                                                        <Loop />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Revoke Key">
                                                                    <IconButton onClick={() => revokeKey(key.id)}>
                                                                        <Key />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="View Audit">
                                                                    <IconButton onClick={() => openAuditDialog(key.id, key.key_id)}>
                                                                        <Visibility />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Delete">
                                                                    <IconButton color="error" onClick={() => removeKey(key.id)}>
                                                                        <Delete />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={key.key_id}
                                                            secondary={
                                                                <Stack direction="row" spacing={1}>
                                                                    <Chip
                                                                        label={key.is_active ? 'Active' : 'Inactive'}
                                                                        color={key.is_active ? 'success' : 'default'}
                                                                        size="small"
                                                                    />
                                                                    {key.expires_at && (
                                                                        <Chip
                                                                            label={`Expires: ${new Date(key.expires_at).toLocaleString()}`}
                                                                            size="small"
                                                                        />
                                                                    )}
                                                                </Stack>
                                                            }
                                                        />
                                                    </ListItem>
                                                    <Divider component="li" />
                                                </React.Fragment>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography color="text.secondary">No API keys issued.</Typography>
                                    )}
                                    {lastIssuedSecret && (
                                        <Alert
                                            severity="success"
                                            sx={{ mt: 2 }}
                                            action={
                                                <Tooltip title="Copy secret">
                                                    <IconButton
                                                        color="inherit"
                                                        onClick={() =>
                                                            navigator.clipboard.writeText(
                                                                `${lastIssuedSecret.key_id}.${lastIssuedSecret.secret}`
                                                            )
                                                        }
                                                    >
                                                        <ContentCopy />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                            onClose={() => setLastIssuedSecret(null)}
                                        >
                                            <Typography variant="subtitle2">API key issued</Typography>
                                            <Typography variant="body2">
                                                Secret: {lastIssuedSecret.key_id}.{lastIssuedSecret.secret}
                                            </Typography>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Stack>
                    ) : loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary">
                                    Select a tenant from the list to view details and manage settings.
                                </Typography>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>

            <TenantFormModal
                open={tenantModalState.open}
                mode={tenantModalState.mode}
                loading={mutationLoading}
                initialValues={
                    tenantModalState.mode === 'edit' && tenantModalState.tenant
                        ? {
                            name: tenantModalState.tenant.name,
                            slug: tenantModalState.tenant.slug,
                            domain: tenantModalState.tenant.domain,
                            subdomain: tenantModalState.tenant.subdomain ?? '',
                            isTrial: tenantModalState.tenant.is_trial,
                            trialEndsAt: tenantModalState.tenant.trial_ends_at ?? '',
                            isActive: tenantModalState.tenant.is_active,
                        }
                        : undefined
                }
                submitDisabled={!canCreateTenant && tenantModalState.mode === 'create'}
                submitDisabledMessage={
                    tenantModalState.mode === 'create' && !canCreateTenant ? tenantCreateDisabledMessage : undefined
                }
                onClose={closeTenantModal}
                onSubmit={handleTenantModalSubmit}
            />

            <TenantDomainModal
                open={domainModalOpen}
                loading={mutationLoading}
                onClose={closeDomainModal}
                onSubmit={handleDomainModalSubmit}
            />

            <TenantUserRoleModal
                open={userRoleModalState.open}
                loading={mutationLoading}
                initialValues={
                    userRoleModalState.user
                        ? {
                            role: userRoleModalState.user.role || 'member',
                            isTenantAdmin: userRoleModalState.user.is_tenant_admin,
                            isActive: userRoleModalState.user.is_active,
                        }
                        : undefined
                }
                onClose={closeUserRoleModal}
                onSubmit={handleUserRoleSubmit}
            />

            <ConfirmDialog
                open={deleteTenantOpen}
                title="Delete Tenant"
                description="Are you sure you want to delete this tenant? This action cannot be undone."
                confirmLabel="Delete"
                loading={mutationLoading}
                onClose={closeDeleteTenantModal}
                onConfirm={async () => {
                    try {
                        await handleDeleteTenant();
                        closeDeleteTenantModal();
                    } catch (error) {
                        console.error('Failed to delete tenant', error);
                    }
                }}
            />

            <ApiKeyAuditDialog
                open={auditModalState.open}
                keyLabel={auditModalState.keyLabel}
                entries={auditEntries}
                loading={keysLoading}
                onClose={closeAuditDialog}
                onRefresh={async () => {
                    if (auditModalState.keyId) {
                        await loadAudit(auditModalState.keyId);
                    }
                }}
            />
        </Box>
    );
};

export default TenantAdmin;
