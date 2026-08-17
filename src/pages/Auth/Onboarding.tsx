import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
    Grid, IconButton, Paper, Stack, Step, StepLabel, Stepper, TextField,
    Typography, Alert, Avatar, Dialog, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableHead, TableRow,
    Fade, Tooltip,
} from '@mui/material';
import {
    Business, CheckCircle, ErrorOutline, ArrowForward, ArrowBack,
    Save, Send, AccountBalance, Person, ContactPhone, Description,
    Refresh, Email, Phone, LocationOn, CalendarToday,
    Public, Badge, CreditCard, Add, DeleteOutline,
    PendingActions, HourglassTop, Preview as PreviewIcon,
    Close, Launch,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { onboardingService, extractOnboardingError, OnboardingProfile, OnboardingAgreement, BankAccount, Owner, Contact } from '../../services/onboardingService';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = 'profile' | 'agreement' | 'banks' | 'owners' | 'contacts' | 'review';

interface FormState {
    business_name: string;
    phone_number: string;
    profile: OnboardingProfile;
    agreement: OnboardingAgreement;
    bank_accounts: BankAccount[];
    owners: Owner[];
    contacts: Contact[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm: FormState = {
    business_name: '',
    phone_number: '',
    profile: {
        description: '', industry: '', category: '', registration_number: '',
        cac_registration_number: '', website: '', address: '', city: '',
        state: '', country: '', postal_code: '', domain: '', sub_domain: '',
        slug: '', trial_ends: '',
    },
    agreement: {
        entity_name: '', company_website: '', company_address: '',
        signatory_name: '', signatory_phone_number: '', signatory_email: '',
    },
    bank_accounts: [{ bank_name: '', account_name: '', account_number: '', is_primary: true }],
    owners: [{ name: '', dob: '', nationality: '', id_type: '', id_number: '', address: '' }],
    contacts: [{ name: '', email: '', phone: '', is_primary: true }],
};

const steps: { key: StepKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Business Profile', icon: <Business /> },
    { key: 'agreement', label: 'Agreement', icon: <Description /> },
    { key: 'banks', label: 'Bank Accounts', icon: <AccountBalance /> },
    { key: 'owners', label: 'Owners / Directors', icon: <Person /> },
    { key: 'contacts', label: 'Contacts', icon: <ContactPhone /> },
    { key: 'review', label: 'Review', icon: <PreviewIcon /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <Box mb={2}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        <Divider sx={{ mt: 1 }} />
    </Box>
);

const Field = ({ label, value, onChange, type = 'text', multiline = false, rows = 1, required = false, placeholder = '' }: any) => (
    <TextField
        fullWidth
        label={label}
        type={type}
        value={value || ''}
        onChange={onChange}
        multiline={multiline}
        rows={rows}
        required={required}
        placeholder={placeholder}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}
        margin="normal"
        size="small"
    />
);

/** Response modal for success / error / info */
const ResponseModal = ({
    open, onClose, type, title, message, details, actions
}: {
    open: boolean; onClose: () => void; type: 'success' | 'error' | 'info';
    title: string; message: string; details?: React.ReactNode; actions?: React.ReactNode;
}) => {
    const colors = {
        success: { bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', icon: <CheckCircle sx={{ fontSize: 40, color: '#fff' }} /> },
        error: { bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', icon: <ErrorOutline sx={{ fontSize: 40, color: '#fff' }} /> },
        info: { bg: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', icon: <PendingActions sx={{ fontSize: 40, color: '#fff' }} /> },
    };
    const c = colors[type];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <Box sx={{ background: c.bg, px: 3, pt: 4, pb: 3, textAlign: 'center', position: 'relative' }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    {c.icon}
                </Box>
                <Typography variant="h6" fontWeight={800} color="#fff">{title}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>{message}</Typography>
            </Box>
            <DialogContent sx={{ pt: 3 }}>
                {details}
            </DialogContent>
            {actions && <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>{actions}</DialogActions>}
        </Dialog>
    );
};

/** Preview row for the review modal */
const PreviewRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.8, borderBottom: '1px solid #f1f5f9' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-all' }}>{value || '—'}</Typography>
    </Stack>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [modal, setModal] = useState<{ open: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; details?: React.ReactNode }>({
        open: false, type: 'info', title: '', message: '',
    });

    const [onboardingStatus, setOnboardingStatus] = useState<string>('');

    // ── Build complete payload ───────────────────────────────────────────────
    // ── Helper: omit empty strings from date fields ─────────────────────────────
const cleanDate = (v: string | undefined) => v?.trim() || undefined;

const buildPayload = useCallback(() => ({
    business_name: form.business_name,
    phone_number: form.phone_number,
    profile: {
        description: form.profile.description,
        industry: form.profile.industry,
        category: form.profile.category,
        registration_number: form.profile.registration_number,
        cac_registration_number: form.profile.cac_registration_number,
        website: form.profile.website,
        address: form.profile.address,
        city: form.profile.city,
        state: form.profile.state,
        country: form.profile.country,
        postal_code: form.profile.postal_code,
        domain: form.profile.domain,
        sub_domain: form.profile.sub_domain,
        slug: form.profile.slug,
        trial_ends: cleanDate(form.profile.trial_ends),
    },
    agreement: {
        entity_name: form.agreement.entity_name,
        company_website: form.agreement.company_website,
        company_address: form.agreement.company_address,
        signatory_name: form.agreement.signatory_name,
        signatory_phone_number: form.agreement.signatory_phone_number,
        signatory_email: form.agreement.signatory_email,
    },
    bank_accounts: form.bank_accounts.map(b => ({
        bank_name: b.bank_name,
        account_name: b.account_name,
        account_number: b.account_number,
        is_primary: b.is_primary,
    })),
    owners: form.owners.map(o => ({
        name: o.name,
        dob: cleanDate(o.dob),
        nationality: o.nationality,
        id_type: o.id_type,
        id_number: o.id_number,
        address: o.address,
    })),
    contacts: form.contacts.map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        is_primary: c.is_primary,
    })),
}), [form]);

    // ── Load existing data ───────────────────────────────────────────────────
    const fetchOnboarding = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [data, status] = await Promise.all([
                onboardingService.getOnboarding(),
                onboardingService.getStatus(),
            ]);

            setOnboardingStatus(status.onboarding_status);

            const isDone = ((status.is_complete === true || status.is_complete === 'true') &&
                ['approved', 'completed', 'active'].includes(status.onboarding_status?.toLowerCase()));
            if (isDone) {
                navigate('/tenants/dashboard');
                return;
            }

            setForm(prev => ({
                ...prev,
                business_name: data.business_name || prev.business_name,
                phone_number: data.phone_number || prev.phone_number,
                profile: { ...prev.profile, ...(data.profile as OnboardingProfile || {}) },
                agreement: { ...prev.agreement, ...(data.agreement as OnboardingAgreement || {}) },
                bank_accounts: data.bank_accounts?.length ? data.bank_accounts : prev.bank_accounts,
                owners: data.owners?.length ? data.owners : prev.owners,
                contacts: data.contacts?.length ? data.contacts : prev.contacts,
            }));
        } catch (err: any) {
            setError(extractOnboardingError(err));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchOnboarding(); }, [fetchOnboarding]);

    // ── Poll status if pending ────────────────────────────────────────────────
    useEffect(() => {
        if (!['submitted', 'pending_review', 'pending', 'under_review'].some(s => onboardingStatus.toLowerCase().includes(s))) return;

        const interval = setInterval(async () => {
            try {
                const status = await onboardingService.getStatus();
                setOnboardingStatus(status.onboarding_status);
                const isDone = status.is_complete === true || status.is_complete === 'true' ||
                    ['approved', 'completed', 'active'].includes(status.onboarding_status?.toLowerCase());
                if (isDone) {
                    setModal({
                        open: true, type: 'success',
                        title: 'Onboarding Approved!',
                        message: 'Your KYC has been reviewed and approved. Welcome aboard.',
                    });
                    setTimeout(() => navigate('/tenants/dashboard'), 2500);
                }
            } catch { /* silent poll */ }
        }, 10000);

        return () => clearInterval(interval);
    }, [onboardingStatus, navigate]);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));
    const updateProfile = (patch: Partial<OnboardingProfile>) => setForm(prev => ({ ...prev, profile: { ...prev.profile, ...patch } }));
    const updateAgreement = (patch: Partial<OnboardingAgreement>) => setForm(prev => ({ ...prev, agreement: { ...prev.agreement, ...patch } }));

    const updateArrayItem = <T,>(array: T[], index: number, patch: Partial<T>): T[] => {
        const next = [...array];
        next[index] = { ...next[index], ...patch };
        return next;
    };

    // ── Save & Continue Later (PUT) ───────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true); setError(null);
        try {
            await onboardingService.updateOnboarding(buildPayload());
            setModal({
                open: true, type: 'success',
                title: 'Progress Saved',
                message: 'Your onboarding information has been saved. You can continue later.',
            });
        } catch (err: any) {
            const msg = extractOnboardingError(err);
            setError(msg);
            setModal({ open: true, type: 'error', title: 'Save Failed', message: msg });
        } finally {
            setSaving(false);
        }
    };

    // ── Preview: save then open preview modal ─────────────────────────────────
    const handlePreview = async () => {
        setPreviewLoading(true); setError(null);
        try {
            await onboardingService.updateOnboarding(buildPayload());
            setPreviewOpen(true);
        } catch (err: any) {
            const msg = extractOnboardingError(err);
            setError(msg);
            setModal({ open: true, type: 'error', title: 'Save Failed', message: msg });
        } finally {
            setPreviewLoading(false);
        }
    };

    // ── Submit (POST) ─────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitting(true); setError(null);
        try {
            const result = await onboardingService.submitOnboarding();
            setPreviewOpen(false);
            setModal({
                open: true, type: 'success',
                title: 'Onboarding Submitted Successfully',
                message: `Your KYC has been submitted for review. Current status: ${result.onboarding_status}.`,
                details: (
                    <Stack spacing={1.5} mt={1}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                            <Stack spacing={0.5}>
                                <Typography variant="body2" fontWeight={700} color="success.main">{result.business_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{result.email}</Typography>
                                <Typography variant="caption" color="text.secondary">Status: <Chip label={result.onboarding_status} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} /></Typography>
                            </Stack>
                        </Paper>
                        {result.kyc_rejection_reason && (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                Note: {result.kyc_rejection_reason}
                            </Alert>
                        )}
                    </Stack>
                ),
            });
            setOnboardingStatus(result.onboarding_status);
        } catch (err: any) {
            const msg = extractOnboardingError(err);
            setError(msg);
            setModal({
                open: true, type: 'error',
                title: 'Submission Failed',
                message: msg || 'We could not submit your onboarding. Please review the required fields and try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Step navigation ─────────────────────────────────────────────────────
    const handleNext = () => {
        if (activeStep < steps.length - 1) setActiveStep(s => s + 1);
    };
    const handleBack = () => {
        if (activeStep > 0) setActiveStep(s => s - 1);
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={40} sx={{ color: '#1e3a8a' }} />
                    <Typography color="text.secondary">Loading your onboarding profile…</Typography>
                </Stack>
            </Box>
        );
    }

    const isPending = ['submitted', 'pending_review', 'pending', 'under_review'].some(s => onboardingStatus.toLowerCase().includes(s));
    if (isPending) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', p: { xs: 2, md: 4 } }}>
                <Stack maxWidth={720} mx="auto" spacing={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: 'warning.light', color: 'warning.main', mx: 'auto', mb: 2 }}>
                                <HourglassTop sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography variant="h5" fontWeight={800} gutterBottom>Onboarding Under Review</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
                                Your KYC has been submitted and is currently being reviewed by our team.
                                You will be redirected to the dashboard once approved.
                            </Typography>
                            <Chip label={onboardingStatus.toUpperCase()} color="warning" sx={{ mt: 2, fontWeight: 800, px: 1 }} />
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Submitted Information</Typography>
                            <Stack spacing={1.5}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Business color="primary" />
                                        <Box>
                                            <Typography variant="body2" fontWeight={700}>{form.business_name || 'Not provided'}</Typography>
                                            <Typography variant="caption" color="text.secondary">Business Name</Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Email color="primary" />
                                        <Box>
                                            <Typography variant="body2" fontWeight={700}>{form.contacts[0]?.email || 'Not provided'}</Typography>
                                            <Typography variant="caption" color="text.secondary">Primary Contact Email</Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <AccountBalance color="primary" />
                                        <Box>
                                            <Typography variant="body2" fontWeight={700}>{form.bank_accounts[0]?.bank_name || 'Not provided'}</Typography>
                                            <Typography variant="caption" color="text.secondary">Primary Bank</Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Stack>
                            <Button
                                fullWidth variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchOnboarding}
                                disabled={checkingStatus}
                                sx={{ mt: 3, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                {checkingStatus ? <CircularProgress size={18} /> : 'Check Status Again'}
                            </Button>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
        );
    }

    // ── Form rendering ────────────────────────────────────────────────────────
    const renderStepContent = () => {
        switch (steps[activeStep].key) {
            case 'profile':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Business Profile" subtitle="Tell us about your organisation. All fields help us verify your business." />
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Field label="Business Name" value={form.business_name} onChange={(e: any) => updateForm({ business_name: e.target.value })} required />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Phone Number" value={form.phone_number} onChange={(e: any) => updateForm({ phone_number: e.target.value })} required />
                                </Grid>
                                <Grid item xs={12}>
                                    <Field label="Description" value={form.profile.description} onChange={(e: any) => updateProfile({ description: e.target.value })} multiline rows={3} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Industry" value={form.profile.industry} onChange={(e: any) => updateProfile({ industry: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Category" value={form.profile.category} onChange={(e: any) => updateProfile({ category: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Registration Number" value={form.profile.registration_number} onChange={(e: any) => updateProfile({ registration_number: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="CAC Registration Number" value={form.profile.cac_registration_number} onChange={(e: any) => updateProfile({ cac_registration_number: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Website" value={form.profile.website} onChange={(e: any) => updateProfile({ website: e.target.value })} placeholder="https://..." />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Field label="Trial Ends" type="date" value={form.profile.trial_ends} onChange={(e: any) => updateProfile({ trial_ends: e.target.value })} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Field label="Address" value={form.profile.address} onChange={(e: any) => updateProfile({ address: e.target.value })} multiline rows={2} />
                                </Grid>
                                <Grid item xs={12} md={4}><Field label="City" value={form.profile.city} onChange={(e: any) => updateProfile({ city: e.target.value })} /></Grid>
                                <Grid item xs={12} md={4}><Field label="State" value={form.profile.state} onChange={(e: any) => updateProfile({ state: e.target.value })} /></Grid>
                                <Grid item xs={12} md={4}><Field label="Country" value={form.profile.country} onChange={(e: any) => updateProfile({ country: e.target.value })} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Postal Code" value={form.profile.postal_code} onChange={(e: any) => updateProfile({ postal_code: e.target.value })} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Slug" value={form.profile.slug} onChange={(e: any) => updateProfile({ slug: e.target.value })} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Domain" value={form.profile.domain} onChange={(e: any) => updateProfile({ domain: e.target.value })} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Sub Domain" value={form.profile.sub_domain} onChange={(e: any) => updateProfile({ sub_domain: e.target.value })} /></Grid>
                            </Grid>
                        </Box>
                    </Fade>
                );

            case 'agreement':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Agreement Details" subtitle="Legal entity and signatory information." />
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}><Field label="Entity Name" value={form.agreement.entity_name} onChange={(e: any) => updateAgreement({ entity_name: e.target.value })} required /></Grid>
                                <Grid item xs={12} md={6}><Field label="Company Website" value={form.agreement.company_website} onChange={(e: any) => updateAgreement({ company_website: e.target.value })} /></Grid>
                                <Grid item xs={12}><Field label="Company Address" value={form.agreement.company_address} onChange={(e: any) => updateAgreement({ company_address: e.target.value })} multiline rows={2} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Signatory Name" value={form.agreement.signatory_name} onChange={(e: any) => updateAgreement({ signatory_name: e.target.value })} required /></Grid>
                                <Grid item xs={12} md={6}><Field label="Signatory Phone" value={form.agreement.signatory_phone_number} onChange={(e: any) => updateAgreement({ signatory_phone_number: e.target.value })} /></Grid>
                                <Grid item xs={12} md={6}><Field label="Signatory Email" value={form.agreement.signatory_email} onChange={(e: any) => updateAgreement({ signatory_email: e.target.value })} /></Grid>
                            </Grid>
                        </Box>
                    </Fade>
                );

            case 'banks':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Bank Accounts" subtitle="Add at least one bank account. Mark one as primary." />
                            <Stack spacing={2}>
                                {form.bank_accounts.map((bank, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: 'relative' }}>
                                        {form.bank_accounts.length > 1 && (
                                            <IconButton size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                                                onClick={() => setForm(prev => ({ ...prev, bank_accounts: prev.bank_accounts.filter((_, i) => i !== idx) }))}>
                                                <DeleteOutline />
                                            </IconButton>
                                        )}
                                        <Chip label={`Account ${idx + 1}`} size="small" sx={{ mb: 1 }} color={bank.is_primary ? 'primary' : 'default'} />
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={4}><Field label="Bank Name" value={bank.bank_name} onChange={(e: any) => setForm(prev => ({ ...prev, bank_accounts: updateArrayItem(prev.bank_accounts, idx, { bank_name: e.target.value }) }))} required /></Grid>
                                            <Grid item xs={12} md={4}><Field label="Account Name" value={bank.account_name} onChange={(e: any) => setForm(prev => ({ ...prev, bank_accounts: updateArrayItem(prev.bank_accounts, idx, { account_name: e.target.value }) }))} required /></Grid>
                                            <Grid item xs={12} md={4}><Field label="Account Number" value={bank.account_number} onChange={(e: any) => setForm(prev => ({ ...prev, bank_accounts: updateArrayItem(prev.bank_accounts, idx, { account_number: e.target.value }) }))} required /></Grid>
                                        </Grid>
                                        <Box mt={1}>
                                            <Button size="small" variant={bank.is_primary ? 'contained' : 'outlined'} onClick={() => {
                                                setForm(prev => ({ ...prev, bank_accounts: prev.bank_accounts.map((b, i) => ({ ...b, is_primary: i === idx })) }));
                                            }}>Primary</Button>
                                        </Box>
                                    </Paper>
                                ))}
                                <Button startIcon={<Add />} variant="outlined" onClick={() => setForm(prev => ({ ...prev, bank_accounts: [...prev.bank_accounts, { bank_name: '', account_name: '', account_number: '', is_primary: false }] }))} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                    Add Another Bank Account
                                </Button>
                            </Stack>
                        </Box>
                    </Fade>
                );

            case 'owners':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Owners / Directors" subtitle="Provide details of business owners or directors." />
                            <Stack spacing={2}>
                                {form.owners.map((owner, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: 'relative' }}>
                                        {form.owners.length > 1 && (
                                            <IconButton size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                                                onClick={() => setForm(prev => ({ ...prev, owners: prev.owners.filter((_, i) => i !== idx) }))}>
                                                <DeleteOutline />
                                            </IconButton>
                                        )}
                                        <Chip label={`Owner ${idx + 1}`} size="small" sx={{ mb: 1 }} />
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}><Field label="Full Name" value={owner.name} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { name: e.target.value }) }))} required /></Grid>
                                            <Grid item xs={12} md={6}><Field label="Date of Birth" type="date" value={owner.dob} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { dob: e.target.value }) }))} /></Grid>
                                            <Grid item xs={12} md={6}><Field label="Nationality" value={owner.nationality} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { nationality: e.target.value }) }))} /></Grid>
                                            <Grid item xs={12} md={6}><Field label="ID Type" value={owner.id_type} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { id_type: e.target.value }) }))} /></Grid>
                                            <Grid item xs={12} md={6}><Field label="ID Number" value={owner.id_number} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { id_number: e.target.value }) }))} /></Grid>
                                            <Grid item xs={12}><Field label="Address" value={owner.address} onChange={(e: any) => setForm(prev => ({ ...prev, owners: updateArrayItem(prev.owners, idx, { address: e.target.value }) }))} multiline rows={2} /></Grid>
                                        </Grid>
                                    </Paper>
                                ))}
                                <Button startIcon={<Add />} variant="outlined" onClick={() => setForm(prev => ({ ...prev, owners: [...prev.owners, { name: '', dob: '', nationality: '', id_type: '', id_number: '', address: '' }] }))} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                    Add Another Owner
                                </Button>
                            </Stack>
                        </Box>
                    </Fade>
                );

            case 'contacts':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Contacts" subtitle="Primary and secondary contact persons." />
                            <Stack spacing={2}>
                                {form.contacts.map((contact, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: 'relative' }}>
                                        {form.contacts.length > 1 && (
                                            <IconButton size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                                                onClick={() => setForm(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) }))}>
                                                <DeleteOutline />
                                            </IconButton>
                                        )}
                                        <Chip label={`Contact ${idx + 1}`} size="small" sx={{ mb: 1 }} color={contact.is_primary ? 'primary' : 'default'} />
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={4}><Field label="Name" value={contact.name} onChange={(e: any) => setForm(prev => ({ ...prev, contacts: updateArrayItem(prev.contacts, idx, { name: e.target.value }) }))} required /></Grid>
                                            <Grid item xs={12} md={4}><Field label="Email" value={contact.email} onChange={(e: any) => setForm(prev => ({ ...prev, contacts: updateArrayItem(prev.contacts, idx, { email: e.target.value }) }))} /></Grid>
                                            <Grid item xs={12} md={4}><Field label="Phone" value={contact.phone} onChange={(e: any) => setForm(prev => ({ ...prev, contacts: updateArrayItem(prev.contacts, idx, { phone: e.target.value }) }))} /></Grid>
                                        </Grid>
                                        <Box mt={1}>
                                            <Button size="small" variant={contact.is_primary ? 'contained' : 'outlined'} onClick={() => {
                                                setForm(prev => ({ ...prev, contacts: prev.contacts.map((c, i) => ({ ...c, is_primary: i === idx })) }));
                                            }}>Primary</Button>
                                        </Box>
                                    </Paper>
                                ))}
                                <Button startIcon={<Add />} variant="outlined" onClick={() => setForm(prev => ({ ...prev, contacts: [...prev.contacts, { name: '', email: '', phone: '', is_primary: false }] }))} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                    Add Another Contact
                                </Button>
                            </Stack>
                        </Box>
                    </Fade>
                );

            case 'review':
                return (
                    <Fade in>
                        <Box>
                            <SectionTitle title="Review" subtitle="Quick summary of your entries. Click Preview to see everything and submit." />
                            <Stack spacing={2}>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Business</Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Name</Typography><Typography fontWeight={600}>{form.business_name || '—'}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">Phone</Typography><Typography fontWeight={600}>{form.phone_number || '—'}</Typography></Grid>
                                    </Grid>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Bank Accounts ({form.bank_accounts.length})</Typography>
                                    {form.bank_accounts.map((b, i) => (
                                        <Box key={i} mb={0.5}>
                                            <Typography variant="body2">{b.bank_name} — {b.account_number} {b.is_primary && <Chip label="Primary" size="small" color="primary" sx={{ height: 20, ml: 1 }} />}</Typography>
                                        </Box>
                                    ))}
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Owners ({form.owners.length}) & Contacts ({form.contacts.length})</Typography>
                                    <Typography variant="body2">{form.owners.map(o => o.name).filter(Boolean).join(', ') || '—'}</Typography>
                                </Paper>
                            </Stack>
                        </Box>
                    </Fade>
                );
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', py: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
            <Stack maxWidth={960} mx="auto" spacing={3}>
                {/* Header */}
                <Card sx={{ borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                            <Box>
                                <Typography variant="h5" fontWeight={800}>Vendor Onboarding</Typography>
                                <Typography variant="body2" color="text.secondary">Complete your KYC to access the dashboard.</Typography>
                            </Box>
                            <Chip
                                icon={<PendingActions />}
                                label={`Step ${activeStep + 1} of ${steps.length}`}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                            />
                        </Stack>
                        <Stepper activeStep={activeStep} sx={{ mt: 3 }} alternativeLabel>
                            {steps.map((s) => (
                                <Step key={s.key}>
                                    <StepLabel StepIconComponent={() => (
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: activeStep >= steps.indexOf(s) ? 'primary.main' : 'grey.300', color: '#fff' }}>
                                            {s.icon}
                                        </Avatar>
                                    )}>
                                        <Typography variant="caption" fontWeight={700}>{s.label}</Typography>
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </CardContent>
                </Card>

                {error && <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                {/* Form Card */}
                <Card sx={{ borderRadius: 3, minHeight: 400 }}>
                    <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                        {renderStepContent()}
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card sx={{ borderRadius: 3, position: 'sticky', bottom: 16, zIndex: 10 }}>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBack />}
                                onClick={handleBack}
                                disabled={activeStep === 0}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                Back
                            </Button>

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    variant="outlined"
                                    startIcon={<Save />}
                                    onClick={handleSave}
                                    disabled={saving}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                                >
                                    {saving ? <CircularProgress size={18} /> : 'Save & Continue Later'}
                                </Button>

                                {activeStep === steps.length - 1 ? (
                                    <Button
                                        variant="contained"
                                        endIcon={<PreviewIcon />}
                                        onClick={handlePreview}
                                        disabled={previewLoading}
                                        sx={{
                                            borderRadius: 2, textTransform: 'none', fontWeight: 700,
                                            bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, px: 4
                                        }}
                                    >
                                        {previewLoading ? <CircularProgress size={18} color="inherit" /> : 'Preview'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        endIcon={<ArrowForward />}
                                        onClick={handleNext}
                                        sx={{
                                            borderRadius: 2, textTransform: 'none', fontWeight: 700,
                                            bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' }, px: 4
                                        }}
                                    >
                                        Next Step
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>

            {/* ═══════════════════════════════════════════════════════════════════
                FULL PREVIEW MODAL — appears after clicking Preview
            ═══════════════════════════════════════════════════════════════════ */}
            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="md"
                fullWidth
                scroll="paper"
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '90vh' } }}
            >
                {/* Header */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                    px: 3, pt: 3, pb: 2.5, color: '#fff', position: 'relative'
                }}>
                    <IconButton
                        onClick={() => setPreviewOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', top: 12, right: 12, color: '#93c5fd', '&:hover': { color: '#fff' } }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                        <PreviewIcon sx={{ fontSize: 26 }} />
                        <Typography variant="h6" fontWeight={800}>Preview Your Onboarding</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#93c5fd' }}>
                        Review every detail before final submission. You can go back to edit if needed.
                    </Typography>
                </Box>

                <DialogContent dividers sx={{ p: 0 }}>
                    <Box sx={{ p: { xs: 2, md: 4 } }}>
                        {/* Business Profile */}
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, bgcolor: '#f8faff' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 36, height: 36 }}><Business fontSize="small" /></Avatar>
                                <Typography variant="subtitle1" fontWeight={800} color="primary">Business Profile</Typography>
                            </Stack>
                            <Grid container spacing={0}>
                                <Grid item xs={12} md={6}><PreviewRow label="Business Name" value={form.business_name} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Phone Number" value={form.phone_number} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Industry" value={form.profile.industry} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Category" value={form.profile.category} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Registration Number" value={form.profile.registration_number} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="CAC Reg. Number" value={form.profile.cac_registration_number} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Website" value={form.profile.website} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Trial Ends" value={form.profile.trial_ends} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Domain" value={form.profile.domain} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Sub Domain" value={form.profile.sub_domain} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Slug" value={form.profile.slug} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Postal Code" value={form.profile.postal_code} /></Grid>
                                <Grid item xs={12}><PreviewRow label="Address" value={form.profile.address} /></Grid>
                                <Grid item xs={12} md={4}><PreviewRow label="City" value={form.profile.city} /></Grid>
                                <Grid item xs={12} md={4}><PreviewRow label="State" value={form.profile.state} /></Grid>
                                <Grid item xs={12} md={4}><PreviewRow label="Country" value={form.profile.country} /></Grid>
                                <Grid item xs={12}><PreviewRow label="Description" value={form.profile.description} /></Grid>
                            </Grid>
                        </Paper>

                        {/* Agreement */}
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, bgcolor: '#f8faff' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 36, height: 36 }}><Description fontSize="small" /></Avatar>
                                <Typography variant="subtitle1" fontWeight={800} color="success.main">Agreement Details</Typography>
                            </Stack>
                            <Grid container spacing={0}>
                                <Grid item xs={12} md={6}><PreviewRow label="Entity Name" value={form.agreement.entity_name} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Company Website" value={form.agreement.company_website} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Signatory Name" value={form.agreement.signatory_name} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Signatory Phone" value={form.agreement.signatory_phone_number} /></Grid>
                                <Grid item xs={12} md={6}><PreviewRow label="Signatory Email" value={form.agreement.signatory_email} /></Grid>
                                <Grid item xs={12}><PreviewRow label="Company Address" value={form.agreement.company_address} /></Grid>
                            </Grid>
                        </Paper>

                        {/* Bank Accounts */}
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, bgcolor: '#f8faff' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main', width: 36, height: 36 }}><AccountBalance fontSize="small" /></Avatar>
                                <Typography variant="subtitle1" fontWeight={800} color="warning.main">Bank Accounts ({form.bank_accounts.length})</Typography>
                            </Stack>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Bank Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Account Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Account Number</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Primary</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {form.bank_accounts.map((b, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{b.bank_name || '—'}</TableCell>
                                                <TableCell>{b.account_name || '—'}</TableCell>
                                                <TableCell>{b.account_number || '—'}</TableCell>
                                                <TableCell>{b.is_primary ? <Chip label="Yes" size="small" color="primary" sx={{ height: 20 }} /> : 'No'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>

                        {/* Owners */}
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3, bgcolor: '#f8faff' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 36, height: 36 }}><Person fontSize="small" /></Avatar>
                                <Typography variant="subtitle1" fontWeight={800} color="info.main">Owners / Directors ({form.owners.length})</Typography>
                            </Stack>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>DOB</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Nationality</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>ID Type</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>ID Number</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {form.owners.map((o, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{o.name || '—'}</TableCell>
                                                <TableCell>{o.dob || '—'}</TableCell>
                                                <TableCell>{o.nationality || '—'}</TableCell>
                                                <TableCell>{o.id_type || '—'}</TableCell>
                                                <TableCell>{o.id_number || '—'}</TableCell>
                                                <TableCell>{o.address || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>

                        {/* Contacts */}
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2, bgcolor: '#f8faff' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 36, height: 36 }}><ContactPhone fontSize="small" /></Avatar>
                                <Typography variant="subtitle1" fontWeight={800} color="secondary.main">Contacts ({form.contacts.length})</Typography>
                            </Stack>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Primary</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {form.contacts.map((c, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{c.name || '—'}</TableCell>
                                                <TableCell>{c.email || '—'}</TableCell>
                                                <TableCell>{c.phone || '—'}</TableCell>
                                                <TableCell>{c.is_primary ? <Chip label="Yes" size="small" color="primary" sx={{ height: 20 }} /> : 'No'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, bgcolor: '#fff' }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={() => setPreviewOpen(false)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                        Go Back & Edit
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        endIcon={<Send />}
                        onClick={handleSubmit}
                        disabled={submitting}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 700,
                            bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, px: 4
                        }}
                    >
                        {submitting ? <CircularProgress size={18} color="inherit" /> : 'Submit Onboarding'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Response Modal */}
            <ResponseModal
                open={modal.open}
                onClose={() => setModal(m => ({ ...m, open: false }))}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                details={modal.details}
                actions={
                    modal.type === 'error' ? (
                        <>
                            <Button fullWidth variant="outlined" onClick={() => setModal(m => ({ ...m, open: false }))} sx={{ borderRadius: 2, textTransform: 'none' }}>Close</Button>
                            <Button fullWidth variant="contained" onClick={() => setModal(m => ({ ...m, open: false }))} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#dc2626' }}>Try Again</Button>
                        </>
                    ) : (
                        <Button fullWidth variant="contained" onClick={() => setModal(m => ({ ...m, open: false }))} sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#16a34a' }}>Okay</Button>
                    )
                }
            />
        </Box>
    );
};

export default Onboarding;