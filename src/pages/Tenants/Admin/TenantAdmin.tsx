import React, { useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add,
    Assessment,
    CheckCircle,
    ContentCopy,
    Delete,
    Domain,
    Edit,
    HighlightOff,
    Key,
    Loop,
    People,
    Refresh,
    Search,
    Security,
    Settings,
    Visibility,
} from '@mui/icons-material';

type Tenant = {
    id: string;
    name: string;
    slug: string;
    domain: string;
    subdomain?: string;
    is_trial: boolean;
    is_active: boolean;
    trial_ends_at?: string;
    plan: string;
};

type TenantStats = {
    total_users: number;
    total_transactions: number;
    api_calls_today: number;
    total_storage_used_mb: number;
    last_activity: string;
};

type TenantConfiguration = {
    max_users: number;
    api_rate_limit: number;
    billing_cycle: string;
};

type TenantProfile = {
    user_email: string;
    default_limits: {
        users: number;
        wallets: number;
        api_calls: number;
    };
    onboarding_config: {
        kyc_required: boolean;
        wallet_enabled: boolean;
        api_access: boolean;
    };
};

type TenantDomain = {
    id: string;
    domain: string;
    is_primary: boolean;
    is_active: boolean;
};

type TenantUser = {
    id: string;
    user_email: string;
    role: string;
    is_tenant_admin: boolean;
    is_active: boolean;
};

type VendorOrg = {
    id: string;
    name: string;
    level: 'vendor' | 'sub_vendor' | 'agent' | 'cashier';
    status: string;
    children?: VendorOrg[];
};

type ApiKeyRecord = {
    id: string;
    key_id: string;
    scopes: string[];
    is_active: boolean;
    expires_at?: string;
    created_at: string;
};

type AuditEntry = {
    id: string;
    event: string;
    actor: string;
    ip_address: string;
    created_at: string;
};

type TenantFormState = {
    name: string;
    slug: string;
    domain: string;
    subdomain: string;
    is_trial: boolean;
    trial_ends_at: string;
    is_active: boolean;
    plan: string;
};

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

const daysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
};

const statusColor = (status?: string): ChipColor => {
    switch ((status || '').toLowerCase()) {
        case 'active':
        case 'online':
        case 'success':
            return 'success';
        case 'trial':
        case 'pending':
        case 'review':
            return 'warning';
        case 'inactive':
        case 'suspended':
        case 'revoked':
            return 'error';
        default:
            return 'default';
    }
};

const formatNumber = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('en-NG').format(Number(value ?? 0));

const formatDate = (value?: string) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
};

const randomToken = () => Math.random().toString(36).replace('0.', '').slice(0, 16);

const getInitial = (value?: string) => value?.trim()?.[0]?.toUpperCase() || '?';

const INITIAL_TENANTS: Tenant[] = [
    {
        id: 'tenant-apexpay',
        name: 'ApexPay Business Services',
        slug: 'apexpay',
        domain: 'apexpay.ng',
        subdomain: 'app.apexpay.ng',
        is_trial: false,
        is_active: true,
        trial_ends_at: daysFromNow(45),
        plan: 'Enterprise',
    },
    {
        id: 'tenant-northbridge',
        name: 'Northbridge Commerce',
        slug: 'northbridge',
        domain: 'northbridge.africa',
        subdomain: 'portal.northbridge.africa',
        is_trial: true,
        is_active: true,
        trial_ends_at: daysFromNow(14),
        plan: 'Growth',
    },
    {
        id: 'tenant-rivermart',
        name: 'RiverMart Distribution',
        slug: 'rivermart',
        domain: 'rivermart.co',
        subdomain: 'admin.rivermart.co',
        is_trial: false,
        is_active: false,
        trial_ends_at: daysAgo(20),
        plan: 'Standard',
    },
];

const INITIAL_STATS: Record<string, TenantStats> = {
    'tenant-apexpay': {
        total_users: 216,
        total_transactions: 32450,
        api_calls_today: 184200,
        total_storage_used_mb: 8420.75,
        last_activity: daysAgo(0),
    },
    'tenant-northbridge': {
        total_users: 84,
        total_transactions: 12880,
        api_calls_today: 79200,
        total_storage_used_mb: 3180.2,
        last_activity: daysAgo(1),
    },
    'tenant-rivermart': {
        total_users: 42,
        total_transactions: 3940,
        api_calls_today: 8800,
        total_storage_used_mb: 940.55,
        last_activity: daysAgo(3),
    },
};

const INITIAL_CONFIGS: Record<string, TenantConfiguration> = {
    'tenant-apexpay': { max_users: 500, api_rate_limit: 25000, billing_cycle: 'Monthly' },
    'tenant-northbridge': { max_users: 150, api_rate_limit: 12000, billing_cycle: 'Monthly' },
    'tenant-rivermart': { max_users: 75, api_rate_limit: 5000, billing_cycle: 'Quarterly' },
};

const INITIAL_PROFILES: Record<string, TenantProfile> = {
    'tenant-apexpay': {
        user_email: 'admin@apexpay.ng',
        default_limits: { users: 500, wallets: 80, api_calls: 25000 },
        onboarding_config: { kyc_required: true, wallet_enabled: true, api_access: true },
    },
    'tenant-northbridge': {
        user_email: 'ops@northbridge.africa',
        default_limits: { users: 150, wallets: 35, api_calls: 12000 },
        onboarding_config: { kyc_required: true, wallet_enabled: true, api_access: true },
    },
    'tenant-rivermart': {
        user_email: 'support@rivermart.co',
        default_limits: { users: 75, wallets: 20, api_calls: 5000 },
        onboarding_config: { kyc_required: false, wallet_enabled: true, api_access: false },
    },
};

