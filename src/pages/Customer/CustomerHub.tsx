// "use client";

// import { useMemo, useState } from "react";
// import {
//     Box,
//     Typography,
//     Button,
//     Card,
//     TextField,
//     InputAdornment,
//     IconButton,
//     Menu,
//     MenuItem,
//     Chip,
//     Avatar,
//     Table,
//     TableBody,
//     TableCell,
//     TableContainer,
//     TableHead,
//     TableRow,
//     Select,
//     FormControl,
//     Pagination,
//     Stack,
//     Divider,
// } from "@mui/material";

// import SearchIcon from "@mui/icons-material/Search";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
// import MoreVertIcon from "@mui/icons-material/MoreVert";
// import ClearIcon from "@mui/icons-material/Clear";
// import { Customer, CreateCustomerPayload } from "./customerTypes";
// import CreateCustomer from "./CreateCustomer";

// const initialCustomers: Customer[] = [
//     {
//         id: 1,
//         name: "Mrs. Kaine Success",
//         phone: "08117578745",
//         accountNumber: "423167656802",
//         meterNumber: "811370278963457",
//         customerClass: "Residential",
//         category: "RESIDENTIAL",
//         meteringType: "Prepaid",
//         status: "active",
//         debtBalance: 0,
//     },
// ];

// const rowsPerPage = 10;

// interface CustomerHubProps {
//     initialData?: Customer[];
//     onRefresh?: () => Promise<void> | void;
//     onCreateCustomer?: (
//         data: CreateCustomerPayload
//     ) => Promise<Customer | void> | Customer | void;
// }

// export default function CustomerHub({
//     initialData,
//     onRefresh,
//     onCreateCustomer,
// }: CustomerHubProps) {
//     const [customers, setCustomers] = useState<Customer[]>(
//         initialData ?? initialCustomers
//     );

//     const [search, setSearch] = useState("");
//     const [statusFilter, setStatusFilter] = useState("all");
//     const [meteringFilter, setMeteringFilter] = useState("all");
//     const [classFilter, setClassFilter] = useState("all");
//     const [categoryFilter, setCategoryFilter] = useState("all");

//     const [page, setPage] = useState(1);
//     const [showCreate, setShowCreate] = useState(false);
//     const [refreshing, setRefreshing] = useState(false);

//     const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
//     const [selectedCustomer, setSelectedCustomer] =
//         useState<Customer | null>(null);

//     // ---------------- FILTER CUSTOMERS ----------------

//     const filteredCustomers = useMemo(() => {
//         return customers.filter((customer) => {
//             const query = search.toLowerCase().trim();

//             const matchesSearch =
//                 !query ||
//                 customer.accountNumber.toLowerCase().includes(query) ||
//                 customer.meterNumber.toLowerCase().includes(query) ||
//                 customer.name.toLowerCase().includes(query) ||
//                 customer.phone.toLowerCase().includes(query);

//             const matchesStatus =
//                 statusFilter === "all" || customer.status === statusFilter;

//             const matchesMetering =
//                 meteringFilter === "all" ||
//                 customer.meteringType.toLowerCase() === meteringFilter.toLowerCase();

//             const matchesClass =
//                 classFilter === "all" ||
//                 customer.customerClass.toLowerCase() === classFilter.toLowerCase();

//             const matchesCategory =
//                 categoryFilter === "all" ||
//                 customer.category.toLowerCase() === categoryFilter.toLowerCase();

//             return (
//                 matchesSearch &&
//                 matchesStatus &&
//                 matchesMetering &&
//                 matchesClass &&
//                 matchesCategory
//             );
//         });
//     }, [
//         customers,
//         search,
//         statusFilter,
//         meteringFilter,
//         classFilter,
//         categoryFilter,
//     ]);

//     // ---------------- PAGINATION ----------------

//     const totalPages = Math.max(
//         1,
//         Math.ceil(filteredCustomers.length / rowsPerPage)
//     );

