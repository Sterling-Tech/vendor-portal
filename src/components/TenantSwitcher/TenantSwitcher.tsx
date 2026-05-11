import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    Typography,
    Box,
    TextField,
    InputAdornment,
    CircularProgress,
    Divider,
} from '@mui/material';
import { Business as BusinessIcon, Search as SearchIcon, ErrorOutline } from '@mui/icons-material';
import { Tenant, tenantService } from '../../services/tenantService';
import { getApiKeyCredentials } from '../../utils/apiKeyStorage';

interface TenantSwitcherProps {
    onTenantChange: (tenant: Tenant) => void;
    currentTenantId?: string;
}

const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ onTenantChange, currentTenantId }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [tenants, setTenants] = useState<Tenant[]>(() => {
        const savedTenant = localStorage.getItem('currentTenant');
        if (savedTenant) {
            try {
                const parsed = JSON.parse(savedTenant) as Tenant;
                return parsed?.id ? [parsed] : [];
            } catch (error) {
                console.error('TenantSwitcher - failed to parse saved tenant', error);
            }
        }
        return [];
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchTick, setFetchTick] = useState(0);

    const fetchTenants = useCallback(
        async (query: string) => {
            // Check if either API key or JWT token is available
            const hasApiKey = !!getApiKeyCredentials();
            const hasToken = !!localStorage.getItem('token');

            if (!hasApiKey && !hasToken) {
                setError('Awaiting secure session. Please try again shortly.');
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const results = await tenantService.getAllTenants({
                    search: query || undefined,
                    ordering: 'name',
                });

                let finalResults = [...results];

                if (currentTenantId && !results.some((tenant) => tenant.id === currentTenantId)) {
                    try {
                        const tenant = await tenantService.getTenantById(currentTenantId);
                        if (tenant?.id) {
                            finalResults = [tenant, ...finalResults];
                        }
                    } catch (tenantError) {
                        console.warn('TenantSwitcher - failed to fetch selected tenant', tenantError);
                    }
                }

                const unique = new Map<string, Tenant>();
                finalResults.forEach((tenant) => unique.set(tenant.id, tenant));
                setTenants(Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err: any) {
                console.error('TenantSwitcher - failed to load tenants', err);
                const message =
                    typeof err?.message === 'string'
                        ? err.message
                        : err?.status
                            ? `Request failed with status ${err.status}`
                            : 'Unable to load tenants';
                setError(message);
            } finally {
                setLoading(false);
            }
        },
        [currentTenantId],
    );

    useEffect(() => {
        if (!anchorEl) {
            return;
        }
        const debounce = setTimeout(() => {
            fetchTenants(searchTerm);
        }, 300);
        return () => clearTimeout(debounce);
    }, [anchorEl, searchTerm, fetchTenants, fetchTick]);

    useEffect(() => {
        if (anchorEl) {
            setFetchTick((tick) => tick + 1);
        }
    }, [anchorEl]);

    useEffect(() => {
        if (!currentTenantId || tenants.some((tenant) => tenant.id === currentTenantId)) {
            return;
        }
        let active = true;
        tenantService
            .getTenantById(currentTenantId)
            .then((tenant) => {
                if (!active || !tenant?.id) {
                    return;
                }
                setTenants((prev) => {
                    if (prev.some((item) => item.id === tenant.id)) {
                        return prev;
                    }
                    return [tenant, ...prev].sort((a, b) => a.name.localeCompare(b.name));
                });
            })
            .catch((err) => {
                console.warn('TenantSwitcher - unable to hydrate current tenant', err);
            });
        return () => {
            active = false;
        };
    }, [currentTenantId, tenants]);

    const noTenantsMessage = useMemo(() => {
        if (loading) return 'Loading tenants...';
        if (error) return null;
        if (tenants.length === 0 && searchTerm) {
            return 'No tenants match your search.';
        }
        if (tenants.length === 0) {
            return 'No tenants available.';
        }
        return null;
    }, [loading, error, tenants.length, searchTerm]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleTenantSelect = (tenant: Tenant) => {
        onTenantChange(tenant);
        handleClose();
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    return (
        <Box>
            <IconButton
                color="inherit"
                onClick={handleClick}
                aria-controls="tenant-menu"
                aria-haspopup="true"
            >
                <BusinessIcon />
            </IconButton>
            <Menu
                id="tenant-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: 320, maxHeight: 420 },
                }}
            >
                <Box sx={{ p: 1.5, pb: 1 }}>
                    <TextField
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Search tenants..."
                        size="small"
                        fullWidth
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
                <Divider />
                {loading && (
                    <MenuItem disabled sx={{ py: 2, justifyContent: 'center' }}>
                        <CircularProgress size={18} sx={{ mr: 1 }} />
                        <Typography variant="body2">Loading tenants...</Typography>
                    </MenuItem>
                )}
                {error && (
                    <MenuItem disabled sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ErrorOutline color="error" fontSize="small" />
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>
                        </Box>
                    </MenuItem>
                )}
                {!loading && !error && noTenantsMessage && (
                    <MenuItem disabled>
                        <Typography variant="body2">{noTenantsMessage}</Typography>
                    </MenuItem>
                )}
                {tenants.length > 0 &&
                    tenants.map((tenant) => (
                        <MenuItem
                            key={tenant.id}
                            selected={tenant.id === currentTenantId}
                            onClick={() => handleTenantSelect(tenant)}
                        >
                            <Typography variant="body2">{tenant.name}</Typography>
                        </MenuItem>
                    ))}
            </Menu>
        </Box>
    );
};

export default TenantSwitcher;