const INITIAL_DOMAINS: Record<string, TenantDomain[]> = {
    'tenant-apexpay': [
        { id: 'domain-1', domain: 'apexpay.ng', is_primary: true, is_active: true },
        { id: 'domain-2', domain: 'dashboard.apexpay.ng', is_primary: false, is_active: true },
    ],
    'tenant-northbridge': [
        { id: 'domain-3', domain: 'northbridge.africa', is_primary: true, is_active: true },
        { id: 'domain-4', domain: 'admin.northbridge.africa', is_primary: false, is_active: true },
    ],
    'tenant-rivermart': [
        { id: 'domain-5', domain: 'rivermart.co', is_primary: true, is_active: false },
    ],
};

const INITIAL_USERS: Record<string, TenantUser[]> = {
    'tenant-apexpay': [
        { id: 'user-1', user_email: 'admin@apexpay.ng', role: 'owner', is_tenant_admin: true, is_active: true },
        { id: 'user-2', user_email: 'finance@apexpay.ng', role: 'finance_admin', is_tenant_admin: true, is_active: true },
        { id: 'user-3', user_email: 'support@apexpay.ng', role: 'support', is_tenant_admin: false, is_active: true },
    ],
    'tenant-northbridge': [
        { id: 'user-4', user_email: 'ops@northbridge.africa', role: 'tenant_admin', is_tenant_admin: true, is_active: true },
        { id: 'user-5', user_email: 'agent.manager@northbridge.africa', role: 'manager', is_tenant_admin: false, is_active: true },
    ],
    'tenant-rivermart': [
        { id: 'user-6', user_email: 'support@rivermart.co', role: 'member', is_tenant_admin: false, is_active: false },
    ],
};

const INITIAL_TREE: VendorOrg[] = [
    {
        id: 'org-hq',
        name: 'ApexPay Vendor HQ',
        level: 'vendor',
        status: 'active',
        children: [
            {
                id: 'org-lagos',
                name: 'Lagos Distribution Network',
                level: 'sub_vendor',
                status: 'active',
                children: [
                    {
                        id: 'org-ikeja-agent',
                        name: 'Ikeja Express Agent',
                        level: 'agent',
                        status: 'active',
                        children: [
                            { id: 'org-counter-01', name: 'Counter 01 - Ikeja', level: 'cashier', status: 'online' },
                            { id: 'org-counter-02', name: 'Counter 02 - Ikeja', level: 'cashier', status: 'online' },
                        ],
                    },
                ],
            },
            {
                id: 'org-abuja',
                name: 'Abuja Service Cluster',
                level: 'sub_vendor',
                status: 'active',
                children: [
                    { id: 'org-wuse-agent', name: 'Wuse Agent Desk', level: 'agent', status: 'active' },
                ],
            },
        ],
    },
];

const INITIAL_KEYS: Record<string, ApiKeyRecord[]> = {
    'org-hq': [
        {
            id: 'key-1',
            key_id: 'vk_live_apexpay_main',
            scopes: ['wallet:read', 'wallet:write', 'transactions:read'],
            is_active: true,
            expires_at: daysFromNow(90),
            created_at: daysAgo(18),
        },
    ],
    'org-lagos': [
        {
            id: 'key-2',
            key_id: 'vk_live_lagos_ops',
            scopes: ['wallet:read', 'transactions:read'],
            is_active: true,
            expires_at: daysFromNow(60),
            created_at: daysAgo(8),
        },
    ],
};

const DEFAULT_TENANT: Tenant = INITIAL_TENANTS[0];
const DEFAULT_STATS: TenantStats = INITIAL_STATS[DEFAULT_TENANT.id];
const DEFAULT_CONFIG: TenantConfiguration = INITIAL_CONFIGS[DEFAULT_TENANT.id];
const DEFAULT_PROFILE: TenantProfile = INITIAL_PROFILES[DEFAULT_TENANT.id];

const makeTenantForm = (tenant?: Tenant): TenantFormState => ({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
    domain: tenant?.domain || '',
    subdomain: tenant?.subdomain || '',
    is_trial: tenant?.is_trial ?? false,
    trial_ends_at: tenant?.trial_ends_at || daysFromNow(30),
    is_active: tenant?.is_active ?? true,
    plan: tenant?.plan || 'Standard',
});

const findOrgById = (nodes: VendorOrg[], id?: string | null): VendorOrg | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        const child = findOrgById(node.children || [], id);
        if (child) return child;
    }
    return null;
};

const countVendorTree = (nodes: VendorOrg[]) => {
    const totals = { total: 0, vendors: 0, subVendors: 0, agents: 0, cashiers: 0 };

    const walk = (items: VendorOrg[]) => {
        items.forEach((item) => {
            totals.total += 1;
            if (item.level === 'vendor') totals.vendors += 1;
            if (item.level === 'sub_vendor') totals.subVendors += 1;
            if (item.level === 'agent') totals.agents += 1;
            if (item.level === 'cashier') totals.cashiers += 1;
            walk(item.children || []);
        });
    };

    walk(nodes);
    return totals;
};

