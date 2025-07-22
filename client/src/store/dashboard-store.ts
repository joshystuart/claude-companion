import { create } from 'zustand';
import { HookEvent, Agent } from '@/types';

interface DashboardState {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Data
  agents: Map<string, Agent>;
  events: HookEvent[];
  selectedAgentId: string | null;
  
  // Filters
  eventFilter: 'all' | 'pre_tool_use' | 'post_tool_use' | 'stop' | 'notification';
  
  // Actions
  setConnectionStatus: (status: DashboardState['connectionStatus']) => void;
  addEvent: (event: HookEvent) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  setSelectedAgent: (agentId: string | null) => void;
  setEventFilter: (filter: DashboardState['eventFilter']) => void;
  clearEvents: () => void;
  
  // Computed values
  getActiveAgents: () => Agent[];
  getFilteredEvents: () => HookEvent[];
  getAgentEvents: (agentId: string) => HookEvent[];
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionStatus: 'disconnected',
  agents: new Map(),
  events: [],
  selectedAgentId: null,
  eventFilter: 'all',

  // Actions
  setConnectionStatus: (status) => {
    set(() => ({
      connectionStatus: status,
      isConnected: status === 'connected',
    }));
  },

  addEvent: (event) => {
    set((state) => {
      const newEvents = [event, ...state.events];
      // Keep only last 500 events to prevent memory issues
      return {
        events: newEvents.slice(0, 500),
      };
    });
  },

  updateAgent: (agent) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.set(agent.id, {
        ...agent,
        lastSeen: new Date(agent.lastSeen),
      });
      return { agents: newAgents };
    });
  },

  removeAgent: (agentId) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.delete(agentId);
      return { agents: newAgents };
    });
  },

  setSelectedAgent: (agentId) => {
    set({ selectedAgentId: agentId });
  },

  setEventFilter: (filter) => {
    set({ eventFilter: filter });
  },

  clearEvents: () => {
    set({ events: [] });
  },

  // Computed values
  getActiveAgents: () => {
    const { agents } = get();
    return Array.from(agents.values()).filter(agent => agent.status === 'active');
  },

  getFilteredEvents: () => {
    const { events, eventFilter, selectedAgentId } = get();
    
    let filtered = events;
    
    // Filter by event type
    if (eventFilter !== 'all') {
      filtered = filtered.filter(event => event.hookType === eventFilter);
    }
    
    // Filter by selected agent
    if (selectedAgentId) {
      filtered = filtered.filter(event => event.agentId === selectedAgentId);
    }
    
    return filtered;
  },

  getAgentEvents: (agentId) => {
    const { events } = get();
    return events.filter(event => event.agentId === agentId);
  },
}));