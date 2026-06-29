import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CloseIcon from "@mui/icons-material/Close";

import { Group } from "../../services/roleService";

interface DeleteGroupDialogProps {
  open: boolean;
  loading?: boolean;
  group: Group |null;
  onClose: () => void;
  onConfirm: (groupId: number) => Promise<void>;
}

export default function DeleteGroupDialog({
  open,
  loading = false,
  group,
  onClose,
  onConfirm,
}: DeleteGroupDialogProps) {
  if (!group) return null;

  const handleDelete = async () => {
    await onConfirm(group.id);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <WarningAmberRoundedIcon color="error" />

          <Typography fontWeight={700}>
            Delete Group
          </Typography>
        </Box>

        <IconButton
          disabled={loading}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography mb={2}>
          Are you sure you want to delete
          <strong> "{group.name}" </strong>?
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          This action cannot be undone. All users currently
          assigned to this group will lose the permissions
          inherited from it.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          color="error"
          variant="contained"
          disabled={loading}
          onClick={handleDelete}
        >
          {loading ? "Deleting..." : "Delete Group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}