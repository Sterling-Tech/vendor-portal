import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TenantState {
    currentTenant: any | null;
    availableTenants: any[];
    isLoading: boolean;
}

const initialState: TenantState = {
    currentTenant: localStorage.getItem('currentTenant') ? JSON.parse(localStorage.getItem('currentTenant')!) : null,
    availableTenants: [],
    isLoading: false,
};

const tenantSlice = createSlice({
    name: 'tenant',
    initialState,
    reducers: {
        setCurrentTenant: (state, action: PayloadAction<any>) => {
            state.currentTenant = action.payload;
            localStorage.setItem('currentTenant', JSON.stringify(action.payload));
        },
        setAvailableTenants: (state, action: PayloadAction<any[]>) => {
            state.availableTenants = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setCurrentTenant, setAvailableTenants, setLoading } = tenantSlice.actions;
export default tenantSlice.reducer;

