const API_KEY_ID_STORAGE_KEY = 'apiKeyId';
const API_KEY_SECRET_STORAGE_KEY = 'apiKeySecret';
const API_KEY_RECORD_ID_STORAGE_KEY = 'apiKeyRecordId';

const getStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export interface ApiKeyCredentials {
    keyId: string;
    secret: string;
    recordId?: string | null;
}

export const setApiKeyCredentials = (keyId: string, secret: string, recordId?: string) => {
    if (!keyId || !secret) {
        return;
    }
    const storage = getStorage();
    if (!storage) {
        return;
    }
    storage.setItem(API_KEY_ID_STORAGE_KEY, keyId);
    storage.setItem(API_KEY_SECRET_STORAGE_KEY, secret);
    if (recordId) {
        storage.setItem(API_KEY_RECORD_ID_STORAGE_KEY, recordId);
    }
};

export const getApiKeyCredentials = (): ApiKeyCredentials | null => {
    const storage = getStorage();
    if (!storage) {
        return null;
    }
    const keyId = storage.getItem(API_KEY_ID_STORAGE_KEY);
    const secret = storage.getItem(API_KEY_SECRET_STORAGE_KEY);
    const recordId = storage.getItem(API_KEY_RECORD_ID_STORAGE_KEY);

    if (!keyId || !secret) {
        return null;
    }

    return { keyId, secret, recordId };
};

export const clearApiKeyCredentials = () => {
    const storage = getStorage();
    if (!storage) {
        return;
    }
    storage.removeItem(API_KEY_ID_STORAGE_KEY);
    storage.removeItem(API_KEY_SECRET_STORAGE_KEY);
    storage.removeItem(API_KEY_RECORD_ID_STORAGE_KEY);
};

