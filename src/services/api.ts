import { getApiKeyCredentials } from '../utils/apiKeyStorage';

// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://188.166.161.13:8065';
// const API_BASE_URL = process.env.REACT_APP_API_SAAS_URL || 'http://188.166.161.13:8074';
const API_BASE_URL = process.env.REACT_APP_API_SAAS_PROD_URL || 'https://api.sterlingtechonline.com';

export interface ApiResponse<T> {
    data: T;
    message?: string;
    status?: number;
}

export interface ApiError {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
    error?: string;
    data?: unknown;
}

/**
 * Get authentication headers
 */
export const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',

    };

    const apiKeyCredentials = getApiKeyCredentials();
    const token = localStorage.getItem('token');

    if (apiKeyCredentials) {
        headers['Authorization'] = `ApiKey ${apiKeyCredentials.keyId}:${apiKeyCredentials.secret}`;
        headers['X-API-Key'] = `${apiKeyCredentials.keyId}:${apiKeyCredentials.secret}`;
    } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
};

const handleUnauthorized = (errorData?: ApiError) => {
    console.warn('Authorization failed, clearing session.', errorData);
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('currentTenant');
        localStorage.removeItem('currentTenantId');
        localStorage.removeItem('apiKeyId');
        localStorage.removeItem('apiKeySecret');
        localStorage.removeItem('apiKeyRecordId');
    } catch (storageError) {
        console.error('Failed to clear auth storage', storageError);
    }

    if (typeof window !== 'undefined') {
        const shouldRedirect = !window.location.pathname.startsWith('/login');
        if (shouldRedirect) {
            window.location.replace('/login');
        }
    }
};

/**
 * Make an API call with error handling
 */
export async function makeApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // ── FormData guard: remove JSON Content-Type so browser sets multipart boundary ──
    const isFormData = options.body instanceof FormData;
    const baseHeaders = getAuthHeaders();
    if (isFormData) {
        delete baseHeaders['Content-Type'];
    }

    const config: RequestInit = {
        ...options,
        headers: {
            ...baseHeaders,
            ...options.headers,
        },
    };

    try {
        // console.log('Making API call:', { url, method: config.method || 'GET', headers: config.headers });
        console.log("Making API call:", {
            url,
            method: config.method || "GET",
            hasAuthorization: Boolean(
                (config.headers as Record<string, string>)?.Authorization
            ),
        });
        const response = await fetch(url, config);

        console.log('API response:', { status: response.status, statusText: response.statusText, url });

        if (!response.ok) {
            let errorData: ApiError;
            try {
                const errorText = await response.text();
                errorData = errorText ? JSON.parse(errorText) : {
                    message: `HTTP error! status: ${response.status}`,
                    status: response.status,
                };
            } catch {
                errorData = {
                    message: `HTTP error! status: ${response.status} - ${response.statusText}`,
                    status: response.status,
                };
            }

            console.error('API error:', errorData);

            // Handle authentication and authorization errors
            // IMPORTANT: Don't redirect on permission errors (403) - let UI handle them
            if (response.status === 401) {
                // Check if it's a permission denied vs actual auth failure
                const errorMessage = (errorData?.message || '').toLowerCase();
                const errorDetail = ((errorData as any)?.detail || '').toLowerCase();
                const errorError = ((errorData as any)?.error || '').toLowerCase();

                // Combine all error text for checking
                const allErrorText = `${errorMessage} ${errorDetail} ${errorError}`;

                // If it's a permission error, don't clear auth - just throw the error
                if (allErrorText.includes('permission') ||
                    allErrorText.includes('not authorized') ||
                    allErrorText.includes('only platform') ||
                    allErrorText.includes('only tenant') ||
                    allErrorText.includes('cannot') ||
                    allErrorText.includes('denied')) {
                    console.warn('Permission denied (401), but keeping session active. Error:', errorData);
                } else {
                    // Actual authentication failure - clear session
                    console.warn('Authentication failed (401), clearing session');
                    handleUnauthorized(errorData);
                }
            } else if (response.status === 403) {
                // 403 Forbidden - this is typically a permission error, NOT an auth failure
                // Never clear auth on 403 - let the UI handle the error message
                console.warn('403 Forbidden - permission error. Keeping session active. Error:', errorData);
            }

            throw errorData;
        }

        // Handle 204 No Content (common for DELETE requests)
        if (response.status === 204) {
            return undefined as unknown as T;
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        // Check if there's actually content to parse
        if (contentLength === '0' || contentLength === '2') {
            // Empty response or just "{}" - return empty object or undefined
            return undefined as unknown as T;
        }

        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            // Handle empty response body
            if (!text || text.trim() === '' || text.trim() === '{}') {
                return undefined as unknown as T;
            }
            try {
                const data: T = JSON.parse(text);
                return data;
            } catch (parseError) {
                console.warn('Failed to parse JSON response:', text);
                return undefined as unknown as T;
            }
        } else {
            const text = await response.text();
            if (!text || text.trim() === '') {
                return undefined as unknown as T;
            }
            console.warn('Non-JSON response:', text);
            return text as unknown as T;
        }
    } catch (error: any) {
        console.error('API call failed:', {
            error,
            url,
            message: error?.message,
            stack: error?.stack,
        });

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw {
                message: 'Network error: Unable to connect to the server. Please check if the backend is running.',
                status: 0,
                error: 'NETWORK_ERROR',
            } as ApiError;
        }

        throw error;
    }
}

/**
 * GET request
 */
// export async function get<T>(endpoint: string): Promise<T> {
//     return makeApiCall<T>(endpoint, { method: 'GET' });
// }
export async function get<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    return makeApiCall<T>(endpoint, {
        method: "GET",
        ...options,
    });
}
/**
 * POST request
 */
export async function post<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    const isFormData = data instanceof FormData;
    return makeApiCall<T>(endpoint, {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data),
        ...options,
    });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    const isFormData = data instanceof FormData;
    return makeApiCall<T>(endpoint, {
        method: 'PUT',
        body: isFormData ? data : JSON.stringify(data),
        ...options,
    });
}

/**
 * PATCH request
 */
export async function patch<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    const isFormData = data instanceof FormData;
    return makeApiCall<T>(endpoint, {
        method: 'PATCH',
        body: isFormData ? data : JSON.stringify(data),
        ...options,
    });
}

/**
 * DELETE request
 */
// export async function del<T>(endpoint: string): Promise<T> {
//     return makeApiCall<T>(endpoint, { method: 'DELETE' });
// }

export async function del<T>(endpoint: string, data?: any): Promise<T> {
    return makeApiCall<T>(endpoint, {
        method: 'DELETE',
        body: data !== undefined ? JSON.stringify(data) : undefined,
    });
}