//     const paginatedCustomers = filteredCustomers.slice(
//         (page - 1) * rowsPerPage,
//         page * rowsPerPage
//     );

//     // ---------------- HELPERS ----------------

//     const getInitials = (name: string) => {
//         return name
//             .trim()
//             .split(/\s+/)
//             .slice(0, 2)
//             .map((word) => word[0])
//             .join("")
//             .toUpperCase();
//     };

//     const formatCurrency = (amount: number) => {
//         return new Intl.NumberFormat("en-NG", {
//             style: "currency",
//             currency: "NGN",
//             maximumFractionDigits: 0,
//         }).format(amount);
//     };

//     const handleRefresh = async () => {
//         try {
//             setRefreshing(true);
//             await onRefresh?.();
//         } finally {
//             setRefreshing(false);
//         }
//     };

//     const clearFilters = () => {
//         setSearch("");
//         setStatusFilter("all");
//         setMeteringFilter("all");
//         setClassFilter("all");
//         setCategoryFilter("all");
//         setPage(1);
//     };

//     const handleMenuOpen = (
//         event: React.MouseEvent<HTMLElement>,
//         customer: Customer
//     ) => {
//         setMenuAnchor(event.currentTarget);
//         setSelectedCustomer(customer);
//     };

//     const handleMenuClose = () => {
//         setMenuAnchor(null);
//     };

//     const handleCreate = async (data: CreateCustomerPayload) => {
//         const result = await onCreateCustomer?.(data);

//         // If the parent/API returns a customer, use it.
//         // Otherwise, create a local record for UI demonstration.
//         const newCustomer: Customer =
//             result && typeof result === "object"
//                 ? result
//                 : {
//                     id: Date.now(),
//                     ...data,
//                     status: "active",
//                     debtBalance: 0,
//                 };

//         setCustomers((prev) => [newCustomer, ...prev]);
//         setShowCreate(false);
//         setPage(1);
//     };

//     // ---------------- CREATE CUSTOMER VIEW ----------------

//     //   if (showCreate) {
//     //     return (
//     //       <CreateCustomer
//     //         onCancel={() => setShowCreate(false)}
//     //         onSubmit={handleCreate}
//     //       />
//     //     );
//     //   }


//     // ---------------- MAIN HUB ----------------

//     return (
//         <Box sx={{ width: "100%", color: "#0f172a" }}>
//             {/* HEADER */}
//             <Box
//                 display="flex"
//                 alignItems={{ xs: "flex-start", md: "center" }}
//                 justifyContent="space-between"
//                 flexDirection={{ xs: "column", md: "row" }}
//                 gap={2}
//                 mb={4}
//             >
//                 <Box>
//                     <Typography
//                         variant="h4"
//                         fontWeight={700}
//                         sx={{ fontSize: { xs: 26, md: 34 } }}
//                     >
//                         Customer Hub
//                     </Typography>

//                     <Typography color="text.secondary" mt={0.5}>
//                         Register and manage all customers — search by meter number or account
//                         number
//                     </Typography>
//                 </Box>

//                 <Stack direction="row" spacing={1.5} flexWrap="wrap">
//                     {/* <Button
//             variant="outlined"
//             startIcon={<PersonAddAlt1Icon />}
//             onClick={() => setShowCreate(true)}
//             sx={{
//               textTransform: "none",
//               fontWeight: 600,
//               borderRadius: 2,
//               px: 2,
//               py: 1.1,
//             }}
//           >
//             Create Customer
//           </Button> */}
//                     <Button
//                         variant="outlined"
//                         startIcon={<PersonAddAlt1Icon />}
//                         onClick={() => setShowCreate(true)}
//                         sx={{
//                             textTransform: "none",
//                             fontWeight: 600,
//                             borderRadius: 2,
//                             px: 2,
//                             py: 1.1,
//                         }}
//                     >
//                         Create Customer
//                     </Button>

