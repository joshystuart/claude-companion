export interface HookEvent {
  agentId: string;
  sessionId: string;
  hookType: 'pre_tool_use' | 'post_tool_use' | 'stop' | 'notification';
  timestamp: string;
  data: {
    toolName?: string;
    toolArgs?: any;
    result?: any;
    message?: string;
    rawInput?: any;
  };
}

export interface Agent {
  id: string;
  lastSeen: Date;
  sessionId?: string;
  status: 'active' | 'idle' | 'offline';
}

export interface EventStreamData {
  type: 'hook_event' | 'agent_status' | 'error' | 'connected';
  data: HookEvent | Agent | { message: string };
  timestamp: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalEvents: number;
  eventsToday: number;
}