import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query';
import type { FetchArgs, FetchBaseQueryError, BaseQueryApi } from '@reduxjs/toolkit/query';
import { RootState } from '../store';
import { logoutUser, setTokens, extractAuthPayload } from '../slices/authSlice';

const rawBaseQuery = fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8001/api/v1',
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        const tenantId = localStorage.getItem('tenantId');
        if (tenantId) {
            headers.set('X-Tenant-ID', tenantId);
        }
        return headers;
    },
});

type RawBaseQueryExtraOptions = Parameters<typeof rawBaseQuery>[2];

const baseQueryWithAuthGuard = async (
    args: string | FetchArgs,
    api: BaseQueryApi,
    extraOptions: RawBaseQueryExtraOptions
) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error && (result.error as FetchBaseQueryError).status === 401) {
        const state = api.getState() as RootState;
        const refreshToken = state.auth.refreshToken ?? localStorage.getItem('refreshToken');
        if (!refreshToken) {
            api.dispatch(logoutUser());
            return result;
        }

        const refreshResult = await rawBaseQuery(
            {
                url: 'auth/login/refresh/',
                method: 'POST',
                body: { refresh: refreshToken },
            },
            api,
            extraOptions
        );

        if (refreshResult.data) {
            const { token: newToken, refreshToken: newRefreshToken } = extractAuthPayload(refreshResult.data);
            if (!newToken) {
                api.dispatch(logoutUser());
                return result;
            }

            api.dispatch(setTokens({ token: newToken, refreshToken: newRefreshToken ?? refreshToken }));

            const retryResult = await rawBaseQuery(args, api, extraOptions);
            if (retryResult.error && (retryResult.error as FetchBaseQueryError).status === 401) {
                api.dispatch(logoutUser());
            }
            return retryResult;
        }

        api.dispatch(logoutUser());
    }
    return result;
};

