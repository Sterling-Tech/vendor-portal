import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
    wallet: any | null;
    transactions: any[];
    isLoading: boolean;
}

const initialState: WalletState = {
    wallet: null,
    transactions: [],
    isLoading: false,
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        setWallet: (state, action: PayloadAction<any>) => {
            state.wallet = action.payload;
        },
        setTransactions: (state, action: PayloadAction<any[]>) => {
            state.transactions = action.payload;
        },
        addTransaction: (state, action: PayloadAction<any>) => {
            state.transactions.unshift(action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setWallet, setTransactions, addTransaction, setLoading } = walletSlice.actions;
export default walletSlice.reducer;
