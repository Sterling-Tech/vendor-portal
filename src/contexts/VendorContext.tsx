import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
    ReactNode,
} from 'react';
import {
    VendorOrg,
    VendorOrgForm,
} from '../types/vendor';
import {
    fetchVendorOrgTree,
    createVendorOrg,
    updateVendorOrg,
    deleteVendorOrg,
} from '../services/vendorHierarchyService';

interface VendorHierarchyContextType {
    tenantId: string | null;
    setTenantId: (tenantId: string | null) => void;
    tree: VendorOrg[];
    loading: boolean;
    error: string | null;
    selectedOrgId: string | null;
    selectedOrg: VendorOrg | null;
    refresh: () => Promise<void>;
    selectOrg: (id: string | null) => void;
    createOrg: (payload: VendorOrgForm) => Promise<VendorOrg>;
    updateOrg: (id: string, payload: Partial<VendorOrgForm>) => Promise<VendorOrg>;
    removeOrg: (id: string) => Promise<void>;
}

const VendorHierarchyContext = createContext<VendorHierarchyContextType | undefined>(undefined);

const findOrgById = (nodes: VendorOrg[], id: string | null): VendorOrg | null => {
    if (!id) return null;
    if (!nodes || !Array.isArray(nodes)) return null;
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        if (node.children && node.children.length) {
            const found = findOrgById(node.children, id);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

interface VendorProviderProps {
    children: ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({ children }) => {
    const [tenantId, setTenantIdState] = useState<string | null>(() => localStorage.getItem('tenantId'));
    const [tree, setTree] = useState<VendorOrg[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<boolean>(false);

    const refresh = useCallback(async () => {
        if (!tenantId) {
            setTree([]);
            setSelectedOrgId(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchVendorOrgTree(tenantId);
            // Ensure data is an array
            const treeData = Array.isArray(data) ? data : [];
            setTree(treeData);
            if (!selectedOrgId && treeData.length > 0) {
                setSelectedOrgId(treeData[0].id);
            } else if (selectedOrgId) {
                const exists = findOrgById(treeData, selectedOrgId);
                if (!exists && treeData.length > 0) {
                    setSelectedOrgId(treeData[0].id);
                }
            }
        } catch (err: any) {
            console.error('Failed to load vendor hierarchy', err);
            setError(err?.message || 'Failed to load vendor hierarchy');
            setTree([]); // Reset tree on error
        } finally {
            setLoading(false);
        }
    }, [tenantId, selectedOrgId]);

    const setTenantId = useCallback((id: string | null) => {
        if (id) {
            localStorage.setItem('tenantId', id);
        } else {
            localStorage.removeItem('tenantId');
        }
        setTenantIdState(id);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!tenantId) {
            const storedTenantId = localStorage.getItem('tenantId');
            if (storedTenantId) {
                setTenantIdState(storedTenantId);
                return;
            }
            const storedTenant = localStorage.getItem('currentTenant');
            if (storedTenant) {
                try {
                    const parsed = JSON.parse(storedTenant);
                    if (parsed?.id) {
                        setTenantId(parsed.id);
                    }
                } catch (error) {
                    console.error('VendorProvider - Failed to parse stored tenant', error);
                }
            }
        }
    }, [tenantId, setTenantId, setTenantIdState]);

    const selectOrg = useCallback((id: string | null) => {
        setSelectedOrgId(id);
    }, []);

    const createOrg = useCallback(
        async (payload: VendorOrgForm) => {
            if (!tenantId) {
                throw new Error('Tenant context is required to create an organisation');
            }
            setActionLoading(true);
            try {
                const created = await createVendorOrg({
                    ...payload,
                    tenant: tenantId,
                });
                await refresh();
                setSelectedOrgId(created.id);
                return created;
            } finally {
                setActionLoading(false);
            }
        },
        [tenantId, refresh],
    );

    const updateOrg = useCallback(
        async (id: string, payload: Partial<VendorOrgForm>) => {
            setActionLoading(true);
            try {
                const updated = await updateVendorOrg(id, payload);
                await refresh();
                return updated;
            } finally {
                setActionLoading(false);
            }
        },
        [refresh],
    );

    const removeOrg = useCallback(
        async (id: string) => {
            setActionLoading(true);
            try {
                await deleteVendorOrg(id);
                await refresh();
            } finally {
                setActionLoading(false);
            }
        },
        [refresh],
    );

    const selectedOrg = useMemo(() => findOrgById(tree, selectedOrgId), [tree, selectedOrgId]);

    const contextValue = useMemo<VendorHierarchyContextType>(
        () => ({
            tenantId,
            setTenantId,
            tree,
            loading: loading || actionLoading,
            error,
            selectedOrgId,
            selectedOrg: selectedOrg || null,
            refresh,
            selectOrg,
            createOrg,
            updateOrg,
            removeOrg,
        }),
        [
            tenantId,
            setTenantId,
            tree,
            loading,
            actionLoading,
            error,
            selectedOrgId,
            selectedOrg,
            refresh,
            selectOrg,
            createOrg,
            updateOrg,
            removeOrg,
        ],
    );

    return (
        <VendorHierarchyContext.Provider value={contextValue}>
            {children}
        </VendorHierarchyContext.Provider>
    );
};

export const useVendorHierarchy = (): VendorHierarchyContextType => {
    const context = useContext(VendorHierarchyContext);
    if (!context) {
        throw new Error('useVendorHierarchy must be used within a VendorProvider');
    }
    return context;
};