// Comprehensive API configuration
export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithAuthGuard,
    tagTypes: ['User', 'Tenant', 'Vendor', 'Wallet', 'Transaction', 'Payment', 'Customer', 'Notification', 'File', 'Analytics', 'Prepaid', 'SubAccount', 'Debt'],
    endpoints: (builder) => ({
        // Auth endpoints
        login: builder.mutation({
            query: (credentials) => ({
                url: 'auth/login/',
                method: 'POST',
                body: credentials,
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: 'auth/logout/',
                method: 'POST',
            }),
        }),
        refreshToken: builder.mutation({
            query: (refreshToken) => ({
                url: 'auth/login/refresh/',
                method: 'POST',
                body: { refresh: refreshToken },
            }),
        }),

        // User endpoints
        getUsers: builder.query({
            query: (params = {}) => ({
                url: 'users/',
                params,
            }),
            providesTags: ['User'],
        }),
        getUser: builder.query({
            query: (id) => `users/${id}/`,
            providesTags: ['User'],
        }),
        createUser: builder.mutation({
            query: (user) => ({
                url: 'users/',
                method: 'POST',
                body: user,
            }),
            invalidatesTags: ['User'],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...user }) => ({
                url: `users/${id}/`,
                method: 'PUT',
                body: user,
            }),
            invalidatesTags: ['User'],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `users/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['User'],
        }),

        // Vendor-specific endpoints
        getVendors: builder.query({
            query: (params = {}) => ({
                url: 'users/',
                params: { ...params, role: 'vendor' },
            }),
            providesTags: ['Vendor'],
        }),
        getVendor: builder.query({
            query: (id) => `users/${id}/`,
            providesTags: ['Vendor'],
        }),
        createVendor: builder.mutation({
            query: (vendor) => ({
                url: 'users/',
                method: 'POST',
                body: { ...vendor, role: 'vendor' },
            }),
            invalidatesTags: ['Vendor'],
        }),
        updateVendor: builder.mutation({
            query: ({ id, ...vendor }) => ({
                url: `users/${id}/`,
                method: 'PUT',
                body: vendor,
            }),
            invalidatesTags: ['Vendor'],
        }),
        deleteVendor: builder.mutation({
            query: (id) => ({
                url: `users/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Vendor'],
        }),

        // Wallet endpoints
        getWallets: builder.query({
            query: (params = {}) => ({
                url: 'wallets/',
                params,
            }),
            providesTags: ['Wallet'],
        }),
        getWallet: builder.query({
            query: (id) => `wallets/${id}/`,
            providesTags: ['Wallet'],
        }),
        createWallet: builder.mutation({
            query: (wallet) => ({
                url: 'wallets/',
                method: 'POST',
                body: wallet,
            }),
            invalidatesTags: ['Wallet'],
        }),
        updateWallet: builder.mutation({
            query: ({ id, ...wallet }) => ({
                url: `wallets/${id}/`,
                method: 'PUT',
                body: wallet,
            }),
            invalidatesTags: ['Wallet'],
        }),

        // Transaction endpoints
        getTransactions: builder.query({
            query: (params = {}) => ({
                url: 'payment/payment-history/',
                params,
            }),
            providesTags: ['Transaction'],
        }),
        getTransaction: builder.query({
            query: (id) => `payment/payment-history/${id}/`,
            providesTags: ['Transaction'],
        }),
        createTransaction: builder.mutation({
            query: (transaction) => ({
                url: 'payment/notify/',
                method: 'POST',
                body: transaction,
            }),
            invalidatesTags: ['Transaction'],
        }),

        // Payment validation
        validatePayment: builder.mutation({
            query: (data) => ({
                url: 'payment/validate/',
                method: 'GET',
                params: data,
            }),
        }),

        // Analytics endpoints
        getDashboardStats: builder.query({
            query: () => 'analytics/dashboard/',
            providesTags: ['Analytics'],
        }),
        getVendorStats: builder.query({
            query: (vendorId) => `analytics/vendor/${vendorId}/`,
            providesTags: ['Analytics'],
        }),
        getTransactionStats: builder.query({
            query: (params = {}) => ({
                url: 'analytics/transactions/',
                params,
            }),
            providesTags: ['Analytics'],
        }),

        // Notification endpoints
        getNotifications: builder.query({
            query: (params = {}) => ({
                url: 'notifications/',
                params,
            }),
            providesTags: ['Notification'],
        }),
        markNotificationRead: builder.mutation({
            query: (id) => ({
                url: `notifications/${id}/read/`,
                method: 'POST',
            }),
            invalidatesTags: ['Notification'],
        }),

        // Tenant endpoints
        getTenants: builder.query({
            query: (params = {}) => ({
                url: 'tenants/',
                params,
            }),
            providesTags: ['Tenant'],
        }),
        getTenant: builder.query({
            query: (id) => `tenants/${id}/`,
            providesTags: ['Tenant'],
        }),
        createTenant: builder.mutation({
            query: (tenant) => ({
                url: 'tenants/',
                method: 'POST',
                body: tenant,
            }),
            invalidatesTags: ['Tenant'],
        }),
        updateTenant: builder.mutation({
            query: ({ id, ...tenant }) => ({
                url: `tenants/${id}/`,
                method: 'PATCH',
                body: tenant,
            }),
            invalidatesTags: ['Tenant'],
        }),
        deleteTenant: builder.mutation({
            query: (id) => ({
                url: `tenants/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Tenant'],
        }),

        // Prepaid endpoints
        searchPrepaidCustomer: builder.query({
            query: (meterNumber) => ({
                url: 'prepaid/customers/search/',
                params: { meter_number: meterNumber },
            }),
            providesTags: ['Prepaid'],
        }),
        getPrepaidCustomer: builder.query({
            query: (id) => `prepaid/customers/${id}/`,
            providesTags: ['Prepaid'],
        }),
        getPrepaidCustomerTokens: builder.query({
            query: (id) => `prepaid/customers/${id}/tokens/`,
            providesTags: ['Prepaid'],
        }),
        getPrepaidCustomerTransactions: builder.query({
            query: (id) => `prepaid/customers/${id}/transactions/`,
            providesTags: ['Prepaid'],
        }),
        processPrepaidPayment: builder.mutation({
            query: (data) => ({
                url: 'prepaid/payment/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Prepaid', 'Wallet', 'Transaction'],
        }),

        // Wallet enhanced endpoints
        transferWallet: builder.mutation({
            query: (data) => ({
                url: 'wallets/transfer/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Wallet', 'Transaction'],
        }),
        fundWallet: builder.mutation({
            query: (data) => ({
                url: 'wallets/fund/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Wallet', 'Transaction'],
        }),
        setWalletPin: builder.mutation({
            query: (data) => ({
                url: 'wallets/set-pin/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Wallet'],
        }),

        // Subaccount/Debt endpoints
        getSubaccounts: builder.query({
            query: (params = {}) => ({
                url: 'subaccounts/subaccounts/',
                params,
            }),
            providesTags: ['SubAccount'],
        }),
        getDebts: builder.query({
            query: (params = {}) => ({
                url: 'subaccounts/debts/',
                params,
            }),
            providesTags: ['Debt'],
        }),
        payDebt: builder.mutation({
            query: ({ debtId, ...data }) => ({
                url: `subaccounts/debts/${debtId}/pay/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Debt', 'Wallet', 'Transaction'],
        }),
    }),
});

// RTK Query automatically generates hooks based on endpoint names
// Import hooks directly from api in components: api.useLoginMutation(), etc.

export default api;