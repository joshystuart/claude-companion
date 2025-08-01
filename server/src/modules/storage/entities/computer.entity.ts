export interface Computer {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  lastSeen: string;
  agents?: Agent[];
}

export interface Agent {
  id: string;
  computerId: string;
  name: string;
  workingDirectory: string;
  status: 'active' | 'idle' | 'offline';
  lastActivity: string;
  currentSessionId?: string;
  sessions?: Session[];
}

export interface Session {
  id: string;
  agentId: string;
  name: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'interrupted';
  workingDirectory: string;
  eventCount: number;
  events?: any[];
}