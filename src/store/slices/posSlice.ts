import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface POSCartItem {
    id: string;
    name: string;
    amount: number;
    quantity: number;
    metadata?: Record<string, string>;
}

export interface POSTransaction {
    id: string;
    reference: string;
    status: 'queued' | 'synced' | 'failed';
    total: number;
    createdAt: string;
    items: POSCartItem[];
    customerIdentifier?: string;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'wallet';
    offline: boolean;
}

interface POSState {
    cart: POSCartItem[];
    pendingTransactions: POSTransaction[];
    status: 'idle' | 'processing' | 'success' | 'error';
    error?: string;
    lastSyncedAt?: string;
}

const initialState: POSState = {
    cart: [],
    pendingTransactions: [],
    status: 'idle',
};

const posSlice = createSlice({
    name: 'pos',
    initialState,
    reducers: {
        addCartItem: (state, action: PayloadAction<Omit<POSCartItem, 'id'>>) => {
            const newId =
                action.payload.metadata?.sku ||
                action.payload.name.toLowerCase().replace(/\s+/g, '-');
            const existing = state.cart.find((item) => item.id === newId);
            const cartItem: POSCartItem = {
                id: newId,
                name: action.payload.name,
                amount: action.payload.amount,
                quantity: (existing?.quantity || 0) + (action.payload.quantity || 1),
                metadata: action.payload.metadata,
            };

            state.cart = state.cart
                .filter((item) => item.id !== cartItem.id)
                .concat(cartItem);
        },
        updateCartItemQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
            state.cart = state.cart.map((item) =>
                item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
            );
        },
        removeCartItem: (state, action: PayloadAction<string>) => {
            state.cart = state.cart.filter((item) => item.id !== action.payload);
        },
        clearCart: (state) => {
            state.cart = [];
        },
        setStatus: (state, action: PayloadAction<POSState['status']>) => {
            state.status = action.payload;
            if (action.payload !== 'error') {
                state.error = undefined;
            }
        },
        setError: (state, action: PayloadAction<string | undefined>) => {
            state.error = action.payload;
            state.status = action.payload ? 'error' : 'idle';
        },
        enqueueTransaction: (
            state,
            action: PayloadAction<{
                items: POSCartItem[];
                total: number;
                paymentMethod: POSTransaction['paymentMethod'];
                customerIdentifier?: string;
                offline?: boolean;
            }>
        ) => {
            const uniqueId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const transaction: POSTransaction = {
                id: uniqueId,
                reference: `POS-${Date.now()}`,
                status: action.payload.offline ? 'queued' : 'synced',
                total: action.payload.total,
                createdAt: new Date().toISOString(),
                items: action.payload.items,
                customerIdentifier: action.payload.customerIdentifier,
                paymentMethod: action.payload.paymentMethod,
                offline: Boolean(action.payload.offline),
            };
            state.pendingTransactions.unshift(transaction);
        },
        markTransactionSynced: (state, action: PayloadAction<string>) => {
            state.pendingTransactions = state.pendingTransactions.map((txn) =>
                txn.id === action.payload ? { ...txn, status: 'synced', offline: false } : txn
            );
            state.lastSyncedAt = new Date().toISOString();
        },
        setPendingTransactions: (state, action: PayloadAction<POSTransaction[]>) => {
            state.pendingTransactions = action.payload;
        },
    },
});

export const {
    addCartItem,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    setStatus,
    setError,
    enqueueTransaction,
    markTransactionSynced,
    setPendingTransactions,
} = posSlice.actions;

export default posSlice.reducer;

