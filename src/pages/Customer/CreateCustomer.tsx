

// "use client";

// import { useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Box,
//   Button,
//   Grid,
//   MenuItem,
//   TextField,
//   Typography,
//   IconButton,
//   CircularProgress,
//   Divider,
// } from "@mui/material";

// import CloseIcon from "@mui/icons-material/Close";
// import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

// import { CreateCustomerPayload } from "./customerTypes";

// interface CreateCustomerProps {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: (data: CreateCustomerPayload) => Promise<void> | void;
// }

// const customerClasses = [
//   "Residential",
//   "Commercial",
//   "Industrial",
//   "Special",
// ];

// const categories = [
//   "RESIDENTIAL",
//   "COMMERCIAL",
//   "INDUSTRIAL",
// ];

// export default function CreateCustomer({
//   open,
//   onClose,
//   onSubmit,
// }: CreateCustomerProps) {
//   const [form, setForm] = useState<CreateCustomerPayload>({
//     name: "",
//     phone: "",
//     accountNumber: "",
//     meterNumber: "",
//     customerClass: "",
//     category: "",
//     meteringType: "Prepaid",
//   });

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [loading, setLoading] = useState(false);

//   const handleChange = (
//     field: keyof CreateCustomerPayload,
//     value: string
//   ) => {
//     setForm((prev) => ({
//       ...prev,
//       [field]: value,
//     }));

//     setErrors((prev) => ({
//       ...prev,
//       [field]: "",
//     }));
//   };

//   const validate = () => {
//     const newErrors: Record<string, string> = {};

//     if (!form.name.trim()) newErrors.name = "Customer name is required";
//     if (!form.phone.trim()) newErrors.phone = "Phone number is required";
//     if (!form.accountNumber.trim())
//       newErrors.accountNumber = "Account number is required";
//     if (!form.meterNumber.trim())
//       newErrors.meterNumber = "Meter number is required";
//     if (!form.customerClass)
//       newErrors.customerClass = "Please select a customer class";
//     if (!form.category)
//       newErrors.category = "Please select a category";

//     setErrors(newErrors);

//     return Object.keys(newErrors).length === 0;
//   };

//   const resetForm = () => {
//     setForm({
//       name: "",
//       phone: "",
//       accountNumber: "",
//       meterNumber: "",
//       customerClass: "",
//       category: "",
//       meteringType: "Prepaid",
//     });

//     setErrors({});
//   };

//   const handleClose = () => {
//     if (loading) return;
//     resetForm();
//     onClose();
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     if (!validate()) return;

//     try {
//       setLoading(true);
//       await onSubmit(form);
//       resetForm();
//     } catch (error) {
//       console.error("Failed to create customer:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog
//       open={open}
//       onClose={handleClose}
//       fullWidth
//       maxWidth="md"
//       scroll="paper"
//       PaperProps={{
//         sx: {
//           borderRadius: 3,
//           overflow: "hidden",
//         },
//       }}
//     >
//       {/* MODAL HEADER */}
//       <DialogTitle sx={{ p: 3, pb: 2 }}>
//         <Box display="flex" justifyContent="space-between" alignItems="center">
//           <Box display="flex" alignItems="center" gap={1.5}>
//             <Box
//               sx={{
//                 width: 44,
//                 height: 44,
//                 borderRadius: 2,
//                 bgcolor: "#eff6ff",
//                 color: "#2563eb",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <PersonAddAlt1Icon />
//             </Box>

//             <Box>
//               <Typography variant="h6" fontWeight={700}>
//                 Create Customer
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 Register a new electricity customer
//               </Typography>
//             </Box>
//           </Box>

//           <IconButton onClick={handleClose} disabled={loading}>
//             <CloseIcon />
//           </IconButton>
//         </Box>
//       </DialogTitle>

//       <Divider />

//       {/* FORM CONTENT */}
//       <Box component="form" onSubmit={handleSubmit}>
//         <DialogContent sx={{ p: 3 }}>
//           <Typography fontWeight={600} mb={2}>
//             Customer Information
//           </Typography>

