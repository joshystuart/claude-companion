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
    sessionId?: string;
    transcriptPath?: string;
    cwd?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    requiresApproval?: boolean;
    suggestedAction?: string;
    context?: string[];
    rawInput?: any;
    // Enhanced context from Phase 2.1
    computerId?: string;
    computerName?: string;
    hostname?: string;
    platform?: string;
    agentName?: string;
    workingDirectory?: string;
  };
}

export interface HookResponse {
  approved?: boolean;
  reason?: string;
  feedback?: string;
  commands?: string[];
}

export interface Agent {
  id: string;
  lastSeen: Date;
  sessionId?: string;
  status: 'active' | 'idle' | 'offline';
}

export interface RemoteCommand {
  id: string;
  agentId: string;
  sessionId: string;
  type: 'approve' | 'deny' | 'context' | 'continue' | 'stop' | 'interrupt';
  payload: {
    reason?: string;
    feedback?: string;
    instructions?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  relatedEventId?: string;
}

export interface EventStreamData {
  type: 'hook_event' | 'agent_status' | 'command_update' | 'error' | 'computer_update' | 'session_update' | 'hierarchy_update';
  data: any; // More flexible to support different data types
  timestamp: string;
}