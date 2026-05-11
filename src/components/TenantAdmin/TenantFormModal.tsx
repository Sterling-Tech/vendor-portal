import React, { useEffect } from 'react';
import {
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    FormControlLabel,
    Switch,
    Typography,
    Stack,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

export type TenantFormValues = {
    name: string;
    slug?: string;
    domain: string;
    subdomain?: string;
    isTrial: boolean;
    trialEndsAt?: string | null;
    isActive: boolean;
    adminEmail?: string;
    adminPassword?: string;
};

interface TenantFormModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    loading?: boolean;
    initialValues?: Partial<TenantFormValues>;
    submitDisabled?: boolean;
    submitDisabledMessage?: string;
    onClose: () => void;
    onSubmit: (values: TenantFormValues) => Promise<void>;
}

const defaultValues: TenantFormValues = {
    name: '',
    slug: '',
    domain: '',
    subdomain: '',
    isTrial: true,
    trialEndsAt: '',
    isActive: true,
    adminEmail: '',
    adminPassword: '',
};

const TenantFormModal: React.FC<TenantFormModalProps> = ({
    open,
    mode,
    loading = false,
    initialValues,
    submitDisabled = false,
    submitDisabledMessage,
    onClose,
    onSubmit,
}) => {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TenantFormValues>({
        defaultValues,
    });

    useEffect(() => {
        if (open) {
            setSubmitError(null);
            reset({
                ...defaultValues,
                ...initialValues,
                isTrial: initialValues?.isTrial ?? initialValues?.isTrial ?? true,
                isActive: initialValues?.isActive ?? true,
                trialEndsAt: initialValues?.trialEndsAt ?? '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialValues]);

    const handleFormSubmit = async (values: TenantFormValues) => {
        const payload: TenantFormValues = {
            ...values,
            name: values.name.trim(),
            domain: values.domain.trim(),
            slug: values.slug?.trim(),
            subdomain: values.subdomain?.trim(),
            adminEmail: values.adminEmail?.trim(),
        };

        if (!payload.slug) {
            payload.slug = payload.name.toLowerCase().replace(/\s+/g, '-');
        }

        if (!payload.isTrial) {
            payload.trialEndsAt = null;
        }

        try {
            await onSubmit(payload);
            setSubmitError(null);
            onClose();
        } catch (error: any) {
            console.error('TenantFormModal: failed to submit tenant form', error);
            const message =
                typeof error === 'string'
                    ? error
                    : error?.message || error?.detail || 'Unable to save tenant. Please try again.';
            setSubmitError(message);
        }
    };

    const isTrial = watch('isTrial');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? 'Create Tenant' : 'Edit Tenant'}</DialogTitle>
            <DialogContent dividers>
                <form id="tenant-form-modal" onSubmit={handleSubmit(handleFormSubmit)}>
                    <Stack spacing={2}>
                        {submitDisabled && submitDisabledMessage && (
                            <Alert severity="info">{submitDisabledMessage}</Alert>
                        )}
                        {submitError && <Alert severity="error">{submitError}</Alert>}
                        <TextField
                            label="Tenant Name"
                            fullWidth
                            {...register('name', { required: 'Tenant name is required.' })}
                            error={Boolean(errors.name)}
                            helperText={errors.name?.message}
                            autoFocus
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Domain"
                                    fullWidth
                                    {...register('domain', { required: 'Domain is required.' })}
                                    error={Boolean(errors.domain)}
                                    helperText={errors.domain?.message}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Subdomain"
                                    fullWidth
                                    {...register('subdomain')}
                                />
                            </Grid>
                        </Grid>
                        <TextField label="Slug" fullWidth {...register('slug')} helperText="Auto-generated if left blank." />
                        <FormControlLabel
                            control={
                                <Switch
                                    color="primary"
                                    checked={watch('isActive')}
                                    onChange={(event) => setValue('isActive', event.target.checked)}
                                />
                            }
                            label="Active Tenant"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    color="primary"
                                    checked={isTrial}
                                    onChange={(event) => setValue('isTrial', event.target.checked)}
                                />
                            }
                            label="Trial Tenant"
                        />
                        <TextField
                            label="Trial Ends"
                            type="date"
                            fullWidth
                            disabled={!isTrial}
                            {...register('trialEndsAt')}
                            InputLabelProps={{ shrink: true }}
                            helperText={isTrial ? 'Optional: choose when the trial expires.' : 'Disabled when tenant is not on trial.'}
                        />
                        {mode === 'create' && (
                            <Stack spacing={2}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Create an optional tenant admin user with immediate access.
                                </Typography>
                                <TextField
                                    label="Admin Email"
                                    type="email"
                                    fullWidth
                                    {...register('adminEmail', {
                                        validate: (value) =>
                                            !value || /\S+@\S+\.\S+/.test(value) || 'Please enter a valid email address.',
                                    })}
                                    error={Boolean(errors.adminEmail)}
                                    helperText={errors.adminEmail?.message || 'Optional'}
                                />
                                <TextField
                                    label="Admin Password"
                                    type="password"
                                    fullWidth
                                    {...register('adminPassword', {
                                        validate: (value) => {
                                            if (!value && watch('adminEmail')) {
                                                return 'Password is required when admin email is provided.';
                                            }
                                            return true;
                                        },
                                    })}
                                    error={Boolean(errors.adminPassword)}
                                    helperText={errors.adminPassword?.message || 'Required if admin email is provided'}
                                />
                            </Stack>
                        )}
                    </Stack>
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    type="submit"
                    form="tenant-form-modal"
                    variant="contained"
                    disabled={loading || isSubmitting || submitDisabled}
                >
                    {mode === 'create' ? 'Create Tenant' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TenantFormModal;


