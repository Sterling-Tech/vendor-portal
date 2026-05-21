import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { clearApiKeyCredentials } from '../../utils/apiKeyStorage';

export interface Related_vendor {
    account_status?: string;
    business_name?: string;
    email?: string;
    hierachy?: string;
    id?: string;
}

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    is_2fa_enabled:boolean;
    related_vendor?:Related_vendor;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
    user_type?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
};

const extractAuthPayload = (data: any) => {
    const payload = data?.data ?? data ?? {};
    const token =
        payload.access ??
        payload.token ??
        payload.access_token ??
        payload.accessToken ??
        null;
    const refreshToken =
        payload.refresh ??
        payload.refresh_token ??
        payload.refreshToken ??
        null;
    const user = Object.prototype.hasOwnProperty.call(payload, 'user') ? payload.user : undefined;

    return { token, refreshToken, user };
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }) => {
        const response = await fetch('http://localhost:8001/api/v1/auth/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        const { token, refreshToken, user } = extractAuthPayload(data);

        if (token) {
            localStorage.setItem('token', token);
        }
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        } else {
            localStorage.removeItem('refreshToken');
        }
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }

        return { token, refreshToken, user };
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state, action: PayloadAction<{ user?: User | null; token?: string | null; refreshToken?: string | null }>) => {
            const { user, token, refreshToken } = action.payload;
            if (user !== undefined) {
                state.user = user;
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                } else {
                    localStorage.removeItem('user');
                }
            }
            if (token !== undefined) {
                state.token = token;
                if (token) {
                    localStorage.setItem('token', token);
                } else {
                    localStorage.removeItem('token');
                }
            }
            if (refreshToken !== undefined) {
                state.refreshToken = refreshToken;
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    localStorage.removeItem('refreshToken');
                }
            }
            state.isAuthenticated = Boolean(state.token);
        },
        logoutUser: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tenantId');
            localStorage.removeItem('currentTenant');
            localStorage.removeItem('currentTenantId');
            clearApiKeyCredentials();
        },
        setTokens: (state, action: PayloadAction<{ token?: string | null; refreshToken?: string | null }>) => {
            const { token, refreshToken } = action.payload;
            if (token !== undefined) {
                state.token = token;
                if (token) {
                    localStorage.setItem('token', token);
                } else {
                    localStorage.removeItem('token');
                }
            }
            if (refreshToken !== undefined) {
                state.refreshToken = refreshToken;
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    localStorage.removeItem('refreshToken');
                }
            }
            state.isAuthenticated = Boolean(state.token);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.refreshToken = action.payload.refreshToken ?? null;
                state.isAuthenticated = true;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Login failed';
            });
    },
});

export const { setAuth, logoutUser, setTokens } = authSlice.actions;
export { extractAuthPayload };
export default authSlice.reducer;

