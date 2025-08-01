import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('agent/register')
  async registerAgent(@Body() body: { agentId: string }) {
    const token = await this.authService.generateAgentToken(body.agentId);
    return {
      agentId: body.agentId,
      token,
      message: 'Agent registered successfully',
    };
  }

  @Post('dashboard/token')
  async getDashboardToken() {
    const token = await this.authService.generateDashboardToken();
    return {
      token,
      message: 'Dashboard token generated',
    };
  }

  @Get('status')
  async getAuthStatus() {
    return {
      message: 'Auth service running',
      timestamp: new Date().toISOString(),
      version: '1.0.0-phase1',
    };
  }
}