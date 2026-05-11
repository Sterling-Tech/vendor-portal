import React, { useState, useEffect } from 'react';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    useTheme,
    useMediaQuery,
    Tooltip,
    Chip,
    Stack,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard,
    Business,
    AccountBalance,
    Receipt,
    Analytics,
    Settings,
    Notifications,
    Logout,
    Assessment,
    PointOfSale,
    PeopleAlt,
    Palette,
    PhoneAndroid,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import TenantSwitcher from '../TenantSwitcher/TenantSwitcher';
import DashboardModal from '../DashboardModal/DashboardModal';
import { useVendorHierarchy } from '../../contexts/VendorContext';
import { useEnsureUserApiKey } from '../../hooks/useEnsureUserApiKey';

const drawerWidth = 240;

interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain: string;
    subdomain?: string;
    is_active: boolean;
    is_trial?: boolean;
    trial_ends_at?: string;
    created_at?: string;
}

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { tenantId, setTenantId } = useVendorHierarchy();
    useEnsureUserApiKey(user?.id ?? null);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [dashboardModalOpen, setDashboardModalOpen] = useState(false);

    useEffect(() => {
        const savedTenant = localStorage.getItem('currentTenant');
        if (savedTenant) {
            try {
                const tenant = JSON.parse(savedTenant) as Tenant;
                setCurrentTenant(tenant);
                if (!tenantId || tenantId !== tenant.id) {
                    setTenantId(tenant.id);
                }
            } catch (error) {
                console.error('Layout - Failed to parse saved tenant:', error);
                localStorage.removeItem('currentTenant');
            }
        } else if (tenantId) {
            const fallback = localStorage.getItem('currentTenantId');
            if (fallback && fallback !== tenantId) {
                setTenantId(fallback);
            }
        }
    }, [tenantId, setTenantId]);

    const handleTenantChange = (tenant: Tenant) => {
        console.log('Layout - Tenant changed to:', tenant);
        setCurrentTenant(tenant);
        localStorage.setItem('currentTenantId', tenant.id);
        localStorage.setItem('currentTenant', JSON.stringify(tenant));
        setTenantId(tenant.id);
    };

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, path: '/tenants/dashboard' },
        { text: 'Vendors', icon: <Business />, path: '/tenants/vendors' },
        { text: 'Wallets', icon: <AccountBalance />, path: '/tenants/wallets' },
        { text: 'Prepaid', icon: <PhoneAndroid />, path: '/prepaid' },
        { text: 'Agents', icon: <PeopleAlt />, path: '/agents' },
        { text: 'POS', icon: <PointOfSale />, path: '/pos' },
        { text: 'Transactions', icon: <Receipt />, path: '/transactions' },
        { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
        { text: 'Settings', icon: <Settings />, path: '/settings' },
    ];

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        dispatch(logoutUser());
        navigate('/login');
        handleMenuClose();
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const drawer = (
        <Box>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        QC
                    </Avatar>
                    <Typography variant="h6" noWrap component="div">
                        QuickCash
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: 'white',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap component="div">
                            Vendor Portal
                        </Typography>
                        <Chip
                            icon={<Palette fontSize="small" />}
                            label="Brand Mode"
                            size="small"
                            color="secondary"
                            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                        />
                        {currentTenant && (
                            <Typography variant="caption" sx={{ ml: 2, opacity: 0.7 }}>
                                ({currentTenant.name})
                            </Typography>
                        )}
                    </Stack>
                    <TenantSwitcher
                        onTenantChange={handleTenantChange}
                        currentTenantId={currentTenant?.id}
                    />
                    <Tooltip title="Comprehensive Dashboard">
                        <IconButton color="inherit" sx={{ mr: 1 }} onClick={() => setDashboardModalOpen(true)}>
                            <Assessment />
                        </IconButton>
                    </Tooltip>
                    <IconButton color="inherit" sx={{ mr: 1 }}>
                        <Notifications />
                    </IconButton>
                    <IconButton onClick={handleMenuOpen}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                            {user?.firstName?.charAt(0) || 'U'}
                        </Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={handleMenuClose}>
                            <ListItemIcon>
                                <Settings />
                            </ListItemIcon>
                            <ListItemText>Settings</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <ListItemIcon>
                                <Logout />
                            </ListItemIcon>
                            <ListItemText>Logout</ListItemText>
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: 8,
                }}
            >
                {children}
            </Box>
            <DashboardModal open={dashboardModalOpen} onClose={() => setDashboardModalOpen(false)} />
        </Box>
    );
};

export default Layout;

