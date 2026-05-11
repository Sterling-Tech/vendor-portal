import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Divider,
    Alert,
    Snackbar,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Tooltip,
    Paper,
} from '@mui/material';
import {
    Security as SecurityIcon,
    Notifications as NotificationsIcon,
    AccountCircle as AccountIcon,
    Save as SaveIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Refresh as RefreshIcon,
    Cancel as CancelIcon,
    VpnKey as KeyIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../store/store';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useApiKeys } from '../../hooks/useApiKeys';
import { tenantService, TenantConfiguration } from '../../services/tenantService';

// Date formatting utility function
const formatDate = (dateString: string | null, formatType: 'short' | 'full' = 'short'): string => {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (formatType === 'full') {
            return date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
};

const API_BASE_URL = 'http://localhost:8001/api/v1';

const Settings: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const { tenantId, selectedOrgId } = useVendorHierarchy();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    // Account settings
    const [accountForm, setAccountForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });

    // Security settings
    const [securityForm, setSecurityForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
        two_factor_enabled: false,
    });

    // Notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
    });

    // Configuration settings
    const [configuration, setConfiguration] = useState<TenantConfiguration | null>(null);
    const [configLoading, setConfigLoading] = useState(false);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [newApiKeyScopes, setNewApiKeyScopes] = useState<string[]>([]);
    const [newApiKeyExpiresAt, setNewApiKeyExpiresAt] = useState<string>('');
    const [showApiKeySecret, setShowApiKeySecret] = useState<Record<string, boolean>>({});
    const [auditDialogOpen, setAuditDialogOpen] = useState(false);
    const [selectedApiKeyForAudit, setSelectedApiKeyForAudit] = useState<string | null>(null);

    // API Keys hooks - for tenant org
    const {
        keys: orgApiKeys,
        loading: orgKeysLoading,
        createKey: createOrgKey,
        rotateKey: rotateOrgKey,
        revokeKey: revokeOrgKey,
        removeKey: removeOrgKey,
        lastIssuedSecret,
        setLastIssuedSecret,
        auditEntries,
        loadAudit,
    } = useApiKeys('vendor_org', selectedOrgId);

    // API Keys hooks - for user
    const {
        keys: userApiKeys,
        loading: userKeysLoading,
        createKey: createUserKey,
        rotateKey: rotateUserKey,
        revokeKey: revokeUserKey,
        removeKey: removeUserKey,
    } = useApiKeys('user', user?.id || null);

    // Configuration form state
    const [configForm, setConfigForm] = useState({
        enable_advanced_analytics: false,
        enable_api_access: true,
        enable_webhooks: false,
        enable_audit_logs: true,
        max_users: 10,
        max_storage_mb: 1000,
        api_rate_limit: 10000,
        billing_cycle: 'monthly',
    });

    // Available scopes for API keys
    const availableScopes = [
        { value: 'wallet:read', label: 'Wallet Read' },
        { value: 'wallet:write', label: 'Wallet Write' },
        { value: 'wallet:transfer', label: 'Wallet Transfer' },
        { value: 'transaction:read', label: 'Transaction Read' },
        { value: 'transaction:write', label: 'Transaction Write' },
        { value: 'report:read', label: 'Report Read' },
        { value: 'vendor:read', label: 'Vendor Read' },
        { value: 'vendor:write', label: 'Vendor Write' },
    ];

    // Available modules/licenses
    const availableModules = [
        { id: 'wallets', name: 'Wallets', enabled: true },
        { id: 'transactions', name: 'Transactions', enabled: true },
        { id: 'analytics', name: 'Advanced Analytics', enabled: false },
        { id: 'webhooks', name: 'Webhooks', enabled: false },
        { id: 'api_access', name: 'API Access', enabled: true },
        { id: 'audit_logs', name: 'Audit Logs', enabled: true },
    ];

    useEffect(() => {
        if (user) {
            setAccountForm({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    // Load tenant configuration
    const loadConfiguration = useCallback(async () => {
        if (!tenantId) return;
        setConfigLoading(true);
        try {
            const config = await tenantService.getTenantConfiguration(tenantId);
            if (config) {
                setConfiguration(config);
                setConfigForm({
                    enable_advanced_analytics: config.enable_advanced_analytics,
                    enable_api_access: config.enable_api_access,
                    enable_webhooks: config.enable_webhooks,
                    enable_audit_logs: config.enable_audit_logs,
                    max_users: config.max_users,
                    max_storage_mb: config.max_storage_mb,
                    api_rate_limit: config.api_rate_limit,
                    billing_cycle: config.billing_cycle,
                });
            }
        } catch (err) {
            console.error('Failed to load configuration:', err);
        } finally {
            setConfigLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (activeTab === 3) {
            loadConfiguration();
        }
    }, [activeTab, loadConfiguration]);

    const handleSaveAccount = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/${user?.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(accountForm),
            });

            if (response.ok) {
                setSuccess('Account settings updated successfully!');
            }
        } catch (err) {
            console.error('Error updating account:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSecurity = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: securityForm.current_password,
                    new_password: securityForm.new_password,
                }),
            });

            if (response.ok) {
                setSuccess('Password changed successfully!');
                setSecurityForm({
                    current_password: '',
                    new_password: '',
                    confirm_password: '',
                    two_factor_enabled: securityForm.two_factor_enabled,
                });
            }
        } catch (err) {
            console.error('Error changing password:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfiguration = async () => {
        if (!configuration) return;
        setConfigLoading(true);
        try {
            await tenantService.updateTenantConfiguration(configuration.id, configForm);
            setSuccess('Configuration updated successfully!');
            await loadConfiguration();
        } catch (err) {
            console.error('Failed to update configuration:', err);
        } finally {
            setConfigLoading(false);
        }
    };

    const handleCreateApiKey = async (forOrg: boolean = false) => {
        try {
            if (forOrg && selectedOrgId) {
                await createOrgKey(newApiKeyScopes.length ? newApiKeyScopes : undefined, newApiKeyExpiresAt || null);
            } else if (user?.id) {
                await createUserKey(newApiKeyScopes.length ? newApiKeyScopes : undefined, newApiKeyExpiresAt || null);
            }
            setApiKeyDialogOpen(false);
            setNewApiKeyScopes([]);
            setNewApiKeyExpiresAt('');
            setSuccess('API key created successfully!');
        } catch (err: any) {
            console.error('Failed to create API key:', err);
        }
    };

    const handleViewAudit = async (keyId: string) => {
        setSelectedApiKeyForAudit(keyId);
        await loadAudit(keyId);
        setAuditDialogOpen(true);
    };

    const toggleModuleLicense = async (moduleId: string, enabled: boolean) => {
        if (!configuration) return;
        const updatedFeatures = enabled
            ? [...(configuration.features || []), moduleId].filter((f, i, arr) => arr.indexOf(f) === i)
            : (configuration.features || []).filter((f) => f !== moduleId);

        try {
            await tenantService.updateTenantConfiguration(configuration.id, {
                features: updatedFeatures,
            });
            setSuccess(`Module ${enabled ? 'enabled' : 'disabled'} successfully!`);
            await loadConfiguration();
        } catch (err) {
            console.error('Failed to update module license:', err);
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" component="h1" gutterBottom>
                Settings
            </Typography>

            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
                    {success}
                </Alert>
            </Snackbar>

            <Card sx={{ mt: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                        <Tab icon={<AccountIcon />} label="Account" iconPosition="start" />
                        <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
                        <Tab icon={<NotificationsIcon />} label="Notifications" iconPosition="start" />
                        <Tab icon={<SettingsIcon />} label="Configuration" iconPosition="start" />
                    </Tabs>
                </Box>

                {/* Account Tab */}
                {activeTab === 0 && (
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Profile Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    value={accountForm.first_name}
                                    onChange={(e) => setAccountForm({ ...accountForm, first_name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={accountForm.last_name}
                                    onChange={(e) => setAccountForm({ ...accountForm, last_name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={accountForm.email}
                                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={accountForm.phone}
                                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveAccount}
                                disabled={loading}
                            >
                                Save Changes
                            </Button>
                        </Box>
                    </CardContent>
                )}

                {/* Security Tab */}
                {activeTab === 1 && (
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Security Settings
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Current Password"
                                    type="password"
                                    value={securityForm.current_password}
                                    onChange={(e) => setSecurityForm({ ...securityForm, current_password: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="New Password"
                                    type="password"
                                    value={securityForm.new_password}
                                    onChange={(e) => setSecurityForm({ ...securityForm, new_password: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Confirm New Password"
                                    type="password"
                                    value={securityForm.confirm_password}
                                    onChange={(e) => setSecurityForm({ ...securityForm, confirm_password: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={securityForm.two_factor_enabled}
                                            onChange={(e) => setSecurityForm({ ...securityForm, two_factor_enabled: e.target.checked })}
                                        />
                                    }
                                    label="Enable Two-Factor Authentication"
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveSecurity}
                                disabled={loading || securityForm.new_password !== securityForm.confirm_password}
                            >
                                Change Password
                            </Button>
                        </Box>
                    </CardContent>
                )}

                {/* Notifications Tab */}
                {activeTab === 2 && (
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                            Notification Preferences
                        </Typography>
                        <List>
                            <ListItem>
                                <ListItemText
                                    primary="Email Notifications"
                                    secondary="Receive updates and alerts via email"
                                />
                                <Switch
                                    checked={notificationSettings.email_notifications}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
                                />
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemText
                                    primary="SMS Notifications"
                                    secondary="Receive important alerts via SMS"
                                />
                                <Switch
                                    checked={notificationSettings.sms_notifications}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_notifications: e.target.checked })}
                                />
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemText
                                    primary="Push Notifications"
                                    secondary="Receive browser notifications"
                                />
                                <Switch
                                    checked={notificationSettings.push_notifications}
                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, push_notifications: e.target.checked })}
                                />
                            </ListItem>
                        </List>
                    </CardContent>
                )}

                {/* Configuration Tab */}
                {activeTab === 3 && (
                    <CardContent>
                        {configLoading && !configuration ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : !tenantId ? (
                            <Alert severity="info">Please select a tenant to configure settings.</Alert>
                        ) : (
                            <Stack spacing={3}>
                                {/* Feature Toggles */}
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Feature Toggles
                                    </Typography>
                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} md={6}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={configForm.enable_api_access}
                                                        onChange={(e) => setConfigForm({ ...configForm, enable_api_access: e.target.checked })}
                                                    />
                                                }
                                                label="API Access"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Enable API access for this tenant
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={configForm.enable_advanced_analytics}
                                                        onChange={(e) => setConfigForm({ ...configForm, enable_advanced_analytics: e.target.checked })}
                                                    />
                                                }
                                                label="Advanced Analytics"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Enable advanced analytics features
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={configForm.enable_webhooks}
                                                        onChange={(e) => setConfigForm({ ...configForm, enable_webhooks: e.target.checked })}
                                                    />
                                                }
                                                label="Webhooks"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Enable webhook notifications
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={configForm.enable_audit_logs}
                                                        onChange={(e) => setConfigForm({ ...configForm, enable_audit_logs: e.target.checked })}
                                                    />
                                                }
                                                label="Audit Logs"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Enable audit logging
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider />

                                {/* Rate Limits & Usage */}
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Rate Limits & Usage
                                    </Typography>
                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="API Rate Limit"
                                                value={configForm.api_rate_limit}
                                                onChange={(e) => setConfigForm({ ...configForm, api_rate_limit: parseInt(e.target.value) || 0 })}
                                                helperText="Requests per hour"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Max Users"
                                                value={configForm.max_users}
                                                onChange={(e) => setConfigForm({ ...configForm, max_users: parseInt(e.target.value) || 0 })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Max Storage (MB)"
                                                value={configForm.max_storage_mb}
                                                onChange={(e) => setConfigForm({ ...configForm, max_storage_mb: parseInt(e.target.value) || 0 })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FormControl fullWidth>
                                                <InputLabel>Billing Cycle</InputLabel>
                                                <Select
                                                    value={configForm.billing_cycle}
                                                    label="Billing Cycle"
                                                    onChange={(e) => setConfigForm({ ...configForm, billing_cycle: e.target.value })}
                                                >
                                                    <MenuItem value="monthly">Monthly</MenuItem>
                                                    <MenuItem value="quarterly">Quarterly</MenuItem>
                                                    <MenuItem value="yearly">Yearly</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider />

                                {/* Module Licenses */}
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Module Licenses
                                    </Typography>
                                    <Stack spacing={2} sx={{ mt: 1 }}>
                                        {availableModules.map((module) => {
                                            const isEnabled = configuration?.features?.includes(module.id) ?? module.enabled;
                                            return (
                                                <Paper key={module.id} variant="outlined" sx={{ p: 2 }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Box>
                                                            <Typography variant="subtitle1">{module.name}</Typography>
                                                            <Chip
                                                                label={isEnabled ? 'Active' : 'Inactive'}
                                                                color={isEnabled ? 'success' : 'default'}
                                                                size="small"
                                                                sx={{ mt: 0.5 }}
                                                            />
                                                        </Box>
                                                        <Switch
                                                            checked={isEnabled}
                                                            onChange={(e) => toggleModuleLicense(module.id, e.target.checked)}
                                                            disabled={configLoading}
                                                        />
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                </Box>

                                <Divider />

                                {/* API Keys Management */}
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">API Keys</Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => setApiKeyDialogOpen(true)}
                                            disabled={!configForm.enable_api_access}
                                        >
                                            Create API Key
                                        </Button>
                                    </Box>

                                    {selectedOrgId && (
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Organisation API Keys
                                            </Typography>
                                            {orgKeysLoading ? (
                                                <CircularProgress size={24} />
                                            ) : orgApiKeys?.length > 0 ? (
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Key ID</TableCell>
                                                                <TableCell>Scopes</TableCell>
                                                                <TableCell>Status</TableCell>
                                                                <TableCell>Expires</TableCell>
                                                                <TableCell>Last Used</TableCell>
                                                                <TableCell align="right">Actions</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(orgApiKeys || []).map((key) => (
                                                                <TableRow key={key.id}>
                                                                    <TableCell>
                                                                        <Typography variant="body2" fontFamily="monospace">
                                                                            {key.key_id.slice(0, 16)}...
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                            {key.scopes.slice(0, 2).map((scope) => (
                                                                                <Chip key={scope} label={scope} size="small" variant="outlined" />
                                                                            ))}
                                                                            {key.scopes.length > 2 && (
                                                                                <Chip label={`+${key.scopes.length - 2}`} size="small" />
                                                                            )}
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={key.is_active ? 'Active' : 'Revoked'}
                                                                            color={key.is_active ? 'success' : 'error'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                            <Tooltip title="View Audit Log">
                                                                                <IconButton size="small" onClick={() => handleViewAudit(key.id)}>
                                                                                    <VisibilityIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Rotate Key">
                                                                                <IconButton size="small" onClick={() => rotateOrgKey(key.id)}>
                                                                                    <RefreshIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title={key.is_active ? 'Revoke Key' : 'Delete Key'}>
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => (key.is_active ? revokeOrgKey(key.id) : removeOrgKey(key.id))}
                                                                                >
                                                                                    {key.is_active ? <CancelIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Stack>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            ) : (
                                                <Typography color="text.secondary">No API keys created yet.</Typography>
                                            )}
                                        </Box>
                                    )}

                                    {user?.id && (
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                User API Keys
                                            </Typography>
                                            {userKeysLoading ? (
                                                <CircularProgress size={24} />
                                            ) : userApiKeys?.length > 0 ? (
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Key ID</TableCell>
                                                                <TableCell>Scopes</TableCell>
                                                                <TableCell>Status</TableCell>
                                                                <TableCell>Expires</TableCell>
                                                                <TableCell>Last Used</TableCell>
                                                                <TableCell align="right">Actions</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(userApiKeys || []).map((key) => (
                                                                <TableRow key={key.id}>
                                                                    <TableCell>
                                                                        <Typography variant="body2" fontFamily="monospace">
                                                                            {key.key_id.slice(0, 16)}...
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                            {key.scopes.slice(0, 2).map((scope) => (
                                                                                <Chip key={scope} label={scope} size="small" variant="outlined" />
                                                                            ))}
                                                                            {key.scopes.length > 2 && (
                                                                                <Chip label={`+${key.scopes.length - 2}`} size="small" />
                                                                            )}
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={key.is_active ? 'Active' : 'Revoked'}
                                                                            color={key.is_active ? 'success' : 'error'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                            <Tooltip title="Rotate Key">
                                                                                <IconButton size="small" onClick={() => rotateUserKey(key.id)}>
                                                                                    <RefreshIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title={key.is_active ? 'Revoke Key' : 'Delete Key'}>
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={() => (key.is_active ? revokeUserKey(key.id) : removeUserKey(key.id))}
                                                                                >
                                                                                    {key.is_active ? <CancelIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Stack>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            ) : (
                                                <Typography color="text.secondary">No user API keys created yet.</Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ pt: 2 }}>
                                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveConfiguration} disabled={configLoading}>
                                        Save Configuration
                                    </Button>
                                </Box>
                            </Stack>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* API Key Creation Dialog */}
            <Dialog
                open={apiKeyDialogOpen}
                onClose={() => setApiKeyDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                disableEscapeKeyDown={false}
            >
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <KeyIcon color="primary" />
                        <Typography variant="h6">Create API Key</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Scopes</InputLabel>
                            <Select
                                multiple
                                value={newApiKeyScopes}
                                onChange={(e) => setNewApiKeyScopes(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                label="Scopes"
                            >
                                {availableScopes.map((scope) => (
                                    <MenuItem key={scope.value} value={scope.value}>
                                        {scope.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            type="datetime-local"
                            label="Expires At (Optional)"
                            value={newApiKeyExpiresAt}
                            onChange={(e) => setNewApiKeyExpiresAt(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        {selectedOrgId && (
                            <Alert severity="info">This key will be created for the selected organisation.</Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApiKeyDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => handleCreateApiKey(!!selectedOrgId)}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* API Key Secret Display Dialog */}
            <Dialog
                open={!!lastIssuedSecret}
                onClose={() => setLastIssuedSecret(null)}
                maxWidth="sm"
                fullWidth
                disableEscapeKeyDown={false}
                onBackdropClick={() => setLastIssuedSecret(null)}
            >
                <DialogTitle>API Key Created</DialogTitle>
                <DialogContent>
                    {lastIssuedSecret && (
                        <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Save this secret immediately. You won't be able to see it again!
                            </Alert>
                            <TextField
                                label="Key ID"
                                value={lastIssuedSecret.key_id || ''}
                                fullWidth
                                InputProps={{ readOnly: true }}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Secret"
                                type={showApiKeySecret[lastIssuedSecret.id] ? 'text' : 'password'}
                                value={lastIssuedSecret.secret || ''}
                                fullWidth
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: lastIssuedSecret.id && (
                                        <IconButton onClick={() => setShowApiKeySecret({ ...showApiKeySecret, [lastIssuedSecret.id]: !showApiKeySecret[lastIssuedSecret.id] })}>
                                            {showApiKeySecret[lastIssuedSecret.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    ),
                                }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={() => setLastIssuedSecret(null)}>
                        Got it
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Audit Log Dialog */}
            <Dialog
                open={auditDialogOpen}
                onClose={() => setAuditDialogOpen(false)}
                maxWidth="md"
                fullWidth
                disableEscapeKeyDown={false}
            >
                <DialogTitle>API Key Audit Log</DialogTitle>
                <DialogContent>
                    {auditEntries?.length > 0 ? (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Action</TableCell>
                                        <TableCell>IP Address</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(auditEntries || []).map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{formatDate(entry.requested_at, 'full')}</TableCell>
                                            <TableCell>{entry.action}</TableCell>
                                            <TableCell>{entry.ip_address || '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={entry.success ? 'Success' : 'Failed'}
                                                    color={entry.success ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography color="text.secondary">No audit entries found.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAuditDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Settings;
