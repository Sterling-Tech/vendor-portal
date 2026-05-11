import React, { useState, useMemo } from 'react';
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
    ToggleButton,
    ToggleButtonGroup,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    Paper,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    PhoneAndroid,
    Wifi,
    ElectricBolt,
    Water,
    Tv,
    Receipt,
    Refresh,
    History,
    CheckCircle,
    Cancel,
    ContentCopy,
} from '@mui/icons-material';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useOrgWallets } from '../../hooks/useOrgWallets';

// Types
interface PrepaidTransaction {
    id: string;
    type: 'airtime' | 'data' | 'electricity' | 'water' | 'tv';
    provider: string;
    amount: number;
    phone?: string;
    meterNumber?: string;
    smartCardNumber?: string;
    status: 'success' | 'pending' | 'failed';
    reference: string;
    createdAt: string;
    token?: string;
}

interface DataBundle {
    id: string;
    name: string;
    size: string;
    validity: string;
    price: number;
}

// Mock data
const networkProviders = [
    { id: 'mtn', name: 'MTN', color: '#FFCC00' },
    { id: 'glo', name: 'Glo', color: '#00A651' },
    { id: 'airtel', name: 'Airtel', color: '#ED1C24' },
    { id: '9mobile', name: '9mobile', color: '#006E51' },
];

const dataBundles: Record<string, DataBundle[]> = {
    mtn: [
        { id: 'mtn-1gb', name: '1GB Daily', size: '1GB', validity: '1 Day', price: 350 },
        { id: 'mtn-2gb', name: '2GB Weekly', size: '2GB', validity: '7 Days', price: 600 },
        { id: 'mtn-5gb', name: '5GB Monthly', size: '5GB', validity: '30 Days', price: 1500 },
        { id: 'mtn-10gb', name: '10GB Monthly', size: '10GB', validity: '30 Days', price: 2500 },
        { id: 'mtn-25gb', name: '25GB Monthly', size: '25GB', validity: '30 Days', price: 5000 },
    ],
    glo: [
        { id: 'glo-1gb', name: '1GB Daily', size: '1GB', validity: '1 Day', price: 300 },
        { id: 'glo-2.5gb', name: '2.5GB Weekly', size: '2.5GB', validity: '7 Days', price: 500 },
        { id: 'glo-7gb', name: '7GB Monthly', size: '7GB', validity: '30 Days', price: 1500 },
        { id: 'glo-13gb', name: '13GB Monthly', size: '13GB', validity: '30 Days', price: 2500 },
    ],
    airtel: [
        { id: 'airtel-1gb', name: '1GB Daily', size: '1GB', validity: '1 Day', price: 350 },
        { id: 'airtel-3gb', name: '3GB Weekly', size: '3GB', validity: '7 Days', price: 700 },
        { id: 'airtel-6gb', name: '6GB Monthly', size: '6GB', validity: '30 Days', price: 1500 },
        { id: 'airtel-12gb', name: '12GB Monthly', size: '12GB', validity: '30 Days', price: 2500 },
    ],
    '9mobile': [
        { id: '9mobile-1gb', name: '1GB Daily', size: '1GB', validity: '1 Day', price: 300 },
        { id: '9mobile-2.5gb', name: '2.5GB Weekly', size: '2.5GB', validity: '7 Days', price: 500 },
        { id: '9mobile-5gb', name: '5GB Monthly', size: '5GB', validity: '30 Days', price: 1200 },
        { id: '9mobile-11gb', name: '11GB Monthly', size: '11GB', validity: '30 Days', price: 2000 },
    ],
};

const electricityProviders = [
    { id: 'eko', name: 'Eko Electricity (EKEDC)' },
    { id: 'ikeja', name: 'Ikeja Electricity (IKEDC)' },
    { id: 'ibadan', name: 'Ibadan Electricity (IBEDC)' },
    { id: 'abuja', name: 'Abuja Electricity (AEDC)' },
    { id: 'kaduna', name: 'Kaduna Electricity (KEDC)' },
    { id: 'kano', name: 'Kano Electricity (KEDCO)' },
    { id: 'phed', name: 'Port Harcourt Electricity (PHED)' },
    { id: 'enugu', name: 'Enugu Electricity (EEDC)' },
];

