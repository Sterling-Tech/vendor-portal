import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Card, CardContent, TextField, Button, Typography,
    Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/store';
import { extractAuthPayload, setAuth } from '../../store/slices/authSlice';
import type { User } from '../../store/slices/authSlice';

interface LoginFormData { email: string; password: string }

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasCheckedAuth = useRef(false);

    useEffect(() => {
        if (hasCheckedAuth.current) return;
        const token = localStorage.getItem('token');
        if (token) navigate('/tenants/dashboard');
        hasCheckedAuth.current = true;
    }, [navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch('http://188.166.161.13:8065/user/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', { status: response.status, body: text });
                setError('Server returned invalid response format');
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || data.detail || 'Login failed. Please try again.');
                return;
            }

            // ── Check if TOTP authenticator is required ────────────────────
            const user = data.user;
            const needsTotp = user?.is_2fa_enabled && user?.two_fa_method === 'authenticator' && user?.totp_confirmed;
            if (needsTotp) {
                sessionStorage.setItem('otp_email', formData.email);
                navigate('/totp-verify');
                return;
            }

            // ── 202 → Email 2FA is ON — OTP has been sent to email ────────
            if (response.status === 202) {
                sessionStorage.setItem('otp_email', formData.email);
                navigate('/otp-verify');
                return;
            }

            // ── 200 → Direct login ────────────────────────────────────────
            const { user: authUser, token, refreshToken } = extractAuthPayload(data);
            if (!token) { setError('Login response did not include an access token'); return; }

            const authPayload: { token: string; refreshToken?: string | null; user?: User | null } = { token };
            if (refreshToken !== undefined) authPayload.refreshToken = refreshToken;
            if (authUser !== undefined) authPayload.user = authUser;

            dispatch(setAuth(authPayload));
            navigate('/tenants/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
            padding: 2,
        }}>
            <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 4, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <LoginIcon sx={{ fontSize: 32, color: '#fff' }} />
                        </Box>
                        <Typography variant="h4" fontWeight={800} gutterBottom>QuickCash Vendor Portal</Typography>
                        <Typography variant="body2" color="text.secondary">Sign in to access your vendor dashboard.</Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <TextField fullWidth label="Email Address" name="email" type="email"
                            value={formData.email} onChange={handleInputChange}
                            margin="normal" required autoComplete="email" autoFocus
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }} />

                        <TextField fullWidth label="Password" name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password} onChange={handleInputChange}
                            margin="normal" required autoComplete="current-password"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8faff' } }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(p => !p)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }} />

                        <Button type="submit" fullWidth variant="contained" size="large"
                            disabled={isLoading}
                            sx={{ mt: 3, mb: 2, borderRadius: 2, height: 50, fontWeight: 700, textTransform: 'none', fontSize: 16, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}>
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Login;