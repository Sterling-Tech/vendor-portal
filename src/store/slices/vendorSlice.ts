import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VendorState {
    vendors: any[];
    selectedVendor: any | null;
    isLoading: boolean;
}

const initialState: VendorState = {
    vendors: [],
    selectedVendor: null,
    isLoading: false,
};

const vendorSlice = createSlice({
    name: 'vendor',
    initialState,
    reducers: {
        setVendors: (state, action: PayloadAction<any[]>) => {
            state.vendors = action.payload;
        },
        setSelectedVendor: (state, action: PayloadAction<any>) => {
            state.selectedVendor = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setVendors, setSelectedVendor, setLoading: setVendorLoading } = vendorSlice.actions;
export default vendorSlice.reducer;

