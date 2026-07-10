import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
    Checkbox, Collapse, Divider, Drawer, FormControl, FormHelperText, Grid,
    IconButton, InputAdornment, InputLabel, List, ListItemButton, ListItemText,
    MenuItem, Paper, Select, Snackbar, Stack, Switch, Tab, Table, TableBody,
    TableCell, TableHead, TablePagination, TableRow, Tabs, TextField, Typography,
    Dialog, DialogContent, DialogTitle, DialogActions, Tooltip,
} from '@mui/material';
import {
    AccountBalance, ArrowBack, ArrowDropDown, ArrowForward, Business,
    CheckCircle, ChevronRight, Close, Domain, Download, People, Receipt,
    Refresh, Search, Delete, NavigateNext, Settings, TrendingDown, Person,
    AccountBalanceWallet, ErrorOutline, ListAlt, ContentCopy, History,
    WarningAmber, PauseCircleOutline,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
    vendorManagementService,
    extractBackendError,
    VendorConfigPayload,
    FundingRequest,
    SuspendedVendorResult,
} from './../../../services/vendormanagementservice';

// ─── Types ────────────────────────────────────────────────────────────────────
type VendorLevel = 'vendor' | 'sub_vendor' | 'agent' | 'cashier' | 'pos';
type VendorLevelFilter = VendorLevel | 'all';
type VendorStatusFilter = 'all' | 'active' | 'inactive' | 'suspended' | 'pending' | 'review';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type MuiColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
type StatFilterKey = 'active' | 'sub_vendor' | 'agent' | 'cashier' | 'pos';

type RelatedVendorLite = { id: number; email: string; business_name: string; account_status: string; hierachy: string };
type RelatedVendor = {
    id: number; business_name: string; email: string; phone_number: string;
    address: string; city: string; state: string; country: string; postal_code: string;
    account_status: string; hierachy: string; related_vendor?: RelatedVendorLite | null;
    token?: string;
    wallet?: { wallet_type?: { name: string; description: string }; balance: string } | null;
    created_at: string;
};
type VendorTransaction = {
    transaction_ref: string; amount: string; timestamp: string; status?: string;
    transaction_type?: 'credit' | 'debit'; vendor_name?: string;
    vendor?: { business_name?: string };
};
type VendorAnalytics = { total_balance: number; total_transactions: number; processed_today: number; active: number };
type VendorTreeNode = RelatedVendor & { children: VendorTreeNode[] };

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVEL_OPTIONS: { label: string; value: VendorLevel }[] = [
    { label: 'Vendor', value: 'vendor' }, { label: 'Sub-vendor', value: 'sub_vendor' },
    { label: 'Agent', value: 'agent' }, { label: 'Cashier', value: 'cashier' }, { label: 'POS', value: 'pos' },
];
const STATUS_OPTIONS: { label: string; value: Exclude<VendorStatusFilter, 'all'> }[] = [
    { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' }, { label: 'Pending', value: 'pending' }, { label: 'Review', value: 'review' },
];
const STEP_LABELS = ['Parent', 'Basic', 'Profile', 'KYC', 'Controls', 'Agreement'];
const STEP_SUBTITLES = [
    'Hierarchy and parent vendor', 'Name, license and status',
    'Business profile and contact', 'KYC and bank details',
    'Transaction controls', 'Entity and agreement',
];

const getAllowedChildHierarchies = (parentHierarchy: string): VendorLevel[] => {
    switch ((parentHierarchy || '').toLowerCase()) {
        case 'vendor':     return ['sub_vendor', 'agent', 'cashier', 'pos'];
        case 'sub_vendor': return ['agent', 'cashier', 'pos'];
        case 'agent':      return ['cashier', 'pos'];
        case 'cashier':    return ['pos'];
        default:           return ['sub_vendor', 'agent', 'cashier', 'pos'];
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().split('T')[0];
const formatCurrency = (v: number | string | undefined | null) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(v || 0));
const formatNumber = (v: number | string | undefined | null) => new Intl.NumberFormat('en-NG').format(Number(v || 0));
const formatDate = (v?: string) => { const d = new Date(v || Date.now()); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); };
const formatDateTime = (v?: string) => { const d = new Date(v || Date.now()); return isNaN(d.getTime()) ? '' : d.toLocaleString(); };
const normalizeLevel = (v?: string): VendorLevel => {
    const l = (v || '').toLowerCase();
    if (l === 'sub_vendor') return 'sub_vendor';
    if (l === 'agent') return 'agent';
    if (l === 'cashier') return 'cashier';
    if (l === 'pos') return 'pos';
    return 'vendor';
};
const levelLabel = (v?: string) => LEVEL_OPTIONS.find(o => o.value === normalizeLevel(v))?.label || v || 'Vendor';
const levelColor = (v?: string): ChipColor => {
    switch (normalizeLevel(v)) {
        case 'vendor': return 'primary'; case 'sub_vendor': return 'success';
        case 'agent': return 'warning'; case 'cashier': return 'info'; case 'pos': return 'secondary';
        default: return 'default';
    }
};
const statusColor = (s?: string): ChipColor => {
    switch ((s || '').toLowerCase()) {
        case 'active': case 'success': case 'successful': case 'completed': case 'approved': return 'success';
        case 'inactive': case 'suspended': return 'warning';
        case 'pending': case 'review': case 'pending_review': case 'pending_approval': return 'info';
        case 'failed': case 'rejected': case 'declined': return 'error';
        default: return 'default';
    }
};
const getWalletBalance = (v?: RelatedVendor | null) => Number(v?.wallet?.balance || 0);
const getWalletTypeName = (v?: RelatedVendor | null) => v?.wallet?.wallet_type?.name || 'Wallet';
const getLocation = (v: RelatedVendor) =>
    [v.city, v.state, v.country].filter(Boolean).join(', ') || v.address || 'Not provided';
const parseVendorList = (p: unknown): RelatedVendor[] => {
    if (Array.isArray(p)) return p as RelatedVendor[];
    if (p && typeof p === 'object' && Array.isArray((p as any).results)) return (p as any).results as RelatedVendor[];
    return [];
};
const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const buildVendorTree = (vendors: RelatedVendor[]): VendorTreeNode[] => {
    const map = new Map<number, VendorTreeNode>();
    vendors.forEach(v => map.set(v.id, { ...v, children: [] }));
    const roots: VendorTreeNode[] = [];
    vendors.forEach(v => {
        const node = map.get(v.id); const pid = v.related_vendor?.id;
        if (!node) return;
        if (pid && map.has(pid)) map.get(pid)?.children.push(node); else roots.push(node);
    });
    return roots;
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, bgcolor: '#f3f4f8',
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1e3a8a' },
    },
    '& .MuiOutlinedInput-input': { bgcolor: 'transparent' },
};

const StatCard = ({ title, value, icon, color = 'primary', subtitle }: { title: string; value: React.ReactNode; icon: React.ReactNode; color?: MuiColor; subtitle?: string }) => (
    <Card sx={{ height: '100%', borderRadius: 2, transition: 'all 0.35s ease' }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography variant="body2" color="text.secondary">{title}</Typography>
                    <Typography variant="h5" fontWeight={700}>{value}</Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
            </Stack>
        </CardContent>
    </Card>
);

// A small helper that renders a key/value row inside the result dialogs
const ResultRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75, borderBottom: '1px solid #f1f5f9' }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</Typography>
    </Stack>
);

// ─── Form state ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    hierachy: '', related_vendor: '',
    business_name: '', email: '', phone_number: '', domain: '', sub_domain: '', slug: '', trial_ends: '', active_on_creation: true,
    address: '', city: '', state: '', country: 'Nigeria', postal_code: '', description: '', industry: '',
    category: '', website: '', contact_name: '', email1: '', email2: '', registration_number: '', cac_registration_number: '',
    owner_name: '', dob: '', nationality: '', id_type: '', id_number: '', owner_address: '',
    bank_name: '', account_name: '', account_number: '',
    funding_cap: '', transaction_max: '', commission_rate: '', monthly_target: '',
    entity_name: '', company_website: '', company_address: '',
    signatory_name: '', signatory_phone_number: '', signatory_email: '',
};
type VendorFormState = typeof EMPTY_FORM;