//                     <Button
//                         variant="outlined"
//                         startIcon={<RefreshIcon />}
//                         onClick={handleRefresh}
//                         disabled={refreshing}
//                         sx={{
//                             textTransform: "none",
//                             fontWeight: 600,
//                             borderRadius: 2,
//                             px: 2,
//                             py: 1.1,
//                         }}
//                     >
//                         {refreshing ? "Refreshing..." : "Refresh"}
//                     </Button>
//                 </Stack>
//             </Box>

//             {/* QUICK SEARCH */}
//             <Card
//                 elevation={0}
//                 sx={{
//                     border: "1px solid #e2e8f0",
//                     borderRadius: 3,
//                     p: { xs: 2, md: 3 },
//                     mb: 3,
//                 }}
//             >
//                 <Typography
//                     variant="subtitle1"
//                     fontWeight={700}
//                     color="text.secondary"
//                     sx={{ letterSpacing: 1, mb: 1.5 }}
//                 >
//                     QUICK SEARCH
//                 </Typography>

//                 <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
//                     <TextField
//                         fullWidth
//                         value={search}
//                         onChange={(e) => {
//                             setSearch(e.target.value);
//                             setPage(1);
//                         }}
//                         placeholder="Search by account number or meter number..."
//                         InputProps={{
//                             startAdornment: (
//                                 <InputAdornment position="start">
//                                     <SearchIcon sx={{ color: "#94a3b8" }} />
//                                 </InputAdornment>
//                             ),
//                             endAdornment: search ? (
//                                 <InputAdornment position="end">
//                                     <Chip
//                                         label="Account / Meter"
//                                         size="small"
//                                         color="primary"
//                                         variant="filled"
//                                     />
//                                 </InputAdornment>
//                             ) : null,
//                         }}
//                         sx={{
//                             "& .MuiOutlinedInput-root": {
//                                 borderRadius: 2.5,
//                                 bgcolor: "#f1f5f9",
//                                 "& fieldset": {
//                                     borderColor: "transparent",
//                                 },
//                                 "&:hover fieldset": {
//                                     borderColor: "#cbd5e1",
//                                 },
//                             },
//                         }}
//                     />

//                     <Button
//                         variant="contained"
//                         color="inherit"
//                         onClick={clearFilters}
//                         startIcon={<ClearIcon />}
//                         sx={{
//                             minWidth: { sm: 110 },
//                             bgcolor: "#e2e8f0",
//                             color: "#334155",
//                             fontWeight: 600,
//                             borderRadius: 2,
//                             textTransform: "none",
//                             "&:hover": {
//                                 bgcolor: "#cbd5e1",
//                             },
//                         }}
//                     >
//                         Clear
//                     </Button>
//                 </Stack>
//             </Card>

//             {/* CUSTOMER TABLE CARD */}
//             <Card
//                 elevation={0}
//                 sx={{
//                     border: "1px solid #e2e8f0",
//                     borderRadius: 3,
//                     overflow: "hidden",
//                 }}
//             >
//                 {/* TABLE HEADER / FILTERS */}
//                 <Box
//                     p={{ xs: 2, md: 3 }}
//                     display="flex"
//                     justifyContent="space-between"
//                     alignItems={{ xs: "flex-start", lg: "center" }}
//                     flexDirection={{ xs: "column", lg: "row" }}
//                     gap={2}
//                 >
//                     <Box>
//                         <Typography variant="h6" fontWeight={700}>
//                             All Customers
//                         </Typography>

//                         <Typography variant="body2" color="text.secondary">
//                             {search ? `Search results for "${search}"` : "Showing all customers"}
//                         </Typography>
//                     </Box>

//                     <Stack
//                         direction="row"
//                         gap={1.5}
//                         flexWrap="wrap"
//                         sx={{ width: { xs: "100%", lg: "auto" } }}
//                     >
//                         {/* STATUS */}
//                         <FilterSelect
//                             value={statusFilter}
//                             onChange={(value) => {
//                                 setStatusFilter(value);
//                                 setPage(1);
//                             }}
//                             options={[
//                                 { value: "all", label: "All Status" },
//                                 { value: "active", label: "Active" },
//                                 { value: "inactive", label: "Inactive" },
//                             ]}
//                         />

