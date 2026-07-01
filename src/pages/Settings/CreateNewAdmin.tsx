import React, { useState } from "react";
import {
    Box, Card, Typography, TextField, IconButton, MenuItem,
    Button, Select, FormControl, Grid, CircularProgress,
    Dialog, DialogContent, DialogActions, DialogTitle,
    Alert, Stack, Divider, Chip, Avatar,
} from "@mui/material";
import {
    CheckCircle, ErrorOutline, Close, ContentCopy, Person,
} from "@mui/icons-material";
import { adminForm, createNewAdmin } from "../../services/settingService";

const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
];

const inputSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        bgcolor: "#f3f4f8",
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1e3a8a" },
    },
};

/** Extracts a readable message from any DRF error shape */
const extractBackendError = (err: any): string => {
    if (!err) return "An unexpected error occurred";
    const d = err?.response?.data ?? err?.data ?? err;
    if (typeof d === "string") return d;
    if (typeof d?.detail === "string") return d.detail;
    if (typeof d?.message === "string") return d.message;
    if (typeof d?.error === "string") return d.error;
    if (Array.isArray(d?.non_field_errors) && d.non_field_errors.length)
        return d.non_field_errors.join(" ");
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(d ?? {}))
        if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`);
    return msgs.length ? msgs.join(" | ") : "An unexpected error occurred";
};

/** A single labelled row inside the result dialog */
const ResultRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack
        direction="row"
        justifyContent="space-between"
        spacing={2}
        sx={{ py: 0.8, borderBottom: "1px solid #f1f5f9" }}
    >
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {label}
        </Typography>
        <Typography
            variant="body2"
            fontWeight={600}
            sx={{ textAlign: "right", wordBreak: "break-all" }}
        >
            {value}
        </Typography>
    </Stack>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type ResultState =
    | { kind: "success"; data: Record<string, any> }
    | { kind: "error"; message: string }
    | null;

// ═══════════════════════════════════════════════════════════════════════════════
export default function CreateNewAdmin() {
    const [form, setForm] = React.useState<adminForm>({} as adminForm);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [loading, setLoading] = React.useState(false);

    // Result dialog (success or error)
    const [result, setResult] = useState<ResultState>(null);
    const closeResult = () => setResult(null);

    const copyText = (text: string) => {
        navigator.clipboard?.writeText(text).catch(() => {});
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = "Business name is required";
        if (!form.email?.trim()) e.email = "Email address is required";
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email))
            e.email = "Invalid email address";
        if (!form.phone_number?.trim()) e.phone_number = "Phone number is required";
        if (!form.gender?.trim()) e.gender = "Gender is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleCreateAdmin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const data = await createNewAdmin(form);
            // On success show the result modal with whatever the backend returned
            setResult({ kind: "success", data: data ?? {} });
            // Reset form
            setForm({ name: "", email: "", phone_number: "", gender: "" });
            setErrors({});
        } catch (err: any) {
            setResult({ kind: "error", message: extractBackendError(err) });
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div>
            <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
                {/* FORM */}
                <Box px={3} py={3}>
                    <Typography variant="h6" fontWeight={700} mb={0.5}>
                        Onboard New Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Fill in the details below to create a new admin account.
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Business Name"
                                placeholder="e.g. Acme Nigeria Ltd"
                                value={form.name || ""}
                                onChange={e => {
                                    setForm(p => ({ ...p, name: e.target.value }));
                                    setErrors(p => ({ ...p, name: "" }));
                                }}
                                error={!!errors.name}
                                helperText={errors.name}
                                sx={inputSx}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                placeholder="admin@business.com"
                                value={form.email || ""}
                                onChange={e => {
                                    setForm(p => ({ ...p, email: e.target.value }));
                                    setErrors(p => ({ ...p, email: "" }));
                                }}
                                error={!!errors.email}
                                helperText={errors.email}
                                sx={inputSx}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                placeholder="+234 800 000 0000"
                                value={form.phone_number || ""}
                                onChange={e => {
                                    setForm(p => ({ ...p, phone_number: e.target.value }));
                                    setErrors(p => ({ ...p, phone_number: "" }));
                                }}
                                error={!!errors.phone_number}
                                helperText={errors.phone_number}
                                sx={inputSx}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.gender} sx={inputSx}>
                                <Select
                                    displayEmpty
                                    value={form.gender || ""}
                                    onChange={e => {
                                        setForm(p => ({ ...p, gender: e.target.value }));
                                        setErrors(p => ({ ...p, gender: "" }));
                                    }}
                                    sx={{ borderRadius: 2, bgcolor: "#f3f4f8" }}
                                >
                                    <MenuItem value="">Select Gender</MenuItem>
                                    {genderOptions.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.gender && (
                                    <Typography fontSize={12} color="error" mt={0.5}>
                                        {errors.gender}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>

                {/* FOOTER */}
                <Box
                    px={3}
                    py={2}
                    display="flex"
                    justifyContent="flex-end"
                    gap={2}
                    borderTop="1px solid #eee"
                >
                    <Button
                        variant="contained"
                        onClick={handleCreateAdmin}
                        disabled={loading}
                        sx={{
                            bgcolor: "#1e3a8a",
                            textTransform: "none",
                            borderRadius: 2,
                            px: 4,
                            height: 44,
                            fontWeight: 700,
                            "&:hover": { bgcolor: "#1e40af" },
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={20} sx={{ color: "#fff" }} />
                        ) : (
                            "Onboard Admin"
                        )}
                    </Button>
                </Box>
            </Card>

            {/* ══════════════════════════════════════════════════════════════════
                RESULT DIALOG — shows success with backend details, or failure reason
            ══════════════════════════════════════════════════════════════════ */}
            <Dialog
                open={Boolean(result)}
                onClose={closeResult}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
            >
                {result?.kind === "success" && (
                    <Box>
                        {/* Success header */}
                        <Box
                            sx={{
                                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                px: 3, pt: 4, pb: 3,
                                textAlign: "center",
                                position: "relative",
                            }}
                        >
                            <IconButton
                                onClick={closeResult}
                                size="small"
                                sx={{ position: "absolute", top: 12, right: 12, color: "#bbf7d0" }}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                            <Box
                                sx={{
                                    width: 64, height: 64, borderRadius: "50%",
                                    bgcolor: "rgba(255,255,255,0.18)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    mx: "auto", mb: 1.5,
                                }}
                            >
                                <CheckCircle sx={{ fontSize: 36, color: "#fff" }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">
                                Admin Created Successfully
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#bbf7d0", mt: 0.5 }}>
                                The new admin account has been set up.
                            </Typography>
                        </Box>

                        {/* Detail rows from backend response */}
                        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                            {/* Avatar + name row */}
                            {(result.data?.name || result.data?.email) && (
                                <Box
                                    sx={{
                                        display: "flex", alignItems: "center", gap: 1.5,
                                        p: 1.5, bgcolor: "#f0fdf4", borderRadius: 2,
                                        border: "1px solid #bbf7d0", mb: 2,
                                    }}
                                >
                                    <Avatar sx={{ bgcolor: "#16a34a", width: 40, height: 40 }}>
                                        <Person />
                                    </Avatar>
                                    <Box>
                                        <Typography fontWeight={700} fontSize={14}>
                                            {result.data?.name || result.data?.business_name || "—"}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {result.data?.email || ""}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            <Stack spacing={0}>
                                {result.data?.id && (
                                    <ResultRow label="Admin ID" value={`#${result.data.id}`} />
                                )}
                                {result.data?.name && (
                                    <ResultRow label="Name" value={result.data.name} />
                                )}
                                {result.data?.email && (
                                    <ResultRow
                                        label="Email"
                                        value={
                                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                                <Typography variant="body2" fontWeight={600}>{result.data.email}</Typography>
                                                <IconButton size="small" onClick={() => copyText(result.data.email)}>
                                                    <ContentCopy sx={{ fontSize: 13 }} />
                                                </IconButton>
                                            </Stack>
                                        }
                                    />
                                )}
                                {result.data?.phone_number && (
                                    <ResultRow label="Phone" value={result.data.phone_number} />
                                )}
                                {result.data?.gender && (
                                    <ResultRow
                                        label="Gender"
                                        value={
                                            <Chip
                                                label={result.data.gender.charAt(0).toUpperCase() + result.data.gender.slice(1)}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        }
                                    />
                                )}
                                {result.data?.user_type && (
                                    <ResultRow label="Role" value={result.data.user_type} />
                                )}
                                {result.data?.status && (
                                    <ResultRow
                                        label="Status"
                                        value={
                                            <Chip
                                                label={result.data.status}
                                                size="small"
                                                color="success"
                                            />
                                        }
                                    />
                                )}
                                {result.data?.created_at && (
                                    <ResultRow
                                        label="Created At"
                                        value={new Date(result.data.created_at).toLocaleString()}
                                    />
                                )}
                            </Stack>

                            <Box sx={{ mt: 2, p: 1.5, bgcolor: "#eff6ff", borderRadius: 2, border: "1px solid #bfdbfe" }}>
                                <Typography variant="caption" color="primary.main">
                                    A password setup or invitation email may have been sent to the admin.
                                </Typography>
                            </Box>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={closeResult}
                                sx={{
                                    borderRadius: 2, textTransform: "none", fontWeight: 700,
                                    bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" },
                                }}
                            >
                                Done
                            </Button>
                        </DialogActions>
                    </Box>
                )}

                {result?.kind === "error" && (
                    <Box>
                        {/* Error header */}
                        <Box
                            sx={{
                                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                                px: 3, pt: 4, pb: 3,
                                textAlign: "center",
                                position: "relative",
                            }}
                        >
                            <IconButton
                                onClick={closeResult}
                                size="small"
                                sx={{ position: "absolute", top: 12, right: 12, color: "#fecaca" }}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                            <Box
                                sx={{
                                    width: 64, height: 64, borderRadius: "50%",
                                    bgcolor: "rgba(255,255,255,0.18)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    mx: "auto", mb: 1.5,
                                }}
                            >
                                <ErrorOutline sx={{ fontSize: 36, color: "#fff" }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="#fff">
                                Admin Creation Failed
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#fecaca", mt: 0.5 }}>
                                The server rejected the request.
                            </Typography>
                        </Box>

                        <DialogContent sx={{ pt: 2.5 }}>
                            <Box sx={{ p: 2, bgcolor: "#fef2f2", borderRadius: 2, border: "1px solid #fecaca" }}>
                                <Typography variant="body2" color="error.dark" fontWeight={600} mb={0.5}>
                                    Reason from server:
                                </Typography>
                                <Typography variant="body2" color="error.main">
                                    {result.message}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
                                Please fix the highlighted issue and try again.
                            </Typography>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={closeResult}
                                color="error"
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                            >
                                Go Back & Fix
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
        </div>
    );
}