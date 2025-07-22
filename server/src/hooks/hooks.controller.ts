import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HooksService } from './hooks.service';
import { HookEventDto } from './dto/hook-event.dto';
import { HookResponse } from '../libs/types';

@Controller('hooks')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  @Post('events')
  @Throttle(30, 60) // 30 events per minute per IP
  async handleHookEvent(
    @Body() hookEvent: HookEventDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<HookResponse> {
    // Extract token from Authorization header
    const token = authHeader?.replace('Bearer ', '');
    
    return await this.hooksService.processHookEvent(hookEvent, token);
  }

  @Post('heartbeat')
  @Throttle(120, 60) // 2 per second
  async heartbeat(
    @Body() data: { agentId: string },
    @Headers('authorization') authHeader?: string,
  ): Promise<{ status: 'ok' }> {
    const token = authHeader?.replace('Bearer ', '');
    
    await this.hooksService.updateAgentHeartbeat(data.agentId, token);
    
    return { status: 'ok' };
  }
}