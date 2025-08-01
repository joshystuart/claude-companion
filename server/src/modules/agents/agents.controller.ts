import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Agent } from '../storage/entities/computer.entity';

@Controller('api/agents')
export class AgentsController {
  constructor(private readonly storageService: StorageService) {}

  @Get('by-computer/:computerId')
  getAgentsByComputer(@Param('computerId') computerId: string) {
    return this.storageService.getAgentsByComputer(computerId);
  }

  @Get(':id')
  getAgent(@Param('id') id: string): Agent | null {
    const agent = this.storageService.getAgent(id);
    return agent || null;
  }

  @Put(':id/status')
  updateAgentStatus(@Param('id') id: string, @Body() body: { status: Agent['status'] }) {
    this.storageService.updateAgentStatus(id, body.status);
    return { success: true };
  }

  @Put(':id/session')
  updateAgentSession(@Param('id') id: string, @Body() body: { sessionId?: string }) {
    this.storageService.updateAgent(id, { currentSessionId: body.sessionId });
    return { success: true };
  }
}