const tvProviders = [
    { id: 'dstv', name: 'DSTV' },
    { id: 'gotv', name: 'GOtv' },
    { id: 'startimes', name: 'StarTimes' },
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(value);

const generateReference = () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

const PrepaidServices: React.FC = () => {
    const { selectedOrgId } = useVendorHierarchy();
    const { wallets, totalBalance } = useOrgWallets(selectedOrgId);

    // Service type state
    const [serviceType, setServiceType] = useState<'airtime' | 'data' | 'electricity' | 'water' | 'tv'>('airtime');

    // Form states
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [selectedNetwork, setSelectedNetwork] = useState('mtn');
    const [selectedBundle, setSelectedBundle] = useState<string>('');
    const [meterNumber, setMeterNumber] = useState('');
    const [electricityProvider, setElectricityProvider] = useState('');
    const [smartCardNumber, setSmartCardNumber] = useState('');
    const [tvProvider, setTvProvider] = useState('');
    const [waterAccountNumber, setWaterAccountNumber] = useState('');

    // UI states
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<PrepaidTransaction | null>(null);

    // Transaction history (mock data)
    const [transactions, setTransactions] = useState<PrepaidTransaction[]>([
        {
            id: '1',
            type: 'airtime',
            provider: 'MTN',
            amount: 1000,
            phone: '08012345678',
            status: 'success',
            reference: 'TXN1699234567ABC',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: '2',
            type: 'electricity',
            provider: 'Eko Electricity',
            amount: 5000,
            meterNumber: '12345678901',
            status: 'success',
            reference: 'TXN1699234123DEF',
            token: '1234-5678-9012-3456-7890',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
    ]);

    // Quick amounts for airtime
    const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

    // Get current data bundles based on selected network
    const currentBundles = useMemo(() => {
        return dataBundles[selectedNetwork] || [];
    }, [selectedNetwork]);

    // Calculate transaction amount
    const transactionAmount = useMemo(() => {
        if (serviceType === 'data' && selectedBundle) {
            const bundle = currentBundles.find(b => b.id === selectedBundle);
            return bundle?.price || 0;
        }
        return typeof amount === 'number' ? amount : 0;
    }, [serviceType, selectedBundle, amount, currentBundles]);

    // Validate form
    const isFormValid = useMemo(() => {
        switch (serviceType) {
            case 'airtime':
                return phoneNumber.length >= 10 && transactionAmount > 0;
            case 'data':
                return phoneNumber.length >= 10 && selectedBundle !== '';
            case 'electricity':
                return meterNumber.length >= 10 && electricityProvider !== '' && transactionAmount > 0;
            case 'tv':
                return smartCardNumber.length >= 8 && tvProvider !== '' && transactionAmount > 0;
            case 'water':
                return waterAccountNumber.length >= 8 && transactionAmount > 0;
            default:
                return false;
        }
    }, [serviceType, phoneNumber, transactionAmount, selectedBundle, meterNumber, electricityProvider, smartCardNumber, tvProvider, waterAccountNumber]);

    const handleServiceTypeChange = (
        _: React.MouseEvent<HTMLElement>,
        newType: 'airtime' | 'data' | 'electricity' | 'water' | 'tv' | null
    ) => {
        if (newType !== null) {
            setServiceType(newType);
            setAmount('');
            setSelectedBundle('');
            setError(null);
        }
    };

    const handlePurchase = () => {
        if (!isFormValid) {
            setError('Please fill all required fields');
            return;
        }
        if (transactionAmount > Number(totalBalance)) {
            setError('Insufficient wallet balance');
            return;
        }
        setConfirmDialogOpen(true);
    };

    const confirmPurchase = async () => {
        setLoading(true);
        setError(null);
        setConfirmDialogOpen(false);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            const transaction: PrepaidTransaction = {
                id: Date.now().toString(),
                type: serviceType,
                provider: serviceType === 'airtime' || serviceType === 'data'
                    ? networkProviders.find(n => n.id === selectedNetwork)?.name || ''
                    : serviceType === 'electricity'
                        ? electricityProviders.find(p => p.id === electricityProvider)?.name || ''
                        : serviceType === 'tv'
                            ? tvProviders.find(p => p.id === tvProvider)?.name || ''
                            : 'Water Board',
                amount: transactionAmount,
                phone: serviceType === 'airtime' || serviceType === 'data' ? phoneNumber : undefined,
                meterNumber: serviceType === 'electricity' ? meterNumber : undefined,
                smartCardNumber: serviceType === 'tv' ? smartCardNumber : undefined,
                status: 'success',
                reference: generateReference(),
                createdAt: new Date().toISOString(),
                token: serviceType === 'electricity' ? '1234-5678-9012-3456-7890' : undefined,
            };

            setTransactions(prev => [transaction, ...prev]);
            setLastTransaction(transaction);
            setSuccess('Transaction successful!');
            setReceiptDialogOpen(true);

            // Reset form
            setPhoneNumber('');
            setAmount('');
            setSelectedBundle('');
            setMeterNumber('');
            setSmartCardNumber('');
            setWaterAccountNumber('');
        } catch (err: any) {
            setError(err?.message || 'Transaction failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(null), 2000);
    };

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">Prepaid Services</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<History />} onClick={() => setHistoryDialogOpen(true)}>
                        History
                    </Button>
                    <Chip
                        icon={<Receipt />}
                        label={`Wallet: ${formatCurrency(Number(totalBalance))}`}
                        color="primary"
                        variant="outlined"
                    />
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

            {/* Service Type Selector */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Select Service
                    </Typography>
                    <ToggleButtonGroup
                        value={serviceType}
                        exclusive
                        onChange={handleServiceTypeChange}
                        sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                        <ToggleButton value="airtime" sx={{ px: 3 }}>
                            <Stack alignItems="center" spacing={0.5}>
                                <PhoneAndroid />
                                <Typography variant="caption">Airtime</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="data" sx={{ px: 3 }}>
                            <Stack alignItems="center" spacing={0.5}>
                                <Wifi />
                                <Typography variant="caption">Data</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="electricity" sx={{ px: 3 }}>
                            <Stack alignItems="center" spacing={0.5}>
                                <ElectricBolt />
                                <Typography variant="caption">Electricity</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="tv" sx={{ px: 3 }}>
                            <Stack alignItems="center" spacing={0.5}>
                                <Tv />
                                <Typography variant="caption">TV</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="water" sx={{ px: 3 }}>
                            <Stack alignItems="center" spacing={0.5}>
                                <Water />
                                <Typography variant="caption">Water</Typography>
                            </Stack>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {/* Main Form */}
                <Grid item xs={12} md={7}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {serviceType === 'airtime' && 'Buy Airtime'}
                                {serviceType === 'data' && 'Buy Data Bundle'}
                                {serviceType === 'electricity' && 'Pay Electricity Bill'}
                                {serviceType === 'tv' && 'Pay TV Subscription'}
                                {serviceType === 'water' && 'Pay Water Bill'}
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Stack spacing={3}>
                                {/* Airtime & Data Forms */}
                                {(serviceType === 'airtime' || serviceType === 'data') && (
                                    <>
                                        {/* Network Selection */}
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Select Network
                                            </Typography>
                                            <Stack direction="row" spacing={2} flexWrap="wrap">
                                                {networkProviders.map((network) => (
                                                    <Chip
                                                        key={network.id}
                                                        label={network.name}
                                                        onClick={() => {
                                                            setSelectedNetwork(network.id);
                                                            setSelectedBundle('');
                                                        }}
                                                        variant={selectedNetwork === network.id ? 'filled' : 'outlined'}
                                                        sx={{
                                                            bgcolor: selectedNetwork === network.id ? network.color : 'transparent',
                                                            color: selectedNetwork === network.id ? '#000' : 'inherit',
                                                            borderColor: network.color,
                                                            '&:hover': {
                                                                bgcolor: network.color,
                                                                opacity: 0.8,
                                                            },
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>

                                        {/* Phone Number */}
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                            placeholder="08012345678"
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">+234</InputAdornment>,
                                            }}
                                        />

                                        {/* Airtime Amount */}
                                        {serviceType === 'airtime' && (
                                            <>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    {quickAmounts.map((quickAmount) => (
                                                        <Chip
                                                            key={quickAmount}
                                                            label={formatCurrency(quickAmount)}
                                                            onClick={() => setAmount(quickAmount)}
                                                            variant={amount === quickAmount ? 'filled' : 'outlined'}
                                                            color={amount === quickAmount ? 'primary' : 'default'}
                                                            sx={{ mb: 1 }}
                                                        />
                                                    ))}
                                                </Stack>
                                                <TextField
                                                    fullWidth
                                                    label="Amount"
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                                    }}
                                                />
                                            </>
                                        )}

                                        {/* Data Bundle Selection */}
                                        {serviceType === 'data' && (
                                            <FormControl fullWidth>
                                                <InputLabel>Select Data Bundle</InputLabel>
                                                <Select
                                                    value={selectedBundle}
                                                    label="Select Data Bundle"
                                                    onChange={(e) => setSelectedBundle(e.target.value)}
                                                >
                                                    {currentBundles.map((bundle) => (
                                                        <MenuItem key={bundle.id} value={bundle.id}>
                                                            <Stack direction="row" justifyContent="space-between" width="100%">
                                                                <Typography>{bundle.name} ({bundle.size})</Typography>
                                                                <Typography color="primary" fontWeight="bold">
                                                                    {formatCurrency(bundle.price)}
                                                                </Typography>
                                                            </Stack>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    </>
                                )}

                                {/* Electricity Form */}
                                {serviceType === 'electricity' && (
                                    <>
                                        <FormControl fullWidth>
                                            <InputLabel>Electricity Provider</InputLabel>
                                            <Select
                                                value={electricityProvider}
                                                label="Electricity Provider"
                                                onChange={(e) => setElectricityProvider(e.target.value)}
                                            >
                                                {electricityProviders.map((provider) => (
                                                    <MenuItem key={provider.id} value={provider.id}>
                                                        {provider.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            fullWidth
                                            label="Meter Number"
                                            value={meterNumber}
                                            onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                                            placeholder="Enter your meter number"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                            }}
                                        />
                                    </>
                                )}

                                {/* TV Form */}
                                {serviceType === 'tv' && (
                                    <>
                                        <FormControl fullWidth>
                                            <InputLabel>TV Provider</InputLabel>
                                            <Select
                                                value={tvProvider}
                                                label="TV Provider"
                                                onChange={(e) => setTvProvider(e.target.value)}
                                            >
                                                {tvProviders.map((provider) => (
                                                    <MenuItem key={provider.id} value={provider.id}>
                                                        {provider.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            fullWidth
                                            label="Smart Card Number"
                                            value={smartCardNumber}
                                            onChange={(e) => setSmartCardNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                            placeholder="Enter your smart card number"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                            }}
                                        />
                                    </>
                                )}

                                {/* Water Form */}
                                {serviceType === 'water' && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Water Account Number"
                                            value={waterAccountNumber}
                                            onChange={(e) => setWaterAccountNumber(e.target.value)}
                                            placeholder="Enter your water account number"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                                            }}
                                        />
                                    </>
                                )}

                                {/* Submit Button */}
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handlePurchase}
                                    disabled={!isFormValid || loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <Receipt />}
                                >
                                    {loading ? 'Processing...' : `Pay ${formatCurrency(transactionAmount)}`}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Summary & Recent Transactions */}
                <Grid item xs={12} md={5}>
                    <Stack spacing={3}>
                        {/* Transaction Summary */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Transaction Summary
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Service</Typography>
                                        <Typography fontWeight="bold" textTransform="capitalize">{serviceType}</Typography>
                                    </Stack>
                                    {(serviceType === 'airtime' || serviceType === 'data') && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Network</Typography>
                                            <Typography fontWeight="bold">
                                                {networkProviders.find(n => n.id === selectedNetwork)?.name || '-'}
                                            </Typography>
                                        </Stack>
                                    )}
                                    {serviceType === 'data' && selectedBundle && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Bundle</Typography>
                                            <Typography fontWeight="bold">
                                                {currentBundles.find(b => b.id === selectedBundle)?.name || '-'}
                                            </Typography>
                                        </Stack>
                                    )}
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="subtitle1">Amount</Typography>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
                                            {formatCurrency(transactionAmount)}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Recent Transactions */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Recent Transactions
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {transactions.slice(0, 5).map((tx) => (
                                    <Paper key={tx.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack>
                                                <Typography variant="subtitle2">{tx.provider}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(tx.createdAt).toLocaleString()}
                                                </Typography>
                                            </Stack>
                                            <Stack alignItems="flex-end">
                                                <Typography fontWeight="bold">{formatCurrency(tx.amount)}</Typography>
                                                <Chip
                                                    label={tx.status}
                                                    size="small"
                                                    color={tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                                                />
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                ))}
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* Confirm Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirm Transaction</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
                        <Typography>You are about to purchase:</Typography>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography color="text.secondary">Service</Typography>
                                    <Typography textTransform="capitalize">{serviceType}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography color="text.secondary">Amount</Typography>
                                    <Typography fontWeight="bold">{formatCurrency(transactionAmount)}</Typography>
                                </Stack>
                            </Stack>
                        </Paper>
                        <Alert severity="warning">
                            This amount will be deducted from your wallet balance.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={confirmPurchase}>
                        Confirm Purchase
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <CheckCircle color="success" />
                        <Typography variant="h6">Transaction Successful</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {lastTransaction && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Reference</Typography>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography fontFamily="monospace">{lastTransaction.reference}</Typography>
                                            <IconButton size="small" onClick={() => copyToClipboard(lastTransaction.reference)}>
                                                <ContentCopy fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Amount</Typography>
                                        <Typography fontWeight="bold">{formatCurrency(lastTransaction.amount)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography color="text.secondary">Provider</Typography>
                                        <Typography>{lastTransaction.provider}</Typography>
                                    </Stack>
                                    {lastTransaction.token && (
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography color="text.secondary">Token</Typography>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography fontFamily="monospace" color="primary" fontWeight="bold">
                                                    {lastTransaction.token}
                                                </Typography>
                                                <IconButton size="small" onClick={() => copyToClipboard(lastTransaction.token!)}>
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>
                            {lastTransaction.token && (
                                <Alert severity="success">
                                    Your electricity token has been generated. Please keep it safe!
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
                    <Button variant="contained" startIcon={<Receipt />}>
                        Print Receipt
                    </Button>
                </DialogActions>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Transaction History</DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Provider</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{tx.type}</TableCell>
                                        <TableCell>{tx.provider}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {tx.reference}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(tx.amount)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={tx.status}
                                                size="small"
                                                color={tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PrepaidServices;

