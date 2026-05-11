import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    Chip,
    Stack,
    Typography,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { ApiKeyAuditEntry } from '../../types/vendor';

interface ApiKeyAuditDialogProps {
    open: boolean;
    keyLabel?: string | null;
    entries: ApiKeyAuditEntry[];
    loading?: boolean;
    onClose: () => void;
    onRefresh: () => Promise<void>;
}

const ApiKeyAuditDialog: React.FC<ApiKeyAuditDialogProps> = ({
    open,
    keyLabel,
    entries,
    loading = false,
    onClose,
    onRefresh,
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                API Key Audit Log
                {keyLabel && (
                    <Typography variant="subtitle2" color="text.secondary">
                        Key: {keyLabel}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent dividers>
                {entries.length === 0 ? (
                    <Typography color="text.secondary">No activity recorded for this API key yet.</Typography>
                ) : (
                    <List dense>
                        {entries.map((entry) => (
                            <ListItem key={entry.id} divider>
                                <ListItemText
                                    primary={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle2">
                                                {new Date(entry.requested_at).toLocaleString()}
                                            </Typography>
                                            <Chip
                                                label={entry.success ? 'Success' : 'Failed'}
                                                color={entry.success ? 'success' : 'error'}
                                                size="small"
                                            />
                                            {entry.action && (
                                                <Chip
                                                    label={entry.action}
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                />
                                            )}
                                        </Stack>
                                    }
                                    secondary={
                                        <Stack spacing={0.5}>
                                            {entry.ip_address && (
                                                <Typography variant="body2">IP: {entry.ip_address}</Typography>
                                            )}
                                            {entry.user_agent && (
                                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                    Agent: {entry.user_agent}
                                                </Typography>
                                            )}
                                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                                <Typography variant="body2">
                                                    Metadata: {JSON.stringify(entry.metadata)}
                                                </Typography>
                                            )}
                                        </Stack>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Tooltip title="Refresh audit log">
                    <span>
                        <IconButton onClick={onRefresh} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ApiKeyAuditDialog;


