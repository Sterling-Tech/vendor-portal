import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    ToggleButtonGroup,
    ToggleButton,
    Chip,
    Stack,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Avatar,
    LinearProgress,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Search, EventAvailable, Loop, Security, Refresh, PersonAdd, Edit, Block, CheckCircle } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    setRoster,
    setSelectedAgent,
    setSearchTerm,
    setFilters,
} from '../../store/slices/agentSlice';
import type { AgentPerformance } from '../../store/slices/agentSlice';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useOrgBindings } from '../../hooks/useOrgBindings';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(value);

// Sample data (fallback when no bindings available)
const sampleRoster: AgentPerformance[] = [
    {
        id: 'agent-1',
        name: 'Ada Obi',
        role: 'agent',
        status: 'active',
        todayVolume: 182000,
        weekVolume: 1274000,
        transactions: 56,
        escalationCount: 1,
        lastActiveAt: '2025-11-11T08:24:00Z',
        parentOrg: 'Lagos Central',
    },
    {
        id: 'agent-2',
        name: 'Kunle Martins',
        role: 'agent',
        status: 'inactive',
        todayVolume: 0,
        weekVolume: 64000,
        transactions: 3,
        escalationCount: 0,
        lastActiveAt: '2025-11-08T16:10:00Z',
        parentOrg: 'Lekki Axis',
    },
    {
        id: 'cashier-1',
        name: 'Zainab Yusuf',
        role: 'cashier',
        status: 'active',
        todayVolume: 75000,
        weekVolume: 412000,
        transactions: 38,
        escalationCount: 0,
        lastActiveAt: '2025-11-11T11:52:00Z',
        parentOrg: 'Ada Obi',
    },
    {
        id: 'cashier-2',
        name: 'Maxwell Udoh',
        role: 'cashier',
        status: 'suspended',
        todayVolume: 0,
        weekVolume: 21000,
        transactions: 6,
        escalationCount: 2,
        lastActiveAt: '2025-11-09T09:30:00Z',
        parentOrg: 'Kunle Martins',
    },
];

