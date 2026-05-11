import React, { useMemo, useState } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    MenuItem,
    Button,
    Stack,
    Divider,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Switch,
    FormControlLabel,
    ToggleButtonGroup,
    ToggleButton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Paper,
    InputAdornment,
} from '@mui/material';
import { Delete, QrCodeScanner, ReceiptLong, Sync, OfflineBolt, Undo, AccountBalanceWallet, CheckCircle, Close } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    addCartItem,
    clearCart,
    removeCartItem,
    enqueueTransaction,
    setStatus,
    setError,
    markTransactionSynced,
} from '../../store/slices/posSlice';

const quickItems = [
    { name: 'Airtime Top-up', amount: 1000 },
    { name: 'POS Cash Withdrawal', amount: 5000 },
    { name: 'Utility Payment', amount: 2500 },
];

const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'transfer', label: 'Bank Transfer' },
    { value: 'wallet', label: 'Wallet' },
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(value);

const PointOfSale: React.FC = () => {
    const dispatch = useAppDispatch();
    const { cart, pendingTransactions, status, error, lastSyncedAt } = useAppSelector((state) => state.pos);

    const [itemName, setItemName] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [quantity, setQuantity] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'wallet'>('cash');
    const [customerReference, setCustomerReference] = useState('');
    const [offlineMode, setOfflineMode] = useState(false);

    // Quick Action Dialog States
    const [qrScanDialogOpen, setQrScanDialogOpen] = useState(false);
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [refundForm, setRefundForm] = useState({ reference: '', amount: '', reason: '' });
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundSuccess, setRefundSuccess] = useState(false);
    const [reconciliationForm, setReconciliationForm] = useState({
        expectedCash: '',
        actualCash: '',
        notes: '',
    });
    const [reconciliationSubmitted, setReconciliationSubmitted] = useState(false);

    const cartTotal = useMemo(
        () => cart.reduce((sum, item) => sum + item.amount * item.quantity, 0),
        [cart]
    );

    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    const offlineQueuedCount = useMemo(
        () => pendingTransactions.filter((txn) => txn.offline && txn.status === 'queued').length,
        [pendingTransactions]
    );

    const handleAddQuickItem = (name: string, amountValue: number) => {
        setItemName(name);
        setAmount(amountValue);
        setQuantity(1);
    };

    const handleAddToCart = () => {
        if (!itemName || !amount || amount <= 0) {
            dispatch(setError('Enter a valid item and amount.'));
            return;
        }

        dispatch(
            addCartItem({
                name: itemName,
                amount,
                quantity,
                metadata: { sku: `${itemName.toLowerCase().replace(/\s+/g, '-')}-${amount}` },
            })
        );
        dispatch(setError(undefined));
        setItemName('');
        setAmount('');
        setQuantity(1);
    };

    const handleSubmitSale = () => {
        if (!cart.length) {
            dispatch(setError('Add at least one item to the cart.'));
            return;
        }

        dispatch(
            enqueueTransaction({
                items: cart,
                total: cartTotal,
                paymentMethod,
                customerIdentifier: customerReference || undefined,
                offline: offlineMode,
            })
        );
        dispatch(clearCart());
        dispatch(setStatus(offlineMode ? 'success' : 'processing'));
        setTimeout(() => dispatch(setStatus('idle')), offlineMode ? 1800 : 900);
        setCustomerReference('');
    };

    const handleSyncOffline = () => {
        dispatch(setStatus('processing'));
        setTimeout(() => {
            pendingTransactions
                .filter((txn) => txn.offline)
                .forEach((txn) => {
                    dispatch(markTransactionSynced(txn.id));
                });
            dispatch(setStatus('success'));
            setTimeout(() => dispatch(setStatus('idle')), 1200);
        }, 1200);
    };

    // QR Scan handler
    const handleQrScan = () => {
        setQrLoading(true);
        // Simulate QR scanning
        setTimeout(() => {
            setQrLoading(false);
            // Simulate a scanned payment request
            setItemName('QR Payment Request');
            setAmount(2500);
            setQuantity(1);
            setCustomerReference('QR-' + Math.random().toString(36).substr(2, 8).toUpperCase());
            setQrScanDialogOpen(false);
        }, 2000);
    };

    // Refund handler
    const handleRefund = () => {
        if (!refundForm.reference || !refundForm.amount) return;
        setRefundLoading(true);
        setTimeout(() => {
            setRefundLoading(false);
            setRefundSuccess(true);
            setTimeout(() => {
                setRefundDialogOpen(false);
                setRefundSuccess(false);
                setRefundForm({ reference: '', amount: '', reason: '' });
            }, 2000);
        }, 1500);
    };

    // Reconciliation handler
    const handleReconciliation = () => {
        setReconciliationSubmitted(true);
        setTimeout(() => {
            setReconciliationDialogOpen(false);
            setReconciliationSubmitted(false);
            setReconciliationForm({ expectedCash: '', actualCash: '', notes: '' });
        }, 2000);
    };

    // Calculate reconciliation variance
    const reconciliationVariance = useMemo(() => {
        const expected = Number(reconciliationForm.expectedCash) || 0;
        const actual = Number(reconciliationForm.actualCash) || 0;
        return actual - expected;
    }, [reconciliationForm]);

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Shift POS Summary
                        </Typography>
                        <Typography variant="h4" sx={{ mt: 1 }}>
                            {formatCurrency(cartTotal || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Active cart total • {cartCount} item(s)
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <OfflineBolt color={offlineMode ? 'warning' : 'disabled'} />
                            <Typography variant="subtitle2" color="text.secondary">
                                Offline Queue
                            </Typography>
                        </Stack>
                        <Typography variant="h4" sx={{ mt: 1 }}>
                            {offlineQueuedCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Transactions waiting for sync
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Last Sync
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                            {lastSyncedAt
                                ? new Date(lastSyncedAt).toLocaleTimeString()
                                : 'No sync recorded yet'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Ensure connectivity before closing shift
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            {error && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">Register Sale</Typography>
                                <ToggleButtonGroup
                                    exclusive
                                    value={paymentMethod}
                                    onChange={(_, value) => value && setPaymentMethod(value)}
                                    size="small"
                                >
                                    {paymentMethods.map((method) => (
                                        <ToggleButton key={method.value} value={method.value}>
                                            {method.label}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Stack>
                            <Divider sx={{ mt: 2, mb: 2 }} />
                            <Stack spacing={2}>
                                <TextField
                                    label="Item / Service"
                                    value={itemName}
                                    onChange={(event) => setItemName(event.target.value)}
                                    placeholder="POS Cash Withdrawal"
                                    fullWidth
                                />
                                <TextField
                                    label="Amount"
                                    type="number"
                                    value={amount}
                                    onChange={(event) => {
                                        const nextValue = event.target.value === '' ? '' : Number(event.target.value);
                                        setAmount(nextValue);
                                    }}
                                    fullWidth
                                    InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>₦</span> }}
                                />
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(event) => {
                                        const nextValue = Math.max(1, Number(event.target.value) || 1);
                                        setQuantity(nextValue);
                                    }}
                                    inputProps={{ min: 1 }}
                                    fullWidth
                                />
                                <TextField
                                    label="Customer Reference (optional)"
                                    value={customerReference}
                                    onChange={(event) => setCustomerReference(event.target.value)}
                                    placeholder="Phone or invoice number"
                                    fullWidth
                                />
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {quickItems.map((quick) => (
                                        <Chip
                                            key={quick.name}
                                            label={`${quick.name} • ${formatCurrency(quick.amount)}`}
                                            onClick={() => handleAddQuickItem(quick.name, quick.amount)}
                                            sx={{ mb: 1 }}
                                        />
                                    ))}
                                </Stack>
                                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={offlineMode}
                                                onChange={(_, checked) => setOfflineMode(checked)}
                                                color="warning"
                                            />
                                        }
                                        label="Offline mode (queue transaction)"
                                    />
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" color="secondary" onClick={() => dispatch(clearCart())}>
                                            Clear Cart
                                        </Button>
                                        <Button variant="contained" onClick={handleAddToCart}>
                                            Add Item
                                        </Button>
                                    </Stack>
                                </Stack>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={<ReceiptLong />}
                                    onClick={handleSubmitSale}
                                >
                                    Complete Sale ({formatCurrency(cartTotal)})
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Stack spacing={3}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">Cart Items</Typography>
                                    <Chip label={`${cart.length} unique`} color="primary" variant="outlined" />
                                </Stack>
                                <Divider sx={{ mt: 2, mb: 2 }} />
                                <List dense>
                                    {cart.map((item) => (
                                        <ListItem key={item.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="subtitle2">
                                                        {item.name} × {item.quantity}
                                                    </Typography>
                                                }
                                                secondary={`${formatCurrency(item.amount)} per item`}
                                            />
                                            <ListItemSecondaryAction>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="body2">
                                                        {formatCurrency(item.amount * item.quantity)}
                                                    </Typography>
                                                    <IconButton edge="end" onClick={() => dispatch(removeCartItem(item.id))}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                                {!cart.length && (
                                    <Typography variant="body2" color="text.secondary">
                                        Add items to build a sale. Quick chips help mirror popular transactions.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">Offline Queue</Typography>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        startIcon={<Sync />}
                                        onClick={handleSyncOffline}
                                        disabled={!offlineQueuedCount || status === 'processing'}
                                    >
                                        Sync Now
                                    </Button>
                                </Stack>
                                <Divider sx={{ mt: 2, mb: 2 }} />
                                <List dense>
                                    {pendingTransactions.map((txn) => (
                                        <ListItem key={txn.id} sx={{ mb: 1 }}>
                                            <ListItemText
                                                primary={
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        {txn.offline && <Chip label="Offline" size="small" color="warning" />}
                                                        <Typography variant="subtitle2">{txn.reference}</Typography>
                                                    </Stack>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(txn.createdAt).toLocaleTimeString()} •{' '}
                                                        {formatCurrency(txn.total)} via {txn.paymentMethod.toUpperCase()}
                                                    </Typography>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <Chip
                                                    label={txn.status === 'queued' ? 'Queued' : 'Synced'}
                                                    color={txn.status === 'queued' ? 'warning' : 'success'}
                                                    size="small"
                                                />
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                                {!pendingTransactions.length && (
                                    <Typography variant="body2" color="text.secondary">
                                        No transactions queued. Process sales to populate the activity feed.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent>
                                <Typography variant="h6">Quick Actions</Typography>
                                <Divider sx={{ mt: 2, mb: 2 }} />
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        startIcon={<QrCodeScanner />}
                                        onClick={() => setQrScanDialogOpen(true)}
                                    >
                                        Scan QR Request
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Undo />}
                                        onClick={() => setRefundDialogOpen(true)}
                                    >
                                        Issue Refund
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AccountBalanceWallet />}
                                        onClick={() => setReconciliationDialogOpen(true)}
                                    >
                                        Cash Reconciliation
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* QR Scan Dialog */}
            <Dialog open={qrScanDialogOpen} onClose={() => !qrLoading && setQrScanDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <QrCodeScanner color="primary" />
                        <Typography variant="h6">Scan QR Payment Request</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                        {qrLoading ? (
                            <>
                                <CircularProgress size={60} />
                                <Typography>Scanning for QR code...</Typography>
                            </>
                        ) : (
                            <>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        width: 200,
                                        height: 200,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'action.hover',
                                    }}
                                >
                                    <QrCodeScanner sx={{ fontSize: 80, color: 'text.secondary' }} />
                                </Paper>
                                <Typography color="text.secondary">
                                    Point your camera at the QR code to scan a payment request
                                </Typography>
                                <Button variant="contained" onClick={handleQrScan}>
                                    Start Scanning
                                </Button>
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrScanDialogOpen(false)} disabled={qrLoading}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Refund Dialog */}
            <Dialog open={refundDialogOpen} onClose={() => !refundLoading && setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Undo color="primary" />
                        <Typography variant="h6">Issue Refund</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {refundSuccess ? (
                        <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                            <CheckCircle color="success" sx={{ fontSize: 60 }} />
                            <Typography variant="h6">Refund Issued Successfully</Typography>
                            <Typography color="text.secondary">
                                {formatCurrency(Number(refundForm.amount))} has been refunded
                            </Typography>
                        </Stack>
                    ) : (
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <Alert severity="warning">
                                Refunds will be deducted from your commission balance
                            </Alert>
                            <TextField
                                fullWidth
                                label="Original Transaction Reference"
                                value={refundForm.reference}
                                onChange={(e) => setRefundForm({ ...refundForm, reference: e.target.value })}
                                placeholder="e.g., TXN123456789"
                            />
                            <TextField
                                fullWidth
                                label="Refund Amount"
                                type="number"
                                value={refundForm.amount}
                                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Reason for Refund"
                                value={refundForm.reason}
                                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                multiline
                                rows={3}
                                placeholder="Explain why this refund is being issued..."
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRefundDialogOpen(false)} disabled={refundLoading}>
                        {refundSuccess ? 'Close' : 'Cancel'}
                    </Button>
                    {!refundSuccess && (
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleRefund}
                            disabled={refundLoading || !refundForm.reference || !refundForm.amount}
                            startIcon={refundLoading ? <CircularProgress size={20} /> : <Undo />}
                        >
                            {refundLoading ? 'Processing...' : 'Issue Refund'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Cash Reconciliation Dialog */}
            <Dialog open={reconciliationDialogOpen} onClose={() => !reconciliationSubmitted && setReconciliationDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AccountBalanceWallet color="primary" />
                        <Typography variant="h6">Cash Reconciliation</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {reconciliationSubmitted ? (
                        <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                            <CheckCircle color="success" sx={{ fontSize: 60 }} />
                            <Typography variant="h6">Reconciliation Submitted</Typography>
                            <Paper variant="outlined" sx={{ p: 2, width: '100%' }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Expected Cash</Typography>
                                        <Typography>{formatCurrency(Number(reconciliationForm.expectedCash) || 0)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Actual Cash</Typography>
                                        <Typography>{formatCurrency(Number(reconciliationForm.actualCash) || 0)}</Typography>
                                    </Stack>
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography fontWeight="bold">Variance</Typography>
                                        <Typography
                                            fontWeight="bold"
                                            color={reconciliationVariance >= 0 ? 'success.main' : 'error.main'}
                                        >
                                            {reconciliationVariance >= 0 ? '+' : ''}{formatCurrency(reconciliationVariance)}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Stack>
                    ) : (
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <Alert severity="info">
                                Complete your shift by reconciling cash on hand with expected amounts
                            </Alert>
                            <TextField
                                fullWidth
                                label="Expected Cash (from system)"
                                type="number"
                                value={reconciliationForm.expectedCash}
                                onChange={(e) => setReconciliationForm({ ...reconciliationForm, expectedCash: e.target.value })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Actual Cash Counted"
                                type="number"
                                value={reconciliationForm.actualCash}
                                onChange={(e) => setReconciliationForm({ ...reconciliationForm, actualCash: e.target.value })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                }}
                            />
                            {reconciliationForm.expectedCash && reconciliationForm.actualCash && (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: reconciliationVariance >= 0 ? 'success.light' : 'error.light',
                                        borderColor: reconciliationVariance >= 0 ? 'success.main' : 'error.main',
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography>Variance</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {reconciliationVariance >= 0 ? '+' : ''}{formatCurrency(reconciliationVariance)}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            )}
                            <TextField
                                fullWidth
                                label="Notes (optional)"
                                value={reconciliationForm.notes}
                                onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                                multiline
                                rows={2}
                                placeholder="Any discrepancies or notes..."
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReconciliationDialogOpen(false)}>
                        {reconciliationSubmitted ? 'Close' : 'Cancel'}
                    </Button>
                    {!reconciliationSubmitted && (
                        <Button
                            variant="contained"
                            onClick={handleReconciliation}
                            disabled={!reconciliationForm.expectedCash || !reconciliationForm.actualCash}
                        >
                            Submit Reconciliation
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PointOfSale;

