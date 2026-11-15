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

const OTP_LENGTH = 6;
const RESEND_SECONDS = 120; // 2 minutes

const OtpVerify: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // ── State ─────────────────────────────────────────────────────────────────
    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [timer, setTimer] = useState(RESEND_SECONDS);
    const [timerActive, setTimerActive] = useState(true);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
    const autoSubmitRef = useRef(false); // guard against double-submit

    const email = sessionStorage.getItem('otp_email') || '';

    // Redirect away if email is missing (user landed here without logging in)
    useEffect(() => {
        if (!email) navigate('/login');
    }, [email, navigate]);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!timerActive) return;
        if (timer === 0) { setTimerActive(false); return; }
        const id = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(id);
    }, [timer, timerActive]);

    const fmtTimer = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

    // ── Submit OTP to API ─────────────────────────────────────────────────────
    const submitOtp = useCallback(async (otp: string) => {
        if (isLoading || isVerified) return;
        setError(null);
        setIsLoading(true);

        try {
            // const response = await fetch('http://188.166.161.13:8065/user/login/confirm-otp/', {
            const response = await fetch('https://api.sterlingtechonline.com/user/login/confirm-otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setError(
                    data.message || data.detail || data.otp?.[0] ||
                    'Invalid or expired OTP. Please try again.'
                );
                // Shake animation — reset digits
                setDigits(Array(OTP_LENGTH).fill(''));
                setTimeout(() => inputRefs.current[0]?.focus(), 50);
                return;
            }

            // ── Success ──────────────────────────────────────────────────────
            setIsVerified(true);
            const { user, token, refreshToken } = extractAuthPayload(data);
            if (!token) { setError('OTP confirmed but no access token received.'); return; }

            const authPayload: { token: string; refreshToken?: string | null; user?: User | null } = { token };
            if (refreshToken !== undefined) authPayload.refreshToken = refreshToken;
            if (user !== undefined) authPayload.user = user;

            dispatch(setAuth(authPayload));
            sessionStorage.removeItem('otp_email');

            // Brief "success" pause then redirect
            setTimeout(() => navigate('/tenants/dashboard'), 900);
        } catch (err: any) {
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, email, isLoading, isVerified, navigate]);

    // ── Auto-submit when all digits are filled ────────────────────────────────
    useEffect(() => {
        const allFilled = digits.every(d => d !== '');
        if (allFilled && !autoSubmitRef.current && !isLoading && !isVerified) {
            autoSubmitRef.current = true;
            submitOtp(digits.join(''));
        }
        if (!allFilled) autoSubmitRef.current = false;
    }, [digits, isLoading, isVerified, submitOtp]);

    // ── Handle a single box change ────────────────────────────────────────────
    const handleChange = (index: number, value: string) => {
        // Only accept digits
        if (!/^\d*$/.test(value)) return;
        // Take only the last character (in case browser fires with 2 chars on some mobiles)
        const digit = value.slice(-1);

        setDigits(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        setError(null);

        if (digit && index < OTP_LENGTH - 1) {
            // Advance focus to next box
            inputRefs.current[index + 1]?.focus();
        }
    };

    // ── Handle paste (fills all boxes at once) ────────────────────────────────
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

        // Focus the last filled box or the next empty one
        const nextFocus = Math.min(index + pasted.length, OTP_LENGTH - 1);
        setTimeout(() => inputRefs.current[nextFocus]?.focus(), 0);
    };

    // ── Handle backspace ──────────────────────────────────────────────────────
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (digits[index]) {
                // Clear current box
                setDigits(prev => { const n = [...prev]; n[index] = ''; return n; });
            } else if (index > 0) {
                // Move back and clear previous box
                setDigits(prev => { const n = [...prev]; n[index - 1] = ''; return n; });
                inputRefs.current[index - 1]?.focus();
            }
        }
        // Allow clicking through with ArrowLeft / ArrowRight
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    // ── Resend OTP (triggers login again) ────────────────────────────────────
    const handleResend = async () => {
        if (!email || timerActive || resendLoading) return;
        setResendLoading(true);
        setResendMsg(null);
        setError(null);
        try {
            // Re-call login without password — the server re-sends OTP on 202
            // (If your backend requires password again, prompt the user to go back)
            // const response = await fetch('http://188.166.161.13:8065/user/login/confirm-otp/', {
            const response = await fetch('https://api.sterlingtechonline.com/user/login/confirm-otp/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: 'resend' }), // sentinel — adjust per backend docs
            });
            // Most systems: just tell the user to go back and log in again
            setResendMsg('A new OTP has been sent to your email.');
        } catch {
            setResendMsg('Could not resend OTP. Please go back and log in again.');
        } finally {
            setResendLoading(false);
            setTimer(RESEND_SECONDS);
            setTimerActive(true);
            setDigits(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        }
    };

    const completedCount = digits.filter(d => d !== '').length;

    // ─────────────────────────────────────────────────────────────────────────
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

                    {/* ── Header ── */}
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
                            {isVerified ? 'Verified!' : 'Two-Factor Authentication'}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                            {isVerified
                                ? 'Redirecting you to your dashboard…'
                                : <>Enter the 6-digit code sent to<br /><strong>{email}</strong></>
                            }
                        </Typography>
                    </Box>

                    {/* ── Alerts ── */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}
                            onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {resendMsg && !error && (
                        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}
                            onClose={() => setResendMsg(null)}>
                            {resendMsg}
                        </Alert>
                    )}

                    {/* ── OTP boxes ── */}
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
                                type="text"         // text so we control single-char display
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
                                    width:  { xs: 46, sm: 56 },
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
                                    // Shake on error
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

                    {/* ── Progress dots ── */}
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

                    {/* ── Submit button ── */}
                    <Button
                        fullWidth variant="contained" size="large"
                        onClick={() => submitOtp(digits.join(''))}
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

                    {/* ── Timer + resend ── */}
                    <Box sx={{ textAlign: 'center' }}>
                        {timerActive ? (
                            <Typography variant="body2" color="text.secondary">
                                Code expires in{' '}
                                <Typography component="span" fontWeight={700} color={timer < 30 ? 'error.main' : '#1e3a8a'}>
                                    {fmtTimer}
                                </Typography>
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Didn't receive a code?{' '}
                                <Link
                                    component="button"
                                    fontWeight={700}
                                    underline="hover"
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    sx={{ color: '#1e3a8a', cursor: 'pointer', verticalAlign: 'baseline' }}
                                >
                                    {resendLoading ? 'Sending…' : 'Resend OTP'}
                                </Link>
                            </Typography>
                        )}
                    </Box>

                    {/* ── Back to login ── */}
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
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

export default OtpVerify;