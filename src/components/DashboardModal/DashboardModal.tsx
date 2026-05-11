import React, { useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    Chip,
    Divider,
    Box,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { useVendorHierarchy } from '../../contexts/VendorContext';

interface DashboardModalProps {
    open: boolean;
    onClose: () => void;
}

interface FlatOrg {
    id: string;
    name: string;
    level: string;
    status: string;
    depth: number;
}

const DashboardModal: React.FC<DashboardModalProps> = ({ open, onClose }) => {
    const { tree } = useVendorHierarchy();

    const summary = useMemo(() => {
        const totals = { total: 0, vendors: 0, subVendors: 0, agents: 0, cashiers: 0, active: 0, suspended: 0 };
        const flat: FlatOrg[] = [];
        const traverse = (nodes: typeof tree, depth = 0) => {
            if (!nodes || !Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                totals.total += 1;
                if (node.status === 'active') totals.active += 1;
                if (node.status === 'suspended') totals.suspended += 1;
                switch (node.level) {
                    case 'vendor':
                        totals.vendors += 1;
                        break;
                    case 'sub_vendor':
                        totals.subVendors += 1;
                        break;
                    case 'agent':
                        totals.agents += 1;
                        break;
                    case 'cashier':
                        totals.cashiers += 1;
                        break;
                    default:
                        break;
                }
                flat.push({ id: node.id, name: node.name, level: node.level, status: node.status, depth });
                if (node.children?.length) traverse(node.children, depth + 1);
            });
        };
        traverse(tree);
        return { totals, flat };
    }, [tree]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Hierarchy Snapshot</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle1">Overview</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                            <Chip label={`Total: ${summary.totals.total}`} />
                            <Chip label={`Vendor Admins: ${summary.totals.vendors}`} color="primary" variant="outlined" />
                            <Chip label={`Sub-vendors: ${summary.totals.subVendors}`} color="primary" variant="outlined" />
                            <Chip label={`Agents: ${summary.totals.agents}`} color="primary" variant="outlined" />
                            <Chip label={`Cashiers: ${summary.totals.cashiers}`} color="primary" variant="outlined" />
                            <Chip label={`Active: ${summary.totals.active}`} color="success" />
                            <Chip label={`Suspended: ${summary.totals.suspended}`} color="warning" />
                        </Stack>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Organisations
                        </Typography>
                        {summary.flat.length ? (
                            <List disablePadding>
                                {summary.flat.map((org) => (
                                    <ListItem key={org.id} sx={{ pl: org.depth * 3 }}>
                                        <ListItemText
                                            primary={org.name}
                                            secondary={
                                                <Stack direction="row" spacing={1} mt={0.5}>
                                                    <Chip label={org.level.replace('_', ' ')} size="small" />
                                                    <Chip label={org.status} size="small" color={org.status === 'active' ? 'success' : 'warning'} />
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary">No organisations available.</Typography>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DashboardModal;

