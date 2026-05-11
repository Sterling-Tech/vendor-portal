import { useCallback, useEffect, useState } from 'react';
import {
    VendorRoleBinding,
    BindingForm,
} from '../types/vendor';
import {
    fetchOrgBindings,
    addOrgBinding,
    updateBindingStatus,
    deleteBinding,
} from '../services/vendorHierarchyService';

export const useOrgBindings = (orgId: string | null) => {
    const [bindings, setBindings] = useState<VendorRoleBinding[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!orgId) {
            setBindings([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchOrgBindings(orgId);
            // Ensure data is always an array
            setBindings(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to load bindings', err);
            setError(err?.message || 'Failed to load bindings');
            setBindings([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const createBinding = useCallback(
        async (payload: BindingForm) => {
            if (!orgId) {
                throw new Error('Organisation ID is required');
            }
            const created = await addOrgBinding(orgId, payload);
            await refresh();
            return created;
        },
        [orgId, refresh],
    );

    const updateBinding = useCallback(
        async (bindingId: string, payload: Partial<BindingForm>) => {
            const updated = await updateBindingStatus(bindingId, payload);
            await refresh();
            return updated;
        },
        [refresh],
    );

    const removeBinding = useCallback(
        async (bindingId: string) => {
            await deleteBinding(bindingId);
            await refresh();
        },
        [refresh],
    );

    return {
        bindings,
        loading,
        error,
        refresh,
        createBinding,
        updateBinding,
        removeBinding,
    };
};

