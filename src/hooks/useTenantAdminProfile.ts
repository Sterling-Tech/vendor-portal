import { useCallback, useEffect, useState } from 'react';
import { TenantAdminProfile } from '../types/vendor';
import { fetchTenantAdminProfiles } from '../services/vendorHierarchyService';

export const useTenantAdminProfile = (tenantId: string | null) => {
    const [profiles, setProfiles] = useState<TenantAdminProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!tenantId) {
            setProfiles([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTenantAdminProfiles(tenantId);
            setProfiles(data);
        } catch (err: any) {
            console.error('Failed to load tenant admin profile', err);
            setError(err?.message || 'Failed to load tenant admin profile');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const profile = profiles.length ? profiles[0] : null;

    return {
        profile,
        profiles,
        loading,
        error,
        refresh,
    };
};

