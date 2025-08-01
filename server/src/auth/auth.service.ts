import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private jwtService: JwtService) {}

  async generateAgentToken(agentId: string): Promise<string> {
    const payload = { sub: agentId, type: 'agent' };
    return this.jwtService.sign(payload);
  }

  async generateDashboardToken(): Promise<string> {
    const payload = { sub: 'dashboard', type: 'dashboard' };
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn(`Invalid token: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  // Phase 1: Simple token validation
  // Phase 2+: Will add proper user authentication, agent registration, etc.
  async validateAgent(agentId: string, token?: string): Promise<boolean> {
    if (!token) {
      // For Phase 1, allow agents without tokens (development mode)
      return true;
    }

    const payload = await this.validateToken(token);
    return payload && payload.type === 'agent' && payload.sub === agentId;
  }

  async validateDashboard(token?: string): Promise<boolean> {
    if (!token) {
      // For Phase 1, allow dashboard access without token (development mode)
      return true;
    }

    const payload = await this.validateToken(token);
    return payload && payload.type === 'dashboard';
  }
}