//                         {/* METERING */}
//                         <FilterSelect
//                             value={meteringFilter}
//                             onChange={(value) => {
//                                 setMeteringFilter(value);
//                                 setPage(1);
//                             }}
//                             options={[
//                                 { value: "all", label: "All Metering" },
//                                 { value: "prepaid", label: "Prepaid" },
//                                 { value: "postpaid", label: "Postpaid" },
//                             ]}
//                         />

//                         {/* CLASS */}
//                         <FilterSelect
//                             value={classFilter}
//                             onChange={(value) => {
//                                 setClassFilter(value);
//                                 setPage(1);
//                             }}
//                             options={[
//                                 { value: "all", label: "All Classes" },
//                                 { value: "residential", label: "Residential" },
//                                 { value: "commercial", label: "Commercial" },
//                                 { value: "industrial", label: "Industrial" },
//                                 { value: "special", label: "Special" },
//                             ]}
//                         />

//                         {/* CATEGORY */}
//                         <FilterSelect
//                             value={categoryFilter}
//                             onChange={(value) => {
//                                 setCategoryFilter(value);
//                                 setPage(1);
//                             }}
//                             options={[
//                                 { value: "all", label: "All Categories" },
//                                 { value: "residential", label: "Residential" },
//                                 { value: "commercial", label: "Commercial" },
//                                 { value: "industrial", label: "Industrial" },
//                             ]}
//                         />
//                     </Stack>
//                 </Box>

//                 {/* TABLE */}
//                 <TableContainer sx={{ overflowX: "auto" }}>
//                     <Table sx={{ minWidth: 1150 }}>
//                         <TableHead>
//                             <TableRow
//                                 sx={{
//                                     "& th": {
//                                         color: "#94a3b8",
//                                         fontWeight: 700,
//                                         fontSize: 13,
//                                         whiteSpace: "nowrap",
//                                         borderBottom: "1px solid #e2e8f0",
//                                     },
//                                 }}
//                             >
//                                 <TableCell>Customer</TableCell>
//                                 <TableCell>Account No</TableCell>
//                                 <TableCell>Meter No</TableCell>
//                                 <TableCell>Class</TableCell>
//                                 <TableCell>Category</TableCell>
//                                 <TableCell>Metering</TableCell>
//                                 <TableCell>Status</TableCell>
//                                 <TableCell>Debt Balance</TableCell>
//                                 <TableCell align="center">Actions</TableCell>
//                             </TableRow>
//                         </TableHead>

//                         <TableBody>
//                             {paginatedCustomers.length > 0 ? (
//                                 paginatedCustomers.map((customer) => (
//                                     <TableRow
//                                         key={customer.id}
//                                         hover
//                                         sx={{
//                                             "& td": {
//                                                 py: 2,
//                                                 borderBottom: "1px solid #e2e8f0",
//                                             },
//                                         }}
//                                     >
//                                         {/* CUSTOMER */}
//                                         <TableCell>
//                                             <Stack direction="row" spacing={1.5} alignItems="center">
//                                                 <Avatar
//                                                     sx={{
//                                                         bgcolor: "#e2e8f0",
//                                                         color: "#334155",
//                                                         fontWeight: 700,
//                                                     }}
//                                                 >
//                                                     {getInitials(customer.name)}
//                                                 </Avatar>

//                                                 <Box>
//                                                     <Typography
//                                                         fontWeight={500}
//                                                         sx={{ whiteSpace: "nowrap" }}
//                                                     >
//                                                         {customer.name}
//                                                     </Typography>
//                                                     <Typography
//                                                         variant="body2"
//                                                         color="text.secondary"
//                                                         sx={{ whiteSpace: "nowrap" }}
//                                                     >
//                                                         {customer.phone}
//                                                     </Typography>
//                                                 </Box>
//                                             </Stack>
//                                         </TableCell>

