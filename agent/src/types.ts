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

export interface HookResponse {
  approved?: boolean;
  reason?: string;
  feedback?: string;
  commands?: string[];
}

export interface AgentConfig {
  serverUrl: string;
  agentId: string;
  token?: string;
}