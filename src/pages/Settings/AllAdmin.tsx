import React, { useEffect, useState } from 'react'
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Avatar,
    Stack,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress
} from "@mui/material";
import { getAllAdmin } from '../../services/settingService';
export default function AllAdmin() {
    const [loading, setLoading] = useState(false);
    const [admin, setAdmin] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuVendor, setMenuVendor] = useState<any>(null);

    const handleFetchAdmin = async () => {
        setLoading(true);
        try {
            const response = await getAllAdmin();
            setAdmin(response);
        } catch (error) {
            console.error("Error fetching admins:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleFetchAdmin();
    }, []);
    return (
        <div>
            {/* List of Admins */}

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Business Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone Number</TableCell>
                        <TableCell>Gender</TableCell>
                        <TableCell />
                    </TableRow>
                </TableHead>

                <TableBody>
                    {loading ? (
                        <Box py={3} textAlign="center">
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        (admin || []).map((v) => (
                            <TableRow
                                key={v.id}
                                hover
                                selected={selected?.id === v.id}
                                onClick={() => setSelected(v)}
                                sx={{ cursor: "pointer" }}
                            >

                                <TableCell>
                                    <Stack direction="row" spacing={2}>
                                        <Avatar>
                                            {v.name?.charAt(0)}
                                        </Avatar>

                                        <Typography
                                            fontWeight={500}
                                            sx={{
                                                maxWidth: 150,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {v.name}
                                        </Typography>
                                    </Stack>
                                </TableCell>

                                <TableCell>{v.email}</TableCell>
                                <TableCell>{v.phone_number}</TableCell>
                                <TableCell>{v.gender}</TableCell>
                            </TableRow>
                        )))}
                </TableBody>
            </Table>
        </div>
    )
}