import { Injectable, Logger } from '@nestjs/common';
import { HookEventDto } from './dto/hook-event.dto';
import { HookResponse } from '../libs/types';
import { EventsService } from '../events/events.service';
import { StorageService } from '../modules/storage/storage.service';
import { Agent } from '../modules/storage/entities/computer.entity';

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);
  private sessionTimeoutInterval: NodeJS.Timeout;

  constructor(
    private readonly eventsService: EventsService,
    private readonly storageService: StorageService,
  ) {
    // Check for session timeouts every minute
    this.sessionTimeoutInterval = setInterval(() => {
      this.storageService.checkSessionTimeout();
    }, 60 * 1000);
  }

  onModuleDestroy() {
    if (this.sessionTimeoutInterval) {
      clearInterval(this.sessionTimeoutInterval);
    }
  }

  async processHookEvent(hookEvent: HookEventDto, token?: string): Promise<HookResponse> {
    this.logger.log(`Processing ${hookEvent.hookType} from agent ${hookEvent.agentId}`);

    try {
      // Extract enhanced context from hookEvent
      const { computerId, computerName, hostname, platform, agentName, workingDirectory } = hookEvent.data || {};
      
      // Create or update computer
      if (computerId) {
        this.storageService.findOrCreateComputer(
          computerId,
          computerName || hostname || computerId,
          hostname || 'unknown',
          platform || 'unknown'
        );
      }
      
      // Create or update agent with context
      const agent = this.storageService.findOrCreateAgent(
        computerId || 'default',
        hookEvent.agentId,
        agentName || hookEvent.agentId,
        workingDirectory || process.cwd()
      );
      
      // Get or create session
      let session = this.storageService.getActiveSessionForAgent(hookEvent.agentId);
      if (!session || (workingDirectory && session.workingDirectory !== workingDirectory)) {
        // Create new session if none exists or working directory changed
        session = this.storageService.createSession({
          id: hookEvent.sessionId,
          agentId: hookEvent.agentId,
          name: this.generateSessionName(),
          startTime: new Date().toISOString(),
          status: 'active',
          workingDirectory: workingDirectory || process.cwd(),
          eventCount: 0
        });
      }
      
      // Store the event
      this.storageService.addEvent(session.id, hookEvent);
      
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
    this.storageService.updateAgentStatus(agentId, 'active');
    this.logger.debug(`Heartbeat from agent ${agentId}`);
  }

  private generateSessionName(): string {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const dayStr = now.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric' 
    });
    return `${dayStr} ${timeStr}`;
  }

  getAgents(): Agent[] {
    // Get all agents from all computers
    const computers = this.storageService.getAllComputers();
    const agents: Agent[] = [];
    
    computers.forEach(computer => {
      if (computer.agents) {
        agents.push(...computer.agents);
      }
    });
    
    return agents;
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