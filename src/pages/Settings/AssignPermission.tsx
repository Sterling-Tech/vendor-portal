import React, { useEffect, useState } from "react";
import { Box, Card, Typography, Grid, Button, CircularProgress, List, ListItemButton, ListItemText, Checkbox, Divider, Chip, Stack, Alert, } from "@mui/material";

import { getAllAdmin, getPermissions, grantPermissions, CreateAdmin, PermissionItem, } from "../../services/settingService";

export default function AssignPermission() {
    const [admins, setAdmins] = useState<CreateAdmin[]>([]);
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);

    const [selectedAdmin, setSelectedAdmin] =
        useState<CreateAdmin | null>(null);

    const [selectedPermissions, setSelectedPermissions] =
        useState<number[]>([]);

    const [loading, setLoading] = useState(false);

    const [saving, setSaving] = useState(false);

    const [alert, setAlert] = useState<{
        open: boolean;
        type: "success" | "error";
        message: string;
    }>({
        open: false,
        type: "success",
        message: "",
    });

    const loadData = async () => {
        try {
            setLoading(true);

            const [adminsRes, permissionsRes] = await Promise.all([
                getAllAdmin(),
                getPermissions(),
            ]);

            console.log("permissionsRes", permissionsRes);

            setAdmins(adminsRes);
            setPermissions(permissionsRes);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePermissionToggle = (
        permissionId: number
    ) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleAssignPermissions = async () => {
        if (!selectedAdmin) {
            setAlert({
                open: true,
                type: "error",
                message: "Please select an admin",
            });
            return;
        }

        if (selectedPermissions.length === 0) {
            setAlert({
                open: true,
                type: "error",
                message:
                    "Please select at least one permission",
            });
            return;
        }

        try {
            setSaving(true);

            await grantPermissions({
                user: selectedAdmin.id,
                permissions: selectedPermissions,
            });

            setAlert({
                open: true,
                type: "success",
                message:
                    "Permissions assigned successfully",
            });

            setSelectedPermissions([]);
        } catch (error: any) {
            setAlert({
                open: true,
                type: "error",
                message:
                    error?.response?.data?.message ||
                    "Failed to assign permissions",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box textAlign="center" py={5}>
                <CircularProgress />
            </Box>
        );
    }
console.log(permissions, "permissions");
    return (
        <Card sx={{ p: 3 }}>
            <Typography
                variant="h5"
                fontWeight={600}
                mb={3}
            >
                Assign Permissions
            </Typography>

            {alert.open && (
                <Alert
                    severity={alert.type}
                    sx={{ mb: 3 }}
                >
                    {alert.message}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* ADMINS */}
                <Grid item xs={12} md={4}>
                    <Typography
                        variant="h6"
                        gutterBottom
                    >
                        Select Admin
                    </Typography>

                    <Card
                        variant="outlined"
                        sx={{
                            maxHeight: 500,
                            overflowY: "auto",
                        }}
                    >
                        <List>
                            {admins.map((admin) => (
                                <ListItemButton
                                    key={admin.id}
                                    selected={
                                        selectedAdmin?.id ===
                                        admin.id
                                    }
                                    onClick={() =>
                                        setSelectedAdmin(
                                            admin
                                        )
                                    }
                                >
                                    <ListItemText
                                        primary={admin.name}
                                        secondary={
                                            admin.email
                                        }
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Card>
                </Grid>

                {/* PERMISSIONS */}
                <Grid item xs={12} md={8}>
                    <Typography
                        variant="h6"
                        gutterBottom
                    >
                        Available Permissions
                    </Typography>

                    <Card
                        variant="outlined"
                        sx={{
                            maxHeight: 500,
                            overflowY: "auto",
                            p: 2,
                        }}
                    >
                        {/* {permissions.map((permission) => ( */}
                        {permissions.map((item) => (
                            
                            <Box
                                key={item.permission.id}
                                mb={2}
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                >
                                    <Checkbox
                                        checked={selectedPermissions.includes(
                                            item.permission.id
                                        )}
                                        onChange={() =>
                                            handlePermissionToggle(
                                                item.permission.id
                                            )
                                        }
                                    />

                                    <Box
                                        sx={{
                                            flex: 1,
                                        }}
                                    >
                                        <Typography
                                            fontWeight={
                                                600
                                            }
                                        >
                                            {
                                                item.permission.name
                                            }
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {
                                                item.permission.description
                                            }
                                        </Typography>
                                    </Box>

                                    <Chip
                                        label={
                                            item.permission.code
                                        }
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Stack>

                                <Divider
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        ))}
                    </Card>
                </Grid>
            </Grid>

            <Box
                display="flex"
                justifyContent="flex-end"
                mt={3}
            >
                <Button
                    variant="contained"
                    onClick={handleAssignPermissions}
                    disabled={saving}
                >
                    {saving ? (
                        <CircularProgress
                            size={20}
                            sx={{
                                color: "#fff",
                            }}
                        />
                    ) : (
                        "Assign Permissions"
                    )}
                </Button>
            </Box>
        </Card>
    );
}