import { Injectable } from '@nestjs/common';
import { Computer, Agent, Session } from './entities/computer.entity';
import { HookEvent } from '../../libs/types';

@Injectable()
export class StorageService {
  private computers: Map<string, Computer> = new Map();
  private agents: Map<string, Agent> = new Map();
  private sessions: Map<string, Session> = new Map();
  private events: Map<string, HookEvent[]> = new Map();

  // Computer operations
  registerComputer(computer: Omit<Computer, 'agents'>): Computer {
    const newComputer = { ...computer };
    this.computers.set(computer.id, newComputer);
    return newComputer;
  }

  getComputer(id: string): Computer | undefined {
    const computer = this.computers.get(id);
    if (computer) {
      computer.agents = this.getAgentsByComputer(id);
    }
    return computer;
  }

  getAllComputers(): Computer[] {
    return Array.from(this.computers.values()).map(computer => ({
      ...computer,
      agents: this.getAgentsByComputer(computer.id)
    }));
  }

  updateComputerLastSeen(id: string): void {
    const computer = this.computers.get(id);
    if (computer) {
      computer.lastSeen = new Date().toISOString();
    }
  }

  // Agent operations
  registerAgent(agent: Omit<Agent, 'sessions'>): Agent {
    const newAgent = { ...agent };
    this.agents.set(agent.id, newAgent);
    this.updateComputerLastSeen(agent.computerId);
    return newAgent;
  }

  getAgent(id: string): Agent | undefined {
    const agent = this.agents.get(id);
    if (agent) {
      agent.sessions = this.getSessionsByAgent(id);
    }
    return agent;
  }

  getAgentsByComputer(computerId: string): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.computerId === computerId)
      .map(agent => ({
        ...agent,
        sessions: this.getSessionsByAgent(agent.id)
      }));
  }

  updateAgent(id: string, updates: Partial<Agent>): Agent | undefined {
    const agent = this.agents.get(id);
    if (agent) {
      Object.assign(agent, updates);
      agent.lastActivity = new Date().toISOString();
      this.updateComputerLastSeen(agent.computerId);
    }
    return agent;
  }

  updateAgentStatus(id: string, status: Agent['status']): void {
    this.updateAgent(id, { status });
  }

  // Session operations
  createSession(session: Omit<Session, 'events'>): Session {
    const newSession = { ...session };
    this.sessions.set(session.id, newSession);
    this.events.set(session.id, []);
    
    const agent = this.agents.get(session.agentId);
    if (agent) {
      agent.currentSessionId = session.id;
      agent.status = 'active';
      this.updateAgent(agent.id, agent);
    }
    
    return newSession;
  }

  getSession(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.events = this.getEventsBySession(id);
    }
    return session;
  }

  getSessionsByAgent(agentId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => session.agentId === agentId)
      .map(session => ({
        ...session,
        events: this.getEventsBySession(session.id)
      }));
  }

  endSession(id: string, status: 'completed' | 'interrupted' = 'completed'): Session | undefined {
    const session = this.sessions.get(id);
    if (session && !session.endTime) {
      session.endTime = new Date().toISOString();
      session.status = status;
      
      const agent = this.agents.get(session.agentId);
      if (agent && agent.currentSessionId === id) {
        agent.currentSessionId = undefined;
        agent.status = 'idle';
        this.updateAgent(agent.id, agent);
      }
    }
    return session;
  }

  updateSessionEventCount(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const events = this.events.get(sessionId) || [];
      session.eventCount = events.length;
    }
  }

  // Event operations
  addEvent(sessionId: string, event: HookEvent): void {
    const events = this.events.get(sessionId) || [];
    events.push(event);
    this.events.set(sessionId, events);
    this.updateSessionEventCount(sessionId);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      const agent = this.agents.get(session.agentId);
      if (agent) {
        this.updateAgent(agent.id, { lastActivity: new Date().toISOString() });
      }
    }
  }

  getEventsBySession(sessionId: string): HookEvent[] {
    return this.events.get(sessionId) || [];
  }

  // Utility methods
  findOrCreateAgent(computerId: string, agentId: string, agentName: string, workingDirectory: string): Agent {
    let agent = this.agents.get(agentId);
    
    if (!agent) {
      agent = this.registerAgent({
        id: agentId,
        computerId,
        name: agentName,
        workingDirectory,
        status: 'active',
        lastActivity: new Date().toISOString()
      });
    } else {
      this.updateAgent(agentId, {
        workingDirectory,
        status: 'active',
        lastActivity: new Date().toISOString()
      });
    }
    
    return agent;
  }

  findOrCreateComputer(id: string, name: string, hostname: string, platform: string): Computer {
    let computer = this.computers.get(id);
    
    if (!computer) {
      computer = this.registerComputer({
        id,
        name,
        hostname,
        platform,
        lastSeen: new Date().toISOString()
      });
    } else {
      this.updateComputerLastSeen(id);
    }
    
    return computer;
  }

  // Session auto-management
  getActiveSessionForAgent(agentId: string): Session | undefined {
    const agent = this.agents.get(agentId);
    if (agent?.currentSessionId) {
      return this.sessions.get(agent.currentSessionId);
    }
    return undefined;
  }

  checkSessionTimeout(timeout: number = 10 * 60 * 1000): void {
    const now = Date.now();
    
    this.sessions.forEach(session => {
      if (session.status === 'active' && !session.endTime) {
        const lastEventTime = Math.max(
          ...this.getEventsBySession(session.id).map(e => new Date(e.timestamp).getTime()),
          new Date(session.startTime).getTime()
        );
        
        if (now - lastEventTime > timeout) {
          this.endSession(session.id, 'completed');
        }
      }
    });
  }
}