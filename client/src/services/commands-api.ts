import { RemoteCommand } from '../types';

export class CommandsApi {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createCommand(command: {
    agentId: string;
    sessionId: string;
    type: 'approve' | 'deny' | 'context' | 'continue' | 'stop' | 'interrupt';
    payload?: {
      reason?: string;
      feedback?: string;
      instructions?: string;
    };
    relatedEventId?: string;
  }): Promise<RemoteCommand> {
    const response = await fetch(`${this.baseUrl}/api/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Failed to create command: ${response.statusText}`);
    }

    return response.json();
  }

  async getCommandsForAgent(agentId: string): Promise<RemoteCommand[]> {
    const response = await fetch(`${this.baseUrl}/api/commands/${agentId}`);

    if (!response.ok) {
      throw new Error(`Failed to get commands: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllCommands(): Promise<RemoteCommand[]> {
    const response = await fetch(`${this.baseUrl}/api/commands`);

    if (!response.ok) {
      throw new Error(`Failed to get all commands: ${response.statusText}`);
    }

    return response.json();
  }

  async markCommandAsProcessing(commandId: string): Promise<RemoteCommand> {
    const response = await fetch(`${this.baseUrl}/api/commands/${commandId}/processing`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error(`Failed to mark command as processing: ${response.statusText}`);
    }

    return response.json();
  }

  async completeCommand(commandId: string, status: 'completed' | 'expired', result?: string): Promise<RemoteCommand> {
    const response = await fetch(`${this.baseUrl}/api/commands/${commandId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, result }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete command: ${response.statusText}`);
    }

    return response.json();
  }

  // Quick action methods for common operations
  async approveAction(agentId: string, sessionId: string, reason?: string, relatedEventId?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'approve',
      payload: { reason: reason || 'Approved from dashboard' },
      relatedEventId,
    });
  }

  async denyAction(agentId: string, sessionId: string, reason?: string, feedback?: string, relatedEventId?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'deny',
      payload: { 
        reason: reason || 'Denied from dashboard', 
        feedback 
      },
      relatedEventId,
    });
  }

  async injectContext(agentId: string, sessionId: string, instructions: string, relatedEventId?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'context',
      payload: { instructions },
      relatedEventId,
    });
  }

  async continueSession(agentId: string, sessionId: string, instructions?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'continue',
      payload: { instructions },
    });
  }

  async stopSession(agentId: string, sessionId: string, reason?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'stop',
      payload: { reason },
    });
  }

  async interruptSession(agentId: string, sessionId: string, reason?: string): Promise<RemoteCommand> {
    return this.createCommand({
      agentId,
      sessionId,
      type: 'interrupt',
      payload: { reason: reason || 'Interrupted from dashboard' },
    });
  }

  // High-priority interrupt endpoint for immediate response
  async getInterruptCommands(agentId: string): Promise<RemoteCommand[]> {
    const response = await fetch(`${this.baseUrl}/api/commands/${agentId}/interrupt`);

    if (!response.ok) {
      return [];
    }

    return response.json();
  }
}

export const commandsApi = new CommandsApi();