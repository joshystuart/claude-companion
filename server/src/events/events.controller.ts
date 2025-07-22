import { Controller, Get, Res, Headers, Query } from '@nestjs/common';
import { Response } from 'express';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('stream')
  async streamEvents(
    @Res() res: Response,
    @Headers('authorization') authHeader?: string,
    @Query('agentId') agentId?: string,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection confirmation
    res.write('data: {"type":"connected","data":{"message":"Connected to event stream"},"timestamp":"' + new Date().toISOString() + '"}\n\n');

    // Register client for events
    const token = authHeader?.replace('Bearer ', '');
    const clientId = this.eventsService.addClient(res, { agentId, token });

    // Handle client disconnect
    const cleanup = () => {
      this.eventsService.removeClient(clientId);
    };

    res.on('close', cleanup);
    res.on('error', cleanup);
    res.on('finish', cleanup);
  }

  @Get('agents')
  async getAgents(
    @Headers('authorization') authHeader?: string,
  ) {
    // For Phase 1, return all agents (no auth filtering)
    // Phase 2 will add proper authentication and filtering
    return {
      agents: this.eventsService.getAgents(),
      timestamp: new Date().toISOString(),
    };
  }
}