//           <Grid container spacing={2.5}>
//             {/* Customer Name */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Customer Name"
//                 placeholder="Enter full name"
//                 value={form.name}
//                 onChange={(e) => handleChange("name", e.target.value)}
//                 error={!!errors.name}
//                 helperText={errors.name}
//                 required
//               />
//             </Grid>

//             {/* Phone Number */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Phone Number"
//                 placeholder="08012345678"
//                 value={form.phone}
//                 onChange={(e) => handleChange("phone", e.target.value)}
//                 error={!!errors.phone}
//                 helperText={errors.phone}
//                 required
//               />
//             </Grid>

//             {/* Account Number */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Account Number"
//                 placeholder="Enter account number"
//                 value={form.accountNumber}
//                 onChange={(e) => handleChange("accountNumber", e.target.value)}
//                 error={!!errors.accountNumber}
//                 helperText={errors.accountNumber}
//                 required
//               />
//             </Grid>

//             {/* Meter Number */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Meter Number"
//                 placeholder="Enter meter number"
//                 value={form.meterNumber}
//                 onChange={(e) => handleChange("meterNumber", e.target.value)}
//                 error={!!errors.meterNumber}
//                 helperText={errors.meterNumber}
//                 required
//               />
//             </Grid>

//             {/* Customer Class */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Customer Class"
//                 value={form.customerClass}
//                 onChange={(e) =>
//                   handleChange("customerClass", e.target.value)
//                 }
//                 error={!!errors.customerClass}
//                 helperText={errors.customerClass}
//                 required
//               >
//                 {customerClasses.map((item) => (
//                   <MenuItem key={item} value={item}>
//                     {item}
//                   </MenuItem>
//                 ))}
//               </TextField>
//             </Grid>

//             {/* Category */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Category"
//                 value={form.category}
//                 onChange={(e) => handleChange("category", e.target.value)}
//                 error={!!errors.category}
//                 helperText={errors.category}
//                 required
//               >
//                 {categories.map((item) => (
//                   <MenuItem key={item} value={item}>
//                     {item}
//                   </MenuItem>
//                 ))}
//               </TextField>
//             </Grid>

//             {/* Metering Type */}
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Metering Type"
//                 value={form.meteringType}
//                 onChange={(e) =>
//                   handleChange("meteringType", e.target.value)
//                 }
//               >
//                 <MenuItem value="Prepaid">Prepaid</MenuItem>
//                 <MenuItem value="Postpaid">Postpaid</MenuItem>
//               </TextField>
//             </Grid>
//           </Grid>
//         </DialogContent>

//         <Divider />

//         {/* MODAL FOOTER */}
//         <DialogActions sx={{ px: 3, py: 2.5 }}>
//           <Button
//             variant="outlined"
//             color="inherit"
//             onClick={handleClose}
//             disabled={loading}
//             sx={{ textTransform: "none", minWidth: 100 }}
//           >
//             Cancel
//           </Button>

//           <Button
//             type="submit"
//             variant="contained"
//             disabled={loading}
//             startIcon={
//               loading ? (
//                 <CircularProgress size={18} color="inherit" />
//               ) : (
//                 <PersonAddAlt1Icon />
//               )
//             }
//             sx={{ textTransform: "none", minWidth: 160, fontWeight: 600 }}
//           >
//             {loading ? "Creating..." : "Create Customer"}
//           </Button>
//         </DialogActions>
//       </Box>
//     </Dialog>
//   );
// }


"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import {
  CustomerForm,
  CustomerOption,
} from "../../services/customerService";

interface CreateCustomerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerForm) => Promise<void>;
  categories: CustomerOption[];
  classes: CustomerOption[];
  meteringTypes: CustomerOption[];
}

