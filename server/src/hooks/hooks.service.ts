import { Injectable, Logger } from '@nestjs/common';
import { HookEventDto } from './dto/hook-event.dto';
import { HookResponse, Agent } from '../libs/types';
import { EventsService } from '../events/events.service';

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);
  private agents = new Map<string, Agent>();

  constructor(private readonly eventsService: EventsService) {}

  async processHookEvent(hookEvent: HookEventDto, token?: string): Promise<HookResponse> {
    this.logger.log(`Processing ${hookEvent.hookType} from agent ${hookEvent.agentId}`);

    try {
      // Update agent status
      this.updateAgent(hookEvent.agentId, hookEvent.sessionId);

      // Broadcast event to connected clients
      await this.eventsService.broadcastHookEvent(hookEvent);

      // For Phase 1, we just approve everything
      // Phase 2 will add command queue checking and decision logic
      const response: HookResponse = {
        approved: true,
        reason: 'Phase 1 - monitoring only',
      };

      return response;

    } catch (error) {
      this.logger.error(`Error processing hook event: ${error.message}`, error.stack);
      
      // Always return approval to avoid blocking Claude
      return {
        approved: true,
        reason: 'Server error, proceeding',
      };
    }
  }

  async updateAgentHeartbeat(agentId: string, token?: string): Promise<void> {
    this.updateAgent(agentId);
    this.logger.debug(`Heartbeat from agent ${agentId}`);
  }

  private updateAgent(agentId: string, sessionId?: string): void {
    const existingAgent = this.agents.get(agentId);
    
    const agent: Agent = {
      id: agentId,
      lastSeen: new Date(),
      sessionId: sessionId || existingAgent?.sessionId,
      status: 'active',
    };

    this.agents.set(agentId, agent);

    // Broadcast agent status update
    this.eventsService.broadcastAgentStatus(agent);

    // Clean up old agents (offline for more than 5 minutes)
    this.cleanupOldAgents();
  }

  private cleanupOldAgents(): void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.lastSeen < fiveMinutesAgo) {
        const offlineAgent = { ...agent, status: 'offline' as const };
        this.agents.set(agentId, offlineAgent);
        this.eventsService.broadcastAgentStatus(offlineAgent);
      }
    }
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getActiveAgents(): Agent[] {
    return this.getAgents().filter(agent => agent.status === 'active');
  }
}