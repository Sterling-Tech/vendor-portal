import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tenantReducer from './slices/tenantSlice';
import vendorReducer from './slices/vendorSlice';
import walletReducer from './slices/walletSlice';
import notificationReducer from './slices/notificationSlice';
import posReducer from './slices/posSlice';
import agentReducer from './slices/agentSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        tenant: tenantReducer,
        vendor: vendorReducer,
        wallet: walletReducer,
        notification: notificationReducer,
        pos: posReducer,
        agent: agentReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks (can also import from './hooks')
export { useAppDispatch, useAppSelector } from './hooks';

