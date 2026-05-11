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
    IconButton,
    Menu,
    MenuItem,
    Alert,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    FormControl,
    InputLabel,
    Select,
    Tabs,
    Tab,
    Autocomplete,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    MoreVert,
    Business,
    Refresh,
    Search,
    CheckCircle,
    Cancel,
    PersonAdd,
} from '@mui/icons-material';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import {
    fetchOrgBindings,
    addOrgBinding,
    updateBindingStatus,
    deleteBinding,
} from '../../services/vendorHierarchyService';
import { get } from '../../services/api';
import type { VendorOrg, VendorOrgForm, VendorRoleBinding, BindingForm } from '../../types/vendor';

interface ManageOrganisationsModalProps {
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

const ManageOrganisationsModal: React.FC<ManageOrganisationsModalProps> = ({ open, onClose }) => {
    const { tree, selectedOrgId, selectOrg, createOrg, updateOrg, removeOrg, refresh, tenantId } = useVendorHierarchy();
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [orgFormOpen, setOrgFormOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<VendorOrg | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<VendorOrg | null>(null);
    const [bindings, setBindings] = useState<VendorRoleBinding[]>([]);
    const [bindingsLoading, setBindingsLoading] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; org: VendorOrg } | null>(null);
    const [bindingFormOpen, setBindingFormOpen] = useState(false);
    const [formData, setFormData] = useState<VendorOrgForm>({
        name: '',
        level: 'sub_vendor',
        status: 'active',
    });
    const [bindingFormData, setBindingFormData] = useState<BindingForm>({
        user: '',
        role: 'sub_vendor',
        status: 'active',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // User search state
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [users, setUsers] = useState<Array<{ id: string; email: string; first_name?: string; last_name?: string }>>([]);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; first_name?: string; last_name?: string } | null>(null);

    useEffect(() => {
        if (open) {
            refresh()
                .then(() => {
                    // Auto-select first organization if none selected and tree has items
                    // Use setTimeout to ensure tree is updated after refresh
                    setTimeout(() => {
                        if (!selectedOrgId && tree.length > 0) {
                            console.log('[ManageOrganisationsModal] Auto-selecting first organization:', tree[0].id);
                            selectOrg(tree[0].id);
                        }
                    }, 100);
                })
                .catch((err) => {
                    console.error('Failed to refresh organisations:', err);
                    setError(err?.message || 'Failed to load organisations');
                });
            setSearchTerm('');
            setTabValue(0);
        }
    }, [open, refresh]);

    // Separate effect to auto-select when tree loads
    useEffect(() => {
        if (open && !selectedOrgId && tree.length > 0) {
            console.log('[ManageOrganisationsModal] Auto-selecting first organization from tree:', tree[0].id);
            selectOrg(tree[0].id);
        }
    }, [open, tree, selectedOrgId, selectOrg]);

    useEffect(() => {
        if (selectedOrgId && open) {
            loadBindings(selectedOrgId);
        }
    }, [selectedOrgId, open]);

    // User search effect
    useEffect(() => {
        if (bindingFormOpen && userSearchTerm.length >= 2) {
            const timeoutId = setTimeout(() => {
                searchUsers(userSearchTerm);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else if (userSearchTerm.length < 2) {
            setUsers([]);
        }
    }, [userSearchTerm, bindingFormOpen]);

    const searchUsers = async (query: string) => {
        if (!query || query.length < 2) {
            setUsers([]);
            return;
        }

        setUserSearchLoading(true);
        try {
            console.log('[ManageOrganisationsModal] Searching users:', query);
            const data = await get<Array<{ id: string; email: string; first_name?: string; last_name?: string }>>(
                `/users/?search=${encodeURIComponent(query)}`
            );
            console.log('[ManageOrganisationsModal] Found users:', data.length);
            setUsers(data || []);
        } catch (err: any) {
            console.error('[ManageOrganisationsModal] Failed to search users:', err);
            setUsers([]);
        } finally {
            setUserSearchLoading(false);
        }
    };

    const loadBindings = async (orgId: string) => {
        setBindingsLoading(true);
        try {
            const data = await fetchOrgBindings(orgId);
            setBindings(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load bindings');
        } finally {
            setBindingsLoading(false);
        }
    };

    const filteredOrgs = tree.filter((org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateOrg = async () => {
        if (!formData.name.trim()) {
            setError('Organization name is required');
            return;
        }
        if (!tenantId) {
            setError('Tenant ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await createOrg({ ...formData, tenant: tenantId } as any);
            setSuccess('Organization created successfully');
            setOrgFormOpen(false);
            setFormData({ name: '', level: 'sub_vendor', status: 'active' });
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOrg = async () => {
        if (!editingOrg || !formData.name.trim()) {
            setError('Organization name is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await updateOrg(editingOrg.id, formData);
            setSuccess('Organization updated successfully');
            setOrgFormOpen(false);
            setEditingOrg(null);
            setFormData({ name: '', level: 'sub_vendor', status: 'active' });
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to update organization');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrg = async () => {
        if (!orgToDelete) return;

        setLoading(true);
        setError(null);
        try {
            await removeOrg(orgToDelete.id);
            setSuccess('Organization deleted successfully');
            setDeleteConfirmOpen(false);
            setOrgToDelete(null);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to delete organization');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBinding = async () => {
        if (!selectedOrgId) {
            setError('Please select an organization first');
            return;
        }

        if (!selectedUser) {
            setError('Please select a user');
            return;
        }

        if (!bindingFormData.role) {
            setError('Please select a role');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            console.log('[ManageOrganisationsModal] Adding binding:', {
                orgId: selectedOrgId,
                userId: selectedUser.id,
                userEmail: selectedUser.email,
                role: bindingFormData.role,
            });

            const payload: BindingForm = {
                user: selectedUser.id,
                role: bindingFormData.role,
                status: bindingFormData.status || 'active',
            };

            await addOrgBinding(selectedOrgId, payload);
            setSuccess('Vendor admin added successfully');
            setBindingFormOpen(false);
            setBindingFormData({ user: '', role: 'sub_vendor', status: 'active' });
            setSelectedUser(null);
            setUserSearchTerm('');
            setUsers([]);
            await loadBindings(selectedOrgId);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('[ManageOrganisationsModal] Failed to add binding:', err);

            // Extract detailed error message
            let errorMessage = 'Failed to add vendor admin. Please try again.';
            if (err?.message) {
                errorMessage = err.message;
            } else if (err?.detail) {
                errorMessage = err.detail;
            } else if (err?.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.message) {
                    errorMessage = data.message;
                } else if (data.user) {
                    errorMessage = Array.isArray(data.user) ? data.user[0] : data.user;
                } else if (data.role) {
                    errorMessage = Array.isArray(data.role) ? data.role[0] : data.role;
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBinding = async (bindingId: string, updates: Partial<BindingForm>) => {
        setLoading(true);
        setError(null);
        try {
            await updateBindingStatus(bindingId, updates);
            setSuccess('Binding updated successfully');
            if (selectedOrgId) await loadBindings(selectedOrgId);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to update binding');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBinding = async (bindingId: string) => {
        setLoading(true);
        setError(null);
        try {
            await deleteBinding(bindingId);
            setSuccess('Binding removed successfully');
            if (selectedOrgId) await loadBindings(selectedOrgId);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to remove binding');
        } finally {
            setLoading(false);
        }
    };

    const openEditForm = (org: VendorOrg) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            level: org.level,
            status: org.status,
            parent: org.parent,
        });
        setOrgFormOpen(true);
        setMenuAnchor(null);
    };

    const openDeleteConfirm = (org: VendorOrg) => {
        setOrgToDelete(org);
        setDeleteConfirmOpen(true);
        setMenuAnchor(null);
    };

    const renderOrgTree = (orgs: VendorOrg[], level = 0): React.ReactNode => {
        return orgs.map((org) => (
            <Box key={org.id} sx={{ ml: level * 2 }}>
                <Card
                    variant="outlined"
                    sx={{
                        mb: 1,
                        cursor: 'pointer',
                        border: selectedOrgId === org.id ? '2px solid' : '1px solid',
                        borderColor: selectedOrgId === org.id ? 'primary.main' : 'divider',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => selectOrg(org.id)}
                >
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack spacing={1} flex={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Business fontSize="small" />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {org.name}
                                    </Typography>
                                    <Chip label={org.level} size="small" color="primary" />
                                    <Chip
                                        label={org.status}
                                        size="small"
                                        color={org.status === 'active' ? 'success' : 'warning'}
                                    />
                                </Stack>
                                {org.parent_name && (
                                    <Typography variant="caption" color="text.secondary">
                                        Parent: {org.parent_name}
                                    </Typography>
                                )}
                            </Stack>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuAnchor({ el: e.currentTarget, org });
                                }}
                            >
                                <MoreVert />
                            </IconButton>
                        </Stack>
                    </CardContent>
                </Card>
                {org.children && org.children.length > 0 && renderOrgTree(org.children, level + 1)}
            </Box>
        ));
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5">Manage Organisations</Typography>
                        <Button startIcon={<Refresh />} onClick={refresh} size="small">
                            Refresh
                        </Button>
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

                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                        <Tab label="Organisations" />
                        <Tab label="User Bindings" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search organisations..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => {
                                        setEditingOrg(null);
                                        setFormData({ name: '', level: 'sub_vendor', status: 'active' });
                                        setOrgFormOpen(true);
                                    }}
                                >
                                    Add Organisation
                                </Button>
                            </Stack>

                            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                {filteredOrgs.length > 0 ? (
                                    renderOrgTree(filteredOrgs)
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" py={4}>
                                        {searchTerm ? 'No organisations match your search' : 'No organisations found'}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        {selectedOrgId ? (
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="subtitle1">
                                        User Bindings for: {tree.find((o) => o.id === selectedOrgId)?.name || 'Selected Organisation'}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PersonAdd />}
                                        onClick={() => {
                                            if (!selectedOrgId) {
                                                setError('Please select an organization first');
                                                return;
                                            }
                                            setBindingFormData({ user: '', role: 'sub_vendor', status: 'active' });
                                            setSelectedUser(null);
                                            setUserSearchTerm('');
                                            setUsers([]);
                                            setError(null);
                                            setBindingFormOpen(true);
                                        }}
                                        disabled={!selectedOrgId || bindingsLoading}
                                        title={
                                            !selectedOrgId
                                                ? 'Please select an organization from the list above first'
                                                : bindingsLoading
                                                    ? 'Loading bindings...'
                                                    : 'Add Vendor Admin to this organization'
                                        }
                                        sx={{
                                            opacity: !selectedOrgId ? 0.6 : 1,
                                        }}
                                    >
                                        Add Vendor Admin
                                    </Button>
                                </Stack>

                                {bindingsLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : bindings.length > 0 ? (
                                    <List>
                                        {bindings.map((binding) => (
                                            <ListItem key={binding.id} divider>
                                                <ListItemText
                                                    primary={binding.user_email}
                                                    secondary={
                                                        <Stack direction="row" spacing={1} mt={0.5}>
                                                            <Chip label={binding.role} size="small" />
                                                            <Chip
                                                                label={binding.status}
                                                                size="small"
                                                                color={binding.status === 'active' ? 'success' : 'warning'}
                                                            />
                                                        </Stack>
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                handleUpdateBinding(binding.id, {
                                                                    status: binding.status === 'active' ? 'suspended' : 'active',
                                                                })
                                                            }
                                                        >
                                                            {binding.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </Button>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteBinding(binding.id)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Stack>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" py={4}>
                                        No user bindings found
                                    </Typography>
                                )}
                            </Stack>
                        ) : (
                            <Alert severity="info">
                                Please select an organisation from the "Organisations" tab above to view and manage user bindings.
                                {tree.length > 0 && (
                                    <Box mt={1}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {
                                                if (tree.length > 0) {
                                                    selectOrg(tree[0].id);
                                                }
                                            }}
                                        >
                                            Select First Organisation
                                        </Button>
                                    </Box>
                                )}
                            </Alert>
                        )}
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Organisation Form Dialog */}
            <Dialog open={orgFormOpen} onClose={() => setOrgFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingOrg ? 'Edit Organisation' : 'Create Organisation'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} pt={1}>
                        <TextField
                            label="Organisation Name"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Level</InputLabel>
                            <Select
                                value={formData.level}
                                label="Level"
                                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                            >
                                <MenuItem value="vendor">Vendor</MenuItem>
                                <MenuItem value="sub_vendor">Sub Vendor</MenuItem>
                                <MenuItem value="agent">Agent</MenuItem>
                                <MenuItem value="cashier">Cashier</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status || 'active'}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="suspended">Suspended</MenuItem>
                                <MenuItem value="invited">Invited</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOrgFormOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={editingOrg ? handleUpdateOrg : handleCreateOrg}
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? <CircularProgress size={20} /> : editingOrg ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Delete Organisation</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteOrg} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Binding Dialog */}
            <Dialog open={bindingFormOpen} onClose={() => {
                setBindingFormOpen(false);
                setSelectedUser(null);
                setUserSearchTerm('');
                setUsers([]);
                setError(null);
            }} maxWidth="sm" fullWidth>
                <DialogTitle>Add Vendor Admin</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} pt={1}>
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {!selectedOrgId && (
                            <Alert severity="warning">
                                Please select an organization from the "Organisations" tab first.
                            </Alert>
                        )}

                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) =>
                                `${option.email}${option.first_name || option.last_name ? ` (${[option.first_name, option.last_name].filter(Boolean).join(' ')})` : ''}`
                            }
                            value={selectedUser}
                            onChange={(_, newValue) => {
                                setSelectedUser(newValue);
                                setError(null);
                            }}
                            onInputChange={(_, newValue) => {
                                setUserSearchTerm(newValue);
                                if (newValue.length < 2) {
                                    setUsers([]);
                                }
                            }}
                            loading={userSearchLoading}
                            filterOptions={(x) => x} // Disable client-side filtering, use server-side search
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search User"
                                    placeholder="Type to search users by email or name..."
                                    required
                                    helperText={
                                        userSearchTerm.length > 0 && userSearchTerm.length < 2
                                            ? 'Type at least 2 characters to search'
                                            : userSearchLoading
                                                ? 'Searching...'
                                                : userSearchTerm.length >= 2 && users.length === 0
                                                    ? 'No users found'
                                                    : userSearchTerm.length >= 2
                                                        ? `${users.length} user${users.length !== 1 ? 's' : ''} found`
                                                        : ''
                                    }
                                />
                            )}
                            noOptionsText={
                                userSearchTerm.length < 2
                                    ? 'Type at least 2 characters to search'
                                    : userSearchLoading
                                        ? 'Searching...'
                                        : 'No users found'
                            }
                        />

                        <FormControl fullWidth required>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={bindingFormData.role}
                                label="Role"
                                onChange={(e) => setBindingFormData({ ...bindingFormData, role: e.target.value as any })}
                            >
                                <MenuItem value="vendor">Vendor</MenuItem>
                                <MenuItem value="sub_vendor">Sub Vendor</MenuItem>
                                <MenuItem value="agent">Agent</MenuItem>
                                <MenuItem value="cashier">Cashier</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={bindingFormData.status || 'active'}
                                label="Status"
                                onChange={(e) => setBindingFormData({ ...bindingFormData, status: e.target.value as any })}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="suspended">Suspended</MenuItem>
                                <MenuItem value="invited">Invited</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setBindingFormOpen(false);
                        setSelectedUser(null);
                        setUserSearchTerm('');
                        setUsers([]);
                        setError(null);
                    }} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAddBinding}
                        disabled={loading || !selectedUser || !bindingFormData.role || !selectedOrgId}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {loading ? 'Adding...' : 'Add Admin'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor?.el}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem onClick={() => menuAnchor && openEditForm(menuAnchor.org)}>
                    <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem onClick={() => menuAnchor && openDeleteConfirm(menuAnchor.org)}>
                    <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>
        </>
    );
};

export default ManageOrganisationsModal;

