import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AgentPerformance {
    id: string;
    name: string;
    role: 'agent' | 'cashier';
    status: 'active' | 'inactive' | 'suspended';
    todayVolume: number;
    weekVolume: number;
    transactions: number;
    escalationCount: number;
    lastActiveAt: string;
    parentOrg?: string;
}

interface AgentState {
    roster: AgentPerformance[];
    selectedAgentId?: string;
    searchTerm: string;
    filters: {
        role?: AgentPerformance['role'];
        status?: AgentPerformance['status'];
    };
}

const initialState: AgentState = {
    roster: [],
    searchTerm: '',
    filters: {},
};

const agentSlice = createSlice({
    name: 'agent',
    initialState,
    reducers: {
        setRoster: (state, action: PayloadAction<AgentPerformance[]>) => {
            state.roster = action.payload;
        },
        setSelectedAgent: (state, action: PayloadAction<string | undefined>) => {
            state.selectedAgentId = action.payload;
        },
        setSearchTerm: (state, action: PayloadAction<string>) => {
            state.searchTerm = action.payload;
        },
        setFilters: (
            state,
            action: PayloadAction<{ role?: AgentPerformance['role']; status?: AgentPerformance['status'] }>
        ) => {
            state.filters = action.payload;
        },
        upsertAgent: (state, action: PayloadAction<AgentPerformance>) => {
            const existing = state.roster.findIndex((agent) => agent.id === action.payload.id);
            if (existing >= 0) {
                state.roster[existing] = action.payload;
            } else {
                state.roster.push(action.payload);
            }
        },
    },
});

export const { setRoster, setSelectedAgent, setSearchTerm, setFilters, upsertAgent } = agentSlice.actions;
export default agentSlice.reducer;

