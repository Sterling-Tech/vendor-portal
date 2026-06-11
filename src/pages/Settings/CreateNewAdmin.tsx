import React from 'react'
import {
    Box,
    Card,
    Typography,
    TextField,
    IconButton,
    MenuItem,
    Button,
    Select,
    FormControl,
    Autocomplete,
    Grid, CircularProgress
} from "@mui/material";
import { adminForm, createNewAdmin } from '../../services/settingService';
import { Fullscreen } from '@mui/icons-material';

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
];

export default function CreateNewAdmin() {
    const [adminForm, setAdminForm] = React.useState<adminForm>({} as adminForm);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [loading, setLoading] = React.useState(false);
    const [alert, setAlert] = React.useState<{ open: boolean; type: string; message: string }>({
        open: false,
        type: "success",
        message: ""
    });

    const validateAdminForm = () => {
        const newErrors: Record<string, string> = {};

        if (!adminForm.name?.trim()) {
            newErrors.name = "Name field is required";
        }

        if (!adminForm.email?.trim()) {
            newErrors.email = "Email Address field is required";
        }

        if (!adminForm.phone_number?.trim()) {
            newErrors.phone_number = "Phone Number field is required";
        }

        if (!adminForm.gender?.trim()) {
            newErrors.gender = "Gender field is required";
        }
        // email format validation
        if (
            adminForm.email &&
            !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(adminForm.email)
        ) {
            newErrors.email = "Invalid email address";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleCreateAdmin = async () => {
        if (!validateAdminForm()) {
            return;
        }
        try {
            setLoading(true);
            await createNewAdmin(adminForm as adminForm);
            setAlert({
                open: true,
                type: "success",
                message: "Admin created successfully",
            });

            setAdminForm({
                name: "",
                email: "",
                phone_number: "",
                gender: ""
            })
        } catch (error) {
            console.error("Error creating admin:", error);
            // Optionally, set a general error message in the UI
            setErrors((prev) => ({
                ...prev,
                general: "An error occurred while creating the admin. Please try again.",
            }));
        } finally {
            setLoading(false);
        }
    }
    return (
        <div>
            <Card
                sx={{
                    fullwidth: "100%",
                    borderRadius: 4,
                    overflow: "hidden",
                }}
            >

                {/* FORM */}
                <Box px={3} py={3}>
                    <Grid container spacing={5}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Business Name"
                                placeholder="e.g. Acme Nigeria Ltd"
                                value={adminForm.name || ""}

                                onChange={(e) => {
                                    setAdminForm({ ...adminForm, name: e.target.value })

                                    setErrors((prev) => ({
                                        ...prev,
                                        name: "",
                                    }));
                                }}
                                error={!!errors.name}
                                helperText={errors.name}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                placeholder="admin@business.com"
                                value={adminForm.email || ""}

                                onChange={(e) => {
                                    setAdminForm({ ...adminForm, email: e.target.value })

                                    setErrors((prev) => ({
                                        ...prev,
                                        email: "",
                                    }));
                                }}
                                error={!!errors.email}
                                helperText={errors.email}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                placeholder="+234 800 000 0000"
                                value={adminForm.phone_number || ""}
                                onChange={(e) => {
                                    setAdminForm({ ...adminForm, phone_number: e.target.value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        phone_number: "",
                                    }));
                                }}
                                error={!!errors.phone_number}
                                helperText={errors.phone_number}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl
                                fullWidth
                                error={!!errors.gender}
                            >
                                <Select
                                    displayEmpty
                                    value={adminForm.gender || ""}

                                    onChange={(e) => {
                                        setAdminForm({
                                            ...adminForm,
                                            gender: e.target.value,
                                        })
                                        setErrors((prev) => ({
                                            ...prev,
                                            gender: "",
                                        }));
                                    }}
                                >
                                    <MenuItem value="">Select Gender</MenuItem>
                                    {genderOptions.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.gender && (
                                    <Typography
                                        fontSize={12}
                                        color="error"
                                        mt={0.5}
                                    >
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
                            px: 3,
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
        </div>
    )
}