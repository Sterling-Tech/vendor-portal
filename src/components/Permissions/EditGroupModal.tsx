import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Group } from "../../services/roleService";

interface EditGroupModalProps {
  open: boolean;
  loading?: boolean;
  group: Group | null;
  onClose: () => void;
  onSubmit: (
    group_id: string | number,
    payload: {
      name: string;
      description: string;
    }
  ) => void | Promise<void>;
}
export default function EditGroupModal({
  open,
  loading = false,
  group,
  onClose,
  onSubmit,
}: EditGroupModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
  if (open && group) {
    setForm({
      name: group.name,
      description: group.description,
    });

    setErrors({
      name: "",
      description: "",
    });
  }
}, [open, group]);

  const validate = () => {
    const newErrors = {
      name: "",
      description: "",
    };

    if (!form.name.trim()) {
      newErrors.name = "Group name is required";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);

    return !newErrors.name && !newErrors.description;
  };

  const handleSubmit = async () => {
  if (!validate()) return;

  if (!group) return;

  await onSubmit(group.id, {
    name: form.name,
    description: form.description,
  });
};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: "#0F2D6B",
          color: "#fff",
          py: 2,
          px: 3,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography
              fontWeight={700}
              fontSize={20}
            >
              Edit User Group
            </Typography>

            <Typography
              fontSize={13}
              sx={{ opacity: 0.8 }}
            >
              Edit a new role for your organization
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{ color: "#fff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body */}

      <DialogContent sx={{ p: 3, mt: 2 }}>
        <TextField
          fullWidth
          label="Group Name"
          placeholder="Financial Manager"
          margin="normal"
          value={form.name}
          error={!!errors.name}
          helperText={errors.name}
          onChange={(e) => {
            setForm({
              ...form,
              name: e.target.value,
            });

            setErrors({
              ...errors,
              name: "",
            });
          }}
        />

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Description"
          placeholder="Describe what this group is responsible for..."
          margin="normal"
          value={form.description}
          error={!!errors.description}
          helperText={errors.description}
          onChange={(e) => {
            setForm({
              ...form,
              description: e.target.value,
            });

            setErrors({
              ...errors,
              description: "",
            });
          }}
        />
      </DialogContent>

      {/* Footer */}

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid #E5E7EB",
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
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: "#0F2D6B",
          }}
        >
          {loading ? "Updating..." : "Update Group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}