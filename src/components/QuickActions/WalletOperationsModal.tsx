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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
} from '@mui/material';
import {
    AccountBalanceWallet,
    Send,
    Refresh,
    Search,
    TrendingUp,
    TrendingDown,
    History,
} from '@mui/icons-material';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useOrgWallets } from '../../hooks/useOrgWallets';
import {
    fetchOrgWallets,
    transferBetweenWallets,
    fetchWalletTransactions,
} from '../../services/vendorHierarchyService';
import type { WalletSummary, WalletTransferPayload } from '../../types/vendor';

interface WalletOperationsModalProps {
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

const WalletOperationsModal: React.FC<WalletOperationsModalProps> = ({ open, onClose }) => {
    const { tree, selectedOrgId, selectOrg, tenantId } = useVendorHierarchy();
    const { wallets, loading: walletsLoading, refresh, transfer, totalBalance } = useOrgWallets(selectedOrgId);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [transferFormOpen, setTransferFormOpen] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
    const [transferData, setTransferData] = useState<WalletTransferPayload>({
        destination_owner_type: 'vendor_org',
        destination_owner_id: '',
        amount: 0,
        description: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (open && selectedOrgId) {
            refresh().catch((err) => {
                console.error('Failed to refresh wallets:', err);
                setError(err?.message || 'Failed to load wallets');
            });
        }
    }, [open, selectedOrgId, refresh]);

    useEffect(() => {
        if (selectedWallet && open) {
            loadTransactions(selectedWallet.id);
        }
    }, [selectedWallet, open]);

    const loadTransactions = async (walletId: string) => {
        setTransactionsLoading(true);
        try {
            const data = await fetchWalletTransactions(walletId);
            setTransactions(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load transactions');
            setTransactions([]);
        } finally {
            setTransactionsLoading(false);
        }
    };

    const filteredWallets = wallets.filter((wallet) =>
        wallet.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTransfer = async () => {
        if (!selectedWallet || !transferData.destination_owner_id || transferData.amount <= 0) {
            setError('Please fill in all required fields');
            return;
        }

        setTransferLoading(true);
        setError(null);
        try {
            await transfer(selectedWallet.id, transferData);
            setSuccess('Transfer completed successfully');
            setTransferFormOpen(false);
            setTransferData({
                destination_owner_type: 'vendor_org',
                destination_owner_id: '',
                amount: 0,
                description: '',
            });
            await refresh();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to complete transfer');
        } finally {
            setTransferLoading(false);
        }
    };

    const getDestinationOptions = () => {
        const options: Array<{ id: string; name: string; type: 'vendor_org' | 'user' }> = [];

        // Add all organisations from tree
        const addOrgs = (orgs: typeof tree) => {
            orgs.forEach((org) => {
                if (org.id !== selectedOrgId) {
                    options.push({ id: org.id, name: org.name, type: 'vendor_org' });
                    if (org.children) {
                        addOrgs(org.children);
                    }
                }
            });
        };
        addOrgs(tree);

        return options;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5">Wallet Operations</Typography>
                    <Stack direction="row" spacing={1}>
                        {selectedOrgId && (
                            <Button startIcon={<Refresh />} onClick={refresh} size="small" disabled={walletsLoading}>
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

                {!selectedOrgId ? (
                    <Alert severity="info">
                        Please select an organisation from the hierarchy to view wallets
                    </Alert>
                ) : (
                    <>
                        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                            <Tab label="Wallets Overview" />
                            <Tab label="Transfer Funds" />
                            <Tab label="Transaction History" />
                        </Tabs>

                        <TabPanel value={tabValue} index={0}>
                            <Stack spacing={2}>
                                <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                    Total Balance
                                                </Typography>
                                                <Typography variant="h4">
                                                    ₦{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </Box>
                                            <AccountBalanceWallet sx={{ fontSize: 48, opacity: 0.3 }} />
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search wallets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                                    }}
                                />

                                {walletsLoading ? (
                                    <Box display="flex" justifyContent="center" py={4}>
                                        <CircularProgress />
                                    </Box>
                                ) : filteredWallets.length > 0 ? (
                                    <Grid container spacing={2}>
                                        {filteredWallets.map((wallet) => (
                                            <Grid item xs={12} sm={6} md={4} key={wallet.id}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        cursor: 'pointer',
                                                        border: selectedWallet?.id === wallet.id ? '2px solid' : '1px solid',
                                                        borderColor: selectedWallet?.id === wallet.id ? 'primary.main' : 'divider',
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                    }}
                                                    onClick={() => setSelectedWallet(wallet)}
                                                >
                                                    <CardContent>
                                                        <Stack spacing={1}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                <Typography variant="subtitle2" fontWeight={600}>
                                                                    {wallet.key}
                                                                </Typography>
                                                                <Chip label={wallet.type} size="small" color="primary" />
                                                            </Stack>
                                                            <Typography variant="h6" color="primary">
                                                                ₦{Number(wallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </Typography>
                                                            {wallet.is_locked && (
                                                                <Chip label="Locked" size="small" color="error" />
                                                            )}
                                                            {wallet.daily_limit && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Daily Limit: ₦{Number(wallet.daily_limit).toLocaleString()}
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" py={4}>
                                        {searchTerm ? 'No wallets match your search' : 'No wallets found'}
                                    </Typography>
                                )}
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Stack spacing={3}>
                                {selectedWallet ? (
                                    <>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                    Source Wallet
                                                </Typography>
                                                <Typography variant="h6">{selectedWallet.key}</Typography>
                                                <Typography variant="h4" color="primary" mt={1}>
                                                    ₦{Number(selectedWallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </CardContent>
                                        </Card>

                                        <Stack spacing={2}>
                                            <FormControl fullWidth>
                                                <InputLabel>Destination Type</InputLabel>
                                                <Select
                                                    value={transferData.destination_owner_type}
                                                    label="Destination Type"
                                                    onChange={(e) =>
                                                        setTransferData({
                                                            ...transferData,
                                                            destination_owner_type: e.target.value as 'vendor_org' | 'user',
                                                            destination_owner_id: '',
                                                        })
                                                    }
                                                >
                                                    <MenuItem value="vendor_org">Organisation</MenuItem>
                                                    <MenuItem value="user">User</MenuItem>
                                                </Select>
                                            </FormControl>

                                            <FormControl fullWidth>
                                                <InputLabel>Destination</InputLabel>
                                                <Select
                                                    value={transferData.destination_owner_id}
                                                    label="Destination"
                                                    onChange={(e) =>
                                                        setTransferData({
                                                            ...transferData,
                                                            destination_owner_id: e.target.value,
                                                        })
                                                    }
                                                >
                                                    {getDestinationOptions().map((option) => (
                                                        <MenuItem key={`${option.type}-${option.id}`} value={option.id}>
                                                            {option.name} ({option.type})
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            <TextField
                                                label="Amount (₦)"
                                                type="number"
                                                fullWidth
                                                value={transferData.amount || ''}
                                                onChange={(e) =>
                                                    setTransferData({
                                                        ...transferData,
                                                        amount: Number(e.target.value),
                                                    })
                                                }
                                                inputProps={{ min: 0, step: 0.01 }}
                                            />

                                            <TextField
                                                label="Description (Optional)"
                                                fullWidth
                                                multiline
                                                rows={2}
                                                value={transferData.description || ''}
                                                onChange={(e) =>
                                                    setTransferData({
                                                        ...transferData,
                                                        description: e.target.value,
                                                    })
                                                }
                                            />

                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<Send />}
                                                onClick={handleTransfer}
                                                disabled={transferLoading || !transferData.destination_owner_id || transferData.amount <= 0}
                                                fullWidth
                                            >
                                                {transferLoading ? <CircularProgress size={20} /> : 'Transfer Funds'}
                                            </Button>
                                        </Stack>
                                    </>
                                ) : (
                                    <Alert severity="info">Please select a wallet from the overview tab to transfer funds</Alert>
                                )}
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            {selectedWallet ? (
                                <Stack spacing={2}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Wallet
                                            </Typography>
                                            <Typography variant="h6">{selectedWallet.key}</Typography>
                                        </CardContent>
                                    </Card>

                                    {transactionsLoading ? (
                                        <Box display="flex" justifyContent="center" py={4}>
                                            <CircularProgress />
                                        </Box>
                                    ) : transactions.length > 0 ? (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Reference</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell align="right">Amount</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Date</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {transactions.map((tx: any) => (
                                                    <TableRow key={tx.id || tx.transaction_id}>
                                                        <TableCell>{tx.reference || tx.transaction_id || '—'}</TableCell>
                                                        <TableCell>{tx.type || tx.transaction_type || '—'}</TableCell>
                                                        <TableCell align="right">
                                                            ₦{Number(tx.amount || tx.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={tx.status || 'pending'}
                                                                size="small"
                                                                color={tx.status === 'completed' || tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'error' : 'default'}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography color="text.secondary" textAlign="center" py={4}>
                                            No transactions found
                                        </Typography>
                                    )}
                                </Stack>
                            ) : (
                                <Alert severity="info">Please select a wallet from the overview tab to view transaction history</Alert>
                            )}
                        </TabPanel>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default WalletOperationsModal;

