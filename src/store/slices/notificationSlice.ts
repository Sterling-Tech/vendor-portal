import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationState {
    notifications: any[];
    unreadCount: number;
    isLoading: boolean;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<any[]>) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter(n => !n.isRead).length;
        },
        addNotification: (state, action: PayloadAction<any>) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.isRead) {
                state.unreadCount += 1;
            }
        },
        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                state.unreadCount -= 1;
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(notification => {
                notification.isRead = true;
            });
            state.unreadCount = 0;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setNotifications, addNotification, markAsRead, markAllAsRead, setLoading } = notificationSlice.actions;
export default notificationSlice.reducer;
