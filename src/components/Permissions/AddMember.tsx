import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, IconButton, Box, Button, Checkbox, List, ListItem,
  ListItemText, TextField, CircularProgress, Alert, Chip, InputAdornment,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Group } from "../../services/roleService";
import { getAllAdmin } from "../../services/settingService";

interface AdminUser { id: number; name: string; email: string; }
interface AddMemberModalProps {
  open: boolean; loading?: boolean; group: Group | null;
  onClose: () => void;
  onSubmit: (groupId: number, members: number[]) => Promise<void>;
}

const extractError = (err: any): string => {
  if (!err) return "Failed to complete action. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof TypeError) return `Network error: ${err.message}`;
  const body = err?.response?.data ?? err;
  if (typeof body === "string") return body;
  if (typeof body.detail === "string") return body.detail;
  if (typeof body.message === "string") return body.message;
  if (Array.isArray(body.non_field_errors) && body.non_field_errors.length) return body.non_field_errors.join(" ");
  const msgs: string[] = [];
  try { for (const [k, v] of Object.entries(body)) if (Array.isArray(v)) msgs.push(`${k}: ${(v as string[]).join(", ")}`); } catch { }
  return msgs.length ? msgs.join(" | ") : "Failed to complete action. Please try again.";
};

export default function AddMemberModal({ open, loading = false, group, onClose, onSubmit }: AddMemberModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { loadUsers(); setSelectedUsers([]); setSearch(""); setServerError(null); }
  }, [open]);

  const loadUsers = async () => {
    try {
      setFetchingUsers(true); setFetchError(null);
      const response = await getAllAdmin();
      const raw = Array.isArray(response) ? response : (response as any)?.results ?? [];
      setUsers(raw.map((u: any) => ({ id: Number(u.id), name: u.name ?? u.email ?? "User", email: u.email ?? "" })));
    } catch (err: any) {
      setFetchError(extractError(err));
      setUsers([]);
    } finally { setFetchingUsers(false); }
  };

  const filteredUsers = useMemo(() =>
    users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  const toggleUser = (id: number) =>
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!group) return;
    setServerError(null);
    try { await onSubmit(group.id, selectedUsers); }
    catch (err: any) { setServerError(extractError(err)); }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
      <DialogTitle sx={{ background: "linear-gradient(135deg, #0F2D6B 0%, #1A3F8F 100%)", color: "#fff", py: 2.5, px: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PersonAddIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={18}>Add Members</Typography>
              <Typography fontSize={12} sx={{ opacity: 0.8 }}>Assign users to {group?.name ?? "this group"}</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={loading} sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } }}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {serverError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setServerError(null)}>{serverError}</Alert>}
        {fetchError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}
            action={<Button size="small" color="inherit" startIcon={<RefreshIcon />} onClick={loadUsers}>Retry</Button>}>
            {fetchError}
          </Alert>
        )}

        <Box display="flex" gap={1} mb={2} alignItems="center">
          <TextField fullWidth size="small" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          {selectedUsers.length > 0 && (
            <Chip label={`${selectedUsers.length} selected`} color="primary" size="small" sx={{ flexShrink: 0, fontWeight: 600 }} />
          )}
        </Box>

        {fetchingUsers ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={6}>
            <CircularProgress size={36} sx={{ color: "#0F2D6B" }} />
            <Typography variant="body2" color="text.secondary">Loading users…</Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 340, overflow: "auto", border: "1px solid #E5E7EB", borderRadius: 2 }}>
            {filteredUsers.length === 0 ? (
              <Box py={5} textAlign="center">
                <Typography color="text.secondary">{search ? "No users match your search" : "No users available"}</Typography>
              </Box>
            ) : filteredUsers.map(user => (
              <ListItem key={user.id} divider onClick={() => toggleUser(user.id)}
                sx={{ cursor: "pointer", bgcolor: selectedUsers.includes(user.id) ? "#EEF2FF" : "transparent", transition: "background-color 0.15s", "&:hover": { bgcolor: selectedUsers.includes(user.id) ? "#E0E7FF" : "#F8FAFC" } }}
                secondaryAction={<Checkbox checked={selectedUsers.includes(user.id)} onChange={() => toggleUser(user.id)} onClick={e => e.stopPropagation()} />}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "#EEF2FF", color: "#0F2D6B", fontSize: 13, mr: 1.5, fontWeight: 700 }}>
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText primary={<Typography fontWeight={500} fontSize={14}>{user.name}</Typography>} secondary={user.email} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: "1px solid #eee", px: 3, py: 2.5, bgcolor: "#FAFBFC", gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ borderRadius: 2, textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" disabled={loading || selectedUsers.length === 0} onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ bgcolor: "#0F2D6B", borderRadius: 2, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#0c2456" } }}>
          {loading ? "Assigning…" : `Assign ${selectedUsers.length ? `(${selectedUsers.length})` : ""} Users`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}