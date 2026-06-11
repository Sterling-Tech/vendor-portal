import React, { useState, useEffect } from "react";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Chip,
  Stack,
  Paper,
  IconButton,
  InputAdornment,
} from "@mui/material";

import {
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Save as SaveIcon,
  SettingsApplications as ConfigIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Key as KeyIcon,
  Language as DomainIcon,
  Business as BusinessIcon,
  Public as PublicIcon,
} from "@mui/icons-material";

import { useAppSelector } from "../../store/store";
import CreateNewAdmin from "./CreateNewAdmin";
import AllAdmin from "./AllAdmin";
import AssignPermission from "./AssignPermission";

//const API_BASE_URL = "http://188.166.161.13:8001/api/v1";

const Settings: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // ================= ACCOUNT =================
  const [accountForm, setAccountForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  // ================= SECURITY =================
  const [securityForm, setSecurityForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    two_factor_enabled: false,
  });

  // ================= NOTIFICATIONS =================
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
  });

  // ================= CONFIGURATION =================
  const [configurationForm, setConfigurationForm] = useState({
    organization_name: "",
    organization_id: "ORG-20394-AB",
    organization_type: "vendor",

    api_key: "pk_live_x82jshh2728sjj",
    api_secret: "sk_live_8sjjsjjs929299",

    api_scope: "full_access",
    rate_limit: "1000",

    domain: "",
    ip_address: "",

    expiration_date: "",
    data_limit: "10GB",

    commission_rate: "5",

    saas_enabled: true,
    billing_cycle: "monthly",

    webhook_url: "",
  });

  useEffect(() => {
    if (user) {
      setAccountForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // ================= ACCOUNT SAVE =================
  const handleSaveAccount = async () => {
    setLoading(true);

    // try {
    //   const token = localStorage.getItem("token");

    //   const response = await fetch(
    //     `${API_BASE_URL}/users/${user?.id}/`,
    //     {
    //       method: "PATCH",
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify(accountForm),
    //     }
    //   );

    //   if (response.ok) {
    //     setSuccess("Account settings updated successfully!");
    //   }
    // } catch (err) {
    //   console.error(err);
    // } finally {
    //   setLoading(false);
    // }
  };

  // ================= SECURITY SAVE =================
  const handleSaveSecurity = async () => {
    setLoading(true);

    // try {
    //   const token = localStorage.getItem("token");

    //   const response = await fetch(
    //     `${API_BASE_URL}/auth/change-password/`,
    //     {
    //       method: "POST",
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify({
    //         current_password: securityForm.current_password,
    //         new_password: securityForm.new_password,
    //       }),
    //     }
    //   );

    //   if (response.ok) {
    //     setSuccess("Password changed successfully!");

    //     setSecurityForm({
    //       current_password: "",
    //       new_password: "",
    //       confirm_password: "",
    //       two_factor_enabled: securityForm.two_factor_enabled,
    //     });
    //   }
    // } catch (err) {
    //   console.error(err);
    // } finally {
    //   setLoading(false);
    // }
  };

  // ================= CONFIGURATION =================
  const generateApiKey = () => {
    const random = Math.random().toString(36).substring(2, 18);

    setConfigurationForm({
      ...configurationForm,
      api_key: `pk_live_${random}`,
    });

    setSuccess("API Key Generated Successfully");
  };

  const rotateApiKey = () => {
    const random = Math.random().toString(36).substring(2, 18);

    setConfigurationForm({
      ...configurationForm,
      api_secret: `sk_live_${random}`,
    });

    setSuccess("API Secret Rotated Successfully");
  };

  const handleSaveConfiguration = async () => {
    try {
      setLoading(true);

      console.log(configurationForm);

      setTimeout(() => {
        setLoading(false);
        setSuccess("Configuration Saved Successfully");
      }, 1200);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // ================= SUPER ADMIN =================
  const isSuperAdmin =
    user?.role === "super_admin"
    //  ||
    // user?.is_superuser === true;

  return (
    <Box
      p={3}
      sx={{
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <Box mb={4}>
        <Typography
          variant="h4"
          fontWeight={800}
        >
          System Settings
        </Typography>

        <Typography color="#64748B" mt={1}>
          Manage account, security,
          notifications and organization
          configurations
        </Typography>
      </Box>

      {/* SUCCESS ALERT */}
      <Snackbar
        open={!!success}
        autoHideDuration={5000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ width: "100%" }}
        >
          {success}
        </Alert>
      </Snackbar>

      {/* MAIN CARD */}
      <Card
        sx={{
          borderRadius: 5,
          overflow: "hidden",
          boxShadow:
            "0 10px 40px rgba(15,23,42,0.06)",
        }}
      >
        {/* TABS */}
        <Box
          sx={{
            borderBottom: "1px solid #E2E8F0",
            px: 2,
            bgcolor: "#fff",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) =>
              setActiveTab(value)
            }
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<AccountIcon />}
              iconPosition="start"
              label="Account"
            />

            <Tab
              icon={<SecurityIcon />}
              iconPosition="start"
              label="Security"
            />

            {/* <Tab
              icon={<NotificationsIcon />}
              iconPosition="start"
              label="Notifications"
            />

              <Tab
                icon={<ConfigIcon />}
                iconPosition="start"
                label="Configuration"
              /> */}
              <Tab
                icon={<ConfigIcon />}
                iconPosition="start"
                label="Admin Management"
              />
              <Tab
                icon={<ConfigIcon />}
                iconPosition="start"
                label="Admin List"
              />
              <Tab
                icon={<ConfigIcon />}
                iconPosition="start"
                label="Assign Permission"
              />
            {/* )} */}
          </Tabs>
        </Box>

        {/* ================= ACCOUNT TAB ================= */}
        {activeTab === 0 && (
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              mb={4}
            >
              Profile Information
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={accountForm.first_name}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      first_name:
                        e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={accountForm.last_name}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      last_name:
                        e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  value={accountForm.email}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      email: e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={accountForm.phone}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      phone: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>

            <Box mt={4}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAccount}
                disabled={loading}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  px: 4,
                  height: 46,
                }}
              >
                Save Changes
              </Button>
            </Box>
          </CardContent>
        )}

        {/* ================= SECURITY TAB ================= */}
        {activeTab === 1 && (
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              mb={4}
            >
              Security Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={
                    securityForm.current_password
                  }
                  onChange={(e) =>
                    setSecurityForm({
                      ...securityForm,
                      current_password:
                        e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={
                    securityForm.new_password
                  }
                  onChange={(e) =>
                    setSecurityForm({
                      ...securityForm,
                      new_password:
                        e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm Password"
                  value={
                    securityForm.confirm_password
                  }
                  onChange={(e) =>
                    setSecurityForm({
                      ...securityForm,
                      confirm_password:
                        e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        securityForm.two_factor_enabled
                      }
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          two_factor_enabled:
                            e.target.checked,
                        })
                      }
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
            </Grid>

            <Box mt={4}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSecurity}
                disabled={
                  loading ||
                  securityForm.new_password !==
                    securityForm.confirm_password
                }
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  px: 4,
                  height: 46,
                }}
              >
                Change Password
              </Button>
            </Box>
          </CardContent>
        )}

        {/* ================= NOTIFICATIONS TAB ================= */}
        {/* {activeTab === 2 && (
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              mb={4}
            >
              Notification Preferences
            </Typography>

            <List>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive updates via email"
                />

                <Switch
                  checked={
                    notificationSettings.email_notifications
                  }
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      email_notifications:
                        e.target.checked,
                    })
                  }
                />
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemText
                  primary="SMS Notifications"
                  secondary="Receive SMS alerts"
                />

                <Switch
                  checked={
                    notificationSettings.sms_notifications
                  }
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      sms_notifications:
                        e.target.checked,
                    })
                  }
                />
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Receive browser notifications"
                />

                <Switch
                  checked={
                    notificationSettings.push_notifications
                  }
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      push_notifications:
                        e.target.checked,
                    })
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        )} */}

          {/* ================= CONFIGURATION TAB ================= */}
         {/* {activeTab === 3 && (
            <CardContent sx={{ p: 4 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                flexWrap="wrap"
                gap={2}
              >
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                  >
                    Vendor Configuration
                  </Typography>

                  <Typography
                    color="#64748B"
                    mt={1}
                  >
                    Manage API access,
                    organization setup,
                    billing, limits and
                    SaaS controls
                  </Typography>
                </Box>

                <Chip
                  label="Super Admin Only"
                  color="error"
                  sx={{
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border:
                        "1px solid #E2E8F0",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      mb={3}
                      alignItems="center"
                    >
                      <BusinessIcon />

                      <Typography
                        fontWeight={700}
                        fontSize={18}
                      >
                        Organization Setup
                      </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Organization Name"
                          value={
                            configurationForm.organization_name
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                organization_name:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Organization ID"
                          value={
                            configurationForm.organization_id
                          }
                          InputProps={{
                            readOnly: true,
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="Organization Type"
                          value={
                            configurationForm.organization_type
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                organization_type:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        >
                          <MenuItem value="vendor">
                            Vendor
                          </MenuItem>

                          <MenuItem value="estate">
                            Estate
                          </MenuItem>

                          <MenuItem value="university">
                            University
                          </MenuItem>

                          <MenuItem value="teaching_hospital">
                            Teaching Hospital
                          </MenuItem>

                          <MenuItem value="community">
                            Community
                          </MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Commission Rate (%)"
                          value={
                            configurationForm.commission_rate
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                commission_rate:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border:
                        "1px solid #E2E8F0",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={3}
                    >
                      <KeyIcon />

                      <Typography
                        fontWeight={700}
                        fontSize={18}
                      >
                        API Configuration
                      </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Key"
                          value={
                            configurationForm.api_key
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      configurationForm.api_key
                                    )
                                  }
                                >
                                  <CopyIcon />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Secret"
                          value={
                            configurationForm.api_secret
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="API Scope"
                          value={
                            configurationForm.api_scope
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                api_scope:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        >
                          <MenuItem value="read_only">
                            Read Only
                          </MenuItem>

                          <MenuItem value="write_only">
                            Write Only
                          </MenuItem>

                          <MenuItem value="full_access">
                            Full Access
                          </MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Rate Limit"
                          value={
                            configurationForm.rate_limit
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                rate_limit:
                                  e.target
                                    .value,
                              }
                            )
                          }
                          helperText="Requests per minute"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Stack
                          direction="row"
                          spacing={2}
                          flexWrap="wrap"
                        >
                          <Button
                            variant="contained"
                            startIcon={
                              <RefreshIcon />
                            }
                            onClick={
                              generateApiKey
                            }
                            sx={{
                              borderRadius: 3,
                              textTransform:
                                "none",
                            }}
                          >
                            Generate API Key
                          </Button>

                          <Button
                            variant="outlined"
                            startIcon={
                              <RefreshIcon />
                            }
                            onClick={
                              rotateApiKey
                            }
                            sx={{
                              borderRadius: 3,
                              textTransform:
                                "none",
                            }}
                          >
                            Rotate Secret Key
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border:
                        "1px solid #E2E8F0",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      mb={3}
                      alignItems="center"
                    >
                      <DomainIcon />

                      <Typography
                        fontWeight={700}
                        fontSize={18}
                      >
                        Domain & Network
                      </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Domain Setup"
                          placeholder="example.com"
                          value={
                            configurationForm.domain
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                domain:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Allowed IP Address"
                          placeholder="192.168.0.1"
                          value={
                            configurationForm.ip_address
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                ip_address:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Webhook URL"
                          placeholder="https://yourdomain.com/webhook"
                          value={
                            configurationForm.webhook_url
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                webhook_url:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border:
                        "1px solid #E2E8F0",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      mb={3}
                      alignItems="center"
                    >
                      <PublicIcon />

                      <Typography
                        fontWeight={700}
                        fontSize={18}
                      >
                        SaaS Billing &
                        Limits
                      </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Expiration Date"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          value={
                            configurationForm.expiration_date
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                expiration_date:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Data Limit"
                          value={
                            configurationForm.data_limit
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                data_limit:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          select
                          label="Billing Cycle"
                          value={
                            configurationForm.billing_cycle
                          }
                          onChange={(e) =>
                            setConfigurationForm(
                              {
                                ...configurationForm,
                                billing_cycle:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        >
                          <MenuItem value="monthly">
                            Monthly
                          </MenuItem>

                          <MenuItem value="quarterly">
                            Quarterly
                          </MenuItem>

                          <MenuItem value="yearly">
                            Yearly
                          </MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={
                                configurationForm.saas_enabled
                              }
                              onChange={(e) =>
                                setConfigurationForm(
                                  {
                                    ...configurationForm,
                                    saas_enabled:
                                      e.target
                                        .checked,
                                  }
                                )
                              }
                            />
                          }
                          label="Enable SaaS Billing"
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              <Box mt={4}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={
                    handleSaveConfiguration
                  }
                  disabled={loading}
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    px: 5,
                    height: 52,
                    fontWeight: 700,
                  }}
                >
                  Save Configuration
                </Button>
              </Box>
            </CardContent>
          )}  */}
          {/* ================= ADMIN MANAGEMENT TAB ================= */}
          {activeTab === 2 && (
            <CreateNewAdmin />
          )}
          {/* ================= ADMIN LIST TAB ================= */}
          {activeTab === 3 && (
            <AllAdmin />
          )}
          {activeTab === 4 && (
            <AssignPermission />
          )}
      </Card>
    </Box>
  );
};

export default Settings;