const StatCard = ({
    title,
    value,
    icon,
    color = 'primary',
}: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    color?: ChipColor;
}) => (
    <Card sx={{ height: '100%', borderRadius: 1 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography color="text.secondary" variant="body2">
                        {title}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                        {value}
                    </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>{icon}</Avatar>
            </Stack>
        </CardContent>
    </Card>
);

const TenantAdmin: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
    const [selectedTenantId, setSelectedTenantId] = useState(INITIAL_TENANTS[0].id);
    const [statsByTenant, setStatsByTenant] = useState<Record<string, TenantStats>>(INITIAL_STATS);
    const [configsByTenant, setConfigsByTenant] = useState<Record<string, TenantConfiguration>>(INITIAL_CONFIGS);
    const [profilesByTenant] = useState<Record<string, TenantProfile>>(INITIAL_PROFILES);
    const [domainsByTenant, setDomainsByTenant] = useState<Record<string, TenantDomain[]>>(INITIAL_DOMAINS);
    const [usersByTenant, setUsersByTenant] = useState<Record<string, TenantUser[]>>(INITIAL_USERS);
    const [tree] = useState<VendorOrg[]>(INITIAL_TREE);
    const [selectedOrgId, setSelectedOrgId] = useState('org-hq');
    const [apiKeysByOrg, setApiKeysByOrg] = useState<Record<string, ApiKeyRecord[]>>(INITIAL_KEYS);

    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [tenantModalState, setTenantModalState] = useState<{ open: boolean; mode: 'create' | 'edit' }>({
        open: false,
        mode: 'create',
    });
    const [tenantForm, setTenantForm] = useState<TenantFormState>(makeTenantForm());
    const [domainModalOpen, setDomainModalOpen] = useState(false);
    const [domainForm, setDomainForm] = useState({ domain: '', is_primary: false, is_active: true });
    const [userRoleModalState, setUserRoleModalState] = useState<{ open: boolean; user: TenantUser | null }>({
        open: false,
        user: null,
    });
    const [userRoleForm, setUserRoleForm] = useState({ role: 'member', is_tenant_admin: false, is_active: true });
    const [deleteTenantOpen, setDeleteTenantOpen] = useState(false);
    const [auditModalState, setAuditModalState] = useState<{
        open: boolean;
        keyLabel: string;
        entries: AuditEntry[];
    }>({
        open: false,
        keyLabel: '',
        entries: [],
    });
    const [scopesInput, setScopesInput] = useState('wallet:read,wallet:write');
    const [expiresInput, setExpiresInput] = useState(daysFromNow(90));
    const [lastIssuedSecret, setLastIssuedSecret] = useState<{ key_id: string; secret: string } | null>(null);

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) || tenants[0] || DEFAULT_TENANT;
    const selectedStats = statsByTenant[selectedTenant.id] || DEFAULT_STATS;
    const selectedConfig = configsByTenant[selectedTenant.id] || DEFAULT_CONFIG;
    const selectedProfile = profilesByTenant[selectedTenant.id] || DEFAULT_PROFILE;
    const selectedDomains = domainsByTenant[selectedTenant.id] || [];
    const selectedUsers = usersByTenant[selectedTenant.id] || [];
    const selectedOrg = findOrgById(tree, selectedOrgId) || tree[0];
    const selectedKeys = selectedOrg ? apiKeysByOrg[selectedOrg.id] || [] : [];

    const summary = useMemo(() => {
        const allUsers = Object.values(usersByTenant).reduce((total, list) => total + list.length, 0);
        const activeUsers = Object.values(usersByTenant).reduce(
            (total, list) => total + list.filter((user) => user.is_active).length,
            0
        );

        return {
            total_tenants: tenants.length,
            active_tenants: tenants.filter((tenant) => tenant.is_active).length,
            trial_tenants: tenants.filter((tenant) => tenant.is_trial).length,
            total_users: activeUsers || allUsers,
            today_api_calls: Object.values(statsByTenant).reduce((total, stats) => total + stats.api_calls_today, 0),
            today_transactions: Object.values(statsByTenant).reduce((total, stats) => total + stats.total_transactions, 0),
            today_storage_mb: Object.values(statsByTenant).reduce((total, stats) => total + stats.total_storage_used_mb, 0),
        };
    }, [statsByTenant, tenants, usersByTenant]);

    const filteredTenants = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return tenants;

        return tenants.filter(
            (tenant) =>
                tenant.name.toLowerCase().includes(term) ||
                tenant.slug.toLowerCase().includes(term) ||
                tenant.domain.toLowerCase().includes(term) ||
                (tenant.subdomain || '').toLowerCase().includes(term)
        );
    }, [tenants, searchTerm]);

    const vendorSummary = useMemo(() => countVendorTree(tree), [tree]);

    const refreshTenants = () => {
        setLastUpdated(new Date());
    };

    const openCreateTenantModal = () => {
        setTenantForm(makeTenantForm());
        setTenantModalState({ open: true, mode: 'create' });
    };

    const openEditTenantModal = () => {
        setTenantForm(makeTenantForm(selectedTenant));
        setTenantModalState({ open: true, mode: 'edit' });
    };

    const closeTenantModal = () => {
        setTenantModalState({ open: false, mode: 'create' });
    };

    const handleTenantModalSubmit = () => {
        const safeName = tenantForm.name.trim() || 'New Tenant';
        const safeSlug = tenantForm.slug.trim() || safeName.toLowerCase().replace(/\s+/g, '-');
        const safeDomain = tenantForm.domain.trim() || `${safeSlug}.example.com`;

        if (tenantModalState.mode === 'create') {
            const id = `tenant-${safeSlug}-${Date.now()}`;
            const newTenant: Tenant = {
                id,
                name: safeName,
                slug: safeSlug,
                domain: safeDomain,
                subdomain: tenantForm.subdomain.trim(),
                is_trial: tenantForm.is_trial,
                trial_ends_at: tenantForm.trial_ends_at || daysFromNow(30),
                is_active: tenantForm.is_active,
                plan: tenantForm.plan || 'Standard',
            };

            setTenants((prev) => [newTenant, ...prev]);
            setSelectedTenantId(id);
            setStatsByTenant((prev) => ({
                ...prev,
                [id]: {
                    total_users: 1,
                    total_transactions: 0,
                    api_calls_today: 0,
                    total_storage_used_mb: 0,
                    last_activity: new Date().toISOString(),
                },
            }));
            setConfigsByTenant((prev) => ({
                ...prev,
                [id]: { max_users: 50, api_rate_limit: 3000, billing_cycle: 'Monthly' },
            }));
            setDomainsByTenant((prev) => ({
                ...prev,
                [id]: [{ id: `domain-${Date.now()}`, domain: safeDomain, is_primary: true, is_active: true }],
            }));
            setUsersByTenant((prev) => ({
                ...prev,
                [id]: [{ id: `user-${Date.now()}`, user_email: `admin@${safeDomain}`, role: 'owner', is_tenant_admin: true, is_active: true }],
            }));
        } else {
            setTenants((prev) =>
                prev.map((tenant) =>
                    tenant.id === selectedTenant.id
                        ? {
                              ...tenant,
                              name: safeName,
                              slug: safeSlug,
                              domain: safeDomain,
                              subdomain: tenantForm.subdomain.trim(),
                              is_trial: tenantForm.is_trial,
                              trial_ends_at: tenantForm.trial_ends_at,
                              is_active: tenantForm.is_active,
                              plan: tenantForm.plan,
                          }
                        : tenant
                )
            );
        }

        closeTenantModal();
    };

    const handleDeleteTenant = () => {
        setTenants((prev) => {
            const remaining = prev.filter((tenant) => tenant.id !== selectedTenant.id);
            const nextTenants = remaining.length ? remaining : [DEFAULT_TENANT];
            setSelectedTenantId(nextTenants[0].id);
            return nextTenants;
        });
        setDeleteTenantOpen(false);
    };

    const handleToggleActive = () => {
        setTenants((prev) =>
            prev.map((tenant) =>
                tenant.id === selectedTenant.id ? { ...tenant, is_active: !tenant.is_active } : tenant
            )
        );
    };

    const handleToggleTrial = () => {
        setTenants((prev) =>
            prev.map((tenant) =>
                tenant.id === selectedTenant.id ? { ...tenant, is_trial: !tenant.is_trial } : tenant
            )
        );
    };

    const updateConfig = (field: keyof TenantConfiguration, value: string) => {
        setConfigsByTenant((prev) => ({
            ...prev,
            [selectedTenant.id]: {
                ...selectedConfig,
                [field]: field === 'billing_cycle' ? value : Number(value || 0),
            },
        }));
    };

    const handleAddDomain = () => {
        const domainValue = domainForm.domain.trim() || `${selectedTenant.slug}.example.com`;
        const newDomain: TenantDomain = {
            id: `domain-${Date.now()}`,
            domain: domainValue,
            is_primary: domainForm.is_primary,
            is_active: domainForm.is_active,
        };

        setDomainsByTenant((prev) => {
            const existing = prev[selectedTenant.id] || [];
            const normalized = newDomain.is_primary ? existing.map((item) => ({ ...item, is_primary: false })) : existing;
            return { ...prev, [selectedTenant.id]: [newDomain, ...normalized] };
        });

        setDomainForm({ domain: '', is_primary: false, is_active: true });
        setDomainModalOpen(false);
    };

    const updateDomain = (domainId: string, patch: Partial<TenantDomain>) => {
        setDomainsByTenant((prev) => {
            const existing = prev[selectedTenant.id] || [];
            const next = existing.map((domain) => {
                if (patch.is_primary && domain.id !== domainId) return { ...domain, is_primary: false };
                return domain.id === domainId ? { ...domain, ...patch } : domain;
            });
            return { ...prev, [selectedTenant.id]: next };
        });
    };

    const removeDomain = (domainId: string) => {
        setDomainsByTenant((prev) => ({
            ...prev,
            [selectedTenant.id]: (prev[selectedTenant.id] || []).filter((domain) => domain.id !== domainId),
        }));
    };

    const openUserRoleModal = (tenantUser: TenantUser) => {
        setUserRoleForm({
            role: tenantUser.role || 'member',
            is_tenant_admin: tenantUser.is_tenant_admin,
            is_active: tenantUser.is_active,
        });
        setUserRoleModalState({ open: true, user: tenantUser });
    };

    const closeUserRoleModal = () => {
        setUserRoleModalState({ open: false, user: null });
    };

    const handleUserRoleSubmit = () => {
        const target = userRoleModalState.user;
        if (!target) return;

        setUsersByTenant((prev) => ({
            ...prev,
            [selectedTenant.id]: (prev[selectedTenant.id] || []).map((tenantUser) =>
                tenantUser.id === target.id ? { ...tenantUser, ...userRoleForm } : tenantUser
            ),
        }));

        closeUserRoleModal();
    };

    const updateTenantUser = (userId: string, patch: Partial<TenantUser>) => {
        setUsersByTenant((prev) => ({
            ...prev,
            [selectedTenant.id]: (prev[selectedTenant.id] || []).map((tenantUser) =>
                tenantUser.id === userId ? { ...tenantUser, ...patch } : tenantUser
            ),
        }));
    };

    const removeTenantUser = (userId: string) => {
        setUsersByTenant((prev) => ({
            ...prev,
            [selectedTenant.id]: (prev[selectedTenant.id] || []).filter((tenantUser) => tenantUser.id !== userId),
        }));
    };

    const handleCreateKey = () => {
        if (!selectedOrg) return;

        const keyId = `vk_live_${selectedOrg.id.replace('org-', '')}_${randomToken().slice(0, 8)}`;
        const secret = `sk_${randomToken()}${randomToken()}`;

        const newKey: ApiKeyRecord = {
            id: `key-${Date.now()}`,
            key_id: keyId,
            scopes: scopesInput
                .split(',')
                .map((scope) => scope.trim())
                .filter(Boolean),
            is_active: true,
            expires_at: expiresInput || daysFromNow(90),
            created_at: new Date().toISOString(),
        };

        setApiKeysByOrg((prev) => ({
            ...prev,
            [selectedOrg.id]: [newKey, ...(prev[selectedOrg.id] || [])],
        }));
        setLastIssuedSecret({ key_id: keyId, secret });
    };

    const rotateKey = (keyId: string) => {
        if (!selectedOrg) return;

        const nextKeyId = `vk_live_rotated_${randomToken().slice(0, 10)}`;
        const nextSecret = `sk_${randomToken()}${randomToken()}`;

        setApiKeysByOrg((prev) => ({
            ...prev,
            [selectedOrg.id]: (prev[selectedOrg.id] || []).map((key) =>
                key.id === keyId ? { ...key, key_id: nextKeyId, created_at: new Date().toISOString() } : key
            ),
        }));
        setLastIssuedSecret({ key_id: nextKeyId, secret: nextSecret });
    };

    const revokeKey = (keyId: string) => {
        if (!selectedOrg) return;

        setApiKeysByOrg((prev) => ({
            ...prev,
            [selectedOrg.id]: (prev[selectedOrg.id] || []).map((key) =>
                key.id === keyId ? { ...key, is_active: false } : key
            ),
        }));
    };

    const removeKey = (keyId: string) => {
        if (!selectedOrg) return;

        setApiKeysByOrg((prev) => ({
            ...prev,
            [selectedOrg.id]: (prev[selectedOrg.id] || []).filter((key) => key.id !== keyId),
        }));
    };

    const openAuditDialog = (key: ApiKeyRecord) => {
        setAuditModalState({
            open: true,
            keyLabel: key.key_id,
            entries: [
                {
                    id: `audit-${key.id}-1`,
                    event: 'Key created',
                    actor: selectedProfile.user_email,
                    ip_address: '102.89.23.10',
                    created_at: key.created_at,
                },
                {
                    id: `audit-${key.id}-2`,
                    event: key.is_active ? 'Successful API request' : 'Key revoked',
                    actor: 'system',
                    ip_address: '197.210.84.18',
                    created_at: daysAgo(1),
                },
                {
                    id: `audit-${key.id}-3`,
                    event: 'Scopes reviewed',
                    actor: 'security@platform.local',
                    ip_address: '10.0.0.4',
                    created_at: daysAgo(2),
                },
            ],
        });
    };

    const copySecret = () => {
        if (!lastIssuedSecret) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(`${lastIssuedSecret.key_id}.${lastIssuedSecret.secret}`);
        }
    };

    const renderOrgNode = (org: VendorOrg, depth = 0): React.ReactNode => (
        <React.Fragment key={org.id}>
            <ListItemButton selected={org.id === selectedOrgId} onClick={() => setSelectedOrgId(org.id)} sx={{ pl: 2 + depth * 2 }}>
                <ListItemText
                    primary={org.name}
                    secondary={
                        <Stack direction="row" spacing={1} mt={0.5}>
                            <Chip label={org.level} size="small" />
                            <Chip label={org.status} color={statusColor(org.status)} size="small" />
                        </Stack>
                    }
                />
            </ListItemButton>
            {(org.children || []).map((child) => renderOrgNode(child, depth + 1))}
        </React.Fragment>
    );

    return (
        <Box p={{ xs: 2, md: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography variant="h4">Tenant Administration</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manual dashboard data • Updated {lastUpdated.toLocaleTimeString()}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={refreshTenants}>
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<Add />} onClick={openCreateTenantModal}>
                        Add Tenant
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <StatCard title="Total Tenants" value={summary.total_tenants} icon={<Domain />} color="primary" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Active Tenants" value={summary.active_tenants} icon={<CheckCircle />} color="success" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Trial Tenants" value={summary.trial_tenants} icon={<Assessment />} color="warning" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Active Users" value={formatNumber(summary.total_users)} icon={<People />} color="info" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard title="API Calls Today" value={formatNumber(summary.today_api_calls)} icon={<Key />} color="primary" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard title="Transactions Today" value={formatNumber(summary.today_transactions)} icon={<Assessment />} color="success" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard title="Storage Used Today" value={`${summary.today_storage_mb.toFixed(2)} MB`} icon={<Security />} color="secondary" />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 1 }}>
                        <CardHeader title="Tenants" subheader={`${tenants.length} total`} />
                        <CardContent>
                            <TextField
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search tenants"
                                fullWidth
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <List dense sx={{ maxHeight: 520, overflowY: 'auto', mt: 2 }}>
                                {(filteredTenants.length ? filteredTenants : tenants).map((tenant) => (
                                    <ListItemButton
                                        key={tenant.id}
                                        selected={tenant.id === selectedTenant.id}
                                        onClick={() => setSelectedTenantId(tenant.id)}
                                    >
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {tenant.name}
                                                    </Typography>
                                                    <Chip
                                                        label={tenant.is_active ? 'Active' : 'Inactive'}
                                                        size="small"
                                                        color={tenant.is_active ? 'success' : 'default'}
                                                    />
                                                    {tenant.is_trial && <Chip label="Trial" size="small" color="warning" />}
                                                </Stack>
                                            }
                                            secondary={`${tenant.domain}${tenant.subdomain ? ` • ${tenant.subdomain}` : ''}`}
                                        />
                                    </ListItemButton>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Stack spacing={3}>
                        <Card sx={{ borderRadius: 1 }}>
                            <CardContent>
                                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                    <Stack spacing={0.5}>
                                        <Typography variant="h5">{selectedTenant.name}</Typography>
                                        <Typography color="text.secondary">{selectedTenant.domain}</Typography>
                                        <Typography color="text.secondary">Subdomain: {selectedTenant.subdomain || 'admin.example.com'}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Button
                                            variant={selectedTenant.is_active ? 'outlined' : 'contained'}
                                            color={selectedTenant.is_active ? 'secondary' : 'success'}
                                            startIcon={selectedTenant.is_active ? <HighlightOff /> : <CheckCircle />}
                                            onClick={handleToggleActive}
                                        >
                                            {selectedTenant.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button variant="outlined" startIcon={<Edit />} onClick={openEditTenantModal}>
                                            Edit
                                        </Button>
                                        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteTenantOpen(true)}>
                                            Delete
                                        </Button>
                                    </Stack>
                                </Stack>

                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                                    <Chip
                                        label={selectedTenant.is_trial ? 'Trial Tenant' : 'Standard Tenant'}
                                        color={selectedTenant.is_trial ? 'warning' : 'default'}
                                        variant={selectedTenant.is_trial ? 'filled' : 'outlined'}
                                    />
                                    <Chip label={selectedTenant.plan} color="primary" variant="outlined" />
                                    <Typography variant="body2">Trial Ends: {formatDate(selectedTenant.trial_ends_at)}</Typography>
                                    <Button size="small" variant="outlined" onClick={handleToggleTrial}>
                                        {selectedTenant.is_trial ? 'Mark as Paid' : 'Mark as Trial'}
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Card sx={{ height: '100%', borderRadius: 1 }}>
                                    <CardHeader
                                        avatar={<Assessment color="primary" />}
                                        title="Tenant Statistics"
                                        subheader={`Last activity: ${formatDate(selectedStats.last_activity)}`}
                                    />
                                    <CardContent>
                                        <Stack spacing={1}>
                                            <Typography variant="body2">Total Users: {formatNumber(selectedStats.total_users)}</Typography>
                                            <Typography variant="body2">Transactions Today: {formatNumber(selectedStats.total_transactions)}</Typography>
                                            <Typography variant="body2">API Calls Today: {formatNumber(selectedStats.api_calls_today)}</Typography>
                                            <Typography variant="body2">Storage Used: {selectedStats.total_storage_used_mb.toFixed(2)} MB</Typography>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card sx={{ height: '100%', borderRadius: 1 }}>
                                    <CardHeader avatar={<People color="primary" />} title="Tenant Admin Profile" />
                                    <CardContent>
                                        <Stack spacing={1}>
                                            <Typography variant="body2">
                                                Admin Email: <strong>{selectedProfile.user_email}</strong>
                                            </Typography>
                                            <Typography variant="body2">User Limit: {selectedProfile.default_limits.users}</Typography>
                                            <Typography variant="body2">Wallet Limit: {selectedProfile.default_limits.wallets}</Typography>
                                            <Typography variant="body2">API Call Limit: {formatNumber(selectedProfile.default_limits.api_calls)}</Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Chip label="KYC Required" color={selectedProfile.onboarding_config.kyc_required ? 'success' : 'default'} size="small" />
                                                <Chip label="Wallet Enabled" color={selectedProfile.onboarding_config.wallet_enabled ? 'success' : 'default'} size="small" />
                                                <Chip label="API Access" color={selectedProfile.onboarding_config.api_access ? 'success' : 'default'} size="small" />
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Card sx={{ borderRadius: 1 }}>
                            <CardHeader
                                avatar={<Settings color="primary" />}
                                title="Tenant Configuration"
                                action={
                                    <Button variant="outlined" size="small" onClick={refreshTenants}>
                                        Save Changes
                                    </Button>
                                }
                            />
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            label="Max Users"
                                            value={selectedConfig.max_users}
                                            onChange={(event) => updateConfig('max_users', event.target.value)}
                                            type="number"
                                            fullWidth
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            label="API Rate Limit"
                                            value={selectedConfig.api_rate_limit}
                                            onChange={(event) => updateConfig('api_rate_limit', event.target.value)}
                                            type="number"
                                            fullWidth
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            select
                                            label="Billing Cycle"
                                            value={selectedConfig.billing_cycle}
                                            onChange={(event) => updateConfig('billing_cycle', event.target.value)}
                                            fullWidth
                                            size="small"
                                        >
                                            <MenuItem value="Monthly">Monthly</MenuItem>
                                            <MenuItem value="Quarterly">Quarterly</MenuItem>
                                            <MenuItem value="Yearly">Yearly</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1 }}>
                            <CardHeader
                                avatar={<Domain color="primary" />}
                                title="Tenant Domains"
                                action={
                                    <Button size="small" startIcon={<Add />} onClick={() => setDomainModalOpen(true)}>
                                        Add Domain
                                    </Button>
                                }
                            />
                            <CardContent>
                                <List dense>
                                    {selectedDomains.map((domain) => (
                                        <ListItem
                                            key={domain.id}
                                            divider
                                            secondaryAction={
                                                <Stack direction="row" spacing={1}>
                                                    {!domain.is_primary && (
                                                        <Button size="small" onClick={() => updateDomain(domain.id, { is_primary: true })}>
                                                            Make Primary
                                                        </Button>
                                                    )}
                                                    <Button size="small" onClick={() => updateDomain(domain.id, { is_active: !domain.is_active })}>
                                                        {domain.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                    <IconButton edge="end" color="error" onClick={() => removeDomain(domain.id)}>
                                                        <Delete />
                                                    </IconButton>
                                                </Stack>
                                            }
                                        >
                                            <ListItemAvatar>
                                                <Avatar>{getInitial(domain.domain)}</Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={domain.domain}
                                                secondary={
                                                    <Stack direction="row" spacing={1} mt={0.5}>
                                                        <Chip label={domain.is_primary ? 'Primary' : 'Secondary'} color={domain.is_primary ? 'success' : 'default'} size="small" />
                                                        <Chip label={domain.is_active ? 'Active' : 'Inactive'} color={domain.is_active ? 'success' : 'default'} size="small" />
                                                    </Stack>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1 }}>
                            <CardHeader avatar={<People color="primary" />} title="Tenant Users" />
                            <CardContent>
                                <List dense>
                                    {selectedUsers.map((tenantUser) => (
                                        <ListItem
                                            key={tenantUser.id}
                                            divider
                                            secondaryAction={
                                                <Stack direction="row" spacing={1}>
                                                    <Button size="small" onClick={() => openUserRoleModal(tenantUser)}>
                                                        Edit Role
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => updateTenantUser(tenantUser.id, { is_tenant_admin: !tenantUser.is_tenant_admin })}
                                                    >
                                                        {tenantUser.is_tenant_admin ? 'Revoke Admin' : 'Make Admin'}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => updateTenantUser(tenantUser.id, { is_active: !tenantUser.is_active })}
                                                    >
                                                        {tenantUser.is_active ? 'Suspend' : 'Activate'}
                                                    </Button>
                                                    <IconButton edge="end" color="error" onClick={() => removeTenantUser(tenantUser.id)}>
                                                        <Delete />
                                                    </IconButton>
                                                </Stack>
                                            }
                                        >
                                            <ListItemAvatar>
                                                <Avatar>{getInitial(tenantUser.user_email)}</Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={tenantUser.user_email}
                                                secondary={
                                                    <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                                                        <Chip label={tenantUser.role || 'member'} size="small" />
                                                        <Chip label={tenantUser.is_tenant_admin ? 'Admin' : 'User'} size="small" color={tenantUser.is_tenant_admin ? 'success' : 'default'} />
                                                        <Chip label={tenantUser.is_active ? 'Active' : 'Inactive'} size="small" color={tenantUser.is_active ? 'success' : 'default'} />
                                                    </Stack>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1 }}>
                            <CardHeader avatar={<Security color="primary" />} title="Vendor Hierarchy Overview" />
                            <CardContent>
                                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                                    <Chip label={`Total Orgs: ${vendorSummary.total}`} size="small" />
                                    <Chip label={`Vendors: ${vendorSummary.vendors}`} size="small" />
                                    <Chip label={`Sub-vendors: ${vendorSummary.subVendors}`} size="small" />
                                    <Chip label={`Agents: ${vendorSummary.agents}`} size="small" />
                                    <Chip label={`Cashiers: ${vendorSummary.cashiers}`} size="small" />
                                </Stack>
                                <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                                    <List dense>{tree.map((org) => renderOrgNode(org))}</List>
                                </Paper>
                            </CardContent>
                        </Card>

                        <Card sx={{ borderRadius: 1 }}>
                            <CardHeader
                                avatar={<Key color="primary" />}
                                title="Vendor API Keys"
                                subheader={selectedOrg ? selectedOrg.name : 'Vendor organisation'}
                            />
                            <CardContent>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="flex-start" mb={2}>
                                    <TextField
                                        label="Scopes"
                                        value={scopesInput}
                                        onChange={(event) => setScopesInput(event.target.value)}
                                        size="small"
                                        helperText="Comma-separated scopes"
                                        fullWidth
                                    />
                                    <TextField
                                        label="Expires At"
                                        value={expiresInput}
                                        onChange={(event) => setExpiresInput(event.target.value)}
                                        size="small"
                                        helperText="ISO timestamp"
                                        fullWidth
                                    />
                                    <Button variant="contained" startIcon={<Add />} onClick={handleCreateKey} sx={{ minWidth: 130 }}>
                                        Issue Key
                                    </Button>
                                </Stack>

                                <List dense>
                                    {selectedKeys.map((apiKey) => (
                                        <React.Fragment key={apiKey.id}>
                                            <ListItem
                                                secondaryAction={
                                                    <Stack direction="row" spacing={1}>
                                                        <Tooltip title="Rotate Key">
                                                            <IconButton onClick={() => rotateKey(apiKey.id)}>
                                                                <Loop />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Revoke Key">
                                                            <IconButton onClick={() => revokeKey(apiKey.id)}>
                                                                <Key />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="View Audit">
                                                            <IconButton onClick={() => openAuditDialog(apiKey)}>
                                                                <Visibility />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton color="error" onClick={() => removeKey(apiKey.id)}>
                                                                <Delete />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                }
                                            >
                                                <ListItemText
                                                    primary={apiKey.key_id}
                                                    secondary={
                                                        <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                                                            <Chip label={apiKey.is_active ? 'Active' : 'Inactive'} color={apiKey.is_active ? 'success' : 'default'} size="small" />
                                                            <Chip label={`Expires: ${formatDate(apiKey.expires_at)}`} size="small" />
                                                            {apiKey.scopes.map((scope) => (
                                                                <Chip key={scope} label={scope} size="small" variant="outlined" />
                                                            ))}
                                                        </Stack>
                                                    }
                                                />
                                            </ListItem>
                                            <Divider component="li" />
                                        </React.Fragment>
                                    ))}
                                </List>

                                {lastIssuedSecret && (
                                    <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: 'success.light' }}>
                                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle2">API key issued</Typography>
                                                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                                    Secret: {lastIssuedSecret.key_id}.{lastIssuedSecret.secret}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Button startIcon={<ContentCopy />} onClick={copySecret}>
                                                    Copy
                                                </Button>
                                                <Button onClick={() => setLastIssuedSecret(null)}>Hide</Button>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                )}
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            <Dialog open={tenantModalState.open} onClose={closeTenantModal} maxWidth="sm" fullWidth>
                <DialogTitle>{tenantModalState.mode === 'create' ? 'Add Tenant' : 'Edit Tenant'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Tenant Name" value={tenantForm.name} onChange={(event) => setTenantForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth />
                        <TextField label="Slug" value={tenantForm.slug} onChange={(event) => setTenantForm((prev) => ({ ...prev, slug: event.target.value }))} fullWidth />
                        <TextField label="Domain" value={tenantForm.domain} onChange={(event) => setTenantForm((prev) => ({ ...prev, domain: event.target.value }))} fullWidth />
                        <TextField label="Subdomain" value={tenantForm.subdomain} onChange={(event) => setTenantForm((prev) => ({ ...prev, subdomain: event.target.value }))} fullWidth />
                        <TextField select label="Plan" value={tenantForm.plan} onChange={(event) => setTenantForm((prev) => ({ ...prev, plan: event.target.value }))} fullWidth>
                            <MenuItem value="Standard">Standard</MenuItem>
                            <MenuItem value="Growth">Growth</MenuItem>
                            <MenuItem value="Enterprise">Enterprise</MenuItem>
                        </TextField>
                        <TextField label="Trial Ends At" value={tenantForm.trial_ends_at} onChange={(event) => setTenantForm((prev) => ({ ...prev, trial_ends_at: event.target.value }))} fullWidth />
                        <Stack direction="row" spacing={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={tenantForm.is_trial} onChange={(event) => setTenantForm((prev) => ({ ...prev, is_trial: event.target.checked }))} />
                                <Typography>Trial</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={tenantForm.is_active} onChange={(event) => setTenantForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                                <Typography>Active</Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeTenantModal}>Cancel</Button>
                    <Button variant="contained" onClick={handleTenantModalSubmit}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={domainModalOpen} onClose={() => setDomainModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Domain</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Domain" value={domainForm.domain} onChange={(event) => setDomainForm((prev) => ({ ...prev, domain: event.target.value }))} fullWidth />
                        <Stack direction="row" spacing={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={domainForm.is_primary} onChange={(event) => setDomainForm((prev) => ({ ...prev, is_primary: event.target.checked }))} />
                                <Typography>Primary</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={domainForm.is_active} onChange={(event) => setDomainForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                                <Typography>Active</Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDomainModalOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddDomain}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={userRoleModalState.open} onClose={closeUserRoleModal} maxWidth="xs" fullWidth>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {userRoleModalState.user?.user_email}
                        </Typography>
                        <TextField select label="Role" value={userRoleForm.role} onChange={(event) => setUserRoleForm((prev) => ({ ...prev, role: event.target.value }))} fullWidth>
                            <MenuItem value="owner">Owner</MenuItem>
                            <MenuItem value="tenant_admin">Tenant Admin</MenuItem>
                            <MenuItem value="finance_admin">Finance Admin</MenuItem>
                            <MenuItem value="manager">Manager</MenuItem>
                            <MenuItem value="support">Support</MenuItem>
                            <MenuItem value="member">Member</MenuItem>
                        </TextField>
                        <Stack direction="row" spacing={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={userRoleForm.is_tenant_admin} onChange={(event) => setUserRoleForm((prev) => ({ ...prev, is_tenant_admin: event.target.checked }))} />
                                <Typography>Admin</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Switch checked={userRoleForm.is_active} onChange={(event) => setUserRoleForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                                <Typography>Active</Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeUserRoleModal}>Cancel</Button>
                    <Button variant="contained" onClick={handleUserRoleSubmit}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteTenantOpen} onClose={() => setDeleteTenantOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Tenant</DialogTitle>
                <DialogContent>
                    <Typography>
                        Delete {selectedTenant.name}? The screen will keep showing manual fallback data after the action.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTenantOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteTenant}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={auditModalState.open} onClose={() => setAuditModalState((prev) => ({ ...prev, open: false }))} maxWidth="sm" fullWidth>
                <DialogTitle>API Key Audit</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        {auditModalState.keyLabel}
                    </Typography>
                    <List dense>
                        {auditModalState.entries.map((entry) => (
                            <ListItem key={entry.id} divider>
                                <ListItemText
                                    primary={entry.event}
                                    secondary={`${entry.actor} • ${entry.ip_address} • ${formatDate(entry.created_at)}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAuditModalState((prev) => ({ ...prev, open: false }))}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TenantAdmin;