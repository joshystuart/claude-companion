import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RemoteCommand } from '../libs/types';
import { CreateCommandDto } from './dto/create-command.dto';
import { CompleteCommandDto } from './dto/complete-command.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);
  private commands = new Map<string, RemoteCommand>();
  private commandsByAgent = new Map<string, string[]>(); // agentId -> commandIds
  
  // Command expiration time in milliseconds (30 seconds)
  private readonly COMMAND_TIMEOUT = 30 * 1000;

  constructor(private readonly eventsService: EventsService) {
    // Clean up expired commands every 10 seconds
    setInterval(() => this.cleanupExpiredCommands(), 10 * 1000);
  }

  async createCommand(createCommandDto: CreateCommandDto): Promise<RemoteCommand> {
    const commandId = this.generateCommandId();
    const now = new Date();
    
    const command: RemoteCommand = {
      id: commandId,
      agentId: createCommandDto.agentId,
      sessionId: createCommandDto.sessionId,
      type: createCommandDto.type,
      payload: createCommandDto.payload || {},
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.COMMAND_TIMEOUT),
      relatedEventId: createCommandDto.relatedEventId,
    };

    this.commands.set(commandId, command);
    
    // Track commands by agent
    const agentCommands = this.commandsByAgent.get(createCommandDto.agentId) || [];
    agentCommands.push(commandId);
    this.commandsByAgent.set(createCommandDto.agentId, agentCommands);

    this.logger.log(`Created ${command.type} command ${commandId} for agent ${command.agentId}`);

    // Broadcast command creation to dashboard
    await this.eventsService.broadcastCommandUpdate(command);

    return command;
  }

  async getPendingCommandsForAgent(agentId: string): Promise<RemoteCommand[]> {
    const agentCommandIds = this.commandsByAgent.get(agentId) || [];
    const pendingCommands = agentCommandIds
      .map(id => this.commands.get(id))
      .filter(cmd => cmd && cmd.status === 'pending')
      .filter(cmd => cmd && cmd.expiresAt > new Date()) as RemoteCommand[];

    return pendingCommands;
  }

  async getCommand(commandId: string): Promise<RemoteCommand> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new NotFoundException(`Command ${commandId} not found`);
    }
    return command;
  }

  async markCommandAsProcessing(commandId: string): Promise<RemoteCommand> {
    const command = await this.getCommand(commandId);
    
    if (command.status !== 'pending') {
      throw new Error(`Command ${commandId} is not in pending status`);
    }

    command.status = 'processing';
    this.commands.set(commandId, command);

    this.logger.log(`Command ${commandId} marked as processing`);
    await this.eventsService.broadcastCommandUpdate(command);

    return command;
  }

  async completeCommand(commandId: string, completeDto: CompleteCommandDto): Promise<RemoteCommand> {
    const command = await this.getCommand(commandId);
    
    command.status = completeDto.status;
    this.commands.set(commandId, command);

    this.logger.log(`Command ${commandId} completed with status ${completeDto.status}`);
    await this.eventsService.broadcastCommandUpdate(command);

    return command;
  }

  async getAllCommands(): Promise<RemoteCommand[]> {
    return Array.from(this.commands.values());
  }

  async getCommandsByAgent(agentId: string): Promise<RemoteCommand[]> {
    const agentCommandIds = this.commandsByAgent.get(agentId) || [];
    return agentCommandIds
      .map(id => this.commands.get(id))
      .filter(cmd => cmd) as RemoteCommand[];
  }

  private generateCommandId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cmd-${timestamp}-${random}`;
  }

  private async cleanupExpiredCommands(): Promise<void> {
    const now = new Date();
    let expiredCount = 0;

    for (const [commandId, command] of this.commands.entries()) {
      if (command.status === 'pending' && command.expiresAt < now) {
        command.status = 'expired';
        this.commands.set(commandId, command);
        
        this.logger.debug(`Command ${commandId} expired`);
        await this.eventsService.broadcastCommandUpdate(command);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} commands`);
    }

    // Remove commands older than 1 hour to prevent memory leak
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const [commandId, command] of this.commands.entries()) {
      if (command.createdAt < oneHourAgo) {
        this.commands.delete(commandId);
        
        // Remove from agent tracking
        const agentCommands = this.commandsByAgent.get(command.agentId) || [];
        const updatedCommands = agentCommands.filter(id => id !== commandId);
        if (updatedCommands.length === 0) {
          this.commandsByAgent.delete(command.agentId);
        } else {
          this.commandsByAgent.set(command.agentId, updatedCommands);
        }
      }
    }
  }
}