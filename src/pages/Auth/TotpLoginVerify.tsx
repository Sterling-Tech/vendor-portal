import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Card, CardContent, Button, Typography,
    Alert, CircularProgress, Link,
} from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/store';
import { extractAuthPayload, setAuth } from '../../store/slices/authSlice';
import type { User } from '../../store/slices/authSlice';
import { verifyTotpLogin } from '../../services/settingService';

const OTP_LENGTH = 6;

const TotpLoginVerify: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
    const autoSubmitRef = useRef(false);

    const email = sessionStorage.getItem('otp_email') || '';

    useEffect(() => {
        if (!email) navigate('/login');
    }, [email, navigate]);

    const submitTotp = useCallback(async (otp: string) => {
        if (isLoading || isVerified) return;
        setError(null);
        setIsLoading(true);

        try {
            const data = await verifyTotpLogin({ email, otp });

            setIsVerified(true);
            const { user, token, refreshToken } = extractAuthPayload(data);
            if (!token) {
                setError('Verification succeeded but no access token received.');
                return;
            }

            const authPayload: { token: string; refreshToken?: string | null; user?: User | null } = { token };
            if (refreshToken !== undefined) authPayload.refreshToken = refreshToken;
            if (user !== undefined) authPayload.user = user;

            dispatch(setAuth(authPayload));
            sessionStorage.removeItem('otp_email');

            setTimeout(() => navigate('/tenants/dashboard'), 900);
        } catch (err: any) {
            setError(err.message || 'Invalid code. Please try again.');
            setDigits(Array(OTP_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, email, isLoading, isVerified, navigate]);

    useEffect(() => {
        const allFilled = digits.every(d => d !== '');
        if (allFilled && !autoSubmitRef.current && !isLoading && !isVerified) {
            autoSubmitRef.current = true;
            submitTotp(digits.join(''));
        }
        if (!allFilled) autoSubmitRef.current = false;
    }, [digits, isLoading, isVerified, submitTotp]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        setDigits(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        setError(null);
        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent, index: number) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (!pasted) return;
        setDigits(prev => {
            const next = [...prev];
            pasted.split('').forEach((ch, i) => {
                if (index + i < OTP_LENGTH) next[index + i] = ch;
            });
            return next;
        });
        setError(null);
        const nextFocus = Math.min(index + pasted.length, OTP_LENGTH - 1);
        setTimeout(() => inputRefs.current[nextFocus]?.focus(), 0);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (digits[index]) {
                setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
            } else if (index > 0) {
                setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
                inputRefs.current[index - 1]?.focus();
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const completedCount = digits.filter(d => d !== '').length;

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
            padding: 2,
        }}>
            <Card sx={{
                maxWidth: 460, width: '100%', borderRadius: 4,
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                overflow: 'visible',
                animation: 'fadeUp 0.4s ease',
                '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Box sx={{ textAlign: 'center', mb: 3.5 }}>
                        <Box sx={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: isVerified ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 2, transition: 'background 0.5s ease',
                            boxShadow: '0 8px 24px rgba(30,58,138,0.35)',
                        }}>
                            {isVerified ? (
                                <Typography sx={{ fontSize: 32 }}>✓</Typography>
                            ) : (
                                <LockIcon sx={{ fontSize: 36, color: '#fff' }} />
                            )}
                        </Box>

                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            {isVerified ? 'Verified!' : 'Authenticator Code'}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                            {isVerified
                                ? 'Redirecting you to your dashboard…'
                                : <>Enter the 6-digit code from your<br /><strong>Google Authenticator</strong> app</>
                            }
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}
                            onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{
                        display: 'flex', gap: { xs: 1, sm: 1.5 },
                        justifyContent: 'center', mb: 3,
                        opacity: isVerified ? 0.5 : 1, transition: 'opacity 0.3s',
                    }}>
                        {digits.map((digit, i) => (
                            <Box
                                key={i}
                                component="input"
                                inputMode="numeric"
                                type="text"
                                maxLength={1}
                                value={digit}
                                ref={el => { inputRefs.current[i] = el as HTMLInputElement | null; }}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e as any)}
                                onPaste={e => handlePaste(e as any, i)}
                                onFocus={e => (e.target as HTMLInputElement).select()}
                                disabled={isLoading || isVerified}
                                autoFocus={i === 0}
                                sx={{
                                    width: { xs: 46, sm: 56 },
                                    height: { xs: 56, sm: 68 },
                                    fontSize: { xs: 22, sm: 28 },
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    border: '2.5px solid',
                                    borderColor: digit
                                        ? (error ? '#ef4444' : '#1e3a8a')
                                        : '#d1d5db',
                                    borderRadius: '14px',
                                    bgcolor: digit
                                        ? (error ? '#fef2f2' : '#eff6ff')
                                        : '#f8faff',
                                    outline: 'none',
                                    cursor: 'text',
                                    transition: 'all 0.18s ease',
                                    color: error ? '#dc2626' : '#1e3a8a',
                                    caretColor: '#1e3a8a',
                                    animation: error ? 'shake 0.4s ease' : 'none',
                                    '@keyframes shake': {
                                        '0%, 100%': { transform: 'translateX(0)' },
                                        '20%': { transform: 'translateX(-5px)' },
                                        '40%': { transform: 'translateX(5px)' },
                                        '60%': { transform: 'translateX(-4px)' },
                                        '80%': { transform: 'translateX(4px)' },
                                    },
                                    '&:focus': {
                                        borderColor: '#3b82f6',
                                        bgcolor: '#fff',
                                        boxShadow: '0 0 0 4px rgba(59,130,246,0.15)',
                                        transform: 'scale(1.07)',
                                    },
                                    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
                                }}
                            />
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mb: 3 }}>
                        {digits.map((d, i) => (
                            <Box key={i} sx={{
                                width: d ? 10 : 7, height: d ? 10 : 7,
                                borderRadius: '50%',
                                bgcolor: d ? '#1e3a8a' : '#d1d5db',
                                transition: 'all 0.2s ease',
                            }} />
                        ))}
                    </Box>

                    <Button
                        fullWidth variant="contained" size="large"
                        onClick={() => submitTotp(digits.join(''))}
                        disabled={completedCount < OTP_LENGTH || isLoading || isVerified}
                        sx={{
                            height: 52, borderRadius: 2.5, fontWeight: 700,
                            textTransform: 'none', fontSize: 16, mb: 2.5,
                            bgcolor: isVerified ? '#16a34a' : '#1e3a8a',
                            '&:hover': { bgcolor: isVerified ? '#15803d' : '#1e40af' },
                            transition: 'background 0.4s ease',
                        }}
                    >
                        {isLoading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : isVerified ? (
                            '✓ Verified — Redirecting…'
                        ) : (
                            `Verify Code (${completedCount}/${OTP_LENGTH})`
                        )}
                    </Button>

                    <Box sx={{ textAlign: 'center' }}>
                        <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => { sessionStorage.removeItem('otp_email'); navigate('/login'); }}
                            sx={{ color: 'text.secondary', cursor: 'pointer' }}
                        >
                            ← Back to Login
                        </Link>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default TotpLoginVerify;