//                                         <TableCell sx={{ whiteSpace: "nowrap" }}>
//                                             {customer.accountNumber}
//                                         </TableCell>

//                                         <TableCell sx={{ whiteSpace: "nowrap" }}>
//                                             {customer.meterNumber}
//                                         </TableCell>

//                                         {/* CLASS */}
//                                         <TableCell>
//                                             <Chip
//                                                 label={customer.customerClass}
//                                                 size="small"
//                                                 sx={{
//                                                     bgcolor: "#dcfce7",
//                                                     color: "#15803d",
//                                                     borderRadius: 5,
//                                                     px: 0.5,
//                                                 }}
//                                             />
//                                         </TableCell>

//                                         {/* CATEGORY */}
//                                         <TableCell sx={{ whiteSpace: "nowrap" }}>
//                                             {customer.category}
//                                         </TableCell>

//                                         {/* METERING */}
//                                         <TableCell>
//                                             <Chip
//                                                 label={customer.meteringType}
//                                                 size="small"
//                                                 sx={{
//                                                     bgcolor: "#eef2ff",
//                                                     color: "#4338ca",
//                                                     borderRadius: 5,
//                                                     px: 0.5,
//                                                 }}
//                                             />
//                                         </TableCell>

//                                         {/* STATUS */}
//                                         <TableCell>
//                                             <Chip
//                                                 label={customer.status}
//                                                 size="small"
//                                                 sx={{
//                                                     bgcolor:
//                                                         customer.status === "active"
//                                                             ? "#dcfce7"
//                                                             : "#fee2e2",
//                                                     color:
//                                                         customer.status === "active"
//                                                             ? "#15803d"
//                                                             : "#b91c1c",
//                                                     borderRadius: 5,
//                                                     px: 0.5,
//                                                 }}
//                                             />
//                                         </TableCell>

//                                         {/* DEBT */}
//                                         <TableCell>
//                                             <Box
//                                                 sx={{
//                                                     minWidth: 85,
//                                                     textAlign: "center",
//                                                     bgcolor:
//                                                         customer.debtBalance <= 0
//                                                             ? "#dcfce7"
//                                                             : "#fee2e2",
//                                                     color:
//                                                         customer.debtBalance <= 0
//                                                             ? "#15803d"
//                                                             : "#b91c1c",
//                                                     borderRadius: 2,
//                                                     py: 1,
//                                                     px: 1.5,
//                                                     fontWeight: 700,
//                                                 }}
//                                             >
//                                                 {formatCurrency(customer.debtBalance)}
//                                             </Box>
//                                         </TableCell>

//                                         {/* ACTIONS */}
//                                         <TableCell align="center">
//                                             <IconButton
//                                                 onClick={(e) => handleMenuOpen(e, customer)}
//                                                 size="small"
//                                             >
//                                                 <MoreVertIcon />
//                                             </IconButton>
//                                         </TableCell>
//                                     </TableRow>
//                                 ))
//                             ) : (
//                                 <TableRow>
//                                     <TableCell colSpan={9}>
//                                         <Box py={6} textAlign="center">
//                                             <SearchIcon
//                                                 sx={{
//                                                     fontSize: 40,
//                                                     color: "#cbd5e1",
//                                                     mb: 1,
//                                                 }}
//                                             />
//                                             <Typography fontWeight={600}>
//                                                 No customers found
//                                             </Typography>
//                                             <Typography color="text.secondary" variant="body2">
//                                                 Try adjusting your search or filters.
//                                             </Typography>
//                                         </Box>
//                                     </TableCell>
//                                 </TableRow>
//                             )}
//                         </TableBody>
//                     </Table>
//                 </TableContainer>

//                 <Divider />

