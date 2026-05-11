import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    tenantService,
    Tenant,
    TenantSummary,
    TenantStats,
    TenantUser,
    TenantDomain,
    TenantConfiguration,
    CreateTenantRequest,
    UpdateTenantRequest,
} from '../services/tenantService';
import { useVendorHierarchy } from '../contexts/VendorContext';
import { getApiKeyCredentials } from '../utils/apiKeyStorage';
import { API_KEY_READY_EVENT } from './useEnsureUserApiKey';

const parseError = (error: unknown): string => {
    if (!error) return 'An unexpected error occurred';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
        return String((error as Record<string, unknown>).message);
    }
    return 'An unexpected error occurred';
};

export const useTenants = () => {
    const { setTenantId: setHierarchyTenantId } = useVendorHierarchy();

    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [summary, setSummary] = useState<TenantSummary | null>(null);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [stats, setStats] = useState<TenantStats | null>(null);
    const [users, setUsers] = useState<TenantUser[]>([]);
    const [domains, setDomains] = useState<TenantDomain[]>([]);
    const [configuration, setConfiguration] = useState<TenantConfiguration | null>(null);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [mutationLoading, setMutationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    type TenantListQuery = { search?: string; is_active?: boolean; ordering?: string };
    const lastQueryRef = useRef<TenantListQuery | undefined>(undefined);

    const selectedTenant = useMemo(
        () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
        [tenants, selectedTenantId]
    );

    const selectTenant = useCallback(
        (tenantId: string | null) => {
            setSelectedTenantId(tenantId);
            setHierarchyTenantId(tenantId);
        },
        [setHierarchyTenantId]
    );

    const refreshTenants = useCallback(async (options?: TenantListQuery) => {
        const query = options ?? lastQueryRef.current ?? undefined;
        lastQueryRef.current = query;

        // Check if either API key or JWT token is available
        const hasApiKey = !!getApiKeyCredentials();
        const hasToken = !!localStorage.getItem('token');

        console.log('[useTenants] refreshTenants called:', { hasApiKey, hasToken, query });

        if (!hasApiKey && !hasToken) {
            console.log('[useTenants] No credentials available, skipping fetch');
            return;
        }

        setLoading(true);
        try {
            console.log('[useTenants] Fetching tenants...');
            const [summaryData, tenantList] = await Promise.all([
                tenantService.getTenantSummary().catch((err) => {
                    console.log('[useTenants] Summary fetch failed:', err);
                    return null;
                }),
                tenantService.getAllTenants(query),
            ]);
            console.log('[useTenants] Tenants fetched:', { count: tenantList.length, tenants: tenantList });
            if (summaryData) {
                setSummary(summaryData);
            }
            setTenants(tenantList);

            if (!tenantList.length) {
                selectTenant(null);
                return;
            }

            if (selectedTenantId) {
                const exists = tenantList.some((tenant) => tenant.id === selectedTenantId);
                if (!exists) {
                    selectTenant(tenantList[0].id);
                }
            } else {
                selectTenant(tenantList[0].id);
            }
        } catch (err) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    }, [selectedTenantId, selectTenant]);

    useEffect(() => {
        refreshTenants();
    }, [refreshTenants]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const handleApiKeyReady = () => {
            refreshTenants(lastQueryRef.current);
        };
        window.addEventListener(API_KEY_READY_EVENT, handleApiKeyReady);
        return () => {
            window.removeEventListener(API_KEY_READY_EVENT, handleApiKeyReady);
        };
    }, [refreshTenants]);

    const fetchTenantDetails = useCallback(
        async (tenantId: string) => {
            setDetailLoading(true);
            try {
                const [statsData, usersData, domainsData, configData] = await Promise.all([
                    tenantService.getTenantStats(tenantId).catch(() => null),
                    tenantService.getTenantUsers(tenantId).catch(() => []),
                    tenantService.getTenantDomains(tenantId).catch(() => []),
                    tenantService.getTenantConfiguration(tenantId).catch(() => null),
                ]);
                setStats(statsData);
                setUsers(usersData);
                setDomains(domainsData);
                setConfiguration(configData);
            } catch (err) {
                setError(parseError(err));
            } finally {
                setDetailLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (selectedTenantId) {
            fetchTenantDetails(selectedTenantId);
        } else {
            setStats(null);
            setUsers([]);
            setDomains([]);
            setConfiguration(null);
        }
    }, [selectedTenantId, fetchTenantDetails]);

    const createTenant = useCallback(
        async (payload: CreateTenantRequest) => {
            setMutationLoading(true);
            try {
                const tenant = await tenantService.createTenant(payload);
                await refreshTenants(lastQueryRef.current);
                selectTenant(tenant.id);
                return tenant;
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        [refreshTenants, selectTenant]
    );

    const updateTenant = useCallback(
        async (id: string, payload: UpdateTenantRequest) => {
            setMutationLoading(true);
            try {
                const tenant = await tenantService.updateTenant(id, payload);
                await refreshTenants(lastQueryRef.current);
                selectTenant(tenant.id);
                return tenant;
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        [refreshTenants, selectTenant]
    );

    const deleteTenant = useCallback(
        async (id: string) => {
            setMutationLoading(true);
            try {
                await tenantService.deleteTenant(id);
                if (selectedTenantId === id) {
                    selectTenant(null);
                }
                await refreshTenants(lastQueryRef.current);
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        [refreshTenants, selectTenant, selectedTenantId]
    );

    const setTenantActive = useCallback(
        async (id: string, active: boolean) => {
            setMutationLoading(true);
            try {
                if (active) {
                    await tenantService.activateTenant(id);
                } else {
                    await tenantService.deactivateTenant(id);
                }
                await refreshTenants(lastQueryRef.current);
                selectTenant(id);
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        [refreshTenants, selectTenant]
    );

    const reloadTenantDetails = useCallback(() => {
        if (selectedTenantId) {
            fetchTenantDetails(selectedTenantId);
        }
    }, [fetchTenantDetails, selectedTenantId]);

    const addDomain = useCallback(
        async (tenant: string, domain: string, options?: { is_primary?: boolean; is_active?: boolean }) => {
            setMutationLoading(true);
            try {
                const created = await tenantService.addTenantDomain({
                    tenant,
                    domain,
                    is_primary: options?.is_primary ?? false,
                    is_active: options?.is_active ?? true,
                });
                setDomains((prev) => [created, ...prev]);
                return created;
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        []
    );

    const updateDomain = useCallback(async (id: string, data: Partial<TenantDomain>) => {
        setMutationLoading(true);
        try {
            const updated = await tenantService.updateTenantDomain(id, data);
            setDomains((prev) => prev.map((domain) => (domain.id === id ? updated : domain)));
            return updated;
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    const updateConfiguration = useCallback(
        async (data: Partial<TenantConfiguration>) => {
            if (!configuration?.id) return null;
            setMutationLoading(true);
            try {
                const updated = await tenantService.updateTenantConfiguration(configuration.id, data);
                setConfiguration(updated);
                return updated;
            } catch (err) {
                setError(parseError(err));
                throw err;
            } finally {
                setMutationLoading(false);
            }
        },
        [configuration]
    );

    const removeDomain = useCallback(async (id: string) => {
        setMutationLoading(true);
        try {
            await tenantService.removeTenantDomain(id);
            setDomains((prev) => prev.filter((domain) => domain.id !== id));
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    const setTenantUserRole = useCallback(async (id: string, role: string) => {
        setMutationLoading(true);
        try {
            const updated = await tenantService.setTenantUserRole(id, role);
            setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
            return updated;
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    const toggleTenantUserAdmin = useCallback(async (id: string) => {
        setMutationLoading(true);
        try {
            const updated = await tenantService.toggleTenantUserAdmin(id);
            setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
            return updated;
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    const updateTenantUser = useCallback(async (id: string, data: Partial<TenantUser>) => {
        setMutationLoading(true);
        try {
            const updated = await tenantService.updateTenantUser(id, data);
            setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
            return updated;
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    const removeTenantUser = useCallback(async (id: string) => {
        setMutationLoading(true);
        try {
            await tenantService.removeTenantUser(id);
            setUsers((prev) => prev.filter((user) => user.id !== id));
        } catch (err) {
            setError(parseError(err));
            throw err;
        } finally {
            setMutationLoading(false);
        }
    }, []);

    return {
        tenants,
        summary,
        selectedTenant,
        selectedTenantId,
        stats,
        users,
        domains,
        configuration,
        loading,
        detailLoading,
        mutationLoading,
        error,
        setError,
        refreshTenants,
        selectTenant,
        createTenant,
        updateTenant,
        deleteTenant,
        setTenantActive,
        reloadTenantDetails,
        addDomain,
        updateDomain,
        removeDomain,
        updateConfiguration,
        setTenantUserRole,
        toggleTenantUserAdmin,
        updateTenantUser,
        removeTenantUser,
    };
};


