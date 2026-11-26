

import React from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { VendTransactionResponse } from "../../../services/customerService";


interface VendingHistoryProps {
  transaction: VendTransactionResponse | null;
  loading?: boolean;
  error?: string;
}

const formatCurrency = (value?: string | number) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const getStatusColor = (status: string) => {
  const value = status?.toLowerCase();

  if (["success", "successful", "completed"].includes(value)) {
    return "success";
  }

  if (["failed", "declined", "cancelled", "canceled"].includes(value)) {
    return "error";
  }

  if (["pending", "processing", "initiated"].includes(value)) {
    return "warning";
  }

  return "default";
};

const VendingHistory: React.FC<VendingHistoryProps> = ({
  transaction,
  loading = false,
  error = "",
}) => {
  const copyToken = async () => {
    if (!transaction?.token) return;

    try {
      await navigator.clipboard.writeText(transaction.token);
    } catch (err) {
      console.error("Unable to copy meter token:", err);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Vending History
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            View your latest electricity vending transaction.
          </Typography>
        </Box>

        {transaction && (
          <Chip
            icon={<ReceiptLongIcon />}
            label="Latest Transaction"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Transaction Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        <Table sx={{ minWidth: 950 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              {[
                "Transaction Reference",
                "Status",
                "Amount",
                "Units",
                "Meter Token",
                "VAT",
                "Outstanding Debt",
              ].map((heading) => (
                <TableCell
                  key={heading}
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: "#475569",
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography color="text.secondary" mt={1}>
                    Loading transaction...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !transaction ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                  <ReceiptLongIcon
                    sx={{ fontSize: 42, color: "text.disabled" }}
                  />

                  <Typography fontWeight={600} mt={1}>
                    No transaction found
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Your vending transactions will appear here after a
                    successful payment.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {transaction.transaction_reference || "—"}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={transaction.status || "Unknown"}
                    color={getStatusColor(transaction.status)}
                    icon={
                      getStatusColor(transaction.status) === "success" ? (
                        <CheckCircleIcon />
                      ) : getStatusColor(transaction.status) === "error" ? (
                        <CancelIcon />
                      ) : getStatusColor(transaction.status) === "warning" ? (
                        <ScheduleIcon />
                      ) : undefined
                    }
                    sx={{
                      textTransform: "capitalize",
                      fontWeight: 600,
                    }}
                  />
                </TableCell>

                <TableCell>
                  <Typography fontWeight={600} variant="body2">
                    {formatCurrency(transaction.amount)}
                  </Typography>
                </TableCell>

                <TableCell>{transaction.units || "—"}</TableCell>

                <TableCell>
                  {transaction.token ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {transaction.token}
                      </Typography>

                      <Tooltip title="Copy meter token">
                        <IconButton size="small" onClick={copyToken}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell>
                  {formatCurrency(transaction.vat)}
                </TableCell>

                <TableCell>
                  {formatCurrency(transaction.debt)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default VendingHistory;



// import React, { useMemo, useState } from "react";
// import {
//   Alert,
//   Box,
//   Button,
//   Chip,
//   CircularProgress,
//   IconButton,
//   InputAdornment,
//   MenuItem,
//   Paper,
//   Stack,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TablePagination,
//   TableRow,
//   TextField,
//   Tooltip,
//   Typography,
// } from "@mui/material";

// import SearchIcon from "@mui/icons-material/Search";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import CancelIcon from "@mui/icons-material/Cancel";
// import ScheduleIcon from "@mui/icons-material/Schedule";

// export interface VendingHistoryItem {
//   id: string | number;
//   transaction_reference: string;
//   status: string;
//   account_number?: string;
//   amount: string | number;
//   units: string | number;
//   token?: string;
//   vat?: string | number;
//   debt?: string | number;
//   created_at?: string;
// }

// interface VendingHistoryProps {
//   transactions: VendingHistoryItem[];
//   loading?: boolean;
//   error?: string;
//   onRefresh?: () => void;
//   onViewDetails?: (transaction: VendingHistoryItem) => void;
// }

// const formatCurrency = (value?: string | number) => {
//   const amount = Number(value || 0);

//   return new Intl.NumberFormat("en-NG", {
//     style: "currency",
//     currency: "NGN",
//     minimumFractionDigits: 2,
//   }).format(Number.isFinite(amount) ? amount : 0);
// };

// const formatDate = (date?: string) => {
//   if (!date) return "—";

//   const parsedDate = new Date(date);

//   if (Number.isNaN(parsedDate.getTime())) return "—";

//   return parsedDate.toLocaleString("en-NG", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// };

// const getStatusColor = (
//   status: string
// ): "success" | "error" | "warning" | "default" => {
//   const value = status?.toLowerCase();

//   if (["success", "successful", "completed"].includes(value)) {
//     return "success";
//   }

//   if (["failed", "declined", "cancelled", "canceled"].includes(value)) {
//     return "error";
//   }

//   if (["pending", "processing", "initiated"].includes(value)) {
//     return "warning";
//   }

//   return "default";
// };

// const getStatusIcon = (status: string) => {
//   const color = getStatusColor(status);

//   if (color === "success") return <CheckCircleIcon fontSize="small" />;
//   if (color === "error") return <CancelIcon fontSize="small" />;
//   if (color === "warning") return <ScheduleIcon fontSize="small" />;

//   return undefined;
// };

// const VendingHistory: React.FC<VendingHistoryProps> = ({
//   transactions,
//   loading = false,
//   error = "",
//   onRefresh,
//   onViewDetails,
// }) => {
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);

//   const filteredTransactions = useMemo(() => {
//     return transactions.filter((transaction) => {
//       const searchValue = search.toLowerCase().trim();

//       const matchesSearch =
//         !searchValue ||
//         transaction.transaction_reference?.toLowerCase().includes(searchValue) ||
//         transaction.account_number?.toLowerCase().includes(searchValue) ||
//         transaction.token?.toLowerCase().includes(searchValue);

//       const matchesStatus =
//         statusFilter === "all" ||
//         transaction.status?.toLowerCase() === statusFilter;

//       return matchesSearch && matchesStatus;
//     });
//   }, [transactions, search, statusFilter]);

//   const paginatedTransactions = filteredTransactions.slice(
//     page * rowsPerPage,
//     page * rowsPerPage + rowsPerPage
//   );

//   const copyToken = async (token: string) => {
//     try {
//       await navigator.clipboard.writeText(token);
//     } catch {
//       console.error("Unable to copy meter token.");
//     }
//   };

//   const handleSearchChange = (value: string) => {
//     setSearch(value);
//     setPage(0);
//   };

//   const handleStatusChange = (value: string) => {
//     setStatusFilter(value);
//     setPage(0);
//   };

//   return (
//     <Box>
//       {/* Header */}
//       <Stack
//         direction={{ xs: "column", sm: "row" }}
//         justifyContent="space-between"
//         alignItems={{ xs: "flex-start", sm: "center" }}
//         spacing={2}
//         mb={3}
//       >
//         <Box>
//           <Typography variant="h5" fontWeight={700}>
//             Vending History
//           </Typography>

//           <Typography variant="body2" color="text.secondary" mt={0.5}>
//             View and manage your previous electricity vending transactions.
//           </Typography>
//         </Box>

//         <Button
//           variant="outlined"
//           startIcon={
//             loading ? (
//               <CircularProgress size={16} />
//             ) : (
//               <RefreshIcon />
//             )
//           }
//           onClick={onRefresh}
//           disabled={loading || !onRefresh}
//           sx={{ textTransform: "none", borderRadius: 2 }}
//         >
//           Refresh
//         </Button>
//       </Stack>

//       {/* Summary */}
//       <Paper
//         variant="outlined"
//         sx={{ p: 2, borderRadius: 2, mb: 3 }}
//       >
//         <Stack
//           direction={{ xs: "column", sm: "row" }}
//           spacing={1}
//           justifyContent="space-between"
//         >
//           <Box>
//             <Typography variant="body2" color="text.secondary">
//               Total Transactions
//             </Typography>

//             <Typography variant="h5" fontWeight={700}>
//               {transactions.length}
//             </Typography>
//           </Box>

//           <Box>
//             <Typography variant="body2" color="text.secondary">
//               Successful Transactions
//             </Typography>

//             <Typography variant="h5" fontWeight={700} color="success.main">
//               {
//                 transactions.filter((item) =>
//                   ["success", "successful", "completed"].includes(
//                     item.status?.toLowerCase()
//                   )
//                 ).length
//               }
//             </Typography>
//           </Box>

//           <Box>
//             <Typography variant="body2" color="text.secondary">
//               Failed Transactions
//             </Typography>

//             <Typography variant="h5" fontWeight={700} color="error.main">
//               {
//                 transactions.filter((item) =>
//                   ["failed", "declined", "cancelled", "canceled"].includes(
//                     item.status?.toLowerCase()
//                   )
//                 ).length
//               }
//             </Typography>
//           </Box>
//         </Stack>
//       </Paper>

//       {/* Search and Filter */}
//       <Stack
//         direction={{ xs: "column", sm: "row" }}
//         spacing={2}
//         mb={2}
//       >
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search reference, account number or token..."
//           value={search}
//           onChange={(e) => handleSearchChange(e.target.value)}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <SearchIcon color="action" />
//               </InputAdornment>
//             ),
//           }}
//         />

//         <TextField
//           select
//           size="small"
//           label="Status"
//           value={statusFilter}
//           onChange={(e) => handleStatusChange(e.target.value)}
//           sx={{ minWidth: { xs: "100%", sm: 180 } }}
//         >
//           <MenuItem value="all">All Statuses</MenuItem>
//           <MenuItem value="success">Success</MenuItem>
//           <MenuItem value="successful">Successful</MenuItem>
//           <MenuItem value="completed">Completed</MenuItem>
//           <MenuItem value="pending">Pending</MenuItem>
//           <MenuItem value="processing">Processing</MenuItem>
//           <MenuItem value="failed">Failed</MenuItem>
//           <MenuItem value="declined">Declined</MenuItem>
//         </TextField>
//       </Stack>

//       {/* Error */}
//       {error && (
//         <Alert severity="error" sx={{ mb: 2 }}>
//           {error}
//         </Alert>
//       )}

//       {/* Table */}
//       <TableContainer
//         component={Paper}
//         variant="outlined"
//         sx={{ borderRadius: 2 }}
//       >
//         <Table sx={{ minWidth: 1250 }}>
//           <TableHead>
//             <TableRow sx={{ bgcolor: "#f8fafc" }}>
//               {[
//                 "Transaction Reference",
//                 "Account Number",
//                 "Status",
//                 "Amount",
//                 "Units",
//                 "Meter Token",
//                 "VAT",
//                 "Debt",
//                 "Date",
//                 "Action",
//               ].map((heading) => (
//                 <TableCell
//                   key={heading}
//                   sx={{
//                     fontWeight: 700,
//                     whiteSpace: "nowrap",
//                     color: "#475569",
//                   }}
//                 >
//                   {heading}
//                 </TableCell>
//               ))}
//             </TableRow>
//           </TableHead>

//           <TableBody>
//             {loading ? (
//               <TableRow>
//                 <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
//                   <CircularProgress size={28} />
//                   <Typography color="text.secondary" mt={1}>
//                     Loading vending history...
//                   </Typography>
//                 </TableCell>
//               </TableRow>
//             ) : paginatedTransactions.length === 0 ? (
//               <TableRow>
//                 <TableCell colSpan={10} align="center" sx={{ py: 7 }}>
//                   <ReceiptLongIcon
//                     sx={{ fontSize: 42, color: "text.disabled" }}
//                   />

//                   <Typography fontWeight={600} mt={1}>
//                     No transactions found
//                   </Typography>

//                   <Typography variant="body2" color="text.secondary">
//                     Your vending transactions will appear here.
//                   </Typography>
//                 </TableCell>
//               </TableRow>
//             ) : (
//               paginatedTransactions.map((transaction) => (
//                 <TableRow
//                   key={transaction.id}
//                   hover
//                   sx={{ "& td": { whiteSpace: "nowrap" } }}
//                 >
//                   <TableCell>
//                     <Typography variant="body2" fontWeight={600}>
//                       {transaction.transaction_reference}
//                     </Typography>
//                   </TableCell>

//                   <TableCell>
//                     {transaction.account_number || "—"}
//                   </TableCell>

//                   <TableCell>
//                     <Chip
//                       size="small"
//                       label={transaction.status || "Unknown"}
//                       color={getStatusColor(transaction.status)}
//                       icon={getStatusIcon(transaction.status)}
//                       sx={{ textTransform: "capitalize", fontWeight: 600 }}
//                     />
//                   </TableCell>

//                   <TableCell>
//                     <Typography fontWeight={600} variant="body2">
//                       {formatCurrency(transaction.amount)}
//                     </Typography>
//                   </TableCell>

//                   <TableCell>{transaction.units || "—"}</TableCell>

//                   <TableCell>
//                     {transaction.token ? (
//                       <Stack direction="row" alignItems="center" spacing={0.5}>
//                         <Typography
//                           variant="body2"
//                           sx={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}
//                         >
//                           {transaction.token}
//                         </Typography>

//                         <Tooltip title="Copy meter token">
//                           <IconButton
//                             size="small"
//                             onClick={() => copyToken(transaction.token!)}
//                           >
//                             <ContentCopyIcon fontSize="inherit" />
//                           </IconButton>
//                         </Tooltip>
//                       </Stack>
//                     ) : (
//                       "—"
//                     )}
//                   </TableCell>

//                   <TableCell>
//                     {formatCurrency(transaction.vat)}
//                   </TableCell>

//                   <TableCell>
//                     {formatCurrency(transaction.debt)}
//                   </TableCell>

//                   <TableCell>
//                     {formatDate(transaction.created_at)}
//                   </TableCell>

//                   <TableCell>
//                     <Tooltip title="View transaction details">
//                       <IconButton
//                         size="small"
//                         onClick={() => onViewDetails?.(transaction)}
//                         disabled={!onViewDetails}
//                       >
//                         <VisibilityIcon fontSize="small" />
//                       </IconButton>
//                     </Tooltip>
//                   </TableCell>
//                 </TableRow>
//               ))
//             )}
//           </TableBody>
//         </Table>

//         <TablePagination
//           component="div"
//           count={filteredTransactions.length}
//           page={page}
//           onPageChange={(_, newPage) => setPage(newPage)}
//           rowsPerPage={rowsPerPage}
//           onRowsPerPageChange={(e) => {
//             setRowsPerPage(Number(e.target.value));
//             setPage(0);
//           }}
//           rowsPerPageOptions={[5, 10, 25, 50]}
//         />
//       </TableContainer>
//     </Box>
//   );
// };

// export default VendingHistory;
