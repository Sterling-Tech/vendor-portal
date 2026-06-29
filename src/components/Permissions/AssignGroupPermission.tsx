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

import { useEffect, useMemo, useState } from "react";

import {
    Permission,
    getSystemPermissions,
} from "../../services/roleService";

import { GroupDetails } from "../../services/roleService";

interface Props {
    open: boolean;
    loading?: boolean;

    groupv: GroupDetails | null;

    onClose: () => void;

    onSubmit: (
        groupId: number,
        permissions: number[]
    ) => Promise<void>;
}

export default function AssignPermissionModal({
    open,
    loading = false,
    groupv,
    onClose,
    onSubmit,
}: Props) {
    const [permissions, setPermissions] = useState<Permission[]>([]);

    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

    const [search, setSearch] = useState("");

    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!open) return;

        loadPermissions();

        setSelectedPermissions([]);

        setSearch("");
    }, [open]);

    const loadPermissions = async () => {
        try {
            setFetching(true);

            const data = await getSystemPermissions();

            setPermissions(data);
        } finally {
            setFetching(false);
        }
    };

    const filteredPermissions = useMemo(() => {
        const existing =
    groupv?.permissions?.map((p) => p.permission.id) || [];
    
        return permissions
            .filter((p) => !existing.includes(p.id))
            .filter((p) =>
                `${p.name} ${p.code}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
    }, [permissions, groupv, search]);

    const togglePermission = (id: number) => {
        setSelectedPermissions((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!groupv) return;

        await onSubmit(groupv.id, selectedPermissions);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 4
                }
            }}
        >

            <DialogTitle
                sx={{
                    bgcolor: "#0F2D6B",
                    color: "#fff"
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
                            Assign Permissions
                        </Typography>

                        <Typography fontSize={13}>
                            Assign permissions to this group
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

            <DialogContent sx={{ mt: 2 }}>

                <TextField
                    fullWidth
                    placeholder="Search permission..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 3 }}
                />

                {
                    fetching ?

                        <Box
                            display="flex"
                            justifyContent="center"
                            py={5}
                        >

                            <CircularProgress />

                        </Box>

                        :

                        <List
                            sx={{
                                maxHeight: 350,
                                overflow: "auto",
                                border: "1px solid #E2E8F0",
                                borderRadius: 2
                            }}
                        >

                            {
                                filteredPermissions.map(permission => (

                                    <ListItem
                                        key={permission.id}
                                        divider
                                        secondaryAction={

                                            <Checkbox
                                                checked={selectedPermissions.includes(permission.id)}
                                                onChange={() => togglePermission(permission.id)}
                                            />

                                        }
                                    >

                                        <ListItemText
                                            primary={permission.name}
                                            secondary={permission.description}
                                        />

                                    </ListItem>

                                ))
                            }

                            {
                                filteredPermissions.length === 0 &&

                                <Box py={5} textAlign="center">

                                    <Typography color="text.secondary">

                                        No permissions available

                                    </Typography>

                                </Box>

                            }

                        </List>

                }

            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: "1px solid #eee"
                }}
            >

                <Button
                    variant="outlined"
                    onClick={onClose}
                >

                    Cancel

                </Button>

                <Button
                    variant="contained"
                    sx={{
                        bgcolor: "#0F2D6B"
                    }}
                    disabled={
                        loading ||
                        selectedPermissions.length === 0
                    }
                    onClick={handleSubmit}
                >

                    {
                        loading
                            ?
                            "Assigning..."
                            :
                            "Assign Permissions"
                    }

                </Button>

            </DialogActions>

        </Dialog>
    );
}