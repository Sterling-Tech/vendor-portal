import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { VendorProvider } from './contexts/VendorContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Tenants/Dashboard/Dashboard';
import VendorManagement from './pages/Tenants/Vendors/VendorManagement';
import VendorDetails from './pages/Tenants/Vendors/VendorDetails';
import WalletManagement from './pages/Tenants/Wallets/WalletManagement';
import TransactionManagement from './pages/Transactions/TransactionManagement';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import Layout from './components/Layout/Layout';
import PointOfSale from './pages/POS/PointOfSale';
import AgentConsole from './pages/Agents/AgentConsole';
import PrepaidServices from './pages/Prepaid/PrepaidServices';

// Enhanced theme
const theme = createTheme({
    palette: {
        primary: {
            main: '#0047ab',
            light: '#4f7fd1',
            dark: '#003586',
        },
        secondary: {
            main: '#ff6f61',
            light: '#ffa296',
            dark: '#c43f31',
        },
        background: {
            default: '#f2f5fa',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 12px 30px rgba(15, 51, 107, 0.08)',
                    border: '1px solid rgba(15, 51, 107, 0.08)',
                    background:
                        'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(244,247,252,0.92) 100%)',
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background:
                        'linear-gradient(180deg, rgba(238,244,252,1) 0%, rgba(247,250,255,1) 40%, rgba(255,255,255,1) 100%)',
                    minHeight: '100vh',
                },
            },
        },
    },
});

const App: React.FC = () => {
    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <VendorProvider>
                    <Router
                        future={{
                            v7_startTransition: true,
                            v7_relativeSplatPath: true,
                        }}
                    >
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route
                                path="/tenants/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <Dashboard />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenants/vendors"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <VendorManagement />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenants/vendors/:vendorId"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <VendorDetails />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/prepaid"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <PrepaidServices />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenants/wallets"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <WalletManagement />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/pos"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <PointOfSale />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/agents"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <AgentConsole />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/transactions"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <TransactionManagement />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/analytics"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <Analytics />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/settings"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <Settings />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/tenants/dashboard" replace />} />
                            <Route path="/dashboard" element={<Navigate to="/tenants/dashboard" replace />} />
                            <Route path="/vendors" element={<Navigate to="/tenants/vendors" replace />} />
                            <Route path="/wallets" element={<Navigate to="/tenants/wallets" replace />} />
                        </Routes>
                    </Router>
                </VendorProvider>
            </ThemeProvider>
        </Provider>
    );
};

export default App;