//                 {/* PAGINATION FOOTER */}
//                 <Box
//                     display="flex"
//                     alignItems="center"
//                     justifyContent="space-between"
//                     flexWrap="wrap"
//                     gap={2}
//                     p={2}
//                 >
//                     <Typography variant="body2">
//                         Page {page} of {totalPages}
//                         {filteredCustomers.length > 0 &&
//                             ` • ${filteredCustomers.length} customer${filteredCustomers.length === 1 ? "" : "s"}`}
//                     </Typography>

//                     <Pagination
//                         count={totalPages}
//                         page={page}
//                         onChange={(_, value) => setPage(value)}
//                         color="primary"
//                         shape="rounded"
//                         siblingCount={0}
//                         boundaryCount={1}
//                     />
//                 </Box>
//             </Card>

//             {/* CUSTOMER ACTION MENU */}
//             <Menu
//                 anchorEl={menuAnchor}
//                 open={Boolean(menuAnchor)}
//                 onClose={handleMenuClose}
//             >
//                 <MenuItem
//                     onClick={() => {
//                         console.log("View customer:", selectedCustomer);
//                         handleMenuClose();
//                     }}
//                 >
//                     View Customer
//                 </MenuItem>

//                 <MenuItem
//                     onClick={() => {
//                         console.log("Edit customer:", selectedCustomer);
//                         handleMenuClose();
//                     }}
//                 >
//                     Edit Customer
//                 </MenuItem>

//                 <MenuItem
//                     onClick={() => {
//                         console.log("Customer selected:", selectedCustomer);
//                         handleMenuClose();
//                     }}
//                 >
//                     Manage Customer
//                 </MenuItem>
//             </Menu>

//             <CreateCustomer
//                 open={showCreate}
//                 onClose={() => setShowCreate(false)}
//                 onSubmit={handleCreate}
//             />
//         </Box>
//     );
// }

// // ---------------- REUSABLE FILTER ----------------

// interface FilterOption {
//     value: string;
//     label: string;
// }

// interface FilterSelectProps {
//     value: string;
//     onChange: (value: string) => void;
//     options: FilterOption[];
// }

