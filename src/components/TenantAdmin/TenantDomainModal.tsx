import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Stack,
} from '@mui/material';
import { useForm } from 'react-hook-form';

export type TenantDomainFormValues = {
    domain: string;
    isPrimary: boolean;
    isActive: boolean;
};

interface TenantDomainModalProps {
    open: boolean;
    loading?: boolean;
    initialValues?: Partial<TenantDomainFormValues>;
    onClose: () => void;
    onSubmit: (values: TenantDomainFormValues) => Promise<void>;
}

const defaultValues: TenantDomainFormValues = {
    domain: '',
    isPrimary: false,
    isActive: true,
};

const TenantDomainModal: React.FC<TenantDomainModalProps> = ({
    open,
    loading = false,
    initialValues,
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
    } = useForm<TenantDomainFormValues>({
        defaultValues,
    });

    useEffect(() => {
        if (open) {
            setSubmitError(null);
            reset({
                ...defaultValues,
                ...initialValues,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialValues]);

    const handleFormSubmit = async (values: TenantDomainFormValues) => {
        try {
            await onSubmit({
                domain: values.domain.trim(),
                isActive: values.isActive,
                isPrimary: values.isPrimary,
            });
            setSubmitError(null);
            onClose();
        } catch (error: any) {
            console.error('TenantDomainModal: failed to save domain', error);
            const message =
                typeof error === 'string'
                    ? error
                    : error?.message || error?.detail || 'Unable to save domain. Please try again.';
            setSubmitError(message);
        }
    };

    const isPrimary = watch('isPrimary');
    const isActive = watch('isActive');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogContent dividers>
                <form id="tenant-domain-form" onSubmit={handleSubmit(handleFormSubmit)}>
                    <Stack spacing={2}>
                        {submitError && <Alert severity="error">{submitError}</Alert>}
                        <TextField
                            label="Domain"
                            fullWidth
                            {...register('domain', { required: 'Domain is required.' })}
                            error={Boolean(errors.domain)}
                            helperText={errors.domain?.message}
                            autoFocus
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isPrimary}
                                    onChange={(event) => setValue('isPrimary', event.target.checked)}
                                />
                            }
                            label="Primary Domain"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isActive}
                                    onChange={(event) => setValue('isActive', event.target.checked)}
                                />
                            }
                            label="Active"
                        />
                    </Stack>
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    type="submit"
                    form="tenant-domain-form"
                    variant="contained"
                    disabled={loading || isSubmitting}
                >
                    Save Domain
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TenantDomainModal;


