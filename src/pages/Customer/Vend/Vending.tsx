
"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import BoltIcon from "@mui/icons-material/Bolt";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchValidateCustomerBeforeVend, processVendPayment, requeryVendTransaction, ValidateCustomerResponse, VendPaymentPayload, VendTransactionResponse } from "../../../services/customerService";
import { useAppSelector } from "../../../store/hooks";
import { fetchVendorOnboardingData } from "../../../services/vendorService";
import VendingHistory from "./VendingHistory";



type VendorData = Awaited<ReturnType<typeof fetchVendorOnboardingData>>;

interface VendingProps {
    onProceed?: (
        customer: ValidateCustomerResponse["customer"],
        amount: number,
        minimumVend: number
    ) => void;
}

const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];


export default function Vending({
    onProceed,
}: VendingProps) {
    const [accountNumber, setAccountNumber] = useState("");
    const [validationData, setValidationData] =
        useState<ValidateCustomerResponse | null>(null);

    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [vendor, setVendor] = useState<VendorData | null>(null);
    const [vendLoading, setVendLoading] = useState(false);
    const [requeryLoading, setRequeryLoading] = useState(false);

    const [successMessage, setSuccessMessage] = useState("");

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    const [paymentDetails, setPaymentDetails] = useState({
        channel: "",
        paymentMode: "",
    });

    const [transaction, setTransaction] = useState<VendTransactionResponse | null>(null);

    const [transactionReference, setTransactionReference] = useState("");
    const [transactionError, setTransactionError] = useState("");
    // --------------------------------------------------
    // VALIDATE CUSTOMER
    // --------------------------------------------------
    const minimumVend = Number(validationData?.minimum_vend || 0);

    const amountOptions = Array.from(
        new Set([
            minimumVend,
            ...quickAmounts.filter((value) => value >= minimumVend),
        ])
    ).sort((a, b) => a - b);


    useEffect(() => {
        let isMounted = true;

        const loadVendor = async () => {
            try {
                setVendLoading(true);
                setError("");

                const vendorData = await fetchVendorOnboardingData();

                if (!vendorData?.token) {
                    throw new Error("Vendor transaction token is unavailable.");
                }

                if (isMounted) {
                    setVendor(vendorData);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(
                        err?.message || "Unable to retrieve vendor information."
                    );
                }
            } finally {
                if (isMounted) {
                    setVendLoading(false);
                }
            }
        };

        loadVendor();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleValidate = async () => {
        if (!accountNumber.trim()) {
            setError("Please enter a customer account number.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setValidationData(null);
            setAmount("");

            // Step 1: Retrieve the logged-in vendor's record.
            // const vendor = await fetchVendorOnboardingData();

            if (!vendor?.token) {
                throw new Error("Vendor transaction token is unavailable.");
            }

            // Step 2: Use the vendor-specific token for validation.
            const response = await fetchValidateCustomerBeforeVend(
                accountNumber.trim(),
                vendor.token
                //vendorToken
            );

            if (!response.status) {
                setError("Customer validation failed. Please verify the account number.");
                return;
            }

            setValidationData(response);
            setAmount(response.minimum_vend);

        } catch (err: any) {
            console.error("Customer validation failed:", err);

            if (err?.status === 401) {
                setError("Vendor transaction token was rejected.");
            } else if (err?.status === 403) {
                setError(
                    "Your vendor is not permitted to vend for this customer's scheme."
                );
            } else if (err?.status === 400) {
                setError(
                    err?.message || "Customer validation failed. Please check the account number."
                );
            } else {
                setError(
                    err?.message || "Unable to validate customer. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };
    const vendAmount = Number(amount || 0);

    const amountValid =
        !!amount &&
        Number.isFinite(vendAmount) &&
        vendAmount >= minimumVend &&
        vendAmount > 0;

    const handleAmountChange = (value: string) => {
        if (/^\d*\.?\d*$/.test(value)) {
            setAmount(value);
        }
    };


    const handleVend = async () => {
        if (!validationData || !amountValid) {
            setTransactionError("Please validate the customer and enter a valid amount.");
            return;
        }

        if (!vendor?.token) {
            setTransactionError("Vendor transaction token is unavailable.");
            return;
        }

        const { channel, paymentMode } = paymentDetails;

        if (!channel.trim() || !paymentMode.trim()) {
            setTransactionError(
                "Please provide the payment channel and payment mode."
            );
            return;
        }

        if (transactionReference) {
            setTransactionError(
                "A transaction is awaiting confirmation. Requery it before starting another vend."
            );
            return;
        }

        // Retrieve bill type directly from the validation response.
        const billType = validationData.customer.metering_type
            ?.trim()
            .toLowerCase();

        if (billType !== "prepaid" && billType !== "postpaid") {
            setTransactionError("Invalid bill type returned for this customer.");
            return;
        }

        const reference = `VEND-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;

        const payload: VendPaymentPayload = {
            account_number: accountNumber.trim(),
            amount: vendAmount.toFixed(2),
            reference,
            bill_type: billType,
            channel: channel.trim(),
            payment_mode: paymentMode.trim(),
        };

        setVendLoading(true);
        setTransactionError("");
        setTransaction(null);
        setTransactionReference(reference);

        try {
            const response = await processVendPayment(payload, vendor.token);

            setTransaction(response);

            const status = response.status?.toLowerCase();

            if (["success", "successful", "completed", "failed", "declined"].includes(status)) {
                setSuccessMessage(
                    "Vend successful! Your electricity token has been generated successfully."
                );
                setTransactionReference("");
            } else {
                setSuccessMessage("");
            }

            if (
                ["failed", "declined"].includes(status)
            ) {
                setTransactionReference("");
            }

            setPaymentModalOpen(false);
        } catch (err: any) {
            console.error("Vend payment error:", err);
            setSuccessMessage("");
            if (err?.status === 401) {
                setTransactionError("Vendor transaction token is invalid or expired.");
            } else if (err?.status === 403) {
                setTransactionError(
                    "Your vendor is not permitted to vend for this customer's scheme."
                );
            } else if (err?.status === 400) {
                setTransactionError(
                    err?.message || "Payment could not be processed."
                );
            } else {
                setTransactionError(
                    "We could not confirm the transaction result. Please requery using the transaction reference before trying again."
                );
            }
        } finally {
            setVendLoading(false);
        }
    };

    const handleRequery = async () => {

        if (!transactionReference || !vendor?.token) return;

        try {
            setRequeryLoading(true);
            setTransactionError("");

            const response = await requeryVendTransaction(
                transactionReference,
                vendor.token
            );

            setTransaction(response);

            const status = response.status?.toLowerCase();

            // if (
            //     ["success", "successful", "completed", "failed", "declined"].includes(status)
            // ) {
            //     setTransactionReference("");
            // }
            if (["success", "successful", "completed"].includes(status)) {
                setSuccessMessage(
                    "Transaction confirmed! Your electricity vending was successful."
                );

                setTransactionReference("");
            } else if (["failed", "declined"].includes(status)) {
                setSuccessMessage("");
                setTransactionReference("");
            } else {
                setSuccessMessage("");
            }
        } catch (err: any) {
            console.error("Transaction requery failed:", err);
            setSuccessMessage("");
            setTransactionError(
                err?.message || "Unable to retrieve the transaction status."
            );
        } finally {
            setRequeryLoading(false);
        }
    };


    const formatCurrency = (value: number | string) =>
        new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2,
        }).format(Number(value) || 0);

    const clearValidation = () => {
        setValidationData(null);
        setAmount("");
        setError("");
    };

    // const sampleTransactions: VendingHistoryItem[] = [
    //     {
    //         id: 1,
    //         transaction_reference: "VEND-173254001-ABC123",
    //         account_number: "12345678901",
    //         status: "successful",
    //         amount: "5000.00",
    //         units: "45.2",
    //         token: "1234-5678-9012-3456-7890",
    //         vat: "375.00",
    //         debt: "0.00",
    //         created_at: "2026-11-25T10:30:00Z",
    //     },
    //     {
    //         id: 2,
    //         transaction_reference: "VEND-173254002-XYZ789",
    //         account_number: "12345678902",
    //         status: "pending",
    //         amount: "2000.00",
    //         units: "18.5",
    //         token: "",
    //         vat: "150.00",
    //         debt: "0.00",
    //         created_at: "2026-11-25T11:15:00Z",
    //     },
    //     {
    //         id: 3,
    //         transaction_reference: "VEND-173254003-DEF456",
    //         account_number: "12345678903",
    //         status: "failed",
    //         amount: "1000.00",
    //         units: "0",
    //         token: "",
    //         vat: "0",
    //         debt: "0",
    //         created_at: "2026-11-25T12:00:00Z",
    //     },
    // ];
    // --------------------------------------------------
    // CUSTOMER DETAIL ITEM
    // --------------------------------------------------

    const DetailItem = ({
        label,
        value,
    }: {
        label: string;
        value?: string | number | null;
    }) => (
        <Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
            >
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
                {value || "—"}
            </Typography>
        </Box>
    );

    // --------------------------------------------------
    // UI
    // --------------------------------------------------

    return (
        <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
            {/* HEADER */}
            <Box mb={3}>
                <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ fontSize: { xs: 26, md: 32 } }}
                >
                    Electricity Vending
                </Typography>

                <Typography color="text.secondary" mt={0.5}>
                    Validate a customer account and initiate electricity vending.
                </Typography>
            </Box>

            {/* ERROR */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2 }}
                    onClose={() => setError("")}
                >
                    {error}
                </Alert>
            )}

            {/* ACCOUNT LOOKUP */}
            <Card
                elevation={0}
                sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    mb: 3,
                }}
            >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <SearchIcon color="primary" />
                        <Typography fontWeight={700}>Customer Lookup</Typography>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems="stretch"
                    >
                        <TextField
                            fullWidth
                            label="Account Number"
                            placeholder="Enter customer account number"
                            value={accountNumber}
                            onChange={(e) => {
                                setAccountNumber(e.target.value);
                                clearValidation();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleValidate();
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountBalanceWalletIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleValidate}
                            disabled={loading || !accountNumber.trim()}
                            startIcon={
                                loading ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : (
                                    <SearchIcon />
                                )
                            }
                            sx={{
                                minWidth: { sm: 190 },
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                        >
                            {loading ? "Validating..." : "Validate Customer"}
                        </Button>
                    </Stack>

                    <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
                        Enter the account number to retrieve and verify customer information.
                    </Typography>
                </CardContent>
            </Card>

            {/* VALIDATED CUSTOMER */}
            {validationData?.status && (
                <Box>
                    {/* CUSTOMER PROFILE */}
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid #dbeafe",
                            borderRadius: 3,
                            mb: 3,
                            overflow: "hidden",
                        }}
                    >
                        {/* PROFILE HEADER */}
                        <Box
                            sx={{
                                bgcolor: "#eff6ff",
                                p: { xs: 2, md: 3 },
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 2,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        bgcolor: "#dbeafe",
                                        color: "#1d4ed8",
                                    }}
                                >
                                    <PersonIcon fontSize="large" />
                                </Avatar>

                                <Box>
                                    <Typography variant="h6" fontWeight={700}>
                                        {validationData.customer.name}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Account: {validationData.customer.acc_no}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Chip
                                icon={<CheckCircleIcon />}
                                label="Customer Verified"
                                color="success"
                                variant="filled"
                            />
                        </Box>

                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            {/* CUSTOMER DETAILS */}
                            <Typography fontWeight={700} mb={2}>
                                Customer Information
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Phone Number"
                                        value={validationData.customer.phone_no}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Meter Number"
                                        value={validationData.customer.meter_no}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Old Account Number"
                                        value={validationData.customer.old_acc_no}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Customer Category"
                                        value={validationData.customer.customer_category}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Customer Class"
                                        value={validationData.customer.customer_class}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Metering Type"
                                        value={validationData.customer.metering_type}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <DetailItem
                                        label="Address"
                                        value={validationData.customer.address}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            {/* SERVICE INFORMATION */}
                            <Typography fontWeight={700} mb={2}>
                                Service & Meter Details
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="District"
                                        value={validationData.customer.district_name}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Feeder"
                                        value={validationData.customer.feeder}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Transformer"
                                        value={validationData.customer.transformer}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Tariff Rate"
                                        value={formatCurrency(validationData.customer.tariff_rate)}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Bill Status"
                                        value={validationData.customer.bill_status}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <DetailItem
                                        label="Outstanding Debt"
                                        value={formatCurrency(validationData.customer.debt)}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            {/* METER CONFIGURATION */}
                            <Typography fontWeight={700} mb={2}>
                                Meter Configuration
                            </Typography>

                            <Grid container spacing={3}>
                                {[
                                    ["KRN", validationData.customer.krn],
                                    ["TI", validationData.customer.ti],
                                    ["SGC", validationData.customer.sgc],
                                    ["KCT1", validationData.customer.kct1],
                                    ["KCT2", validationData.customer.kct2],
                                ].map(([label, value]) => (
                                    <Grid item xs={6} sm={4} md={2.4} key={label}>
                                        <DetailItem label={label} value={value} />
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* VEND AMOUNT */}
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 3,
                            mb: 3,
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                <BoltIcon color="primary" />
                                <Typography fontWeight={700}>Vending Amount</Typography>
                            </Stack>

                            {/* MINIMUM VEND */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    bgcolor: "#f8fafc",
                                    p: 2,
                                    borderRadius: 2,
                                    mb: 2.5,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 1,
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Minimum Vend Amount
                                    </Typography>

                                    <Typography variant="h6" fontWeight={700} color="primary">
                                        {formatCurrency(minimumVend)}
                                    </Typography>
                                </Box>

                                <Chip label="API validated" color="success" size="small" />
                            </Paper>

                            {/* AMOUNT INPUT */}
                            <TextField
                                fullWidth
                                label="Enter Amount"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                error={!!amount && vendAmount < minimumVend}
                                helperText={
                                    !!amount && vendAmount < minimumVend
                                        ? `Minimum amount is ${formatCurrency(minimumVend)}`
                                        : "Enter the amount you want to vend."
                                }
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">₦</InputAdornment>
                                    ),
                                }}
                            />

                            {/* QUICK AMOUNTS */}
                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                                mt={2}
                            >
                                {/* {quickAmounts */}
                                {amountOptions
                                    .filter((value) => value >= minimumVend)
                                    .map((value) => (
                                        <Button
                                            key={value}
                                            variant={amount === String(value) ? "contained" : "outlined"}
                                            onClick={() => setAmount(String(value))}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: "none",
                                            }}
                                        >
                                            ₦{value.toLocaleString("en-NG")}
                                        </Button>
                                    ))}
                            </Stack>

                            {/* PROCEED */}
                            <Box
                                display="flex"
                                justifyContent="flex-end"
                                mt={3}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    disabled={
                                        !amountValid ||
                                        vendLoading ||
                                        !!transaction ||
                                        !!transactionReference ||
                                        !vendor?.token
                                    }
                                    // onClick={handleVend}
                                    onClick={() => {
                                        setTransactionError("");
                                        setPaymentModalOpen(true);
                                    }}
                                    endIcon={
                                        vendLoading ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <ArrowForwardIcon />
                                        )
                                    }
                                    sx={{
                                        borderRadius: 2,
                                        minWidth: 220,
                                        fontWeight: 600,
                                        textTransform: "none",
                                    }}
                                >
                                    {vendLoading ? "Processing Payment..." : "Pay & Vend"}
                                </Button>

                            </Box>
                        </CardContent>
                    </Card>

                    {successMessage && (
                        <Alert
                            severity="success"
                            icon={<CheckCircleIcon />}
                            onClose={() => setSuccessMessage("")}
                            sx={{
                                mb: 3,
                                borderRadius: 2,
                                alignItems: "center",
                            }}
                        >
                            <Typography fontWeight={600}>
                                {successMessage}
                            </Typography>
                        </Alert>
                    )}

                    {/* transactions */}
                    {transaction && (
                        <Card
                            elevation={0}
                            sx={{
                                border: "1px solid #bbf7d0",
                                borderRadius: 3,
                                mb: 3,
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    mb={2}
                                >
                                    <CheckCircleIcon color="success" />
                                    <Typography fontWeight={700}>
                                        Vend Transaction Result
                                    </Typography>
                                </Stack>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="Transaction Reference"
                                            value={transaction.transaction_reference || transactionReference}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="Transaction Status"
                                            value={transaction.status}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="Amount Paid"
                                            value={formatCurrency(transaction.amount)}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="Units Purchased"
                                            value={transaction.units}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="VAT"
                                            value={formatCurrency(transaction.vat)}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <DetailItem
                                            label="Outstanding Debt"
                                            value={formatCurrency(transaction.debt)}
                                        />
                                    </Grid>
                                </Grid>

                                {transaction.token && (
                                    <Box
                                        sx={{
                                            mt: 3,
                                            p: 2,
                                            bgcolor: "#f0fdf4",
                                            border: "1px dashed #86efac",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            mb={1}
                                        >
                                            Electricity Meter Token
                                        </Typography>

                                        <Typography
                                            variant="h5"
                                            fontWeight={800}
                                            letterSpacing={2}
                                            sx={{ wordBreak: "break-all" }}
                                        >
                                            {transaction.token}
                                        </Typography>

                                        <Button
                                            size="small"
                                            sx={{ mt: 1, textTransform: "none" }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(transaction.token);
                                            }}
                                        >
                                            Copy Token
                                        </Button>
                                    </Box>
                                )}

                                {!!transactionReference && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        This transaction is awaiting final confirmation. Do not submit another payment.
                                    </Alert>
                                )}

                                {!!transactionReference && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleRequery}
                                        disabled={requeryLoading}
                                        sx={{ mt: 2, textTransform: "none" }}
                                        startIcon={
                                            requeryLoading ? (
                                                <CircularProgress size={16} />
                                            ) : undefined
                                        }
                                    >
                                        {requeryLoading ? "Checking Transaction..." : "Requery Transaction"}
                                    </Button>
                                )}

                                {!transactionReference && (
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setTransaction(null);
                                            setTransactionError("");
                                            setAmount(validationData.minimum_vend);
                                        }}
                                        sx={{ mt: 2, textTransform: "none" }}
                                    >
                                        Start Another Vend
                                    </Button>
                                )}
                            </CardContent>
                            {/* error alert */}
                            {transactionError && (
                                <Alert
                                    severity="error"
                                    sx={{ mb: 3, borderRadius: 2 }}
                                    onClose={() => setTransactionError("")}
                                >
                                    {transactionError}
                                </Alert>
                            )}
                        </Card>
                    )}
                </Box>
            )}

            <Dialog
                open={paymentModalOpen}
                onClose={() => {
                    if (!vendLoading) {
                        setPaymentModalOpen(false);
                    }
                }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle fontWeight={700}>
                    Payment Details
                </DialogTitle>
                <DialogContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={2.5}
                    >
                        Enter the payment channel and payment mode to continue with
                        this vending transaction.
                    </Typography>

                    <Stack spacing={2.5}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Payment Channel"
                            placeholder="Enter payment channel"
                            value={paymentDetails.channel}
                            onChange={(e) =>
                                setPaymentDetails((prev) => ({
                                    ...prev,
                                    channel: e.target.value,
                                }))
                            }
                            required
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label="Payment Mode"
                            placeholder="Enter payment mode"
                            value={paymentDetails.paymentMode}
                            onChange={(e) =>
                                setPaymentDetails((prev) => ({
                                    ...prev,
                                    paymentMode: e.target.value,
                                }))
                            }
                            required
                        />

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "#f8fafc",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Amount to Vend
                            </Typography>

                            <Typography variant="h6" fontWeight={700}>
                                {formatCurrency(vendAmount)}
                            </Typography>
                        </Paper>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setPaymentModalOpen(false)}
                        disabled={vendLoading}
                        color="inherit"
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disabled={
                            vendLoading ||
                            !paymentDetails.channel.trim() ||
                            !paymentDetails.paymentMode.trim()
                        }
                        onClick={handleVend}
                        sx={{ textTransform: "none", minWidth: 130 }}
                    >
                        {vendLoading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            "Confirm & Vend"
                        )}
                    </Button>
                </DialogActions>

            </Dialog>


            {/* <VendingHistory
                transactions={sampleTransactions}
                onRefresh={() => console.log("Refresh transactions")}
                onViewDetails={(transaction) =>
                    console.log("Selected transaction:", transaction)
                }
            /> */}

            {/* <div className="mt-10 border-t border-gray-200 pt-6" */}
            <Box
                sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: "#f0fdf4",
                    border: "1px dashed #86efac",
                    borderRadius: 2,
                }}
            >
                <VendingHistory
                    transaction={transaction}
                    loading={vendLoading || requeryLoading}
                    error={transactionError}
                />
            </Box>

        </Box>
    );
}
