import { useCallback, useEffect, useState } from 'react';
import {
    WalletSummary,
    WalletTransferPayload,
    WalletTransferResponse,
} from '../types/vendor';
import {
    fetchOrgWallets,
    transferBetweenWallets,
} from '../services/vendorHierarchyService';

export const useOrgWallets = (orgId: string | null) => {
    const [wallets, setWallets] = useState<WalletSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!orgId) {
            setWallets([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchOrgWallets(orgId);
            // Ensure data is always an array
            setWallets(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to load wallets', err);
            setError(err?.message || 'Failed to load wallets');
            setWallets([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const transfer = useCallback(
        async (walletId: string, payload: WalletTransferPayload): Promise<WalletTransferResponse> => {
            const result = await transferBetweenWallets(walletId, payload);
            await refresh();
            return result;
        },
        [refresh],
    );

    const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);

    return {
        wallets,
        loading,
        error,
        refresh,
        transfer,
        totalBalance,
    };
};

