import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Switch, FormControlLabel, Alert, Snackbar, Tabs, Tab,
  MenuItem, CircularProgress, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import {
  Security as SecurityIcon, AccountCircle as AccountIcon,
  Save as SaveIcon, SettingsApplications as ConfigIcon,
  Shield as ShieldIcon, History as HistoryIcon,
  PhonelinkLock as PhonelinkLockIcon, Policy as PolicyIcon,
  CheckCircle as CheckCircleIcon, Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setAuth } from "../../store/slices/authSlice";
import CreateNewAdmin from "./CreateNewAdmin";
import AllAdmin from "./AllAdmin";
import AssignPermission from "./AssignPermission";
import AuditLogs from "./Auditlogs";
import {
  changePassword, extractError, updateProfile,
  setupTotp, confirmTotp, disableTotp,
  getPasswordPolicy, updatePasswordPolicy,
  type PasswordPolicy,
} from "../../services/settingService";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("accessToken") ||
  "";

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "#f8faff",
  },
};

const Settings: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    gender: "",
    phone_number: "",
    email: "",
    user_type: "",
  });
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityForm, setSecurityForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const twoFaMethod = (user as any)?.two_fa_method || "email";
  const totpConfirmed = Boolean((user as any)?.totp_confirmed);
  const totpActive = twoFaMethod === "authenticator" && totpConfirmed;

  const [totpSetupMode, setTotpSetupMode] = useState(false);
  const [totpSettingUp, setTotpSettingUp] = useState(false);
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; otpauth_uri: string; qr_code: string } | null>(null);
  const [totpOtp, setTotpOtp] = useState("");
  const [totpConfirming, setTotpConfirming] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpDisableConfirmOpen, setTotpDisableConfirmOpen] = useState(false);
  const [totpDisabling, setTotpDisabling] = useState(false);

  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState<PasswordPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyLoadError, setPolicyLoadError] = useState<string | null>(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user?.name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        gender: user.gender || "",
        phone_number: user.phone_number || user.phone || "",
        email: user.email || "",
        user_type: user.user_type || user.role || "",
      });
      setIs2faEnabled(Boolean(user.is_2fa_enabled));
    }
  }, [user]);

  useEffect(() => {
    const loadPolicy = async () => {
      setPolicyLoading(true);
      setPolicyLoadError(null);
      try {
        const data = await getPasswordPolicy();
        setPolicy(data);
        setPolicyForm(data);
      } catch (err: any) {
        setPolicyLoadError(extractError(err));
        setPolicy(null);
        setPolicyForm(null);
      } finally {
        setPolicyLoading(false);
      }
    };
    loadPolicy();
  }, []);

  const passwordChecks = useMemo(() => {
    if (!policy) return null;
    const pwd = securityForm.new_password || "";
    const checks: { label: string; passed: boolean }[] = [
      { label: `At least ${policy.min_length} characters`, passed: pwd.length >= policy.min_length },
    ];
    if (policy.require_upper) checks.push({ label: "One uppercase letter (A-Z)", passed: /[A-Z]/.test(pwd) });
    if (policy.require_lower) checks.push({ label: "One lowercase letter (a-z)", passed: /[a-z]/.test(pwd) });
    if (policy.require_number) checks.push({ label: "One number (0-9)", passed: /[0-9]/.test(pwd) });
    if (policy.require_symbol) checks.push({ label: "One symbol (e.g. !@#$%)", passed: /[^A-Za-z0-9]/.test(pwd) });
    return checks;
  }, [policy, securityForm.new_password]);

  const handleTotpToggle = async (checked: boolean) => {
    setTotpError(null);
    if (checked) {
      setTotpSetupMode(true);
      setTotpSettingUp(true);
      try {
        const data = await setupTotp();
        setTotpSetupData(data);
        setTotpOtp("");
        setTotpDialogOpen(true);
      } catch (err: any) {
        setTotpSetupMode(false);
        setTotpError(extractError(err));
      } finally {
        setTotpSettingUp(false);
      }
    } else {
      setTotpDisableConfirmOpen(true);
    }
  };

  const handleCancelTotpSetup = () => {
    setTotpDialogOpen(false);
    setTotpSetupData(null);
    setTotpOtp("");
    setTotpError(null);
    setTotpSetupMode(false);
  };

  const handleConfirmTotp = async () => {
    if (!totpOtp.trim() || totpOtp.trim().length !== 6) {
      setTotpError("Enter the 6-digit code shown in your authenticator app.");
      return;
    }
    setTotpConfirming(true);
    setTotpError(null);
    try {
      const updated = await confirmTotp({ otp: totpOtp.trim() });
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setTotpDialogOpen(false);
      setTotpSetupData(null);
      setTotpOtp("");
      setTotpSetupMode(false);
      setSuccess("Authenticator app activated! You'll be asked for a code from it at your next login.");
    } catch (err: any) {
      setTotpError(extractError(err));
    } finally {
      setTotpConfirming(false);
    }
  };

  const handleDisableTotp = async () => {
    setTotpDisabling(true);
    setTotpError(null);
    try {
      const updated = await disableTotp();
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setTotpDisableConfirmOpen(false);
      setSuccess("Authenticator app disabled. Login codes will be sent to your email again.");
    } catch (err: any) {
      setTotpError(extractError(err));
    } finally {
      setTotpDisabling(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policyForm) return;
    setPolicyError(null);
    setPolicySaving(true);
    try {
      const { updated_at, ...payload } = policyForm;
      const updated = await updatePasswordPolicy(payload);
      setPolicy(updated);
      setPolicyForm(updated);
      setSuccess("Password policy updated successfully!");
    } catch (err: any) {
      setPolicyError(extractError(err));
    } finally {
      setPolicySaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    if (!profileForm.name.trim()) {
      setProfileError("Name is required.");
      return;
    }
    setProfileLoading(true);
    try {
      const updated = await updateProfile({
        name: profileForm.name.trim(),
        gender: profileForm.gender || undefined,
        phone_number: profileForm.phone_number || undefined,
      });
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileError(extractError(err));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggle2fa = async (checked: boolean) => {
    setTwoFaError(null);
    setToggling2fa(true);
    setIs2faEnabled(checked);
    try {
      const updated = await updateProfile({ is_2fa_enabled: checked });
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setSuccess(`Two-factor authentication ${checked ? "enabled" : "disabled"}.`);
    } catch (err: any) {
      setIs2faEnabled(!checked);
      setTwoFaError(extractError(err));
    } finally {
      setToggling2fa(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSecurityError(null);
    if (!securityForm.old_password.trim()) { setSecurityError("Current password is required."); return; }
    if (!securityForm.new_password.trim()) { setSecurityError("New password is required."); return; }
    if (securityForm.new_password !== securityForm.confirm_password) { setSecurityError("Passwords do not match."); return; }
    if (passwordChecks && passwordChecks.some(c => !c.passed)) {
      setSecurityError("Your new password doesn't meet all the requirements listed below.");
      return;
    }

    setSecurityLoading(true);
    try {
      await changePassword({
        old_password: securityForm.old_password,
        new_password: securityForm.new_password,
        confirm_password: securityForm.confirm_password,
      });
      setSuccess("Password changed successfully!");
      setSecurityForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setSecurityError(extractError(err));
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <Box p={3} sx={{ background: "#F8FAFC", minHeight: "100vh" }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800}>System Settings</Typography>
        <Typography color="#64748B" mt={1}>
          Manage account, security, notifications and organisation configurations
        </Typography>
      </Box>

      <Snackbar
        open={!!success}
        autoHideDuration={5000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}

      <Card sx={{ borderRadius: 5, overflow: "hidden", boxShadow: "0 10px 40px rgba(15,23,42,0.06)" }}>
        <Box sx={{ borderBottom: "1px solid #E2E8F0", px: 2, bgcolor: "#fff" }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<AccountIcon />} iconPosition="start" label="Account" />
            <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
            <Tab icon={<PolicyIcon />} iconPosition="start" label="Password Policy" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Admin Management" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Admin List" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Assign Permission" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Audit Logs" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Profile Information</Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Update your display name, gender and phone number.
            </Typography>

            {profileError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setProfileError(null)}>
                {profileError}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth required
                  label="Full Name"
                  value={profileForm.name}
                  onChange={e => { setProfileForm(p => ({ ...p, name: e.target.value })); setProfileError(null); }}
                  sx={inputSx}
                  helperText="Your display name across the platform"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth select
                  label="Gender"
                  value={profileForm.gender}
                  onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))}
                  sx={inputSx}
                  helperText="Optional"
                >
                  <MenuItem value=""><em>Prefer not to say</em></MenuItem>
                  {GENDER_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileForm.phone_number}
                  onChange={e => setProfileForm(p => ({ ...p, phone_number: e.target.value }))}
                  sx={inputSx}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profileForm.email}
                  disabled
                  sx={{
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx["& .MuiOutlinedInput-root"],
                      bgcolor: "#f1f5f9",
                    },
                  }}
                  helperText="Email cannot be changed here"
                />
              </Grid>
              {profileForm.user_type && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Account Type"
                    value={profileForm.user_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    disabled
                    sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], bgcolor: "#f1f5f9" } }}
                    helperText="Assigned by your organisation"
                  />
                </Grid>
              )}
            </Grid>

            <Box mt={4}>
              <Button
                variant="contained"
                startIcon={profileLoading ? undefined : <SaveIcon />}
                onClick={handleSaveProfile}
                disabled={profileLoading}
                sx={{ borderRadius: 3, textTransform: "none", px: 4, height: 46, bgcolor: "#1e3a8a", "&:hover": { bgcolor: "#1e40af" } }}
              >
                {profileLoading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Saving…</> : "Save Profile"}
              </Button>
            </Box>

            <Box mt={5}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Two-Factor Authentication</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Add an extra layer of security. When enabled, an OTP will be sent to your email each time you log in.
              </Typography>

              {twoFaError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setTwoFaError(null)}>
                  {twoFaError}
                </Alert>
              )}

              <Box sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                p: 2.5, borderRadius: 3,
                border: "2px solid",
                borderColor: is2faEnabled ? "#1e3a8a" : "#e2e8f0",
                bgcolor: is2faEnabled ? "#eff6ff" : "#f8faff",
                transition: "all 0.3s ease",
                maxWidth: 520,
              }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{
                    width: 44, height: 44, borderRadius: "50%",
                    bgcolor: is2faEnabled ? "#1e3a8a" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.3s",
                  }}>
                    <ShieldIcon sx={{ fontSize: 22, color: is2faEnabled ? "#fff" : "#94a3b8" }} />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600} fontSize={15}>Two-Factor Authentication</Typography>
                      <Chip
                        label={is2faEnabled ? "ON" : "OFF"}
                        size="small"
                        sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: is2faEnabled ? "#16a34a" : "#94a3b8", color: "#fff" }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {is2faEnabled ? "OTP will be required at every login" : "Enable to receive a login OTP via email"}
                    </Typography>
                  </Box>
                </Stack>

                {toggling2fa ? (
                  <CircularProgress size={24} sx={{ color: "#1e3a8a", flexShrink: 0 }} />
                ) : (
                  <Switch
                    checked={is2faEnabled}
                    onChange={e => handleToggle2fa(e.target.checked)}
                    sx={{
                      flexShrink: 0,
                      "& .MuiSwitch-thumb": { bgcolor: "#1e3a8a" },
                      "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#1e3a8a80" },
                    }}
                  />
                )}
              </Box>
                <Box sx={{
                  mt: 2, p: 2.5, borderRadius: 3,
                  border: "2px solid",
                  borderColor: totpActive ? "#1e3a8a" : "#e2e8f0",
                  bgcolor: totpActive ? "#eff6ff" : "#f8faff",
                  transition: "all 0.3s ease",
                  maxWidth: 520,
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{
                        width: 44, height: 44, borderRadius: "50%",
                        bgcolor: totpActive ? "#1e3a8a" : "#e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.3s",
                      }}>
                        <PhonelinkLockIcon sx={{ fontSize: 22, color: totpActive ? "#fff" : "#94a3b8" }} />
                      </Box>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600} fontSize={15}>Authenticator App</Typography>
                          <Chip
                            label={totpActive ? "ACTIVE" : "EMAIL OTP"}
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: totpActive ? "#16a34a" : "#94a3b8", color: "#fff" }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {totpActive
                            ? "Login codes come from your authenticator app"
                            : "Use an app like Google Authenticator instead of email codes"}
                        </Typography>
                      </Box>
                    </Stack>

                    {totpSettingUp ? (
                      <CircularProgress size={24} sx={{ color: "#1e3a8a", flexShrink: 0 }} />
                    ) : (
                      <Switch
                        checked={totpActive || totpSetupMode}
                        onChange={e => handleTotpToggle(e.target.checked)}
                        sx={{
                          flexShrink: 0,
                          "& .MuiSwitch-thumb": { bgcolor: "#1e3a8a" },
                          "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#1e3a8a80" },
                        }}
                      />
                    )}
                  </Stack>

                  {totpError && !totpDialogOpen && !totpDisableConfirmOpen && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setTotpError(null)}>
                      {totpError}
                    </Alert>
                  )}
                </Box>
            </Box>
          </CardContent>
        )}

        {activeTab === 1 && (
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Change Password</Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Your new password must be different from your current one.
            </Typography>

            {securityError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSecurityError(null)}>
                {securityError}
              </Alert>
            )}

            <Grid container spacing={3} sx={{ maxWidth: 560 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth type="password"
                  label="Current Password"
                  value={securityForm.old_password}
                  error={!!securityError && !securityForm.old_password}
                  onChange={e => { setSecurityForm(p => ({ ...p, old_password: e.target.value })); setSecurityError(null); }}
                  sx={inputSx}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth type="password"
                  label="New Password"
                  value={securityForm.new_password}
                  onChange={e => { setSecurityForm(p => ({ ...p, new_password: e.target.value })); setSecurityError(null); }}
                  sx={inputSx}
                />
                {passwordChecks && (
                  <Box sx={{ mt: 1.5 }}>
                    {passwordChecks.map((check, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        {check.passed ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        )}
                        <Typography variant="caption" sx={{ color: check.passed ? '#16a34a' : '#94a3b8' }}>
                          {check.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth type="password"
                  label="Confirm New Password"
                  value={securityForm.confirm_password}
                  error={!!securityForm.confirm_password && securityForm.new_password !== securityForm.confirm_password}
                  helperText={
                    securityForm.confirm_password && securityForm.new_password !== securityForm.confirm_password
                      ? "Passwords do not match"
                      : undefined
                  }
                  onChange={e => { setSecurityForm(p => ({ ...p, confirm_password: e.target.value })); setSecurityError(null); }}
                  sx={inputSx}
                />
              </Grid>
            </Grid>

            <Box mt={4}>
              <Button
                variant="contained"
                startIcon={securityLoading ? undefined : <SaveIcon />}
                onClick={handleSaveSecurity}
                disabled={
                  securityLoading ||
                  (!!securityForm.confirm_password && securityForm.new_password !== securityForm.confirm_password)
                }
                sx={{ borderRadius: 3, textTransform: "none", px: 4, height: 46, bgcolor: "#1e3a8a", "&:hover": { bgcolor: "#1e40af" } }}
              >
                {securityLoading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Changing…</> : "Change Password"}
              </Button>
            </Box>
          </CardContent>
        )}

        {activeTab === 2 && (
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>Password Policy</Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Configure system-wide password requirements and account lockout rules.
            </Typography>

            {policyLoadError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPolicyLoadError(null)}>
                {policyLoadError}
              </Alert>
            )}
            {policyError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPolicyError(null)}>
                {policyError}
              </Alert>
            )}

            {policyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : policyForm ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth type="number"
                    label="Minimum Password Length"
                    value={policyForm.min_length}
                    onChange={e => setPolicyForm(p => p ? { ...p, min_length: Number(e.target.value) } : p)}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth type="number"
                    label="Password Expiry (days)"
                    value={policyForm.password_expiry_days}
                    onChange={e => setPolicyForm(p => p ? { ...p, password_expiry_days: Number(e.target.value) } : p)}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth type="number"
                    label="Max Failed Attempts"
                    value={policyForm.max_failed_attempts}
                    onChange={e => setPolicyForm(p => p ? { ...p, max_failed_attempts: Number(e.target.value) } : p)}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth type="number"
                    label="Lockout Duration (minutes)"
                    value={policyForm.lockout_minutes}
                    onChange={e => setPolicyForm(p => p ? { ...p, lockout_minutes: Number(e.target.value) } : p)}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.require_upper} onChange={e => setPolicyForm(p => p ? { ...p, require_upper: e.target.checked } : p)} />}
                    label="Require Uppercase Letter"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.require_lower} onChange={e => setPolicyForm(p => p ? { ...p, require_lower: e.target.checked } : p)} />}
                    label="Require Lowercase Letter"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.require_number} onChange={e => setPolicyForm(p => p ? { ...p, require_number: e.target.checked } : p)} />}
                    label="Require Number"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.require_symbol} onChange={e => setPolicyForm(p => p ? { ...p, require_symbol: e.target.checked } : p)} />}
                    label="Require Symbol"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.block_common_passwords} onChange={e => setPolicyForm(p => p ? { ...p, block_common_passwords: e.target.checked } : p)} />}
                    label="Block Common Passwords"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch checked={policyForm.is_enabled} onChange={e => setPolicyForm(p => p ? { ...p, is_enabled: e.target.checked } : p)} />}
                    label="Policy Enabled"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={policySaving ? undefined : <SaveIcon />}
                    onClick={handleSavePolicy}
                    disabled={policySaving}
                    sx={{ borderRadius: 3, textTransform: 'none', px: 4, height: 46, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}
                  >
                    {policySaving ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Saving…</> : 'Save Policy'}
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="warning">No password policy loaded.</Alert>
            )}
          </CardContent>
        )}

        {activeTab === 3 && <CreateNewAdmin />}
        {activeTab === 4 && <AllAdmin />}
        {activeTab === 5 && <AssignPermission />}

        {activeTab === 6 && (
          <CardContent sx={{ p: 4 }}>
            <AuditLogs />
          </CardContent>
        )}

        {/* TOTP Setup Dialog */}
        <Dialog open={totpDialogOpen} onClose={handleCancelTotpSetup} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PhonelinkLockIcon sx={{ color: '#1e3a8a' }} />
              <Typography fontWeight={700}>Set Up Authenticator App</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} alignItems="center" sx={{ py: 1 }}>
              <Typography color="text.secondary" textAlign="center">
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
              </Typography>

              {totpSetupData?.qr_code && (
                <Box sx={{
                  p: 2.5, bgcolor: '#fff', borderRadius: 4,
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                }}>
                  <img
                    src={totpSetupData.qr_code}
                    alt="TOTP QR Code"
                    style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
                  />
                </Box>
              )}

              <Box sx={{
                p: 2, bgcolor: '#f8faff', borderRadius: 2,
                border: '1px dashed #cbd5e1', width: '100%',
              }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Can&apos;t scan? Enter this secret manually:
                </Typography>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                  bgcolor: '#fff', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0',
                }}>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight={700}
                    sx={{ userSelect: 'all', wordBreak: 'break-all', color: '#1e3a8a', fontSize: 13 }}
                  >
                    {totpSetupData?.secret}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => { navigator.clipboard.writeText(totpSetupData?.secret || ''); }}
                    sx={{ textTransform: 'none', minWidth: 0, flexShrink: 0 }}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>

              {/* <TextField
                fullWidth
                label="6-digit code from app"
                value={totpOtp}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTotpOtp(val);
                  setTotpError(null);
                }}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                error={!!totpError}
                helperText={totpError || "Enter the current code shown in your authenticator app"}
                sx={inputSx}
                autoFocus
              /> */}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={handleCancelTotpSetup} color="inherit" sx={{ textTransform: 'none', borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTotp}
              variant="contained"
              disabled={totpConfirming || totpOtp.length !== 6}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3, bgcolor: '#1e3a8a', '&:hover': { bgcolor: '#1e40af' } }}
            >
              {totpConfirming ? <CircularProgress size={18} color="inherit" /> : 'Activate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* TOTP Disable Confirmation Dialog */}
        <Dialog open={totpDisableConfirmOpen} onClose={() => !totpDisabling && setTotpDisableConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Disable Authenticator App?</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary">
              This will remove the authenticator and revert to <strong>email OTP codes</strong>. Two-factor authentication will remain enabled.
            </Typography>
            {totpError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {totpError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setTotpDisableConfirmOpen(false)}
              color="inherit"
              disabled={totpDisabling}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisableTotp}
              variant="contained"
              color="error"
              disabled={totpDisabling}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
            >
              {totpDisabling ? <CircularProgress size={18} color="inherit" /> : 'Disable'}
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
};

export default Settings;