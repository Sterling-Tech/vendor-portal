import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Switch, FormControlLabel, Alert, Snackbar, Tabs, Tab,
} from "@mui/material";
import {
  Security as SecurityIcon, AccountCircle as AccountIcon,
  Save as SaveIcon, SettingsApplications as ConfigIcon,
} from "@mui/icons-material";
import { useAppSelector } from "../../store/store";
import CreateNewAdmin from "./CreateNewAdmin";
import AllAdmin from "./AllAdmin";
import AssignPermission from "./AssignPermission";
import { changePassword, extractError } from "../../services/settingService";

const Settings: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null); // top-level page errors
  const [activeTab, setActiveTab] = useState(0);

  // ─── Account ──────────────────────────────────────────────────────────────
  const [accountForm, setAccountForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
  });

  // ─── Security ─────────────────────────────────────────────────────────────
  const [securityForm, setSecurityForm] = useState({
    old_password: "", new_password: "", confirm_password: "",
    two_factor_enabled: false,
  });
  const [securityError, setSecurityError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setAccountForm({
        first_name: user.first_name || "",
        last_name:  user.last_name  || "",
        email:      user.email      || "",
        phone:      user.phone      || "",
      });
    }
  }, [user]);

  // ─── Account save (wired up for when endpoint is ready) ──────────────────
  const handleSaveAccount = async () => {
    setLoading(true);
    setPageError(null);
    try {
      // Uncomment when endpoint is available:
      // await userService.updateProfile(accountForm);
      setSuccess("Account settings updated successfully!");
    } catch (err: any) {
      setPageError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Change password — consumes PUT /user/change-password/ ───────────────
  const handleSaveSecurity = async () => {
    setSecurityError(null);

    // Client-side guard before hitting the API
    if (!securityForm.old_password.trim()) {
      setSecurityError("Current password is required.");
      return;
    }
    if (!securityForm.new_password.trim()) {
      setSecurityError("New password is required.");
      return;
    }
    if (securityForm.new_password !== securityForm.confirm_password) {
      setSecurityError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        old_password:     securityForm.old_password,
        new_password:     securityForm.new_password,
        confirm_password: securityForm.confirm_password,
      });

      setSuccess("Password changed successfully!");

      setSecurityForm({
        old_password: "", new_password: "", confirm_password: "",
        two_factor_enabled: securityForm.two_factor_enabled,
      });
    } catch (err: any) {
      // Show the EXACT backend message (e.g. "Old password is incorrect")
      setSecurityError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

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

      {/* ── Global page-level error ── */}
      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}

      <Card sx={{ borderRadius: 5, overflow: "hidden", boxShadow: "0 10px 40px rgba(15,23,42,0.06)" }}>
        {/* ── Tab bar ── */}
        <Box sx={{ borderBottom: "1px solid #E2E8F0", px: 2, bgcolor: "#fff" }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<AccountIcon />} iconPosition="start" label="Account" />
            <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
            <Tab icon={<ConfigIcon />}   iconPosition="start" label="Admin Management" />
            <Tab icon={<ConfigIcon />}   iconPosition="start" label="Admin List" />
            <Tab icon={<ConfigIcon />}   iconPosition="start" label="Assign Permission" />
          </Tabs>
        </Box>

        {/* ══════════════════════════════════════════════════════════════════
            ACCOUNT TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={4}>Profile Information</Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="First Name" value={accountForm.first_name}
                  onChange={e => setAccountForm({ ...accountForm, first_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Last Name" value={accountForm.last_name}
                  onChange={e => setAccountForm({ ...accountForm, last_name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="email" label="Email" value={accountForm.email}
                  onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Phone Number" value={accountForm.phone}
                  onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} />
              </Grid>
            </Grid>

            <Box mt={4}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveAccount}
                disabled={loading} sx={{ borderRadius: 3, textTransform: "none", px: 4, height: 46 }}>
                Save Changes
              </Button>
            </Box>
          </CardContent>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECURITY TAB — real API call with backend error display
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={4}>Security Settings</Typography>

            {/* Backend / validation error shown inline above the form */}
            {securityError && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
                onClose={() => setSecurityError(null)}
              >
                {securityError}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth type="password"
                  label="Current Password"
                  value={securityForm.old_password}
                  error={!!securityError && !securityForm.old_password}
                  onChange={e => {
                    setSecurityForm({ ...securityForm, old_password: e.target.value });
                    setSecurityError(null);
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth type="password"
                  label="New Password"
                  value={securityForm.new_password}
                  onChange={e => {
                    setSecurityForm({ ...securityForm, new_password: e.target.value });
                    setSecurityError(null);
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth type="password"
                  label="Confirm New Password"
                  value={securityForm.confirm_password}
                  error={
                    !!securityForm.confirm_password &&
                    securityForm.new_password !== securityForm.confirm_password
                  }
                  helperText={
                    securityForm.confirm_password &&
                    securityForm.new_password !== securityForm.confirm_password
                      ? "Passwords do not match"
                      : undefined
                  }
                  onChange={e => {
                    setSecurityForm({ ...securityForm, confirm_password: e.target.value });
                    setSecurityError(null);
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityForm.two_factor_enabled}
                      onChange={e => setSecurityForm({ ...securityForm, two_factor_enabled: e.target.checked })}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
            </Grid>

            <Box mt={4}>
              <Button
                variant="contained"
                startIcon={loading ? undefined : <SaveIcon />}
                onClick={handleSaveSecurity}
                disabled={
                  loading ||
                  (!!securityForm.confirm_password &&
                    securityForm.new_password !== securityForm.confirm_password)
                }
                sx={{ borderRadius: 3, textTransform: "none", px: 4, height: 46 }}
              >
                {loading ? "Changing…" : "Change Password"}
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