const validateStep = (step: number, form: VendorFormState): Record<string, string> => {
    const e: Record<string, string> = {};
    if (step === 0) {
        if (!form.related_vendor) e.related_vendor = 'Please select a parent vendor or choose Self';
        if (!form.hierachy) e.hierachy = 'Please select a hierarchy';
    }
    if (step === 1) {
        if (!form.business_name.trim()) e.business_name = 'Business name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        if (!form.phone_number.trim()) e.phone_number = 'Phone number is required';
        if (!form.domain.trim()) e.domain = 'License / domain is required';
    }
    if (step === 2) {
        if (!form.address.trim()) e.address = 'Address is required';
        if (!form.city.trim()) e.city = 'City is required';
        if (!form.state.trim()) e.state = 'State is required';
        if (!form.postal_code.trim()) e.postal_code = 'Postal code is required';
    }
    return e;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const VendorManagement: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const today = new Date();
    const past = new Date(); past.setDate(today.getDate() - 14);
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const [fundingRequestStatus, setFundingRequestStatus] = useState<
        "approved" | "pending_review" | "pending_approval" | "rejected"
    >("approved");
    // ── List state ────────────────────────────────────────────────────────────
    const [vendors, setVendors] = useState<RelatedVendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<RelatedVendor | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<RelatedVendor[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<VendorTransaction[]>([]);
    const [selectedTransactionCount, setSelectedTransactionCount] = useState(0);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analytics, setAnalytics] = useState<VendorAnalytics>({ total_balance: 0, total_transactions: 0, processed_today: 0, active: 0 });

    // ── Filters ───────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<VendorLevelFilter>('all');
    const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statFilter, setStatFilter] = useState<StatFilterKey | null>(null);

    // ── Pagination ────────────────────────────────────────────────────────────
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(5);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionStartDate, setTransactionStartDate] = useState(fmt(past));
    const [transactionEndDate, setTransactionEndDate] = useState(fmt(tomorrow));
    const [cardStartDate, setCardStartDate] = useState(fmt(past));
    const [cardEndDate, setCardEndDate] = useState(fmt(tomorrow));

    // ── Wizard ────────────────────────────────────────────────────────────────
    const [createVendorOpen, setCreateVendorOpen] = useState(false);
    const [creatingVendor, setCreatingVendor] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [vendorForm, setVendorForm] = useState<VendorFormState>({ ...EMPTY_FORM });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [relatedVendorList, setRelatedVendorList] = useState<RelatedVendor[]>([]);
    const [vendorListLoading, setVendorListLoading] = useState(false);
    const [isSelf, setIsSelf] = useState(false);
    const [selectedParentVendor, setSelectedParentVendor] = useState<RelatedVendor | null>(null);

    // ── Config panel ──────────────────────────────────────────────────────────
    const [configVendor, setConfigVendor] = useState<RelatedVendor | null>(null);
    const [configForm, setConfigForm] = useState({ funding_cap: '', transaction_max: '', commission_rate: '', monthly_target: '' });
    const [savingConfig, setSavingConfig] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [configSuccess, setConfigSuccess] = useState<string | null>(null);
    // Popup shown after a config submit, success or failure, with the raw backend response
    const [configResultDialog, setConfigResultDialog] = useState<{ success: boolean; message: string; data?: any } | null>(null);

    // ── Fund Wallet (Request Funding) dialog ──────────────────────────────────
    const [fundWalletVendor, setFundWalletVendor] = useState<RelatedVendor | null>(null);
    const [fundForm, setFundForm] = useState({ amount: '' });
    const [fundingWallet, setFundingWallet] = useState(false);
    const [fundError, setFundError] = useState<string | null>(null);
    // Nice success modal showing the returned funding-request transaction details
    const [fundSuccessResult, setFundSuccessResult] = useState<FundingRequest | null>(null);

    // ── Funding Requests page (list of all request-funding records) ──────────
    const [fundingRequestsOpen, setFundingRequestsOpen] = useState(false);
    const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
    const [fundingRequestsCount, setFundingRequestsCount] = useState(0);
    const [fundingRequestsLoading, setFundingRequestsLoading] = useState(false);
    const [fundingRequestsError, setFundingRequestsError] = useState<string | null>(null);
    const [fundingRequestPage, setFundingRequestPage] = useState(0);
    const [fundingRequestRowsPerPage, setFundingRequestRowsPerPage] = useState(8);

    // ── Delete confirmation ───────────────────────────────────────────────────
    const [deleteConfirmVendor, setDeleteConfirmVendor] = useState<RelatedVendor | null>(null);
    const [deletingVendor, setDeletingVendor] = useState(false);

    // ── Suspend confirmation + result ─────────────────────────────────────────
    const [suspendConfirmVendor, setSuspendConfirmVendor] = useState<RelatedVendor | null>(null);
    const [suspendingVendor, setSuspendingVendor] = useState(false);
    const [suspendResultDialog, setSuspendResultDialog] = useState<
        | { success: true; data: SuspendedVendorResult }
        | { success: false; message: string }
        | null
    >(null);

    // ── Computed ──────────────────────────────────────────────────────────────
    const allowedHierarchies = useMemo<VendorLevel[]>(() => {
        if (!selectedParentVendor) return [];
        return getAllowedChildHierarchies(selectedParentVendor.hierachy);
    }, [selectedParentVendor]);

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────────────────────
    const setField = (key: keyof VendorFormState, value: any) => {
        setVendorForm(prev => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const handleSelfToggle = (checked: boolean) => {
        setIsSelf(checked);
        if (checked) {
            const selfId = String(user?.related_vendor?.id || '');
            setField('related_vendor', selfId);
            setField('hierachy', '');
            setSelectedParentVendor({
                id: Number(selfId),
                business_name: user?.related_vendor?.business_name || 'Me (Self)',
                email: user?.email || '', phone_number: '',
                address: '', city: '', state: '', country: '', postal_code: '',
                account_status: 'active', hierachy: user?.related_vendor?.hierachy || 'vendor', created_at: '',
            });
        } else {
            setField('related_vendor', ''); setField('hierachy', ''); setSelectedParentVendor(null);
        }
    };

    const handleParentVendorChange = (vendorId: string) => {
        setField('related_vendor', vendorId); setField('hierachy', '');
        setSelectedParentVendor(relatedVendorList.find(v => String(v.id) === vendorId) || null);
        setFieldErrors(prev => { const n = { ...prev }; delete n.related_vendor; delete n.hierachy; return n; });
    };

    const handleNext = () => {
        const errs = validateStep(currentStep, vendorForm);
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }
        setFieldErrors({}); setCurrentStep(s => s + 1);
    };
    const handlePrev = () => { setCurrentStep(s => s - 1); setFieldErrors({}); };

    const handleCloseDialog = () => {
        setCreateVendorOpen(false); setVendorForm({ ...EMPTY_FORM });
        setFieldErrors({}); setDialogError(null); setCurrentStep(0);
        setIsSelf(false); setSelectedParentVendor(null);
    };

    const handleCreateVendor = async () => {
        const errs = validateStep(currentStep, vendorForm);
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }
        setCreatingVendor(true); setDialogError(null);
        try {
            const payload: Record<string, any> = { ...vendorForm };
            Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });
            await vendorManagementService.createVendor(payload as any);
            setSuccess('Vendor created successfully'); handleCloseDialog(); await fetchRelatedVendors();
        } catch (err: any) { setDialogError(extractBackendError(err)); }
        finally { setCreatingVendor(false); }
    };

    // ── Config handlers ───────────────────────────────────────────────────────
    const openConfig = (vendor: RelatedVendor) => {
        setConfigVendor(vendor); setConfigError(null); setConfigSuccess(null);
        setConfigForm({ funding_cap: '', transaction_max: '', commission_rate: '', monthly_target: '' });
    };
    const closeConfig = () => { setConfigVendor(null); setConfigError(null); setConfigSuccess(null); };
    const closeConfigResultDialog = () => setConfigResultDialog(null);

    const handleSaveConfig = async () => {
        if (!configVendor) return;
        setSavingConfig(true); setConfigError(null); setConfigSuccess(null);
        try {
            // Build payload — only send filled fields
            const payload: Record<string, string> = {};
            if (configForm.funding_cap.trim()) payload.funding_cap = configForm.funding_cap.trim();
            if (configForm.transaction_max.trim()) payload.transaction_max = configForm.transaction_max.trim();
            if (configForm.commission_rate.trim()) payload.commission_rate = configForm.commission_rate.trim();
            if (configForm.monthly_target.trim()) payload.monthly_target = configForm.monthly_target.trim();

            const result = await vendorManagementService.configureVendor(configVendor.id, payload);
            // Show the vendor name from the response to confirm it worked
            const name = result?.business_name || configVendor.business_name;
            setConfigSuccess(`✓ Configuration saved for ${name}`);
            // Pop up the backend response so the user can see exactly what was saved
            setConfigResultDialog({ success: true, message: `Configuration saved for ${name}`, data: result });
            // Refresh vendor list silently after 1.5 s then close the drawer
            setTimeout(() => { fetchRelatedVendors(); closeConfig(); }, 1800);
        } catch (err: any) {
            const message = extractBackendError(err);
            setConfigError(message);
            // Pop up the backend's failure response too
            setConfigResultDialog({ success: false, message, data: err?.response?.data || err?.data || err });
        }
        finally { setSavingConfig(false); }
    };

    // ── Fund Wallet / Request Funding handlers ────────────────────────────────
    const openFundWallet = (vendor: RelatedVendor) => {
        setFundWalletVendor(vendor); setFundForm({ amount: '' }); setFundError(null);
    };
    const closeFundWallet = () => { setFundWalletVendor(null); setFundError(null); };
    const closeFundSuccessResult = () => setFundSuccessResult(null);

    const handleFundWallet = async () => {
        if (!fundWalletVendor) return;
        if (!fundForm.amount.trim() || isNaN(Number(fundForm.amount)) || Number(fundForm.amount) <= 0) {
            setFundError('Please enter a valid amount greater than zero.'); return;
        }
        setFundingWallet(true); setFundError(null);
        try {
            // POST /vendor/request-funding/  — only sends the funding request, no actual funding occurs yet
            const result = await vendorManagementService.requestWalletFunding({ vendor: fundWalletVendor?.id , amount: fundForm.amount });
            // Close the request form and show a nice success modal with the transaction details returned
            const fundedVendorName = fundWalletVendor.business_name;
            closeFundWallet();
            setFundSuccessResult(result);
            setSuccess(`Funding request submitted for ${fundedVendorName}`);
        } catch (err: any) {
            // Keep the failure behaviour exactly as before — inline error in the same dialog
            setFundError(extractBackendError(err));
        }
        finally { setFundingWallet(false); }
    };

    // ── Delete handlers ───────────────────────────────────────────────────────
    const openDeleteConfirm = (vendor: RelatedVendor) => setDeleteConfirmVendor(vendor);
    const closeDeleteConfirm = () => { if (!deletingVendor) setDeleteConfirmVendor(null); };

    const confirmDeleteVendor = async () => {
        if (!deleteConfirmVendor) return;
        setDeletingVendor(true);
        try {
            await vendorManagementService.deleteVendor(deleteConfirmVendor.id);
            setSuccess('Vendor deleted successfully');
            setDeleteConfirmVendor(null);
            setSelectedVendor(null);
            fetchRelatedVendors();
        } catch (err: any) {
            setError(extractBackendError(err));
            setDeleteConfirmVendor(null);
        } finally {
            setDeletingVendor(false);
        }
    };

    // ── Suspend handlers ──────────────────────────────────────────────────────
    const openSuspendConfirm = (vendor: RelatedVendor) => setSuspendConfirmVendor(vendor);
    const closeSuspendConfirm = () => { if (!suspendingVendor) setSuspendConfirmVendor(null); };
    const closeSuspendResultDialog = () => setSuspendResultDialog(null);

    const confirmSuspendVendor = async () => {
        if (!suspendConfirmVendor) return;
        setSuspendingVendor(true);
        try {
            const result = await vendorManagementService.suspendVendor({ vendor: suspendConfirmVendor.id });
            setSuspendConfirmVendor(null);
            setSuspendResultDialog({ success: true, data: result });
            // Reflect the updated status immediately if this vendor is currently selected
            setSelectedVendor(prev => (prev && prev.id === result.id ? { ...prev, account_status: result.account_status } : prev));
            fetchRelatedVendors();
        } catch (err: any) {
            setSuspendConfirmVendor(null);
            setSuspendResultDialog({ success: false, message: extractBackendError(err) });
        } finally {
            setSuspendingVendor(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // FETCHES
    // ─────────────────────────────────────────────────────────────────────────
    const fetchRelatedVendorList = useCallback(async () => {
        setVendorListLoading(true);
        try { setRelatedVendorList(parseVendorList(await vendorManagementService.getRelatedVendors({}))); }
        catch { setRelatedVendorList([]); }
        finally { setVendorListLoading(false); }
    }, []);

    useEffect(() => {
        if (createVendorOpen) { fetchRelatedVendorList(); setIsSelf(false); setSelectedParentVendor(null); }
    }, [createVendorOpen, fetchRelatedVendorList]);

    const fetchVendorAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const d = await vendorManagementService.getAnalytics({ start_date: cardStartDate, end_date: cardEndDate });
            setAnalytics({ total_balance: Number(d.total_balance || 0), total_transactions: Number(d.total_transactions || 0), processed_today: Number(d.processed_today || 0), active: Number(d.active || 0) });
        } catch { } finally { setAnalyticsLoading(false); }
    }, [cardStartDate, cardEndDate]);

    const fetchRelatedVendors = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params: Record<string, string> = {};
            if (levelFilter !== 'all') params.hierachy = levelFilter;
            if (statusFilter !== 'all') { params.account_status = statusFilter; params.status = statusFilter; }
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            const payload = await vendorManagementService.getRelatedVendors(params);
            setVendors(parseVendorList(payload)); setLastUpdated(new Date());
        } catch (err: any) { setError(extractBackendError(err)); setVendors([]); }
        finally { setLoading(false); }
    }, [levelFilter, statusFilter, searchTerm, startDate, endDate]);

    const fetchVendorTransactions = useCallback(async (vendorId: number, pg = 1, ps = 5) => {
        setTransactionLoading(true);
        try {
            const payload = await vendorManagementService.getVendorTransactions({
                vendor_id: vendorId, page: pg, page_size: ps,
                start_date: transactionStartDate, end_date: transactionEndDate,
                ...(transactionSearch.trim() ? { search: transactionSearch } : {}),
            });
            const sorted = [...(payload.results || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setSelectedTransactions(sorted.map((t: any) => ({ ...t, vendor_name: t.vendor?.business_name || selectedVendor?.business_name || 'Unknown' })));
            setSelectedTransactionCount(Number(payload.count || 0));
        } catch { setSelectedTransactions([]); setSelectedTransactionCount(0); }
        finally { setTransactionLoading(false); }
    }, [transactionSearch, transactionStartDate, transactionEndDate, selectedVendor]);

    const fetchVendorChildren = useCallback(async (vendorId: number) => {
        setDetailLoading(true);
        try { setSelectedChildren(parseVendorList(await vendorManagementService.getVendorChildren(vendorId))); }
        catch { setSelectedChildren([]); }
        finally { setDetailLoading(false); }
    }, []);

    // Retrieve all funding requests — GET /vendor/request-funding/?request_status=...
    const fetchFundingRequests = useCallback(
        async (pg = 1, ps = 8, status = fundingRequestStatus) => {
            setFundingRequestsLoading(true);
            setFundingRequestsError(null);
            try {
                const payload = await vendorManagementService.getFundingRequests({
                    request_status: status, page: pg, page_size: ps,
                });
                setFundingRequests(payload?.results || []);
                setFundingRequestsCount(Number(payload?.count || 0));
            } catch (err: any) {
                setFundingRequestsError(extractBackendError(err));
                setFundingRequests([]);
                setFundingRequestsCount(0);
            } finally {
                setFundingRequestsLoading(false);
            }
        },
        [fundingRequestStatus]
    );

    const openFundingRequests = () => {
        setFundingRequestsOpen(true); setFundingRequestPage(0);
        fetchFundingRequests(1, fundingRequestRowsPerPage);
    };
    const closeFundingRequests = () => setFundingRequestsOpen(false);

    useEffect(() => {
        if (fundingRequestsOpen) fetchFundingRequests(fundingRequestPage + 1, fundingRequestRowsPerPage);
    }, [fundingRequestsOpen, fundingRequestPage, fundingRequestRowsPerPage, fetchFundingRequests]);

    useEffect(() => { fetchRelatedVendors(); fetchVendorAnalytics(); }, [fetchRelatedVendors, fetchVendorAnalytics]);
    useEffect(() => {
        if (selectedVendor) fetchVendorTransactions(selectedVendor.id, transactionPage + 1, transactionRowsPerPage);
    }, [selectedVendor, transactionPage, transactionRowsPerPage, transactionSearch, transactionStartDate, transactionEndDate, fetchVendorTransactions]);

    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED DATA
    // ─────────────────────────────────────────────────────────────────────────
    const filteredVendors = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return vendors.filter(v => {
            const level = normalizeLevel(v.hierachy); const status = (v.account_status || '').toLowerCase();
            const search = !term || v.business_name?.toLowerCase().includes(term) || v.email?.toLowerCase().includes(term) || v.phone_number?.toLowerCase().includes(term) || v.city?.toLowerCase().includes(term);
            const lvl = levelFilter === 'all' || level === levelFilter;
            const st = statusFilter === 'all' || status === statusFilter;
            const created = new Date(v.created_at).getTime();
            const ms = !startDate || created >= new Date(`${startDate}T00:00:00`).getTime();
            const me = !endDate || created <= new Date(`${endDate}T23:59:59`).getTime();
            let statMatch = true;
            if (statFilter === 'active') statMatch = status === 'active';
            else if (statFilter) statMatch = level === statFilter;
            return search && lvl && st && ms && me && statMatch;
        });
    }, [vendors, searchTerm, levelFilter, statusFilter, startDate, endDate, statFilter]);

    const paginatedVendors = useMemo(() => filteredVendors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredVendors, page, rowsPerPage]);

    const stats = useMemo(() => {
        const byLevel = (l: VendorLevel) => { const s = new Set<number>(); vendors.forEach(v => { if (normalizeLevel(v.hierachy) === l) s.add(v.id); }); return s.size; };
        return { subVendors: byLevel('sub_vendor'), agents: byLevel('agent'), cashiers: byLevel('cashier'), pos: byLevel('pos'), active: vendors.filter(v => v.account_status?.toLowerCase() === 'active').length };
    }, [vendors]);

    const filteredStats = useMemo(() => {
        if (!statFilter) return null;
        const active = filteredVendors.filter(v => v.account_status?.toLowerCase() === 'active').length;
        const inactive = filteredVendors.length - active;
        const balance = filteredVendors.reduce((s, v) => s + getWalletBalance(v), 0);
        return { total: filteredVendors.length, active, inactive, balance };
    }, [statFilter, filteredVendors]);

    const selectedVendorTree = useMemo(() => buildVendorTree(selectedChildren), [selectedChildren]);
    const selectedDirectChildrenCount = selectedVendor ? selectedChildren.filter(c => c.related_vendor?.id === selectedVendor.id).length || selectedChildren.length : 0;

    // Quick stats for the funding-requests table
    const fundingRequestStats = useMemo(() => {
        const totalAmount = fundingRequests.reduce((s, r) => s + Number(r.amount || 0), 0);
        const pending = fundingRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
        const approved = fundingRequests.filter(r => ['approved', 'success', 'successful', 'completed'].includes((r.status || '').toLowerCase())).length;
        return { totalAmount, pending, approved };
    }, [fundingRequests]);

    const resetFilters = () => { setSearchTerm(''); setLevelFilter('all'); setStatusFilter('all'); setStartDate(''); setEndDate(''); setPage(0); setStatFilter(null); };
    const toggleExpanded = (id: number) => { setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

    const handleSelectVendor = useCallback((vendor: RelatedVendor) => {
        setSelectedVendor(vendor); setShowFullDetails(false); setExpandedIds(new Set([vendor.id]));
        fetchVendorChildren(vendor.id); fetchVendorTransactions(vendor.id, 1, transactionRowsPerPage);
        if (typeof window !== 'undefined') window.setTimeout(() => document.getElementById('vendor-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }, [fetchVendorChildren, fetchVendorTransactions]);

    const exportVendors = () => {
        const headers = ['ID', 'Business', 'Email', 'Phone', 'Hierarchy', 'Status', 'Balance', 'City', 'State', 'Country', 'Parent', 'Created'];
        const rows = filteredVendors.map(v => [v.id, v.business_name, v.email, v.phone_number, levelLabel(v.hierachy), v.account_status, getWalletBalance(v), v.city, v.state, v.country, v.related_vendor?.business_name || '', v.created_at]);
        const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = 'vendors.csv';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        setSuccess(`Exported ${rows.length} vendors`);
    };

    const copyTransactionRef = (ref?: string) => {
        if (!ref || typeof navigator === 'undefined' || !navigator.clipboard) return;
        navigator.clipboard.writeText(ref).then(() => setSuccess('Transaction reference copied')).catch(() => {});
    };

    const renderVendorTree = (nodes: VendorTreeNode[], depth = 0): React.ReactNode => (
        <List disablePadding>
            {nodes.map(node => {
                const hasChildren = Boolean(node.children?.length); const isExpanded = expandedIds.has(node.id);
                return (
                    <Box key={node.id}>
                        <ListItemButton selected={selectedVendor?.id === node.id} onClick={() => handleSelectVendor(node)} sx={{ pl: 2 + depth * 2 }}>
                            {hasChildren ? (
                                <IconButton size="small" onClick={e => { e.stopPropagation(); toggleExpanded(node.id); }}>
                                    {isExpanded ? <ArrowDropDown /> : <ChevronRight />}
                                </IconButton>
                            ) : <Box sx={{ width: 32 }} />}
                            <ListItemText primary={node.business_name} secondary={
                                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                                    <Chip label={levelLabel(node.hierachy)} size="small" color={levelColor(node.hierachy)} variant="outlined" />
                                    <Chip label={node.account_status} size="small" color={statusColor(node.account_status)} />
                                </Stack>
                            } />
                        </ListItemButton>
                        {hasChildren && isExpanded && renderVendorTree(node.children, depth + 1)}
                    </Box>
                );
            })}
        </List>
    );

    const StatFilterChip = ({ label, filterKey, count }: { label: string; filterKey: StatFilterKey; count: number }) => {
        const isActive = statFilter === filterKey;
        return (
            <Chip label={`${count} ${label}`} onClick={() => { setStatFilter(isActive ? null : filterKey); setPage(0); }}
                sx={{ cursor: 'pointer', fontWeight: isActive ? 700 : 400, bgcolor: isActive ? '#1e3a8a' : undefined, color: isActive ? '#fff' : undefined, borderColor: isActive ? '#1e3a8a' : undefined, animation: !isActive ? 'chipPop 2s ease-in-out infinite' : 'none', transition: 'all 0.25s ease', '&:hover': { bgcolor: isActive ? '#1e40af' : undefined, transform: 'scale(1.05)' } }}
                variant={isActive ? 'filled' : 'outlined'} size="small" />
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP CONTENT
    // ─────────────────────────────────────────────────────────────────────────
    const renderStepContent = () => {
        const fe = fieldErrors; const tSx = inputSx;
        switch (currentStep) {
            case 0: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 2, border: '2px solid', borderColor: isSelf ? '#1e3a8a' : '#e2e8f0', bgcolor: isSelf ? '#eff6ff' : '#f8faff', transition: 'all 0.25s ease', cursor: 'pointer' }} onClick={() => handleSelfToggle(!isSelf)}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ width: 38, height: 38, bgcolor: isSelf ? '#1e3a8a' : '#e2e8f0', transition: 'all 0.25s' }}><Person sx={{ fontSize: 20, color: isSelf ? '#fff' : '#94a3b8' }} /></Avatar>
                                <Box>
                                    <Typography fontWeight={600} fontSize={14} color={isSelf ? '#1e3a8a' : 'text.primary'}>Use Self as Parent</Typography>
                                    <Typography variant="caption" color="text.secondary">Select yourself ({user?.related_vendor?.business_name || 'Me'}) as the parent vendor</Typography>
                                </Box>
                            </Stack>
                            <Checkbox checked={isSelf} onChange={e => { e.stopPropagation(); handleSelfToggle(e.target.checked); }} sx={{ color: '#1e3a8a', '&.Mui-checked': { color: '#1e3a8a' }, pointerEvents: 'none' }} />
                        </Box>
                    </Grid>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary" px={1}>{isSelf ? 'Self selected — uncheck to pick below' : 'Or select a related vendor as parent'}</Typography></Divider></Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth required error={!!fe.related_vendor} sx={tSx} disabled={isSelf}>
                            <InputLabel>{vendorListLoading ? 'Loading vendors…' : 'Select Parent Vendor *'}</InputLabel>
                            <Select value={isSelf ? String(user?.related_vendor?.id || '') : vendorForm.related_vendor} label={vendorListLoading ? 'Loading vendors…' : 'Select Parent Vendor *'} onChange={e => handleParentVendorChange(e.target.value)} startAdornment={vendorListLoading ? <CircularProgress size={16} sx={{ ml: 1, mr: 0.5 }} /> : undefined}>
                                <MenuItem value={String(user?.related_vendor?.id || '')} sx={{ bgcolor: '#f0f9ff' }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Person fontSize="small" sx={{ color: '#1e3a8a' }} />
                                        <Box><Typography variant="body2" fontWeight={700} color="#1e3a8a">{user?.related_vendor?.business_name || 'Me (Self)'}</Typography><Typography variant="caption" color="text.secondary">Self · {user?.related_vendor?.hierachy || 'vendor'}</Typography></Box>
                                        <Chip label="Self" size="small" color="primary" sx={{ ml: 'auto', height: 18, fontSize: 10 }} />
                                    </Stack>
                                </MenuItem>
                                {relatedVendorList.length > 0 && <MenuItem disabled sx={{ py: 0.5, minHeight: 'auto', opacity: 1 }}><Divider sx={{ width: '100%' }} /></MenuItem>}
                                {relatedVendorList.map(v => (
                                    <MenuItem key={v.id} value={String(v.id)}>
                                        <Stack direction="row" spacing={1.5} alignItems="center" width="100%">
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: `${levelColor(v.hierachy)}.light`, color: `${levelColor(v.hierachy)}.main`, fontSize: 12, fontWeight: 700 }}>{v.business_name.charAt(0)}</Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={600} noWrap>{v.business_name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{v.email}</Typography></Box>
                                            <Stack direction="row" spacing={0.5} flexShrink={0}><Chip label={levelLabel(v.hierachy)} size="small" color={levelColor(v.hierachy)} variant="outlined" sx={{ height: 18, fontSize: 10 }} /><Chip label={v.account_status} size="small" color={statusColor(v.account_status)} sx={{ height: 18, fontSize: 10 }} /></Stack>
                                        </Stack>
                                    </MenuItem>
                                ))}
                                {relatedVendorList.length === 0 && !vendorListLoading && <MenuItem disabled><Typography variant="body2" color="text.secondary" fontStyle="italic">No related vendors found</Typography></MenuItem>}
                            </Select>
                            {fe.related_vendor && <FormHelperText>{fe.related_vendor}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    {selectedParentVendor && (
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <CheckCircle sx={{ color: '#16a34a', fontSize: 20, flexShrink: 0 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#15803d">{selectedParentVendor.business_name}{isSelf && ' (Self)'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Hierarchy: <strong>{levelLabel(selectedParentVendor.hierachy)}</strong> · Can create: <strong>{allowedHierarchies.map(h => levelLabel(h)).join(', ') || 'None'}</strong></Typography>
                                </Box>
                            </Box>
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <FormControl fullWidth required error={!!fe.hierachy} disabled={!selectedParentVendor || allowedHierarchies.length === 0} sx={tSx}>
                            <InputLabel>{!selectedParentVendor ? 'Select a parent vendor first' : allowedHierarchies.length === 0 ? 'No child hierarchy available' : 'New Vendor Hierarchy *'}</InputLabel>
                            <Select value={vendorForm.hierachy} label={!selectedParentVendor ? 'Select a parent vendor first' : 'New Vendor Hierarchy *'} onChange={e => setField('hierachy', e.target.value)}>
                                {allowedHierarchies.map(h => (<MenuItem key={h} value={h}><Stack direction="row" spacing={1} alignItems="center"><Chip label={levelLabel(h)} size="small" color={levelColor(h)} variant="outlined" sx={{ height: 20, fontSize: 11 }} /><Typography variant="body2">{levelLabel(h)}</Typography></Stack></MenuItem>))}
                            </Select>
                            {fe.hierachy && <FormHelperText>{fe.hierachy}</FormHelperText>}
                            {!selectedParentVendor && <FormHelperText sx={{ color: '#94a3b8' }}>Hierarchy options appear after selecting a parent vendor</FormHelperText>}
                        </FormControl>
                    </Grid>
                </Grid>
            );
            case 1: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12}><TextField fullWidth required label="Business Name *" value={vendorForm.business_name} error={!!fe.business_name} helperText={fe.business_name} onChange={e => setField('business_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth required label="License / Domain *" value={vendorForm.domain} error={!!fe.domain} helperText={fe.domain} onChange={e => setField('domain', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Subdomain" value={vendorForm.sub_domain} onChange={e => setField('sub_domain', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Slug" value={vendorForm.slug} onChange={e => setField('slug', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Trial Ends" type="date" InputLabelProps={{ shrink: true }} value={vendorForm.trial_ends} onChange={e => setField('trial_ends', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth required label="Admin Email *" type="email" value={vendorForm.email} error={!!fe.email} helperText={fe.email} onChange={e => setField('email', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth required label="Phone Number *" value={vendorForm.phone_number} error={!!fe.phone_number} helperText={fe.phone_number} onChange={e => setField('phone_number', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, bgcolor: '#f3f4f8', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                            <Box><Typography fontWeight={500}>Active on creation</Typography><Typography variant="caption" color="text.secondary">Vendor will be immediately active</Typography></Box>
                            <Switch checked={vendorForm.active_on_creation} onChange={e => setField('active_on_creation', e.target.checked)} />
                        </Stack>
                    </Grid>
                </Grid>
            );
            case 2: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12}><TextField fullWidth required label="Address *" value={vendorForm.address} error={!!fe.address} helperText={fe.address} onChange={e => setField('address', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth required label="City *" value={vendorForm.city} error={!!fe.city} helperText={fe.city} onChange={e => setField('city', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth required label="State *" value={vendorForm.state} error={!!fe.state} helperText={fe.state} onChange={e => setField('state', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth required label="Postal Code *" value={vendorForm.postal_code} error={!!fe.postal_code} helperText={fe.postal_code} onChange={e => setField('postal_code', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Country" value={vendorForm.country} onChange={e => setField('country', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Website" value={vendorForm.website} onChange={e => setField('website', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Industry" value={vendorForm.industry} onChange={e => setField('industry', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Category" value={vendorForm.category} onChange={e => setField('category', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Contact Name" value={vendorForm.contact_name} onChange={e => setField('contact_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Alt Email 1" type="email" value={vendorForm.email1} onChange={e => setField('email1', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Alt Email 2" type="email" value={vendorForm.email2} onChange={e => setField('email2', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Registration Number" value={vendorForm.registration_number} onChange={e => setField('registration_number', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><TextField fullWidth label="CAC Registration Number" value={vendorForm.cac_registration_number} onChange={e => setField('cac_registration_number', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Description" value={vendorForm.description} onChange={e => setField('description', e.target.value)} sx={tSx} /></Grid>
                </Grid>
            );
            case 3: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Owner Name" value={vendorForm.owner_name} onChange={e => setField('owner_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} value={vendorForm.dob} onChange={e => setField('dob', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Nationality" value={vendorForm.nationality} onChange={e => setField('nationality', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><FormControl fullWidth sx={tSx}><InputLabel>ID Type</InputLabel><Select value={vendorForm.id_type} label="ID Type" onChange={e => setField('id_type', e.target.value)}>{['NIN', 'BVN', 'Passport', "Driver's License", "Voter's Card"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="ID Number" value={vendorForm.id_number} onChange={e => setField('id_number', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Owner Address" value={vendorForm.owner_address} onChange={e => setField('owner_address', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Bank Details</Typography></Divider></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Bank Name" value={vendorForm.bank_name} onChange={e => setField('bank_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Account Name" value={vendorForm.account_name} onChange={e => setField('account_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Account Number" value={vendorForm.account_number} onChange={e => setField('account_number', e.target.value)} sx={tSx} /></Grid>
                </Grid>
            );
            case 4: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Funding Cap (₦)" type="number" value={vendorForm.funding_cap} onChange={e => setField('funding_cap', e.target.value)} helperText="Max wallet funding" sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Transaction Max (₦)" type="number" value={vendorForm.transaction_max} onChange={e => setField('transaction_max', e.target.value)} helperText="Per-transaction limit" sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Commission Rate (%)" type="number" value={vendorForm.commission_rate} onChange={e => setField('commission_rate', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Monthly Target (₦)" type="number" value={vendorForm.monthly_target} onChange={e => setField('monthly_target', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #bfdbfe' }}><Typography variant="body2" color="primary.main" fontWeight={600}>Leave empty to inherit parent defaults</Typography></Box></Grid>
                </Grid>
            );
            case 5: return (
                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Entity Name" value={vendorForm.entity_name} onChange={e => setField('entity_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Company Website" value={vendorForm.company_website} onChange={e => setField('company_website', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><TextField fullWidth label="Company Address" value={vendorForm.company_address} onChange={e => setField('company_address', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Signatory Details</Typography></Divider></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Signatory Name" value={vendorForm.signatory_name} onChange={e => setField('signatory_name', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Signatory Phone" value={vendorForm.signatory_phone_number} onChange={e => setField('signatory_phone_number', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12} md={4}><TextField fullWidth label="Signatory Email" type="email" value={vendorForm.signatory_email} onChange={e => setField('signatory_email', e.target.value)} sx={tSx} /></Grid>
                    <Grid item xs={12}><Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}><Typography variant="body2" color="success.main" fontWeight={600}>Ready to Create — all required fields must be filled.</Typography></Box></Grid>
                </Grid>
            );
            default: return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <Box p={{ xs: 2, md: 3 }} sx={{
            '@keyframes tableSlideIn':  { from: { opacity: 0, transform: 'translateX(-28px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
            '@keyframes detailSlideIn': { from: { opacity: 0, transform: 'translateX(36px)'  }, to: { opacity: 1, transform: 'translateX(0)' } },
            '@keyframes chipPop': { '0%, 100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.14)' }, '60%': { transform: 'scale(0.96)' } },
            '@keyframes popIn': { '0%': { opacity: 0, transform: 'scale(0.85)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        }}>
            {/* ── Page header ── */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Vendor Hierarchy</Typography>
                    <Typography variant="body2" color="text.secondary">Live related vendors · updated {lastUpdated.toLocaleTimeString()}</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    {/* <Stack direction="row" spacing={2}>
                        <TextField label="Start Date" type="date" size="small" value={cardStartDate} onChange={e => setCardStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                        <TextField label="End Date" type="date" size="small" value={cardEndDate} onChange={e => setCardEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
                    </Stack> */}
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<History />} onClick={openFundingRequests}>Funding Requests</Button>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={() => { fetchRelatedVendors(); fetchVendorAnalytics(); }} disabled={loading || analyticsLoading}>Refresh</Button>
                        <Button variant="contained" startIcon={<Download />} onClick={exportVendors} disabled={!filteredVendors.length}>Export</Button>
                    </Stack>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Stat cards ── */}
            <Grid container spacing={2} mb={3} sx={{ transition: 'all 0.4s ease' }}>
                {filteredStats ? (
                    <>
                        <Grid item xs={12} md={3}><StatCard title={`Total ${statFilter?.replace('_', ' ')} vendors`} value={formatNumber(filteredStats.total)} icon={<People />} color="primary" subtitle="in current filter" /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Total Active" value={formatNumber(filteredStats.active)} icon={<CheckCircle />} color="success" subtitle={`${Math.round((filteredStats.active / Math.max(filteredStats.total, 1)) * 100)}% of group`} /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Total Inactive" value={formatNumber(filteredStats.inactive)} icon={<TrendingDown />} color="error" subtitle="inactive / suspended" /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Total Subvendor Balance" value={formatCurrency(filteredStats.balance)} icon={<AccountBalance />} color="info" subtitle="combined wallet balance" /></Grid>
                    </>
                ) : null}
            </Grid>

            {!selectedVendor ? (
                <Box key="vendor-table" sx={{ animation: 'tableSlideIn 340ms ease' }}>
                    <Card sx={{ mb: 3, borderRadius: 2 }}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}><TextField fullWidth size="small" placeholder="Search business, email, phone, city" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }} sx={inputSx} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} /></Grid>
                                <Grid item xs={12} md={2}><FormControl fullWidth size="small" sx={inputSx}><InputLabel>Hierarchy</InputLabel><Select value={levelFilter} label="Hierarchy" onChange={e => { setLevelFilter(e.target.value as VendorLevelFilter); setPage(0); }}><MenuItem value="all">All Hierarchy</MenuItem>{LEVEL_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</Select></FormControl></Grid>
                                <Grid item xs={12} md={2}><FormControl fullWidth size="small" sx={inputSx}><InputLabel>Status</InputLabel><Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value as VendorStatusFilter); setPage(0); }}><MenuItem value="all">All Status</MenuItem>{STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</Select></FormControl></Grid>
                                <Grid item xs={12} md={2}><TextField fullWidth size="small" type="date" label="Start Date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
                                <Grid item xs={12} md={2}><TextField fullWidth size="small" type="date" label="End Date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                                        <Tooltip title="Filter by active status" arrow><span><StatFilterChip label="active" filterKey="active" count={stats.active} /></span></Tooltip>
                                        <Tooltip title="Show sub-vendors only" arrow><span><StatFilterChip label="sub-vendors" filterKey="sub_vendor" count={stats.subVendors} /></span></Tooltip>
                                        <Tooltip title="Show agents only" arrow><span><StatFilterChip label="agents" filterKey="agent" count={stats.agents} /></span></Tooltip>
                                        <Tooltip title="Show cashiers only" arrow><span><StatFilterChip label="cashiers" filterKey="cashier" count={stats.cashiers} /></span></Tooltip>
                                        <Tooltip title="Show POS only" arrow><span><StatFilterChip label="pos" filterKey="pos" count={stats.pos} /></span></Tooltip>
                                        {statFilter && <Button size="small" onClick={() => { setStatFilter(null); setPage(0); }} sx={{ color: '#64748b', fontSize: 11 }}>Clear ×</Button>}
                                        <Button size="small" onClick={resetFilters} sx={{ ml: 'auto' }}>Reset All</Button>
                                    </Stack>
                                    {statFilter && <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>Showing {filteredVendors.length} result{filteredVendors.length !== 1 ? 's' : ''} · {statFilter.replace('_', ' ')} filter active</Typography>}
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}><Domain /></Avatar>
                                <Box><Typography variant="h6">Vendors</Typography><Typography variant="body2" color="text.secondary">Click any row for full management details</Typography></Box>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {loading && <CircularProgress size={22} />}
                                <Button variant="contained" color="primary" startIcon={<Business />} onClick={() => setCreateVendorOpen(true)}>Create Children</Button>
                            </Stack>
                        </Stack>
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Business</TableCell><TableCell>Hierarchy</TableCell><TableCell>Status</TableCell>
                                        <TableCell>Contact</TableCell><TableCell>Location</TableCell><TableCell>Wallet</TableCell>
                                        <TableCell>Created</TableCell><TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedVendors.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>{loading ? 'Loading…' : 'No vendors found'}</TableCell></TableRow>
                                    ) : paginatedVendors.map(vendor => (
                                        <TableRow key={vendor.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectVendor(vendor)}>
                                            <TableCell><Stack spacing={0.25}><Typography variant="subtitle2">{vendor.business_name}</Typography><Typography variant="caption" color="text.secondary">Parent: {vendor.related_vendor?.business_name || 'None'}</Typography></Stack></TableCell>
                                            <TableCell><Chip label={levelLabel(vendor.hierachy)} size="small" color={levelColor(vendor.hierachy)} variant="outlined" /></TableCell>
                                            <TableCell><Chip label={vendor.account_status} size="small" color={statusColor(vendor.account_status)} /></TableCell>
                                            <TableCell><Typography variant="body2">{vendor.email}</Typography><Typography variant="caption" color="text.secondary">{vendor.phone_number}</Typography></TableCell>
                                            <TableCell>{getLocation(vendor)}</TableCell>
                                            <TableCell><Typography variant="subtitle2">{formatCurrency(getWalletBalance(vendor))}</Typography><Typography variant="caption" color="text.secondary">{getWalletTypeName(vendor)}</Typography></TableCell>
                                            <TableCell>{formatDate(vendor.created_at)}</TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <Button size="small" endIcon={<ArrowForward />} onClick={e => { e.stopPropagation(); handleSelectVendor(vendor); }}>View</Button>
                                                    <Button size="small" variant="outlined" startIcon={<Settings fontSize="small" />} sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: 12 }} onClick={e => { e.stopPropagation(); openConfig(vendor); }}>Config</Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                        <TablePagination component="div" count={filteredVendors.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[5, 8, 12, 20, 50]} />
                    </Paper>
                </Box>
            ) : (
                <Box id="vendor-detail-panel" key={selectedVendor.id} sx={{ animation: 'detailSlideIn 380ms ease' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                        <Box><Typography variant="h6">Selected Vendor Details</Typography><Typography variant="body2" color="text.secondary">{selectedVendor.business_name}</Typography></Box>
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" startIcon={<Settings />} onClick={() => openConfig(selectedVendor)}>Configuration</Button>
                            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setSelectedVendor(null)}>Back</Button>
                        </Stack>
                    </Stack>
                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} md={3}><StatCard title="Wallet Balance" value={formatCurrency(getWalletBalance(selectedVendor))} icon={<AccountBalance />} color="success" /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Transactions" value={formatNumber(selectedTransactionCount)} icon={<Receipt />} color="warning" /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Total Subordinates" value={formatNumber(selectedDirectChildrenCount)} icon={<Business />} color="primary" /></Grid>
                        <Grid item xs={12} md={3}><StatCard title="Status" value={selectedVendor.account_status} icon={<CheckCircle />} color="info" /></Grid>
                    </Grid>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <Stack spacing={3}>
                                <Card sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="h5">{selectedVendor.business_name}</Typography>
                                                <Typography color="text.secondary">{selectedVendor.email}</Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    <Chip label={levelLabel(selectedVendor.hierachy)} color={levelColor(selectedVendor.hierachy)} />
                                                    <Chip label={selectedVendor.account_status} color={statusColor(selectedVendor.account_status)} />
                                                    <Chip label={getLocation(selectedVendor)} variant="outlined" />
                                                </Stack>
                                            </Stack>
                                            {/* ── Fund / Suspend / Delete buttons ── */}
                                            <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap">
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<AccountBalanceWallet />}
                                                    onClick={() => openFundWallet(selectedVendor)}
                                                    sx={{
                                                        height: 36, textTransform: 'none', borderRadius: 2,
                                                        borderColor: '#1e3a8a', color: '#1e3a8a',
                                                        '&:hover': { bgcolor: '#eff6ff', borderColor: '#1e40af' },
                                                    }}
                                                >
                                                    Fund Subordinate Wallet
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<PauseCircleOutline />}
                                                    onClick={() => openSuspendConfirm(selectedVendor)}
                                                    sx={{
                                                        height: 36, textTransform: 'none', borderRadius: 2,
                                                        borderColor: '#d97706', color: '#d97706',
                                                        '&:hover': { bgcolor: '#fffbeb', borderColor: '#b45309' },
                                                    }}
                                                >
                                                    Suspend
                                                </Button>
                                                <Button variant="contained" color="error" sx={{ height: 36, textTransform: 'none', borderRadius: 2 }} startIcon={<Delete />} onClick={() => openDeleteConfirm(selectedVendor)}>Delete</Button>
                                            </Stack>
                                        </Stack>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Phone</Typography><Typography>{selectedVendor.phone_number || 'N/A'}</Typography></Grid>
                                            <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Created</Typography><Typography>{formatDate(selectedVendor.created_at)}</Typography></Grid>
                                            <Grid item xs={12}><Button size="small" onClick={() => setShowFullDetails(p => !p)}>{showFullDetails ? 'View Less' : 'View Full Details'}</Button></Grid>
                                        </Grid>
                                        <Collapse in={showFullDetails} timeout={260}>
                                            <Divider sx={{ my: 2 }} />
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Vendor ID</Typography><Typography>{selectedVendor.id}</Typography></Grid>
                                                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Postal Code</Typography><Typography>{selectedVendor.postal_code || 'N/A'}</Typography></Grid>
                                                <Grid item xs={12}><Typography variant="body2" color="text.secondary">Address</Typography><Typography>{selectedVendor.address || 'N/A'}</Typography></Grid>
                                                <Grid item xs={4}><Typography variant="body2" color="text.secondary">City</Typography><Typography>{selectedVendor.city || 'N/A'}</Typography></Grid>
                                                <Grid item xs={4}><Typography variant="body2" color="text.secondary">State</Typography><Typography>{selectedVendor.state || 'N/A'}</Typography></Grid>
                                                <Grid item xs={4}><Typography variant="body2" color="text.secondary">Country</Typography><Typography>{selectedVendor.country || 'N/A'}</Typography></Grid>
                                                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Wallet Type</Typography><Typography>{getWalletTypeName(selectedVendor)}</Typography></Grid>
                                                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Parent</Typography><Typography>{selectedVendor.related_vendor?.business_name || 'None'}</Typography></Grid>
                                            </Grid>
                                        </Collapse>
                                    </CardContent>
                                </Card>

                                <Card sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6">Transactions</Typography>
                                            {transactionLoading && <CircularProgress size={22} />}
                                        </Stack>
                                        <Grid container spacing={2} mb={2}>
                                            <Grid item xs={12} md={4}><TextField fullWidth size="small" placeholder="Search transaction" value={transactionSearch} onChange={e => { setTransactionSearch(e.target.value); setTransactionPage(0); }} sx={inputSx} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} /></Grid>
                                            <Grid item xs={12} md={3}><TextField fullWidth size="small" type="date" label="Start" value={transactionStartDate} onChange={e => { setTransactionStartDate(e.target.value); setTransactionPage(0); }} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
                                            <Grid item xs={12} md={3}><TextField fullWidth size="small" type="date" label="End" value={transactionEndDate} onChange={e => { setTransactionEndDate(e.target.value); setTransactionPage(0); }} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
                                        </Grid>
                                        <Divider sx={{ mb: 2 }} />
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <Table size="small">
                                                <TableHead><TableRow><TableCell>Reference</TableCell><TableCell>Status</TableCell><TableCell align="right">Amount</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
                                                <TableBody>
                                                    {selectedTransactions.map(t => (
                                                        <TableRow key={t.transaction_ref} hover>
                                                            <TableCell>{t.transaction_ref}</TableCell>
                                                            <TableCell><Chip label={t.status || 'success'} size="small" color={t.status === 'failed' ? 'error' : t.status === 'pending' ? 'warning' : 'success'} /></TableCell>
                                                            <TableCell align="right"><Typography fontWeight={700} sx={{ color: t.transaction_type === 'debit' ? 'error.main' : 'success.main' }}>{t.transaction_type === 'debit' ? '- ' : '+ '}{formatCurrency(t.amount)}</Typography></TableCell>
                                                            <TableCell>{formatDateTime(t.timestamp)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <TablePagination component="div" count={selectedTransactionCount} page={transactionPage} onPageChange={(_, p) => setTransactionPage(p)} rowsPerPage={transactionRowsPerPage} onRowsPerPageChange={e => { setTransactionRowsPerPage(Number(e.target.value)); setTransactionPage(0); }} rowsPerPageOptions={[5, 10, 20]} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Card sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">Subordinates Under This Vendor</Typography>
                                        {detailLoading && <CircularProgress size={22} />}
                                    </Stack>
                                    <Paper variant="outlined" sx={{ maxHeight: 340, overflow: 'auto', borderRadius: 1 }}>
                                        {selectedVendorTree.length ? renderVendorTree(selectedVendorTree) : <Box p={2}><Typography color="text.secondary">No child vendors found.</Typography></Box>}
                                    </Paper>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            <Snackbar open={Boolean(success)} autoHideDuration={3500} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>{success}</Alert>
            </Snackbar>

            {/* ══════════════════════════════════════════════════════════════════
                WIZARD DIALOG
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={createVendorOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 0, color: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">Create new vendor</Typography>
                            <Typography variant="body2" sx={{ color: '#93c5fd', mt: 0.25 }}>Step {currentStep + 1} of {STEP_LABELS.length} — {STEP_SUBTITLES[currentStep]}</Typography>
                        </Box>
                        <IconButton onClick={handleCloseDialog} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                    </Stack>
                    <Box sx={{ display: 'flex', alignItems: 'center', pb: 0 }}>
                        {STEP_LABELS.map((label, i) => {
                            const done = i < currentStep; const active = i === currentStep;
                            return (
                                <React.Fragment key={label}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 }}>
                                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: done ? '#22c55e' : active ? '#fff' : 'transparent', border: done || active ? 'none' : '2px solid rgba(255,255,255,0.35)', color: done ? '#fff' : active ? '#1e3a8a' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12, transition: 'all 0.3s' }}>
                                            {done ? <CheckCircle sx={{ fontSize: 14 }} /> : i + 1}
                                        </Box>
                                        <Typography variant="caption" sx={{ mt: 0.4, fontSize: 9.5, fontWeight: active ? 700 : 400, color: active ? '#fff' : done ? '#86efac' : 'rgba(255,255,255,0.5)' }}>{label}</Typography>
                                        <Box sx={{ height: 3, width: '100%', bgcolor: active ? '#fff' : 'transparent', borderRadius: 2, mt: 0.5, transition: 'all 0.3s' }} />
                                    </Box>
                                    {i < STEP_LABELS.length - 1 && <Box sx={{ flex: 1, height: 1.5, bgcolor: i < currentStep ? '#4ade80' : 'rgba(255,255,255,0.2)', mx: 0.5, mb: 4 }} />}
                                </React.Fragment>
                            );
                        })}
                    </Box>
                </Box>
                <DialogContent sx={{ p: 3, maxHeight: '58vh', overflowY: 'auto' }}>
                    {dialogError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>{dialogError}</Alert>}
                    {renderStepContent()}
                </DialogContent>
                <Box sx={{ px: 3, py: 2, bgcolor: '#f8faff', borderTop: '1px solid #e8edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Step {currentStep + 1} of {STEP_LABELS.length}</Typography>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" onClick={handlePrev} disabled={currentStep === 0} sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', borderRadius: 1.5 }}>Previous</Button>
                        {currentStep < STEP_LABELS.length - 1 ? (
                            <Button variant="contained" onClick={handleNext} endIcon={<NavigateNext />} sx={{ textTransform: 'none', bgcolor: '#1e3a8a', borderRadius: 1.5, '&:hover': { bgcolor: '#1e40af' } }}>Next</Button>
                        ) : (
                            <Button variant="contained" onClick={handleCreateVendor} disabled={creatingVendor} sx={{ textTransform: 'none', bgcolor: '#16a34a', borderRadius: 1.5, '&:hover': { bgcolor: '#15803d' }, minWidth: 140 }}>
                                {creatingVendor ? <CircularProgress size={18} color="inherit" /> : '✓ Create Vendor'}
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                REQUEST FUNDING DIALOG  — PUT /vendor/fund/child/
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(fundWalletVendor)} onClose={closeFundWallet} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                {/* Header */}
                <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <AccountBalanceWallet sx={{ fontSize: 22 }} />
                                <Typography variant="h6" fontWeight={700} color="#fff">Request Wallet Funding</Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                                This only submits a funding request — no funds move yet.
                            </Typography>
                        </Box>
                        <IconButton onClick={closeFundWallet} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                    </Stack>
                </Box>

                <DialogContent sx={{ pt: 3, pb: 1 }}>
                    {fundError && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setFundError(null)}>
                            {fundError}
                        </Alert>
                    )}

                    <Stack spacing={2.5}>
                        {/* Vendor name — read-only */}
                        <TextField
                            fullWidth label="Vendor"
                            value={fundWalletVendor?.business_name || ''}
                            disabled
                            sx={{
                                ...inputSx,
                                '& .MuiOutlinedInput-root': { ...inputSx['& .MuiOutlinedInput-root'], bgcolor: '#f1f5f9' },
                            }}
                            helperText={`ID: ${fundWalletVendor?.id} · ${levelLabel(fundWalletVendor?.hierachy)}`}
                        />

                        {/* Amount — the only field the backend accepts */}
                        <TextField
                            fullWidth required
                            label="Amount (₦)"
                            type="number"
                            placeholder="e.g. 5000"
                            value={fundForm.amount}
                            onChange={e => { setFundForm({ amount: e.target.value }); setFundError(null); }}
                            sx={inputSx}
                            inputProps={{ min: 1 }}
                            helperText="Enter the amount to request for this vendor's wallet"
                        />

                        {/* Summary */}
                        {fundForm.amount && Number(fundForm.amount) > 0 && (
                            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="body2" color="#1e3a8a" fontWeight={700}>
                                    You are requesting {formatCurrency(fundForm.amount)} for {fundWalletVendor?.business_name}'s wallet
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={closeFundWallet} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
                    <Button
                        fullWidth variant="contained"
                        onClick={handleFundWallet}
                        disabled={fundingWallet || !fundForm.amount || Number(fundForm.amount) <= 0}
                        sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, fontWeight: 700 }}
                    >
                        {fundingWallet ? <CircularProgress size={18} color="inherit" /> : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                FUNDING REQUEST SUCCESS MODAL — shows the backend's returned record
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(fundSuccessResult)} onClose={closeFundSuccessResult} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {fundSuccessResult && (
                    <Box>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            px: 3, pt: 4, pb: 3, color: '#fff', textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                                animation: 'popIn 320ms ease',
                            }}>
                                <CheckCircle sx={{ fontSize: 36 }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">Funding Request Submitted</Typography>
                            <Typography variant="body2" sx={{ color: '#bbf7d0', mt: 0.5 }}>
                                {formatCurrency(fundSuccessResult.amount)} requested for {fundSuccessResult.vendor?.business_name}
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={0}>
                                <ResultRow label="Status" value={<Chip label={fundSuccessResult.status} size="small" color={statusColor(fundSuccessResult.status)} />} />
                                <ResultRow label="Amount" value={formatCurrency(fundSuccessResult.amount)} />
                                <ResultRow label="Vendor" value={fundSuccessResult.vendor?.business_name} />
                                <ResultRow label="Vendor Email" value={fundSuccessResult.vendor?.email} />
                                <ResultRow label="Request ID" value={`#${fundSuccessResult.id}`} />
                                <ResultRow
                                    label="Transaction Ref"
                                    value={
                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                            <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>{fundSuccessResult.transaction_ref}</Typography>
                                            <IconButton size="small" onClick={() => copyTransactionRef(fundSuccessResult.transaction_ref)}><ContentCopy sx={{ fontSize: 14 }} /></IconButton>
                                        </Stack>
                                    }
                                />
                                <ResultRow label="Requested At" value={formatDateTime(fundSuccessResult.request_time)} />
                            </Stack>
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="caption" color="primary.main">
                                    This request is now <strong>{fundSuccessResult.status}</strong>. No funds have moved yet — check the Funding Requests page for the latest status.
                                </Typography>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button fullWidth variant="contained" onClick={closeFundSuccessResult} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}>Done</Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                FUNDING REQUESTS PAGE — GET /vendor/request-funding/?request_status=...
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={fundingRequestsOpen} onClose={closeFundingRequests} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2.5, color: '#fff' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <History sx={{ fontSize: 22 }} />
                                <Typography variant="h6" fontWeight={700} color="#fff">Funding Requests</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#93c5fd' }}>All wallet-funding requests submitted across vendors</Typography>
                        </Box>
                        <IconButton onClick={closeFundingRequests} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff' } }}><Close fontSize="small" /></IconButton>
                    </Stack>
                </Box>
                <DialogContent sx={{ p: 3 }}>
                    {fundingRequestsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFundingRequestsError(null)}>{fundingRequestsError}</Alert>}

                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} sm={4}><StatCard title="Total Requests" value={formatNumber(fundingRequests.length)} icon={<ListAlt />} color="primary" /></Grid>
                        <Grid item xs={12} sm={4}><StatCard title="Total Pending" value={formatNumber(fundingRequestStats.pending)} icon={<Receipt />} color="warning" /></Grid>
                        <Grid item xs={12} sm={4}><StatCard title="Total Requested Amount" value={formatCurrency(fundingRequestStats.totalAmount)} icon={<AccountBalance />} color="success" /></Grid>
                    </Grid>

                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                        <Stack sx={{ px: 2, py: 1.5 }} spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight={700}>All Requests</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {fundingRequestsLoading && <CircularProgress size={20} />}
                                    <IconButton size="small" onClick={() => fetchFundingRequests(fundingRequestPage + 1, fundingRequestRowsPerPage)}><Refresh fontSize="small" /></IconButton>
                                </Stack>
                            </Stack>
                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    label="Status"
                                    value={fundingRequestStatus}
                                    onChange={(e) => {
                                        setFundingRequestStatus(e.target.value as any);
                                        setFundingRequestPage(0);
                                    }}
                                >
                                    <MenuItem value="approved">Approved</MenuItem>
                                    <MenuItem value="pending_review">Pending Review</MenuItem>
                                    <MenuItem value="pending_approval">Pending Approval</MenuItem>
                                    <MenuItem value="rejected">Rejected</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                        <Divider />
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ref</TableCell>
                                        <TableCell>Vendor</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Requested</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {fundingRequests.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>{fundingRequestsLoading ? 'Loading…' : 'No funding requests found'}</TableCell></TableRow>
                                    ) : fundingRequests.map(r => (
                                        <TableRow key={r.id} hover>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.transaction_ref.slice(0, 8)}…</Typography>
                                                    <IconButton size="small" onClick={() => copyTransactionRef(r.transaction_ref)}><ContentCopy sx={{ fontSize: 13 }} /></IconButton>
                                                </Stack>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{r.vendor?.business_name}</Typography><Chip label={levelLabel(r.vendor?.hierachy)} size="small" variant="outlined" color={levelColor(r.vendor?.hierachy)} sx={{ height: 18, fontSize: 10, mt: 0.25 }} /></TableCell>
                                            <TableCell>{r.vendor?.email}</TableCell>
                                            <TableCell align="right"><Typography fontWeight={700} color="success.main">{formatCurrency(r.amount)}</Typography></TableCell>
                                            <TableCell><Chip label={r.status} size="small" color={statusColor(r.status)} /></TableCell>
                                            <TableCell>{formatDateTime(r.request_time)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination component="div" count={fundingRequestsCount} page={fundingRequestPage} onPageChange={(_, p) => setFundingRequestPage(p)} rowsPerPage={fundingRequestRowsPerPage} onRowsPerPageChange={e => { setFundingRequestRowsPerPage(Number(e.target.value)); setFundingRequestPage(0); }} rowsPerPageOptions={[5, 8, 12, 20]} />
                        </Box>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button variant="outlined" onClick={closeFundingRequests} sx={{ borderRadius: 2, textTransform: 'none' }}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                CONFIG DRAWER  — PUT /vendor/configure/?vendor_id=X
            ══════════════════════════════════════════════════════════════════ */}
            <Drawer anchor="right" open={Boolean(configVendor)} onClose={closeConfig}
                PaperProps={{ sx: { width: { xs: '100vw', sm: 460 }, borderRadius: '16px 0 0 16px', overflow: 'hidden', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' } }}>
                {configVendor && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <Box sx={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', px: 3, pt: 3, pb: 2, color: '#fff', flexShrink: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="#fff">{configVendor.business_name}</Typography>
                                    <Typography variant="caption" sx={{ color: '#93c5fd' }}>{[configVendor.related_vendor?.business_name, configVendor.business_name].filter(Boolean).join(' › ')}</Typography>
                                    <Box mt={1}>
                                        <Chip label={configVendor.account_status} size="small" sx={{ bgcolor: configVendor.account_status?.toLowerCase() === 'active' ? '#22c55e' : '#f59e0b', color: '#fff', fontWeight: 600, fontSize: 11 }} />
                                        <Chip label={`ID: ${configVendor.id}`} size="small" sx={{ ml: 0.5, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }} />
                                    </Box>
                                </Box>
                                <IconButton onClick={closeConfig} size="small" sx={{ color: '#93c5fd', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}><Close fontSize="small" /></IconButton>
                            </Stack>
                        </Box>

                        {/* Body */}
                        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
                            {/* Backend error */}
                            {configError && (
                                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setConfigError(null)}>
                                    {configError}
                                </Alert>
                            )}
                            {/* Backend success */}
                            {configSuccess && (
                                <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }} onClose={() => setConfigSuccess(null)}>
                                    {configSuccess}
                                </Alert>
                            )}

                            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Transaction Controls</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2.5}>
                                Set limits and commission for this vendor. Leave a field empty to inherit from parent defaults.
                            </Typography>

                            <Stack spacing={2.5}>
                                {/* Commission Rate */}
                                <TextField
                                    fullWidth
                                    label="Commission Rate (%)"
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={configForm.commission_rate}
                                    onChange={e => setConfigForm(p => ({ ...p, commission_rate: e.target.value }))}
                                    sx={inputSx}
                                    helperText="Percentage commission applied to transactions"
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                />

                                <Divider />

                                {/* Funding Cap */}
                                <TextField
                                    fullWidth
                                    label="Funding Cap (₦)"
                                    type="number"
                                    placeholder="e.g. 1000000"
                                    value={configForm.funding_cap}
                                    onChange={e => setConfigForm(p => ({ ...p, funding_cap: e.target.value }))}
                                    sx={inputSx}
                                    helperText="Maximum wallet balance this vendor can hold"
                                    inputProps={{ min: 0 }}
                                />

                                {/* Transaction Max */}
                                <TextField
                                    fullWidth
                                    label="Transaction Max (₦)"
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={configForm.transaction_max}
                                    onChange={e => setConfigForm(p => ({ ...p, transaction_max: e.target.value }))}
                                    sx={inputSx}
                                    helperText="Maximum single transaction value"
                                    inputProps={{ min: 0 }}
                                />

                                {/* Monthly Target */}
                                <TextField
                                    fullWidth
                                    label="Monthly Target (₦)"
                                    type="number"
                                    placeholder="e.g. 2000000"
                                    value={configForm.monthly_target}
                                    onChange={e => setConfigForm(p => ({ ...p, monthly_target: e.target.value }))}
                                    sx={inputSx}
                                    helperText="Monthly transaction volume target"
                                    inputProps={{ min: 0 }}
                                />

                                {/* Current values preview */}
                                <Box sx={{ p: 2, bgcolor: '#f8faff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>CURRENT VALUES ON VENDOR</Typography>
                                    <Grid container spacing={1}>
                                        {[
                                            { label: 'Commission', value: (configVendor as any).commission_rate ? `${(configVendor as any).commission_rate}%` : '—' },
                                            { label: 'Funding Cap', value: (configVendor as any).funding_cap ? formatCurrency((configVendor as any).funding_cap) : '—' },
                                            { label: 'Txn Max', value: (configVendor as any).transaction_max ? formatCurrency((configVendor as any).transaction_max) : '—' },
                                            { label: 'Monthly Target', value: (configVendor as any).monthly_target ? formatCurrency((configVendor as any).monthly_target) : '—' },
                                        ].map(item => (
                                            <Grid item xs={6} key={item.label}>
                                                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                                <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Stack>
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8faff', flexShrink: 0 }}>
                            <Stack direction="row" spacing={1.5}>
                                <Button fullWidth variant="outlined" onClick={closeConfig} sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}>Cancel</Button>
                                <Button
                                    fullWidth variant="contained"
                                    onClick={handleSaveConfig}
                                    disabled={savingConfig || Boolean(configSuccess)}
                                    sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#1e3a8a', fontWeight: 700, '&:hover': { bgcolor: '#1e40af' } }}
                                >
                                    {savingConfig ? <CircularProgress size={18} color="inherit" /> : 'Save Configuration'}
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* ══════════════════════════════════════════════════════════════════
                CONFIG RESULT POPUP — shows exactly what the backend returned
                on submit, whether the configure call succeeded or failed
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(configResultDialog)} onClose={closeConfigResultDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {configResultDialog && (
                    <Box>
                        <Box sx={{
                            background: configResultDialog.success
                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            px: 3, pt: 4, pb: 3, color: '#fff', textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                                animation: 'popIn 320ms ease',
                            }}>
                                {configResultDialog.success ? <CheckCircle sx={{ fontSize: 36 }} /> : <ErrorOutline sx={{ fontSize: 36 }} />}
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">
                                {configResultDialog.success ? 'Configuration Saved' : 'Configuration Failed'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: configResultDialog.success ? '#bbf7d0' : '#fecaca', mt: 0.5 }}>
                                {configResultDialog.message}
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            {configResultDialog.success ? (
                                <Stack spacing={0}>
                                    {configResultDialog.data?.business_name && <ResultRow label="Vendor" value={configResultDialog.data.business_name} />}
                                    {configResultDialog.data?.commission_rate != null && <ResultRow label="Commission Rate" value={`${configResultDialog.data.commission_rate}%`} />}
                                    {configResultDialog.data?.funding_cap != null && <ResultRow label="Funding Cap" value={formatCurrency(configResultDialog.data.funding_cap)} />}
                                    {configResultDialog.data?.transaction_max != null && <ResultRow label="Transaction Max" value={formatCurrency(configResultDialog.data.transaction_max)} />}
                                    {configResultDialog.data?.monthly_target != null && <ResultRow label="Monthly Target" value={formatCurrency(configResultDialog.data.monthly_target)} />}
                                </Stack>
                            ) : (
                                <Box sx={{ p: 1.5, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                                    <Typography variant="body2" color="error.main">
                                        The backend rejected this request. Please review the values and try again.
                                    </Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button
                                fullWidth variant="contained"
                                onClick={closeConfigResultDialog}
                                sx={{
                                    borderRadius: 2, textTransform: 'none', fontWeight: 700,
                                    bgcolor: configResultDialog.success ? '#16a34a' : '#dc2626',
                                    '&:hover': { bgcolor: configResultDialog.success ? '#15803d' : '#b91c1c' },
                                }}
                            >
                                Done
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                DELETE CONFIRMATION — nice customized alert replacing window.confirm
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(deleteConfirmVendor)} onClose={closeDeleteConfirm} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {deleteConfirmVendor && (
                    <Box>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            px: 3, pt: 4, pb: 3, color: '#fff', textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                            }}>
                                <WarningAmber sx={{ fontSize: 36 }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">Delete Vendor?</Typography>
                            <Typography variant="body2" sx={{ color: '#fecaca', mt: 0.5 }}>
                                This action cannot be undone.
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca', mb: 1.5 }}>
                                <Typography variant="body2" color="error.dark">
                                    You are about to permanently delete{' '}
                                    <strong>{deleteConfirmVendor.business_name}</strong>{' '}
                                    (ID: {deleteConfirmVendor.id}). All associated data under this vendor may also be affected.
                                </Typography>
                            </Box>
                            <Stack spacing={0}>
                                <ResultRow label="Business Name" value={deleteConfirmVendor.business_name} />
                                <ResultRow label="Email" value={deleteConfirmVendor.email} />
                                <ResultRow label="Hierarchy" value={<Chip label={levelLabel(deleteConfirmVendor.hierachy)} size="small" color={levelColor(deleteConfirmVendor.hierachy)} variant="outlined" />} />
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button fullWidth variant="outlined" onClick={closeDeleteConfirm} disabled={deletingVendor} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
                            <Button
                                fullWidth variant="contained" color="error"
                                onClick={confirmDeleteVendor}
                                disabled={deletingVendor}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                {deletingVendor ? <CircularProgress size={18} color="inherit" /> : 'Yes, Delete Vendor'}
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                SUSPEND CONFIRMATION — PUT /vendor/suspend-child/
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(suspendConfirmVendor)} onClose={closeSuspendConfirm} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {suspendConfirmVendor && (
                    <Box>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                            px: 3, pt: 4, pb: 3, color: '#fff', textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                            }}>
                                <PauseCircleOutline sx={{ fontSize: 36 }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">Suspend Vendor?</Typography>
                            <Typography variant="body2" sx={{ color: '#fde68a', mt: 0.5 }}>
                                They will lose access until reactivated.
                            </Typography>
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', mb: 1.5 }}>
                                <Typography variant="body2" color="#92400e">
                                    Are you sure you want to suspend{' '}
                                    <strong>{suspendConfirmVendor.business_name}</strong>{' '}
                                    (ID: {suspendConfirmVendor.id})? Their account status will change to <strong>suspended</strong>.
                                </Typography>
                            </Box>
                            <Stack spacing={0}>
                                <ResultRow label="Business Name" value={suspendConfirmVendor.business_name} />
                                <ResultRow label="Email" value={suspendConfirmVendor.email} />
                                <ResultRow label="Current Status" value={<Chip label={suspendConfirmVendor.account_status} size="small" color={statusColor(suspendConfirmVendor.account_status)} />} />
                                <ResultRow label="Hierarchy" value={<Chip label={levelLabel(suspendConfirmVendor.hierachy)} size="small" color={levelColor(suspendConfirmVendor.hierachy)} variant="outlined" />} />
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button fullWidth variant="outlined" onClick={closeSuspendConfirm} disabled={suspendingVendor} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
                            <Button
                                fullWidth variant="contained"
                                onClick={confirmSuspendVendor}
                                disabled={suspendingVendor}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                            >
                                {suspendingVendor ? <CircularProgress size={18} color="inherit" /> : 'Yes, Suspend Vendor'}
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════════
                SUSPEND RESULT POPUP — success (backend data) or failure (reason)
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(suspendResultDialog)} onClose={closeSuspendResultDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                {suspendResultDialog && (
                    <Box>
                        <Box sx={{
                            background: suspendResultDialog.success
                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            px: 3, pt: 4, pb: 3, color: '#fff', textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5,
                                animation: 'popIn 320ms ease',
                            }}>
                                {suspendResultDialog.success ? <CheckCircle sx={{ fontSize: 36 }} /> : <ErrorOutline sx={{ fontSize: 36 }} />}
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">
                                {suspendResultDialog.success ? 'Vendor Suspended' : 'Suspension Failed'}
                            </Typography>
                            {suspendResultDialog.success && (
                                <Typography variant="body2" sx={{ color: '#bbf7d0', mt: 0.5 }}>
                                    {suspendResultDialog.data.business_name} is now suspended
                                </Typography>
                            )}
                        </Box>
                        <DialogContent sx={{ pt: 2.5 }}>
                            {suspendResultDialog.success ? (
                                <Stack spacing={0}>
                                    <ResultRow label="Vendor" value={suspendResultDialog.data.business_name} />
                                    <ResultRow label="Email" value={suspendResultDialog.data.email} />
                                    <ResultRow label="Vendor ID" value={`#${suspendResultDialog.data.id}`} />
                                    <ResultRow
                                        label="Status"
                                        value={<Chip label={suspendResultDialog.data.account_status} size="small" color={statusColor(suspendResultDialog.data.account_status)} />}
                                    />
                                    <ResultRow
                                        label="Hierarchy"
                                        value={<Chip label={levelLabel(suspendResultDialog.data.hierachy)} size="small" color={levelColor(suspendResultDialog.data.hierachy)} variant="outlined" />}
                                    />
                                    {suspendResultDialog.data.wallet && (
                                        <ResultRow label="Wallet Balance" value={formatCurrency(suspendResultDialog.data.wallet.balance)} />
                                    )}
                                </Stack>
                            ) : (
                                <Box sx={{ p: 1.5, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                                    <Typography variant="body2" color="error.main">
                                        {suspendResultDialog.message}
                                    </Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 3 }}>
                            <Button
                                fullWidth variant="contained"
                                onClick={closeSuspendResultDialog}
                                sx={{
                                    borderRadius: 2, textTransform: 'none', fontWeight: 700,
                                    bgcolor: suspendResultDialog.success ? '#16a34a' : '#dc2626',
                                    '&:hover': { bgcolor: suspendResultDialog.success ? '#15803d' : '#b91c1c' },
                                }}
                            >
                                Done
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default VendorManagement;