const initialForm: CustomerForm = {
  name: "",
  email: "",
  phone_number: "",
  address: "",

  customer_category: 0,
  customer_class: null,
  metering_type: 0,

  feeder_33: "",
  service_unit: "",
  postpaid_arrears: "",
  district: "",
  feeder: "",
  transformer: "",
  service_center: "",

  band: "",
  tariff: "",

  krn: "",
  ti: "",
  sgc: "",
  kct1: "",
  kct2: "",
};

export default function CreateCustomer({
  open,
  onClose,
  onSubmit,
  categories,
  classes,
  meteringTypes,
}: CreateCustomerProps) {
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = <K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Customer name is required";
    if (!form.phone_number.trim())
      newErrors.phone_number = "Phone number is required";
    if (!form.address.trim()) newErrors.address = "Address is required";

    if (!form.customer_category)
      newErrors.customer_category = "Select a customer category";

    if (!form.metering_type)
      newErrors.metering_type = "Select metering type";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      await onSubmit(form);
      resetForm();
    } catch {
      // API errors are handled by the parent.
      // Keep form data so the user can retry.
    } finally {
      setLoading(false);
    }
  };

  const renderTextField = (
    name: keyof CustomerForm,
    label: string,
    options?: {
      required?: boolean;
      type?: string;
      multiline?: boolean;
      rows?: number;
    }
  ) => (
    <TextField
      fullWidth
      label={label}
      value={form[name] ?? ""}
      onChange={(e) => handleChange(name, e.target.value as never)}
      error={!!errors[name as string]}
      helperText={errors[name as string] || ""}
      required={options?.required}
      type={options?.type || "text"}
      multiline={options?.multiline}
      rows={options?.rows}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      {/* HEADER */}
      <DialogTitle sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PersonAddAlt1Icon />
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={700}>
                Create Customer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register a new electricity customer
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {/* BASIC INFORMATION */}
          <Typography fontWeight={700} mb={2}>
            Basic Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {renderTextField("name", "Customer Name", { required: true })}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("phone_number", "Phone Number", {
                required: true,
              })}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("email", "Email Address")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("address", "Address", { required: true })}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* CUSTOMER CONFIGURATION */}
          <Typography fontWeight={700} mb={2}>
            Customer Configuration
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                required
                label="Customer Category"
                value={form.customer_category || ""}
                onChange={(e) =>
                  handleChange("customer_category", Number(e.target.value))
                }
                error={!!errors.customer_category}
                helperText={errors.customer_category}
              >
                {categories.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Customer Class (Optional)"
                value={form.customer_class ?? ""}
                onChange={(e) =>
                  handleChange(
                    "customer_class",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                error={!!errors.customer_class}
                helperText={errors.customer_class}
              >
                <MenuItem value="">
                  <em>None (optional)</em>
                </MenuItem>
                {classes.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                required
                label="Metering Type"
                value={form.metering_type || ""}
                onChange={(e) =>
                  handleChange("metering_type", Number(e.target.value))
                }
                error={!!errors.metering_type}
                helperText={errors.metering_type}
              >
                {meteringTypes.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* SERVICE INFORMATION */}
          <Typography fontWeight={700} mb={2}>
            Service Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {renderTextField("district", "District")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("feeder", "Feeder")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("feeder_33", "33KV Feeder")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("transformer", "Transformer")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("service_unit", "Service Unit")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("service_center", "Service Center")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("band", "Band")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("tariff", "Tariff")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("postpaid_arrears", "Postpaid Arrears", {
                type: "number",
              })}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* METER CONFIGURATION */}
          <Typography fontWeight={700} mb={2}>
            Meter Configuration
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {renderTextField("krn", "KRN")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("ti", "TI")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("sgc", "SGC")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("kct1", "KCT1")}
            </Grid>

            <Grid item xs={12} md={6}>
              {renderTextField("kct2", "KCT2")}
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        {/* FOOTER */}
        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={loading}
            onClick={handleClose}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PersonAddAlt1Icon />
              )
            }
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading ? "Creating..." : "Create Customer"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