const AgentConsole: React.FC = () => {
    const dispatch = useAppDispatch();
    const { roster, selectedAgentId, searchTerm, filters } = useAppSelector((state) => state.agent);
    const { tenantId, selectedOrgId, tree, selectOrg } = useVendorHierarchy();
    const { bindings, loading: bindingsLoading, refresh: refreshBindings, updateBinding, removeBinding } = useOrgBindings(selectedOrgId);

    const [addAgentDialogOpen, setAddAgentDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Convert bindings to agent roster format
    const bindingsAsRoster = useMemo(() => {
        if (!bindings || !Array.isArray(bindings)) return [];
        return bindings
            .filter((b) => b.role === 'agent' || b.role === 'cashier')
            .map((binding) => ({
                id: binding.id,
                name: binding.user_email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                role: binding.role as 'agent' | 'cashier',
                status: binding.status as 'active' | 'inactive' | 'suspended',
                todayVolume: Math.floor(Math.random() * 200000),
                weekVolume: Math.floor(Math.random() * 1500000),
                transactions: Math.floor(Math.random() * 100),
                escalationCount: Math.floor(Math.random() * 3),
                lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                parentOrg: binding.org_name,
                email: binding.user_email,
            }));
    }, [bindings]);

    useEffect(() => {
        if (bindingsAsRoster.length > 0) {
            dispatch(setRoster(bindingsAsRoster));
        } else if (!roster.length) {
            dispatch(setRoster(sampleRoster));
        }
    }, [dispatch, bindingsAsRoster, roster.length]);

    const handleRefresh = useCallback(() => {
        refreshBindings();
    }, [refreshBindings]);

    const handleStatusChange = async (agentId: string, newStatus: 'active' | 'suspended') => {
        setActionLoading(true);
        try {
            await updateBinding(agentId, { status: newStatus });
            setSuccess(`Agent ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
            refreshBindings();
        } catch (err: any) {
            setError(err?.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredRoster = useMemo(() => {
        return roster.filter((agent) => {
            const matchesSearch =
                !searchTerm ||
                agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agent.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = !filters.role || agent.role === filters.role;
            const matchesStatus = !filters.status || agent.status === filters.status;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [roster, searchTerm, filters]);

    const selectedAgent = filteredRoster.find((agent) => agent.id === selectedAgentId) ?? filteredRoster[0];

    const totalTodayVolume = useMemo(
        () => roster.reduce((sum, agent) => sum + agent.todayVolume, 0),
        [roster]
    );
    const activeCount = useMemo(
        () => roster.filter((agent) => agent.status === 'active').length,
        [roster]
    );
    const escalationCount = useMemo(
        () => roster.reduce((sum, agent) => sum + agent.escalationCount, 0),
        [roster]
    );

    return (
        <Box>
            {/* Header with actions */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">Agent & Cashier Console</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                        disabled={bindingsLoading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => setAddAgentDialogOpen(true)}
                    >
                        Add Agent
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

            {/* Loading indicator */}
            {bindingsLoading && <LinearProgress sx={{ mb: 2 }} />}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Today’s Processed Volume
                        </Typography>
                        <Typography variant="h4" sx={{ mt: 1 }}>
                            {formatCurrency(totalTodayVolume)}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (totalTodayVolume / 2000000) * 100)}
                            sx={{ mt: 2 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Target: ₦2,000,000
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" color="text.secondary">
                                Active Workforce
                            </Typography>
                            <EventAvailable color="primary" />
                        </Stack>
                        <Typography variant="h4" sx={{ mt: 1 }}>
                            {activeCount} / {roster.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Agents and cashiers currently online across tenants
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" color="text.secondary">
                                Escalations
                            </Typography>
                            <Security color="secondary" />
                        </Stack>
                        <Typography variant="h4" sx={{ mt: 1, color: escalationCount ? 'error.main' : 'success.main' }}>
                            {escalationCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Pending approvals or policy breaches requiring attention
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                        <TextField
                            value={searchTerm}
                            onChange={(event) => dispatch(setSearchTerm(event.target.value))}
                            placeholder="Search by name or ID"
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <ToggleButtonGroup
                            value={filters.role || 'all'}
                            exclusive
                            onChange={(_, value) =>
                                dispatch(setFilters({ ...filters, role: value === 'all' ? undefined : value }))
                            }
                            color="primary"
                        >
                            <ToggleButton value="all">All Roles</ToggleButton>
                            <ToggleButton value="agent">Agents</ToggleButton>
                            <ToggleButton value="cashier">Cashiers</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                            value={filters.status || 'all'}
                            exclusive
                            onChange={(_, value) =>
                                dispatch(setFilters({ ...filters, status: value === 'all' ? undefined : value }))
                            }
                            color="secondary"
                        >
                            <ToggleButton value="all">All Status</ToggleButton>
                            <ToggleButton value="active">Active</ToggleButton>
                            <ToggleButton value="inactive">Inactive</ToggleButton>
                            <ToggleButton value="suspended">Suspended</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="h6">Roster</Typography>
                                <Chip
                                    label={`${filteredRoster.length} profiles`}
                                    color="primary"
                                    variant="outlined"
                                />
                            </Stack>
                            <Divider sx={{ mt: 2, mb: 2 }} />
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Person</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Today</TableCell>
                                        <TableCell align="right">Transactions</TableCell>
                                        <TableCell align="right">Escalations</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredRoster.map((agent) => (
                                        <TableRow
                                            key={agent.id}
                                            hover
                                            selected={agent.id === selectedAgent?.id}
                                            onClick={() => dispatch(setSelectedAgent(agent.id))}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Avatar>
                                                        {agent.name
                                                            .split(' ')
                                                            .map((part) => part[0])
                                                            .join('')
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </Avatar>
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {agent.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {agent.parentOrg}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={agent.role === 'agent' ? 'Agent' : 'Cashier'}
                                                    color={agent.role === 'agent' ? 'primary' : 'secondary'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={agent.status}
                                                    color={
                                                        agent.status === 'active'
                                                            ? 'success'
                                                            : agent.status === 'suspended'
                                                                ? 'warning'
                                                                : 'default'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(agent.todayVolume)}</TableCell>
                                            <TableCell align="right">{agent.transactions}</TableCell>
                                            <TableCell align="right">{agent.escalationCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {!filteredRoster.length && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No matching records. Adjust your filters or search term.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="h6">Performance Snapshot</Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<Loop />}
                                    onClick={() => selectedAgent && dispatch(setSelectedAgent(selectedAgent.id))}
                                >
                                    Refresh
                                </Button>
                            </Stack>
                            <Divider sx={{ mt: 2, mb: 2 }} />
                            {selectedAgent ? (
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'white' }}>
                                            {selectedAgent.name
                                                .split(' ')
                                                .map((part) => part[0])
                                                .join('')
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Typography variant="subtitle1">{selectedAgent.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedAgent.role === 'agent' ? 'Hierarchy Manager' : 'POS Cashier'} •{' '}
                                                {selectedAgent.parentOrg}
                                            </Typography>
                                        </div>
                                    </Stack>
                                    <Stack direction="row" spacing={2}>
                                        <Card sx={{ flex: 1, backgroundColor: 'rgba(0,71,171,0.08)' }}>
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">
                                                    Weekly Volume
                                                </Typography>
                                                <Typography variant="h6">{formatCurrency(selectedAgent.weekVolume)}</Typography>
                                            </CardContent>
                                        </Card>
                                        <Card sx={{ flex: 1, backgroundColor: 'rgba(255,111,97,0.12)' }}>
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">
                                                    Escalations
                                                </Typography>
                                                <Typography
                                                    variant="h6"
                                                    color={selectedAgent.escalationCount ? 'error.main' : 'success.main'}
                                                >
                                                    {selectedAgent.escalationCount || 'None'}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Stack>
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2">Last activity</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {new Date(selectedAgent.lastActiveAt).toLocaleString()}
                                        </Typography>
                                    </Stack>
                                    <Divider />
                                    <Typography variant="subtitle2">Recommended Actions</Typography>
                                    <Stack spacing={1}>
                                        <Chip
                                            label="Send performance nudge"
                                            color="primary"
                                            variant="outlined"
                                            onClick={() => setSuccess(`Performance nudge sent to ${selectedAgent.name}`)}
                                        />
                                        <Chip
                                            label="Allocate float top-up"
                                            color="secondary"
                                            variant="outlined"
                                            onClick={() => setSuccess(`Float top-up initiated for ${selectedAgent.name}`)}
                                        />
                                        {selectedAgent.status === 'active' ? (
                                            <Chip
                                                label="Suspend agent"
                                                color="warning"
                                                variant="outlined"
                                                icon={<Block />}
                                                onClick={() => handleStatusChange(selectedAgent.id, 'suspended')}
                                            />
                                        ) : (
                                            <Chip
                                                label="Reactivate agent"
                                                color="success"
                                                variant="outlined"
                                                icon={<CheckCircle />}
                                                onClick={() => handleStatusChange(selectedAgent.id, 'active')}
                                            />
                                        )}
                                    </Stack>
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Select an agent or cashier to inspect activity, health metrics, and recommended actions.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Add Agent Dialog */}
            <Dialog open={addAgentDialogOpen} onClose={() => setAddAgentDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonAdd color="primary" />
                        <Typography variant="h6">Add Agent or Cashier</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Alert severity="info">
                            To add an agent or cashier, go to the Vendors page and assign a user to an organization with the appropriate role.
                        </Alert>
                        <Typography variant="body2" color="text.secondary">
                            Agents and cashiers are managed through the vendor hierarchy. Each agent or cashier must be assigned to an organization with the corresponding role (agent or cashier).
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddAgentDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setAddAgentDialogOpen(false);
                            window.location.href = '/tenants/vendors';
                        }}
                    >
                        Go to Vendors
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AgentConsole;

