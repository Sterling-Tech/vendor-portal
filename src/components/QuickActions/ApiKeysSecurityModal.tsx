import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    Grid,
    Card,
    CardContent,
    Stack,
    Chip,
    Alert,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Tooltip,
    DialogContentText,
    InputAdornment,
} from '@mui/material';
import {
    Security,
    Add,
    Refresh,
    Delete,
    Visibility,
    VisibilityOff,
    ContentCopy,
    RotateRight,
    Block,
    History,
    CheckCircle,
    Cancel,
} from '@mui/icons-material';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import {
    fetchApiKeys,
    issueApiKey,
    rotateApiKey,
    revokeApiKey,
    deleteApiKey,
    fetchApiKeyAudit,
} from '../../services/vendorHierarchyService';
import type { ApiKey, ApiKeyWithSecret, ApiKeyAuditEntry } from '../../types/vendor';

interface ApiKeysSecurityModalProps {
    open: boolean;
    onClose: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const ApiKeysSecurityModal: React.FC<ApiKeysSecurityModalProps> = ({ open, onClose }) => {
    const { tree, selectedOrgId, selectOrg } = useVendorHierarchy();
    const [tabValue, setTabValue] = useState(0);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [createKeyOpen, setCreateKeyOpen] = useState(false);
    const [auditOpen, setAuditOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
    const [auditEntries, setAuditEntries] = useState<ApiKeyAuditEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState<{ [key: string]: boolean }>({});
    const [ownerType, setOwnerType] = useState<'vendor_org' | 'user'>('vendor_org');
    const [ownerId, setOwnerId] = useState<string>('');
    const [scopes, setScopes] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

    useEffect(() => {
        if (open && selectedOrgId) {
            loadApiKeys('vendor_org', selectedOrgId).catch((err) => {
                console.error('Failed to load API keys:', err);
                setError(err?.message || 'Failed to load API keys');
            });
            setOwnerId(selectedOrgId);
        }
    }, [open, selectedOrgId]);

    const loadApiKeys = async (type: 'vendor_org' | 'user', id: string) => {
        if (!id) {
            setError('Owner ID is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchApiKeys(type, id);
            setKeys(data);
            setOwnerType(type);
            setOwnerId(id);
        } catch (err: any) {
            console.error('loadApiKeys error:', err);
            const errorMessage = err?.message || err?.error || 'Failed to load API keys';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const loadAudit = async (keyId: string) => {
        setAuditLoading(true);
        try {
            const data = await fetchApiKeyAudit(keyId);
            setAuditEntries(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load audit log');
        } finally {
            setAuditLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!ownerId.trim()) {
            setError('Owner ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const scopesArray = scopes.split(',').map((s) => s.trim()).filter(Boolean);
            const result = await issueApiKey({
                owner_type: ownerType,
                owner_id: ownerId,
                scopes: scopesArray.length > 0 ? scopesArray : undefined,
                expires_at: expiresAt || undefined,
            });
            setNewKeySecret((result as ApiKeyWithSecret).secret || null);
            setSuccess('API key created successfully');
            setCreateKeyOpen(false);
            setScopes('');
            setExpiresAt('');
            await loadApiKeys(ownerType, ownerId);
            setTimeout(() => {
                setSuccess(null);
                setNewKeySecret(null);
            }, 10000);
        } catch (err: any) {
            setError(err?.message || 'Failed to create API key');
        } finally {
            setLoading(false);
        }
    };

    const handleRotateKey = async (keyId: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await rotateApiKey(keyId);
            setNewKeySecret((result as ApiKeyWithSecret).secret || null);
            setSuccess('API key rotated successfully');
            await loadApiKeys(ownerType, ownerId);
            setTimeout(() => {
                setSuccess(null);
                setNewKeySecret(null);
            }, 10000);
        } catch (err: any) {
            setError(err?.message || 'Failed to rotate API key');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeKey = async () => {
        if (!keyToDelete) return;

        setLoading(true);
        setError(null);
        try {
            await revokeApiKey(keyToDelete.id);
            setSuccess('API key revoked successfully');
            setRevokeConfirmOpen(false);
            setKeyToDelete(null);
            await loadApiKeys(ownerType, ownerId);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to revoke API key');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteKey = async () => {
        if (!keyToDelete) return;

        setLoading(true);
        setError(null);
        try {
            await deleteApiKey(keyToDelete.id);
            setSuccess('API key deleted successfully');
            setDeleteConfirmOpen(false);
            setKeyToDelete(null);
            await loadApiKeys(ownerType, ownerId);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to delete API key');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard');
        setTimeout(() => setSuccess(null), 2000);
    };

    const toggleSecretVisibility = (keyId: string) => {
        setShowSecret((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
    };

    const getOrgOptions = () => {
        const options: Array<{ id: string; name: string }> = [];
        const addOrgs = (orgs: typeof tree) => {
            orgs.forEach((org) => {
                options.push({ id: org.id, name: org.name });
                if (org.children) {
                    addOrgs(org.children);
                }
            });
        };
        addOrgs(tree);
        return options;
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5">API Keys & Security</Typography>
                        <Stack direction="row" spacing={1}>
                            {ownerId && (
                                <Button startIcon={<Refresh />} onClick={() => loadApiKeys(ownerType, ownerId)} size="small" disabled={loading}>
                                    Refresh
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {(error || success) && (
                        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => {
                            setError(null);
                            setSuccess(null);
                        }}>
                            {error || success}
                        </Alert>
                    )}

                    {newKeySecret && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                ⚠️ Save this secret key now! You won't be able to see it again.
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                                <TextField
                                    value={newKeySecret}
                                    fullWidth
                                    size="small"
                                    type={showSecret['new'] ? 'text' : 'password'}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => toggleSecretVisibility('new')} size="small">
                                                    {showSecret['new'] ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                                <IconButton onClick={() => copyToClipboard(newKeySecret)} size="small">
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Stack>
                        </Alert>
                    )}

                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                        <Tab label="API Keys" />
                        <Tab label="Audit Log" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => {
                                        setCreateKeyOpen(true);
                                        if (selectedOrgId) {
                                            setOwnerType('vendor_org');
                                            setOwnerId(selectedOrgId);
                                        }
                                    }}
                                >
                                    Create API Key
                                </Button>
                                {selectedOrgId && (
                                    <Chip
                                        label={`Viewing: ${tree.find((o) => o.id === selectedOrgId)?.name || 'Selected Organisation'}`}
                                        color="primary"
                                    />
                                )}
                            </Stack>

                            {loading ? (
                                <Box display="flex" justifyContent="center" py={4}>
                                    <CircularProgress />
                                </Box>
                            ) : keys.length > 0 ? (
                                <Table>
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
                                        {keys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {key.key_id}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                        {key.scopes.map((scope) => (
                                                            <Chip key={scope} label={scope} size="small" />
                                                        ))}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    {key.revoked_at ? (
                                                        <Chip label="Revoked" size="small" color="error" icon={<Block />} />
                                                    ) : key.is_active ? (
                                                        <Chip label="Active" size="small" color="success" icon={<CheckCircle />} />
                                                    ) : (
                                                        <Chip label="Inactive" size="small" color="default" icon={<Cancel />} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {key.expires_at ? (
                                                        new Date(key.expires_at) > new Date() ? (
                                                            <Typography variant="body2">
                                                                {new Date(key.expires_at).toLocaleDateString()}
                                                            </Typography>
                                                        ) : (
                                                            <Chip label="Expired" size="small" color="warning" />
                                                        )
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            Never
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {key.last_used_at ? (
                                                        <Typography variant="body2">
                                                            {new Date(key.last_used_at).toLocaleString()}
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            Never
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <Tooltip title="View Audit Log">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedKey(key);
                                                                    loadAudit(key.id);
                                                                    setAuditOpen(true);
                                                                }}
                                                            >
                                                                <History fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {!key.revoked_at && (
                                                            <>
                                                                <Tooltip title="Rotate Key">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleRotateKey(key.id)}
                                                                        disabled={loading}
                                                                    >
                                                                        <RotateRight fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Revoke Key">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="warning"
                                                                        onClick={() => {
                                                                            setKeyToDelete(key);
                                                                            setRevokeConfirmOpen(true);
                                                                        }}
                                                                    >
                                                                        <Block fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                        <Tooltip title="Delete Key">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => {
                                                                    setKeyToDelete(key);
                                                                    setDeleteConfirmOpen(true);
                                                                }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Alert severity="info">
                                    No API keys found. Create your first API key to get started.
                                </Alert>
                            )}
                        </Stack>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        {selectedKey ? (
                            <Stack spacing={2}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            API Key
                                        </Typography>
                                        <Typography variant="h6" fontFamily="monospace">
                                            {selectedKey.key_id}
                                        </Typography>
                                    </CardContent>
                                </Card>

                                {auditLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : auditEntries.length > 0 ? (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Action</TableCell>
                                                <TableCell>IP Address</TableCell>
                                                <TableCell>User Agent</TableCell>
                                                <TableCell>Date</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {auditEntries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <Chip label={entry.action} size="small" />
                                                    </TableCell>
                                                    <TableCell>{entry.ip_address || '—'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                                            {entry.user_agent || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{new Date(entry.requested_at).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" py={4}>
                                        No audit entries found
                                    </Typography>
                                )}
                            </Stack>
                        ) : (
                            <Alert severity="info">Select an API key from the API Keys tab to view its audit log</Alert>
                        )}
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create API Key Dialog */}
            <Dialog open={createKeyOpen} onClose={() => setCreateKeyOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} pt={1}>
                        <TextField
                            label="Owner Type"
                            select
                            fullWidth
                            value={ownerType}
                            onChange={(e) => {
                                setOwnerType(e.target.value as 'vendor_org' | 'user');
                                setOwnerId('');
                            }}
                            SelectProps={{ native: true }}
                        >
                            <option value="vendor_org">Organisation</option>
                            <option value="user">User</option>
                        </TextField>

                        {ownerType === 'vendor_org' ? (
                            <TextField
                                label="Organisation"
                                select
                                fullWidth
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                                SelectProps={{ native: true }}
                            >
                                <option value="">Select organisation</option>
                                {getOrgOptions().map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </TextField>
                        ) : (
                            <TextField
                                label="User ID"
                                fullWidth
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                                placeholder="Enter user ID"
                            />
                        )}

                        <TextField
                            label="Scopes (comma-separated)"
                            fullWidth
                            value={scopes}
                            onChange={(e) => setScopes(e.target.value)}
                            placeholder="wallet:read,wallet:write,wallet:transfer"
                            helperText="Leave empty for all scopes"
                        />

                        <TextField
                            label="Expires At (Optional)"
                            type="datetime-local"
                            fullWidth
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateKeyOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreateKey} disabled={loading || !ownerId.trim()}>
                        {loading ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Revoke Confirmation */}
            <Dialog open={revokeConfirmOpen} onClose={() => setRevokeConfirmOpen(false)}>
                <DialogTitle>Revoke API Key</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to revoke API key <strong>{keyToDelete?.key_id}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRevokeConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="warning" onClick={handleRevokeKey} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Revoke'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Delete API Key</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to permanently delete API key <strong>{keyToDelete?.key_id}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteKey} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Audit Log Dialog */}
            <Dialog open={auditOpen} onClose={() => setAuditOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Audit Log - {selectedKey?.key_id}</DialogTitle>
                <DialogContent dividers>
                    {auditLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : auditEntries.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Action</TableCell>
                                    <TableCell>IP Address</TableCell>
                                    <TableCell>User Agent</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {auditEntries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <Chip label={entry.action} size="small" />
                                        </TableCell>
                                        <TableCell>{entry.ip_address || '—'}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                                {entry.user_agent || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{new Date(entry.requested_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            No audit entries found
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAuditOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ApiKeysSecurityModal;

