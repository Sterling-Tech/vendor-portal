import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    FormControlLabel,
    Switch,
    Stack,
} from '@mui/material';
import { useForm } from 'react-hook-form';

export type TenantUserRoleFormValues = {
    role: string;
    isTenantAdmin: boolean;
    isActive: boolean;
};

interface TenantUserRoleModalProps {
    open: boolean;
    loading?: boolean;
    initialValues?: Partial<TenantUserRoleFormValues>;
    availableRoles?: string[];
    onClose: () => void;
    onSubmit: (values: TenantUserRoleFormValues) => Promise<void>;
}

const defaultValues: TenantUserRoleFormValues = {
    role: 'member',
    isTenantAdmin: false,
    isActive: true,
};

const DEFAULT_ROLES = ['owner', 'admin', 'manager', 'member', 'analyst', 'auditor'];

const TenantUserRoleModal: React.FC<TenantUserRoleModalProps> = ({
    open,
    loading = false,
    initialValues,
    availableRoles = DEFAULT_ROLES,
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
        formState: { isSubmitting },
    } = useForm<TenantUserRoleFormValues>({
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

    const handleFormSubmit = async (values: TenantUserRoleFormValues) => {
        try {
            await onSubmit(values);
            setSubmitError(null);
            onClose();
        } catch (error: any) {
            console.error('TenantUserRoleModal: failed to update tenant user', error);
            const message =
                typeof error === 'string'
                    ? error
                    : error?.message || error?.detail || 'Unable to update tenant user. Please try again.';
            setSubmitError(message);
        }
    };

    const isTenantAdmin = watch('isTenantAdmin');
    const isActive = watch('isActive');

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Edit Tenant User</DialogTitle>
            <DialogContent dividers>
                <form id="tenant-user-role-form" onSubmit={handleSubmit(handleFormSubmit)}>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {submitError && <Alert severity="error">{submitError}</Alert>}
                        <TextField label="Role" select fullWidth {...register('role')} defaultValue="member">
                            {availableRoles.map((role) => (
                                <MenuItem key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isTenantAdmin}
                                    onChange={(event) => setValue('isTenantAdmin', event.target.checked)}
                                />
                            }
                            label="Tenant Admin"
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
                    form="tenant-user-role-form"
                    variant="contained"
                    disabled={loading || isSubmitting}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TenantUserRoleModal;


