import { useEffect, useRef } from 'react';
import { bootstrapUserApiKey } from '../services/vendorHierarchyService';
import {
    clearApiKeyCredentials,
    getApiKeyCredentials,
    setApiKeyCredentials,
} from '../utils/apiKeyStorage';

export const API_KEY_READY_EVENT = 'qc-api-key-ready';

const notifyKeyReady = () => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(API_KEY_READY_EVENT));
    }
};

/**
 * Automatically provisions a user-level API key (or rotates an existing one)
 * so that authenticated requests can succeed without manual intervention.
 */
export const useEnsureUserApiKey = (userId: string | null | undefined) => {
    const provisioningRef = useRef(false);

    useEffect(() => {
        if (!userId) {
            return;
        }

        let cancelled = false;

        const ensureKey = async () => {
            if (provisioningRef.current) {
                return;
            }
            provisioningRef.current = true;

            try {
                const stored = getApiKeyCredentials();
                if (stored) {
                    notifyKeyReady();
                    return;
                }

                const bootstrap = await bootstrapUserApiKey();
                if (cancelled) {
                    return;
                }
                if (bootstrap?.key_id && bootstrap?.secret && bootstrap?.id) {
                    setApiKeyCredentials(bootstrap.key_id, bootstrap.secret, bootstrap.id);
                    notifyKeyReady();
                } else {
                    console.warn('useEnsureUserApiKey: bootstrap endpoint did not return credentials; clearing stored API key.');
                    clearApiKeyCredentials();
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('useEnsureUserApiKey: unable to provision user API key', error);
                }
                clearApiKeyCredentials();
            } finally {
                provisioningRef.current = false;
            }
        };

        ensureKey();

        return () => {
            cancelled = true;
        };
    }, [userId]);
};


