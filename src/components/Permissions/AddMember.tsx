import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    IconButton,
    Box,
    Button,
    Checkbox,
    List,
    ListItem,
    ListItemText,
    TextField,
    CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { Group } from "../../services/roleService";
import { getAllAdmin } from "../../services/settingService";

interface User {
    id: number;
    name: string;
    email: string;
}

interface AddMemberModalProps {
    open: boolean;
    loading?: boolean;
    group: Group | null;
    onClose: () => void;

    onSubmit: (
        groupId: number,
        members: number[]
    ) => Promise<void>;
}
export default function AddMemberModal({
    open,
    loading = false,
    group,
    onClose,
    onSubmit,
}: AddMemberModalProps) {

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [search, setSearch] = useState("");
    const [fetchingUsers, setFetchingUsers] = useState(false);

    useEffect(() => {
        if (!open) return;

        loadUsers();
        setSelectedUsers([]);
        setSearch("");
    }, [open]);

    const loadUsers = async () => {
        try {
            setFetchingUsers(true);

            const response = await getAllAdmin();

            const mapped: User[] = (response ?? []).map((u: any) => ({
                id: Number(u.id),
                name: u.name,
                email: u.email,
            }));

            setUsers(mapped);
        } finally {
            setFetchingUsers(false);
        }
    };

    const filteredUsers = useMemo(() => {
  return users.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
}, [users, search]);

    const toggleUser = (id: number) => {
        setSelectedUsers((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!group) return;

        await onSubmit(group.id, selectedUsers);
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
                            Add Member
                        </Typography>

                        <Typography
                            fontSize={13}
                            sx={{ opacity: 0.8 }}
                        >
                            Add new member to this group
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

            <DialogContent sx={{ mt: 2 }}>

                <TextField
                    fullWidth
                    placeholder="Search user..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 3 }}
                />

                {fetchingUsers ? (
                    <Box
                        display="flex"
                        justifyContent="center"
                        py={5}
                    >
                        <CircularProgress />
                    </Box>
                ) : (

                    <List
                        sx={{
                            maxHeight: 350,
                            overflow: "auto",
                            border: "1px solid #E5E7EB",
                            borderRadius: 2,
                        }}
                    >

                        {filteredUsers.map((user) => (

                            <ListItem
                                key={user.id}
                                divider
                                secondaryAction={
                                    <Checkbox
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => toggleUser(user.id)}
                                    />
                                }
                            >

                                <ListItemText
                                    primary={user.name}
                                    secondary={user.email}
                                />

                            </ListItem>

                        ))}

                        {!filteredUsers.length && (
                            <Box
                                py={5}
                                textAlign="center"
                            >
                                <Typography color="text.secondary">
                                    No users found
                                </Typography>
                            </Box>
                        )}

                    </List>

                )}

            </DialogContent>

            {/* Footer */}

            <DialogActions
                sx={{
                    borderTop: "1px solid #eee",
                    px: 3,
                    py: 2,
                }}
            >
                <Button
                    onClick={onClose}
                    variant="outlined"
                >
                    Cancel
                </Button>

                <Button
                    variant="contained"
                    disabled={
                        loading ||
                        selectedUsers.length === 0
                    }
                    onClick={handleSubmit}
                    sx={{
                        bgcolor: "#0F2D6B",
                    }}
                >
                    {loading
                        ? "Assigning..."
                        : "Assign Users"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}