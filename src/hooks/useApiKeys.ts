import { useCallback, useEffect, useState } from 'react';
import {
    ApiKey,
    ApiKeyWithSecret,
    ApiKeyAuditEntry,
} from '../types/vendor';
import {
    fetchApiKeys,
    issueApiKey,
    rotateApiKey,
    revokeApiKey,
    deleteApiKey,
    fetchApiKeyAudit,
} from '../services/vendorHierarchyService';
import {
    clearApiKeyCredentials,
    getApiKeyCredentials,
    setApiKeyCredentials,
} from '../utils/apiKeyStorage';

export const useApiKeys = (ownerType: 'vendor_org' | 'user', ownerId: string | null) => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastIssuedSecret, setLastIssuedSecret] = useState<ApiKeyWithSecret | null>(null);
    const [auditEntries, setAuditEntries] = useState<ApiKeyAuditEntry[]>([]);

    const refresh = useCallback(async () => {
        if (!ownerId) {
            setKeys([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchApiKeys(ownerType, ownerId);
            setKeys(data);
            const stored = getApiKeyCredentials();
            if (stored && !data.some((key) => key.key_id === stored.keyId)) {
                clearApiKeyCredentials();
            }
        } catch (err: any) {
            console.error('Failed to load API keys', err);
            setError(err?.message || 'Failed to load API keys');
        } finally {
            setLoading(false);
        }
    }, [ownerType, ownerId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const createKey = useCallback(
        async (scopes?: string[], expiresAt?: string | null) => {
            if (!ownerId) {
                throw new Error('Owner ID is required to issue an API key');
            }
            const issued = await issueApiKey({
                owner_type: ownerType,
                owner_id: ownerId,
                scopes,
                expires_at: expiresAt,
            });
            setLastIssuedSecret(issued);
            setApiKeyCredentials(issued.key_id, issued.secret, issued.id);
            await refresh();
            return issued;
        },
        [ownerType, ownerId, refresh],
    );

    const rotateKey = useCallback(
        async (id: string) => {
            const rotated = await rotateApiKey(id);
            setLastIssuedSecret(rotated);
            setApiKeyCredentials(rotated.key_id, rotated.secret, rotated.id);
            await refresh();
            return rotated;
        },
        [refresh],
    );

    const revokeKey = useCallback(
        async (id: string) => {
            const revoked = await revokeApiKey(id);
            const stored = getApiKeyCredentials();
            if (stored && (stored.keyId === revoked.key_id || stored.recordId === revoked.id)) {
                clearApiKeyCredentials();
            }
            await refresh();
            return revoked;
        },
        [refresh],
    );

    const removeKey = useCallback(
        async (id: string) => {
            const stored = getApiKeyCredentials();
            await deleteApiKey(id);
            if (stored && (stored.recordId === id || stored.keyId === id)) {
                clearApiKeyCredentials();
            }
            await refresh();
        },
        [refresh],
    );

    const loadAudit = useCallback(
        async (id: string) => {
            const entries = await fetchApiKeyAudit(id);
            setAuditEntries(entries);
            return entries;
        },
        [],
    );

    return {
        keys,
        loading,
        error,
        refresh,
        createKey,
        rotateKey,
        revokeKey,
        removeKey,
        lastIssuedSecret,
        setLastIssuedSecret,
        auditEntries,
        loadAudit,
    };
};

