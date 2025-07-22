import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { HookEvent, Agent, EventStreamData, RemoteCommand } from '../libs/types';

interface SSEClient {
  id: string;
  response: Response;
  agentFilter?: string;
  token?: string;
  lastSeen: Date;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private clients = new Map<string, SSEClient>();
  private eventHistory: EventStreamData[] = [];
  private readonly maxHistorySize = 1000;

  addClient(response: Response, options?: { agentId?: string; token?: string }): string {
    const clientId = this.generateClientId();
    
    const client: SSEClient = {
      id: clientId,
      response,
      agentFilter: options?.agentId,
      token: options?.token,
      lastSeen: new Date(),
    };

    this.clients.set(clientId, client);
    
    this.logger.log(`SSE client connected: ${clientId} (filter: ${options?.agentId || 'all'})`);

    // Send recent events to new client
    this.sendRecentEvents(client);

    // Clean up old disconnected clients
    this.cleanupClients();

    return clientId;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        // Client already disconnected
      }
      this.clients.delete(clientId);
      this.logger.log(`SSE client disconnected: ${clientId}`);
    }
  }

  async broadcastHookEvent(hookEvent: HookEvent): Promise<void> {
    const eventData: EventStreamData = {
      type: 'hook_event',
      data: hookEvent,
      timestamp: new Date().toISOString(),
    };

    this.addToHistory(eventData);
    await this.broadcast(eventData);
  }

  async broadcastAgentStatus(agent: Agent): Promise<void> {
    const eventData: EventStreamData = {
      type: 'agent_status',
      data: agent,
      timestamp: new Date().toISOString(),
    };

    this.addToHistory(eventData);
    await this.broadcast(eventData);
  }

  async broadcastError(message: string): Promise<void> {
    const eventData: EventStreamData = {
      type: 'error',
      data: { message },
      timestamp: new Date().toISOString(),
    };

    await this.broadcast(eventData);
  }

  private async broadcast(eventData: EventStreamData): Promise<void> {
    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    const disconnectedClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      try {
        // Check if client has agent filter and event matches
        if (client.agentFilter && eventData.type === 'hook_event') {
          const hookEvent = eventData.data as HookEvent;
          if (hookEvent.agentId !== client.agentFilter) {
            continue; // Skip this client
          }
        }

        client.response.write(message);
        client.lastSeen = new Date();
        
      } catch (error) {
        this.logger.warn(`Failed to send to client ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
        disconnectedClients.push(clientId);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach(clientId => this.removeClient(clientId));
  }

  private sendRecentEvents(client: SSEClient): void {
    // Send last 50 events to new clients
    const recentEvents = this.eventHistory.slice(-50);
    
    for (const event of recentEvents) {
      try {
        // Apply agent filter if specified
        if (client.agentFilter && event.type === 'hook_event') {
          const hookEvent = event.data as HookEvent;
          if (hookEvent.agentId !== client.agentFilter) {
            continue;
          }
        }

        const message = `data: ${JSON.stringify(event)}\n\n`;
        client.response.write(message);
      } catch (error) {
        this.logger.warn(`Failed to send recent event to client ${client.id}`);
        break;
      }
    }
  }

  private addToHistory(eventData: EventStreamData): void {
    this.eventHistory.push(eventData);
    
    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize + 100);
    }
  }

  private cleanupClients(): void {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.lastSeen < tenMinutesAgo) {
        this.removeClient(clientId);
      }
    }
  }

  private generateClientId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `client-${timestamp}-${random}`;
  }

  getAgents(): Agent[] {
    // This will be implemented by the HooksService
    // For now, return empty array
    return [];
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getEventHistory(): EventStreamData[] {
    return this.eventHistory.slice(); // Return a copy
  }
}