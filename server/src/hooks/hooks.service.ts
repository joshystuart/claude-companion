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

      // Phase 2: Check for pending commands and process them
      // For now, still approve everything but with enhanced logic for Phase 2 readiness
      const response: HookResponse = await this.processDecisionLogic(hookEvent);

      // Enhanced response with risk assessment
      if (hookEvent.hookType === 'pre_tool_use') {
        this.assessToolRisk(hookEvent);
      }

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

  private async processDecisionLogic(hookEvent: HookEventDto): Promise<HookResponse> {
    // Phase 2 placeholder - in full implementation this will:
    // 1. Check for pending commands for this agent/session
    // 2. Process command if exists
    // 3. Return appropriate response based on command
    // 4. Handle timeouts and defaults
    
    // For now, return basic approval
    return {
      approved: true,
      reason: 'Phase 2 - monitoring with decision logic ready',
    };
  }

  private assessToolRisk(hookEvent: HookEventDto): void {
    // Basic risk assessment for common dangerous operations
    const toolName = hookEvent.data.toolName?.toLowerCase() || '';
    const toolArgs = JSON.stringify(hookEvent.data.toolArgs || {}).toLowerCase();

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let requiresApproval = false;
    let suggestedAction = '';

    // High risk operations
    if (toolName === 'bash' || toolName === 'shell') {
      if (toolArgs.includes('rm -rf') || toolArgs.includes('rm -r')) {
        riskLevel = 'high';
        requiresApproval = true;
        suggestedAction = 'Recursive file deletion - verify target directory';
      } else if (toolArgs.includes('sudo') || toolArgs.includes('chmod') || toolArgs.includes('chown')) {
        riskLevel = 'high';
        requiresApproval = true;
        suggestedAction = 'System-level changes - verify permissions';
      } else if (toolArgs.includes('git push') || toolArgs.includes('git reset --hard')) {
        riskLevel = 'medium';
        requiresApproval = true;
        suggestedAction = 'Git operation with permanent effects';
      }
    }

    // Medium risk operations
    if (toolName === 'edit' || toolName === 'write') {
      const filepath = toolArgs;
      if (filepath.includes('.env') || filepath.includes('config') || filepath.includes('.json')) {
        riskLevel = 'medium';
        suggestedAction = 'Modifying configuration file';
      }
    }

    // Update event data with risk assessment
    hookEvent.data.riskLevel = riskLevel;
    hookEvent.data.requiresApproval = requiresApproval;
    hookEvent.data.suggestedAction = suggestedAction;
  }
}