import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Switch, FormControlLabel, Alert, Snackbar, Tabs, Tab,
  MenuItem, CircularProgress, Chip, Stack,
} from "@mui/material";
import {
  Security as SecurityIcon, AccountCircle as AccountIcon,
  Save as SaveIcon, SettingsApplications as ConfigIcon,
  Shield as ShieldIcon,
} from "@mui/icons-material";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setAuth } from "../../store/slices/authSlice";
import CreateNewAdmin from "./CreateNewAdmin";
import AllAdmin from "./AllAdmin";
import AssignPermission from "./AssignPermission";
import { changePassword, extractError,updateProfile } from "../../services/settingService";

// ─── Profile update API ────────────────────────────────────────────────────────
// const API_BASE = "http://188.166.161.13:8061";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("accessToken") ||
  "";

// const updateProfile = async (payload: {
//   name?: string;
//   gender?: string;
//   phone_number?: string;
//   is_2fa_enabled?: boolean;
// }) => {
//   const res = await fetch(`${API_BASE}/user/update-profile/`, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${getToken()}`,
//     },
//     body: JSON.stringify(payload),
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) throw data;
//   return data;
// };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  const [activeTab, setActiveTab] = useState(0);

  // ── success / page-level error ──────────────────────────────────────────────
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Account / Profile state ─────────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    gender: "",
    phone_number: "",
    // read-only display fields (not sent to API)
    email: "",
    user_type: "",
  });
  // 2FA toggle — tracked separately so we can optimistically update
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  // ── Security state ──────────────────────────────────────────────────────────
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityForm, setSecurityForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // ── Populate from redux user on mount / user change ─────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE PROFILE  PUT /user/update-profile/
  // Fields allowed: name, gender, phone_number
  // Email is READ-ONLY (disabled in UI, not sent to API)
  // ─────────────────────────────────────────────────────────────────────────────
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
      // Persist updated user into redux so the UI reflects changes immediately
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileError(extractError(err));
    } finally {
      setProfileLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOGGLE 2FA  — uses the same PUT /user/update-profile/ but only sends is_2fa_enabled
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggle2fa = async (checked: boolean) => {
    setTwoFaError(null);
    setToggling2fa(true);
    // Optimistic update
    setIs2faEnabled(checked);
    try {
      const updated = await updateProfile({ is_2fa_enabled: checked });
      dispatch(setAuth({ token: getToken(), user: { ...user, ...updated } }));
      setSuccess(`Two-factor authentication ${checked ? "enabled" : "disabled"}.`);
    } catch (err: any) {
      // Roll back optimistic update on failure
      setIs2faEnabled(!checked);
      setTwoFaError(extractError(err));
    } finally {
      setToggling2fa(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CHANGE PASSWORD  PUT /user/change-password/
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSaveSecurity = async () => {
    setSecurityError(null);
    if (!securityForm.old_password.trim()) { setSecurityError("Current password is required."); return; }
    if (!securityForm.new_password.trim()) { setSecurityError("New password is required."); return; }
    if (securityForm.new_password !== securityForm.confirm_password) { setSecurityError("Passwords do not match."); return; }

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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box p={3} sx={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* ── Page header ── */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800}>System Settings</Typography>
        <Typography color="#64748B" mt={1}>
          Manage account, security, notifications and organisation configurations
        </Typography>
      </Box>

      {/* ── Global success toast ── */}
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
        {/* ── Tab bar ── */}
        <Box sx={{ borderBottom: "1px solid #E2E8F0", px: 2, bgcolor: "#fff" }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<AccountIcon />} iconPosition="start" label="Account" />
            <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Admin Management" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Admin List" />
            <Tab icon={<ConfigIcon />} iconPosition="start" label="Assign Permission" />
          </Tabs>
        </Box>

        {/* ══════════════════════════════════════════════════════════════════
            ACCOUNT TAB — Profile + 2FA toggle
        ══════════════════════════════════════════════════════════════════ */}
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
              {/* ── Name ── */}
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

              {/* ── Gender ── */}
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

              {/* ── Phone ── */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileForm.phone_number}
                  onChange={e => setProfileForm(p => ({ ...p, phone_number: e.target.value }))}
                  sx={inputSx}
                />
              </Grid>

              {/* ── Email (READ-ONLY — not allowed in update-profile payload) ── */}
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

              {/* ── User type (display only) ── */}
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

            {/* ══════════════════════════════════════════════════════════════
                TWO-FACTOR AUTHENTICATION — moved here from Security tab
            ══════════════════════════════════════════════════════════════ */}
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
                      <Typography fontWeight={600} fontSize={15}>
                        Two-Factor Authentication
                      </Typography>
                      <Chip
                        label={is2faEnabled ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          height: 20, fontSize: 10, fontWeight: 700,
                          bgcolor: is2faEnabled ? "#16a34a" : "#94a3b8",
                          color: "#fff",
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {is2faEnabled
                        ? "OTP will be required at every login"
                        : "Enable to receive a login OTP via email"}
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
            </Box>
          </CardContent>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECURITY TAB — Change password only (2FA moved to Account)
        ══════════════════════════════════════════════════════════════════ */}
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

        {/* ── Admin management tabs ── */}
        {activeTab === 2 && <CreateNewAdmin />}
        {activeTab === 3 && <AllAdmin />}
        {activeTab === 4 && <AssignPermission />}
      </Card>
    </Box>
  );
};

export default Settings;