// function FilterSelect({
//     value,
//     onChange,
//     options,
// }: FilterSelectProps) {
//     return (
//         <FormControl
//             size="small"
//             sx={{
//                 minWidth: { xs: "calc(50% - 8px)", sm: 130 },
//                 flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
//             }}
//         >
//             <Select
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 sx={{
//                     borderRadius: 2,
//                     "& .MuiSelect-select": {
//                         py: 1.5,
//                     },
//                 }}
//             >
//                 {options.map((option) => (
//                     <MenuItem key={option.value} value={option.value}>
//                         {option.label}
//                     </MenuItem>
//                 ))}
//             </Select>
//         </FormControl>
//     );
// }


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Divider,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ClearIcon from "@mui/icons-material/Clear";

import CreateCustomer from "./CreateCustomer";

import {
  Customer,
  CustomerOption,
  CustomerForm,
  fetchCustomers,
  fetchCustomerCategories,
  fetchCustomerClasses,
  fetchMeteringTypes,
  createCustomer,
} from "../../services/customerService";

const rowsPerPage = 10;

export default function CustomerHub() {
  // DATA
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<CustomerOption[]>([]);
  const [classes, setClasses] = useState<CustomerOption[]>([]);
  const [meteringTypes, setMeteringTypes] = useState<CustomerOption[]>([]);
  const [optionsError, setOptionsError] = useState("");

  // LOADING
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // FILTERS
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [meteringFilter, setMeteringFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // PAGINATION
  const [page, setPage] = useState(1);

  // MODAL
  const [showCreate, setShowCreate] = useState(false);

  // ROW ACTIONS
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // ERROR
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCustomerOptions = async () => {
      try {
        const [customerCategories, customerClasses, customerMeteringTypes] =
          await Promise.all([
            fetchCustomerCategories(),
            fetchCustomerClasses(),
            fetchMeteringTypes(),
          ]);

        setCategories(customerCategories);
        setClasses(customerClasses);
        setMeteringTypes(customerMeteringTypes);
      } catch (err) {
        console.error("Failed to fetch customer form options:", err);
        setOptionsError("Unable to load customer form options. Please try again.");
      }
    };

    loadCustomerOptions();
  }, []);

  // --------------------------------------------------
  // FETCH CUSTOMERS
  // --------------------------------------------------

  const loadCustomers = useCallback(async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetchCustomers({
        page,
        metering_type_id:
          meteringFilter !== "all" ? meteringFilter : undefined,
        class_id: classFilter !== "all" ? classFilter : undefined,
        category_id: categoryFilter !== "all" ? categoryFilter : undefined,
      });

      setCustomers(response.results ?? []);
      setTotalCount(response.count ?? 0);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setError("Unable to load customers. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, meteringFilter, classFilter, categoryFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // --------------------------------------------------
  // CREATE CUSTOMER
  // --------------------------------------------------

  const handleCreateCustomer = async (payload: CustomerForm) => {
    try {
      setError("");

      await createCustomer(payload);

      // Refresh current list from the backend to get the
      // fully populated customer, including nested objects.
      setShowCreate(false);
      setPage(1);

      // If already on page 1, the page change won't trigger
      // the effect, so explicitly fetch.
      if (page === 1) {
        await loadCustomers();
      }

    } catch (err) {
      console.error("Failed to create customer:", err);
      throw err;
    }
  };

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name?.toLowerCase().includes(query) ||
        customer.account_number?.toLowerCase().includes(query) ||
        customer.meter_number?.toLowerCase().includes(query) ||
        customer.phone_number?.toLowerCase().includes(query);

      const status =
        (customer.account_status || customer.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  // Backend pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getInitials = (name?: string) => {
    if (!name) return "CU";

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  const formatCurrency = (amount?: string | number | null) => {
    const value = Number(amount ?? 0);

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const getStatusColor = (status?: string) => {
    const value = status?.toLowerCase();

    if (value === "active") return "success";
    if (value === "inactive" || value === "suspended") return "error";

    return "default";
  };

  const handleRefresh = () => {
    loadCustomers(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMeteringFilter("all");
    setClassFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    customer: Customer
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // --------------------------------------------------
  // REUSABLE FILTER SELECT
  // --------------------------------------------------

  const FilterSelect = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <FormControl
      size="small"
      sx={{
        minWidth: { xs: "calc(50% - 8px)", sm: 135 },
        flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
      }}
    >
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          borderRadius: 2,
          "& .MuiSelect-select": { py: 1.5 },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <Box sx={{ width: "100%", color: "#0f172a" }}>
      {/* PAGE HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        flexDirection={{ xs: "column", md: "row" }}
        gap={2}
        mb={4}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ fontSize: { xs: 26, md: 34 } }}
          >
            Customer Hub
          </Typography>

          <Typography color="text.secondary" mt={0.5}>
            Register and manage all customers — search by meter number or account
            number
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<PersonAddAlt1Icon />}
            onClick={() => setShowCreate(true)}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Create Customer
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Box>

      {/* ERROR MESSAGE */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {optionsError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOptionsError("")}>
          {optionsError}
        </Alert>
      )}

      {/* QUICK SEARCH */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          mb: 3,
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          color="text.secondary"
          sx={{ letterSpacing: 1, mb: 1.5 }}
        >
          QUICK SEARCH
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account number or meter number..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: "#f1f5f9",
                "& fieldset": { borderColor: "transparent" },
              },
            }}
          />

          <Button
            variant="contained"
            color="inherit"
            onClick={clearFilters}
            startIcon={<ClearIcon />}
            sx={{
              minWidth: { sm: 110 },
              bgcolor: "#e2e8f0",
              color: "#334155",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#cbd5e1" },
            }}
          >
            Clear
          </Button>
        </Stack>
      </Card>

      {/* CUSTOMER TABLE CARD */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* TABLE HEADER AND FILTERS */}
        <Box
          p={{ xs: 2, md: 3 }}
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          flexDirection={{ xs: "column", lg: "row" }}
          gap={2}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              All Customers
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {search ? "Filtered customers" : "Showing all customers"}
            </Typography>
          </Box>

          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <FilterSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "suspended", label: "Suspended" },
              ]}
            />

            <FilterSelect
              value={meteringFilter}
              onChange={(value) => {
                setMeteringFilter(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Metering" },
                ...meteringTypes.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              ]}
            />

            <FilterSelect
              value={classFilter}
              onChange={(value) => {
                setClassFilter(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Classes" },
                ...classes.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              ]}
            />

            <FilterSelect
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              ]}
            />
          </Stack>
        </Box>

        {/* TABLE */}
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 1150 }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    color: "#94a3b8",
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Customer</TableCell>
                <TableCell>Account No</TableCell>
                <TableCell>Meter No</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Metering</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Debt Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box py={5} textAlign="center">
                      <Typography color="text.secondary">
                        Loading customers...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const status =
                    customer.account_status || customer.status || "";

                  const debt =
                    customer.extra_info?.postpaid_arrears ?? "0";

                  return (
                    <TableRow key={customer.id} hover>
                      {/* CUSTOMER */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: "#e2e8f0",
                              color: "#334155",
                              fontWeight: 700,
                            }}
                          >
                            {getInitials(customer.name)}
                          </Avatar>

                          <Box>
                            <Typography fontWeight={500} whiteSpace="nowrap">
                              {customer.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              whiteSpace="nowrap"
                            >
                              {customer.phone_number || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {customer.account_number || "—"}
                      </TableCell>

                      <TableCell>
                        {customer.meter_number || "—"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={customer.customer_class?.name || "—"}
                          sx={{
                            bgcolor: "#dcfce7",
                            color: "#15803d",
                            borderRadius: 5,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        {customer.customer_category?.name || "—"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={customer.metering_type?.name || "—"}
                          sx={{
                            bgcolor: "#eef2ff",
                            color: "#4338ca",
                            borderRadius: 5,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        {status ? (
                          <Chip
                            size="small"
                            label={status}
                            color={getStatusColor(status)}
                            sx={{ borderRadius: 5 }}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            minWidth: 90,
                            textAlign: "center",
                            bgcolor:
                              Number(debt) <= 0 ? "#dcfce7" : "#fee2e2",
                            color:
                              Number(debt) <= 0 ? "#15803d" : "#b91c1c",
                            borderRadius: 2,
                            py: 1,
                            px: 1.5,
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(debt)}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, customer)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box py={6} textAlign="center">
                      <SearchIcon
                        sx={{ fontSize: 40, color: "#cbd5e1", mb: 1 }}
                      />

                      <Typography fontWeight={600}>
                        No customers found
                      </Typography>

                      <Typography color="text.secondary" variant="body2">
                        Try adjusting your search or filters.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />

        {/* PAGINATION */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          p={2}
        >
          <Typography variant="body2">
            Page {page} of {totalPages} · {totalCount} customers
          </Typography>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            siblingCount={0}
            boundaryCount={1}
          />
        </Box>
      </Card>

      {/* ROW ACTION MENU */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            console.log("View customer", selectedCustomer);
            handleMenuClose();
          }}
        >
          View Customer
        </MenuItem>

        <MenuItem
          onClick={() => {
            console.log("Edit customer", selectedCustomer);
            handleMenuClose();
          }}
        >
          Edit Customer
        </MenuItem>

        <MenuItem
          onClick={() => {
            console.log("Manage customer", selectedCustomer);
            handleMenuClose();
          }}
        >
          Manage Customer
        </MenuItem>
      </Menu>

      {/* CREATE CUSTOMER MODAL */}
      <CreateCustomer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateCustomer}
        categories={categories}
        classes={classes}
        meteringTypes={meteringTypes}
      />
    </Box>
  );
}
