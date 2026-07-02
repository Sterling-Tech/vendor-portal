import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, IconButton, Box, Alert, CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAddOutlined";

interface CreateGroupModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string }) => void | Promise<void>;
}

const extractError = (err: any): string => {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof TypeError) return `Network error: ${err.message}`;
  const body = err?.response?.data ?? err;
  if (typeof body === "string") return body;
  if (typeof body.detail === "string") return body.detail;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  if (Array.isArray(body.non_field_errors) && body.non_field_errors.length)
    return body.non_field_errors.join(" ");
  const msgs: string[] = [];
  try {
    for (const [k, v] of Object.entries(body))
      if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`);
  } catch { /* noop */ }
  return msgs.length ? msgs.join(" | ") : "Something went wrong. Please try again.";
};

export default function CreateGroupModal({ open, loading = false, onClose, onSubmit }: CreateGroupModalProps) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({ name: "", description: "" });
  const [serverError, setServerError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({ name: "", description: "" });
      setErrors({ name: "", description: "" });
      setServerError(null);
      // auto-focus name field after animation
      setTimeout(() => nameRef.current?.focus(), 120);
    }
  }, [open]);

  const validate = (): boolean => {
    const e = { name: "", description: "" };
    if (!form.name.trim()) e.name = "Group name is required";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return !e.name && !e.description;
  };

  const handleSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    try {
      await onSubmit({ name: form.name.trim(), description: form.description.trim() });
      // parent closes the dialog on success
    } catch (err: any) {
      setServerError(extractError(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <DialogTitle sx={{ background: "linear-gradient(135deg, #0F2D6B 0%, #1A3F8F 100%)", color: "#fff", py: 2.5, px: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GroupAddIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={18}>Create User Group</Typography>
              <Typography fontSize={12} sx={{ opacity: 0.8 }}>Create a new role for your organisation</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={loading} sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body */}
      <DialogContent sx={{ p: 3, mt: 1 }}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        <TextField
          inputRef={nameRef}
          fullWidth label="Group Name *" placeholder="e.g. Financial Manager"
          margin="normal" value={form.name}
          error={!!errors.name} helperText={errors.name || "A unique name for this role"}
          disabled={loading}
          onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: "" })); setServerError(null); }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        <TextField
          fullWidth multiline rows={4}
          label="Description *" placeholder="Describe what this group is responsible for…"
          margin="normal" value={form.description}
          error={!!errors.description} helperText={errors.description || "What permissions or responsibilities does this group have?"}
          disabled={loading}
          onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => ({ ...p, description: "" })); setServerError(null); }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2.5, borderTop: "1px solid #E5E7EB", bgcolor: "#FAFBFC", gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ borderRadius: 2, textTransform: "none" }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ bgcolor: "#0F2D6B", borderRadius: 2, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#0c2456" } }}
        >
          {loading ? "Creating…" : "Create Group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}