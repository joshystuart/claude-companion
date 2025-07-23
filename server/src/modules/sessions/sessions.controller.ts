import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Session } from '../storage/entities/computer.entity';

@Controller('api/sessions')
export class SessionsController {
  constructor(private readonly storageService: StorageService) {}

  @Get('by-agent/:agentId')
  getSessionsByAgent(@Param('agentId') agentId: string) {
    return this.storageService.getSessionsByAgent(agentId);
  }

  @Get(':id')
  getSession(@Param('id') id: string): Session | null {
    const session = this.storageService.getSession(id);
    return session || null;
  }

  @Get(':id/events')
  getSessionEvents(@Param('id') id: string) {
    return this.storageService.getEventsBySession(id);
  }

  @Post()
  createSession(@Body() sessionData: Omit<Session, 'events'>) {
    return this.storageService.createSession(sessionData);
  }

  @Put(':id/end')
  endSession(@Param('id') id: string, @Body() body: { status?: 'completed' | 'interrupted' }) {
    const session = this.storageService.endSession(id, body.status);
    return session || { success: false };
  }
}