### Remote Control Dashboard Component (`packages/client/src/components/RemoteControlPanel.tsx`)

```typescript
import React, { useState } from 'react';
import { useRemoteControl } from '../hooks/useRemoteControl';
import { useHookEvents } from '../hooks/useHookEvents';

interface RemoteControlPanelProps {
  agentId: string;
  serverUrl: string;
  authToken?: string;
}

export const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({
  agentId,
  serverUrl,
  authToken
}) => {
  const { getToolCallsInProgress } = useHookEvents({ serverUrl, authToken });
  const {
    approveToolCall,
    denyToolCall,
    injectContext,
    pauseSession,
    continueSession,
    pendingCommands,
    isLoading
  } = useRemoteControl({ serverUrl, authToken });

  const [contextInput, setContextInput] = useState('');
  const [denyReason, setDenyReason] = useState('');

  const toolCallsInProgress = getToolCallsInProgress().filter(tc => tc.agentId === agentId);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Remote Control - {agentId}</h3>
      
      {/* Active Tool Calls */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2">Tool Calls Awaiting Decision</h4>
        {toolCallsInProgress.length === 0 ? (
          <p className="text-gray-500">No active tool calls</p>
        ) : (
          <div className="space-y-2">
            {toolCallsInProgress.map((toolCall) => (
              <div key={toolCall.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{toolCall.tool}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(toolCall.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveToolCall(agentId, {
                        sessionId: toolCall.id,
                        toolName: toolCall.tool,
                        reason: 'Approved from dashboard'
                      })}
                      disabled={isLoading}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => denyToolCall(agentId, {
                        sessionId: toolCall.id,
                        toolName: toolCall.tool,
                        reason: denyReason || 'Denied from dashboard'
                      })}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Injection */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2">Inject Context</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            placeholder="Additional context for Claude..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={() => {
              if (contextInput.trim()) {
                injectContext(agentId, contextInput);
                setContextInput('');
              }
            }}
            disabled={isLoading || !contextInput.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Inject
          </button>
        </div>
      </div>

      {/* Session Control */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2">Session Control</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => pauseSession(agentId, 'Paused from dashboard')}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Pause
          </button>
          <button
            onClick={() => continueSession(agentId, 'Continue from dashboard')}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Pending Commands */}
      {pendingCommands.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-2">Pending Commands</h4>
          <div className="space-y-1">
            {pendingCommands.map((cmd) => (
              <div key={cmd.id} className="text-sm bg-gray-100 rounded p-2">
                <span className="font-medium">{cmd.type}</span>
                {cmd.reason && <span className="text-gray-600"> - {cmd.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```### React Client Remote Control Interface (`packages/client/src/hooks/useRemoteControl.ts`)

```typescript
import { useState } from 'react';
import axios from 'axios';

interface RemoteControlOptions {
  serverUrl: string;
  authToken?: string;
}

interface PendingCommand {
  id: string;
  agentId: string;
  type: 'approve' | 'deny' | 'context' | 'stop' | 'continue';
  reason?: string;
  sessionId?: string;
  toolName?: string;
  status: 'pending' | 'processed' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

export const useRemoteControl = ({ serverUrl, authToken }: RemoteControlOptions) => {
  const [pendingCommands, setPendingCommands] = useState<PendingCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiClient = axios.create({
    baseURL: serverUrl,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  const approveToolCall = async (agentId: string, options?: {
    sessionId?: string;
    toolName?: string;
    reason?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/commands/approve-tool', {
        agentId,
        ...options
      });
      await refreshPendingCommands(agentId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const denyToolCall = async (agentId: string, options?: {
    sessionId?: string;
    toolName?: string;
    reason?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/commands/deny-tool', {
        agentId,
        reason: options?.reason || 'Denied by remote user',
        ...options
      });
      await refreshPendingCommands(agentId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const injectContext = async (agentId: string, context: string, options?: {
    sessionId?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/commands/inject-context', {
        agentId,
        reason: context,
        ...options
      });
      await refreshPendingCommands(agentId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseSession = async (agentId: string, reason?: string, sessionId?: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/commands/pause-session', {
        agentId,
        sessionId,
        reason: reason || 'Paused by remote user'
      });
      await refreshPendingCommands(agentId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const continueSession = async (agentId: string, guidance?: string, sessionId?: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/commands/continue-session', {
        agentId,
        sessionId,
        reason: guidance || 'Continue as planned'
      });
      await refreshPendingCommands(agentId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPendingCommands = async (agentId: string) => {
    try {
      const response = await apiClient.get(`/api/commands/agent/${agentId}`);
      setPendingCommands(response.data.filter((cmd: PendingCommand) => cmd.status === 'pending'));
    } catch (error) {
      console.error('Failed to refresh pending commands:', error);
    }
  };

  return {
    pendingCommands,
    isLoading,
    approveToolCall,
    denyToolCall,
    injectContext,
    pauseSession,
    continueSession,
    refreshPendingCommands
  };
};
```

### React Client Hook Event Visualization (`packages/client/src/hooks/useHookEvents.ts`)# Claude Code Companion - Project Setup Prompt

## Overview
Create a NestJS project called "claude-code-companion" that implements a real-time dashboard for monitoring Claude Code CLI sessions remotely using Server-Sent Events (SSE). This system allows you to step away from your computer while Claude Code (the CLI tool) performs long-running tasks and monitor progress through a web-based dashboard accessible from any device.

**IMPORTANT**: This project does NOT use the Claude API or make HTTP calls to Anthropic. Instead, it wraps the locally-installed Claude Code CLI tool to capture and stream its stdout/stderr output to a remote dashboard. You interact with the actual Claude Code agent running on your local machine, not with API endpoints.

## Core Architecture

The system is now structured as a microsite with three main components:

### 1. **Agent Package** (`packages/agent/`)
- **Claude Code Hook Integration**: Uses Claude Code's native hooks system
- **Hook Command Generator**: Creates and manages hook commands for data collection
- **HTTP Client**: Sends hook event data to server via HTTP POST
- **Configuration Management**: Manages hook installation and server connection
- **Event Processing**: Processes hook data (PreToolUse, PostToolUse, Stop, Notification events)

### 2. **Server Package** (`packages/server/`)
- **NestJS API Server**: RESTful API with SSE endpoints
- **Hook Data Processing**: Handle incoming data from Claude Code hooks via HTTP
- **SSE Streaming**: Real-time streaming of hook events to connected clients
- **Authentication**: Secure agent and client connections

### 3. **Client Package** (`packages/client/`)
- **React SPA**: Modern dashboard built with React and TypeScript
- **Real-time Updates**: Server-Sent Events connection for live Claude Code activity monitoring
- **Hook Event Visualization**: Display PreToolUse, PostToolUse, Stop, and Notification events
- **Multi-Agent Support**: Monitor multiple machines with Claude Code hooks installed
- **Mobile Responsive**: Touch-friendly interface for all devices

## Technical Requirements

### Agent Dependencies
- `axios` - HTTP client for sending hook data to server
- `yargs` - Command line argument parsing
- `chalk` - Terminal colors and formatting
- `dotenv` - Environment configuration
- `uuid` - Unique identifier generation
- `fs-extra` - Enhanced file system operations
- `js-yaml` - YAML parsing for Claude settings

### Server Dependencies
- `@nestjs/core` - NestJS framework core
- `@nestjs/common` - Common NestJS utilities
- `@nestjs/platform-express` - Express platform adapter
- `nest-typed-config` - Type-safe configuration management
- `js-yaml` - YAML configuration parsing
- `class-validator` - Configuration validation
- `class-transformer` - Configuration transformation
- `rxjs` - Reactive extensions for SSE streaming
- `uuid` - Unique identifier generation
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token management

### Client Dependencies
- `react` - React framework
- `react-dom` - React DOM rendering
- `react-router-dom` - Client-side routing
- `@types/react` - React TypeScript types
- `@types/react-dom` - React DOM TypeScript types
- `axios` - HTTP client for API calls
- `tailwindcss` - Utility-first CSS framework
- `@headlessui/react` - Accessible UI components
- `@heroicons/react` - Icon library
- `react-hot-toast` - Toast notifications
- `zustand` - State management
- `vite` - Build tool and dev server

### Key Technologies
- **Claude Code Hooks**: Native integration with Claude Code's lifecycle events
- **Monorepo Structure**: PNPM workspace for managing multiple packages
- **Server-Sent Events (SSE)**: Real-time unidirectional communication for hook event streaming
- **HTTP API**: RESTful endpoints for agent registration and configuration
- **Hook Event Processing**: Capture and process PreToolUse, PostToolUse, Stop, and Notification events
- **React SPA**: Modern, responsive user interface
- **NestJS Microservice**: Scalable API server with SSE streaming
- **NPM Global Package**: Easy installation and deployment of the hook installer
- **TypeScript**: Full type safety across all packages
- **Tailwind CSS**: Utility-first styling for the React client
- **Mobile Responsive Design**: Works on phones, tablets, and desktops

## Project Structure

```
claude-code-companion/
├── packages/
│   ├── agent/                       # NPM-installable Claude Code hook installer
│   │   ├── src/
│   │   │   ├── agent.ts             # Main agent entry point
│   │   │   ├── hook-installer.ts    # Claude Code hook installation/management
│   │   │   ├── hook-commands.ts     # Generated hook shell commands
│   │   │   ├── websocket-client.ts  # WebSocket connection to server
│   │   │   ├── event-processor.ts   # Process hook events and data
│   │   │   ├── config.ts            # Agent configuration
│   │   │   └── types.ts             # Hook event type definitions
│   │   ├── hooks/
│   │   │   ├── pre-tool-use.sh      # PreToolUse hook script template
│   │   │   ├── post-tool-use.sh     # PostToolUse hook script template
│   │   │   ├── notification.sh      # Notification hook script template
│   │   │   └── stop.sh              # Stop hook script template
│   │   ├── bin/
│   │   │   └── claude-companion-agent.js # CLI executable
│   │   ├── package.json             # Agent package config
│   │   ├── tsconfig.json
│   │   └── README.md
│   ├── server/                      # NestJS API server
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── configuration.ts
│   │   │   │   ├── config.module.ts
│   │   │   │   └── validation.schema.ts
│   │   │   ├── hook-events/
│   │   │   │   ├── hook-events.service.ts    # Process incoming hook data
│   │   │   │   ├── hook-events.controller.ts # REST endpoints for hook data
│   │   │   │   ├── hook-events.gateway.ts    # WebSocket gateway for hooks
│   │   │   │   └── hook-events.module.ts
│   │   │   ├── agent/
│   │   │   │   ├── agent.service.ts          # Agent registration and management
│   │   │   │   ├── agent.controller.ts       # Agent endpoints
│   │   │   │   ├── agent.gateway.ts          # Agent WebSocket handling
│   │   │   │   └── agent.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   └── strategies/
│   │   │   │       └── jwt.strategy.ts
│   │   │   ├── common/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── filters/
│   │   │   │   └── decorators/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── config/
│   │   │   ├── development.yaml
│   │   │   ├── production.yaml
│   │   │   └── default.yaml
│   │   ├── test/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   └── client/                      # React SPA dashboard
│       ├── public/
│       │   ├── index.html
│       │   └── favicon.ico
│       ├── src/
│       │   ├── components/
│       │   │   ├── Dashboard/
│       │   │   │   ├── Dashboard.tsx
│       │   │   │   ├── Dashboard.module.css
│       │   │   │   └── index.ts
│       │   │   ├── HookEventsList/
│       │   │   │   ├── HookEventsList.tsx
│       │   │   │   ├── HookEventItem.tsx
│       │   │   │   └── index.ts
│       │   │   ├── ToolCallViewer/
│       │   │   │   ├── ToolCallViewer.tsx
│       │   │   │   ├── ToolCallViewer.module.css
│       │   │   │   └── index.ts
│       │   │   ├── AgentStatus/
│       │   │   │   ├── AgentStatus.tsx
│       │   │   │   └── index.ts
│       │   │   └── Layout/
│       │   │       ├── Header.tsx
│       │   │       ├── Sidebar.tsx
│       │   │       └── Layout.tsx
│       │   ├── hooks/
│       │   │   ├── useWebSocket.ts
│       │   │   ├── useAuth.ts
│       │   │   ├── useHookEvents.ts        # Hook for managing hook event data
│       │   │   └── useLocalStorage.ts
│       │   ├── services/
│       │   │   ├── api.ts                  # API client
│       │   │   ├── websocket.ts            # WebSocket service
│       │   │   └── auth.ts                 # Authentication service
│       │   ├── types/
│       │   │   ├── hook-events.ts          # Hook event types
│       │   │   ├── agent.ts
│       │   │   └── api.ts
│       │   ├── utils/
│       │   │   ├── constants.ts
│       │   │   └── helpers.ts
│       │   ├── App.tsx
│       │   ├── App.css
│       │   ├── index.tsx
│       │   └── index.css
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts           # Using Vite for faster development
│       └── tailwind.config.js       # Tailwind CSS configuration
├── docker/
│   ├── Dockerfile.server            # Server container
│   ├── Dockerfile.client            # Client container
│   └── docker-compose.yml           # Multi-service compose
├── scripts/
│   ├── setup.sh                     # Development setup
│   ├── build.sh                     # Build all packages
│   ├── deploy.sh                    # Production deployment
│   └── publish-agent.sh             # Publish agent to NPM
├── docs/
│   ├── setup.md
│   ├── deployment.md
│   └── architecture.md
├── package.json                     # Root workspace config
├── pnpm-workspace.yaml              # PNPM workspace configuration
├── tsconfig.base.json               # Base TypeScript config
├── .eslintrc.js                     # Shared ESLint config
├── .prettierrc                      # Shared Prettier config
└── README.md
```

## Core Features to Implement

### 1. Agent Package Features (`packages/agent/`)
- **Hook Installation**: Automatically install Claude Code hooks for monitoring
- **Hook Management**: Add, remove, and update hooks in Claude settings
- **Event Collection**: Capture PreToolUse, PostToolUse, Stop, and Notification events
- **Command Queue Integration**: Check server for pending remote commands before hook decisions
- **Remote Control**: Enable approve/deny tool calls and context injection from dashboard
- **HTTP Client**: Send hook event data and fetch commands from server via HTTP
- **Configuration Management**: Agent settings and server connection
- **Retry Logic**: Handle network interruptions gracefully with exponential backoff

### 2. Server Package Features (`packages/server/`)
- **Agent Registry**: Track connected agents and their hook configurations
- **Hook Event Processing**: Handle incoming data from Claude Code hooks via HTTP endpoints
- **Command Queue System**: Queue and manage remote commands for agents
- **SSE Gateway**: Real-time streaming of hook events to connected clients
- **REST API**: HTTP endpoints for client interactions, agent registration, and command management
- **Authentication**: JWT-based auth for clients and agents
- **Event History**: Optional database integration for hook event history

### 3. Client Package Features (`packages/client/`)
- **Dashboard Overview**: System status and agent monitoring
- **Hook Event Visualization**: Real-time display of Claude Code lifecycle events via SSE
- **Tool Call Monitoring**: Track PreToolUse and PostToolUse events with detailed data
- **Remote Control Interface**: Send approval/denial decisions and context to running Claude sessions
- **Command Queue Management**: View and manage pending commands for each agent
- **Agent Management**: View and manage connected agents and their hook status
- **Event Filtering**: Filter events by type, agent, tool, or time range
- **Responsive Design**: Optimized for desktop, tablet, and mobile

## Implementation Details

### Smart Hooks with Command Queue Architecture

Claude Code hooks provide deterministic control over Claude Code's behavior by executing shell commands at various lifecycle points. Our implementation extends this with a **command queue system** that enables remote control capabilities.

### Remote Control Flow

```
Dashboard → Send Command → Server Queue → Hook Checks Queue → Hook Decision → Claude Code
```

1. **Dashboard sends command** (approve/deny/context) via REST API
2. **Server queues command** for specific agent/session
3. **Hook executes and checks queue** before making decisions
4. **Hook returns appropriate response** to Claude Code
5. **Claude Code processes decision** and continues/stops/adjusts accordingly

### Hook Event Types and Remote Control

Claude Code provides four main hook events, each with remote control capabilities:

- **PreToolUse**: Check queue for approval/denial decisions before tool execution
- **PostToolUse**: Check queue for context/feedback to inject after tool completion  
- **Stop**: Check queue for continue/pause decisions when Claude wants to stop
- **Notification**: Monitor and optionally respond to Claude notifications

### Agent Hook Configuration (`packages/agent/src/hook-installer.ts`)

```typescript
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { AgentConfig } from './config';

export class HookInstaller {
  private claudeSettingsPath: string;

  constructor(private config: AgentConfig) {
    this.claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  }

  async installHooks(): Promise<void> {
    const settings = await this.loadClaudeSettings();
    
    // Install our companion hooks
    const companionHooks = this.generateCompanionHooks();
    
    settings.hooks = {
      ...settings.hooks,
      ...companionHooks
    };

    await this.saveClaudeSettings(settings);
    console.log('Claude Companion hooks installed successfully');
  }

  private generateCompanionHooks() {
    const serverUrl = this.config.serverUrl;
    const agentId = this.config.agentId;
    const authToken = this.config.authToken;

    return {
      "PreToolUse": [
        {
          "matcher": "", // Match all tools
          "hooks": [
            {
              "type": "command",
              "command": `node ${__dirname}/hook-commands.js pre-tool-use "${serverUrl}" "${agentId}" "${authToken}"`
            }
          ]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "",
          "hooks": [
            {
              "type": "command", 
              "command": `node ${__dirname}/hook-commands.js post-tool-use "${serverUrl}" "${agentId}" "${authToken}"`
            }
          ]
        }
      ],
      "Notification": [
        {
          "matcher": "",
          "hooks": [
            {
              "type": "command",
              "command": `node ${__dirname}/hook-commands.js notification "${serverUrl}" "${agentId}" "${authToken}"`
            }
          ]
        }
      ],
      "Stop": [
        {
          "matcher": "",
          "hooks": [
            {
              "type": "command",
              "command": `node ${__dirname}/hook-commands.js stop "${serverUrl}" "${agentId}" "${authToken}"`
            }
          ]
        }
      ]
    };
  }

  private async loadClaudeSettings(): Promise<any> {
    try {
      const settings = await fs.readJSON(this.claudeSettingsPath);
      return settings;
    } catch (error) {
      return { hooks: {} };
    }
  }

  private async saveClaudeSettings(settings: any): Promise<void> {
    await fs.ensureDir(path.dirname(this.claudeSettingsPath));
    await fs.writeJSON(this.claudeSettingsPath, settings, { spaces: 2 });
  }
}
```

### Enhanced Hook Command Implementation (`packages/agent/src/hook-commands.ts`)

```typescript
#!/usr/bin/env node
import axios from 'axios';

interface HookEventData {
  type: 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop';
  agentId: string;
  timestamp: string;
  data: any;
}

interface RemoteCommand {
  id: string;
  type: 'approve' | 'deny' | 'context' | 'stop' | 'continue';
  reason?: string;
  sessionId?: string;
  toolName?: string;
}

class HookCommand {
  constructor(
    private eventType: string,
    private serverUrl: string, 
    private agentId: string,
    private authToken: string
  ) {}

  async execute(): Promise<void> {
    try {
      // Read JSON data from stdin (provided by Claude Code)
      const stdinData = await this.readStdin();
      const hookData = JSON.parse(stdinData);

      // Create event data
      const eventData: HookEventData = {
        type: this.eventType as any,
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        data: hookData
      };

      // Send event to server
      await this.sendEventToServer(eventData);

      // Check for remote commands and handle them
      const decision = await this.checkForRemoteCommands(hookData);

      if (decision) {
        // Output JSON decision for Claude Code
        console.log(JSON.stringify(decision));
      } else {
        // Output success message
        console.log(`Hook event ${this.eventType} processed successfully`);
      }

      process.exit(0);

    } catch (error) {
      console.error(`Hook error: ${error.message}`);
      process.exit(1);
    }
  }

  private async checkForRemoteCommands(hookData: any): Promise<any> {
    try {
      const httpServerUrl = this.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      
      // Check for pending commands for this agent/session
      const response = await axios.get(`${httpServerUrl}/api/commands/pending`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Agent-Id': this.agentId
        },
        params: {
          sessionId: hookData.session_id,
          eventType: this.eventType,
          toolName: hookData.tool_input?.tool
        },
        timeout: 2000 // Quick check to avoid slowing down Claude
      });

      const commands: RemoteCommand[] = response.data;
      
      if (commands.length === 0) {
        return null;
      }

      // Process the first matching command
      const command = commands[0];
      
      // Mark command as processed
      await this.markCommandProcessed(command.id);

      // Return appropriate hook response based on event type and command
      return this.generateHookResponse(command);

    } catch (error) {
      // If command check fails, don't block Claude - just continue normally
      console.error(`Command check failed: ${error.message}`);
      return null;
    }
  }

  private generateHookResponse(command: RemoteCommand): any {
    switch (this.eventType) {
      case 'PreToolUse':
        if (command.type === 'approve') {
          return { 
            decision: 'approve',
            reason: command.reason || 'Approved remotely'
          };
        } else if (command.type === 'deny') {
          return {
            decision: 'block',
            reason: command.reason || 'Denied by remote user'
          };
        }
        break;

      case 'PostToolUse':
        if (command.type === 'context') {
          return {
            decision: 'block',
            reason: command.reason || 'Additional context from remote user'
          };
        }
        break;

      case 'Stop':
        if (command.type === 'continue') {
          return {
            decision: 'block',
            reason: command.reason || 'Continue as directed by remote user'
          };
        } else if (command.type === 'stop') {
          return {
            continue: false,
            stopReason: command.reason || 'Stopped by remote user'
          };
        }
        break;
    }

    return null;
  }

  private async sendEventToServer(eventData: HookEventData): Promise<void> {
    const httpServerUrl = this.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    await axios.post(`${httpServerUrl}/api/hook-events`, eventData, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'Agent-Id': this.agentId
      },
      timeout: 5000
    });
  }

  private async markCommandProcessed(commandId: string): Promise<void> {
    const httpServerUrl = this.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    await axios.post(`${httpServerUrl}/api/commands/${commandId}/processed`, {}, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Agent-Id': this.agentId
      },
      timeout: 2000
    });
  }

  private async readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      
      process.stdin.on('end', () => {
        resolve(data.trim());
      });
      
      process.stdin.on('error', reject);
    });
  }
}

// CLI execution
const [,, eventType, serverUrl, agentId, authToken] = process.argv;

if (!eventType || !serverUrl || !agentId || !authToken) {
  console.error('Usage: hook-commands.js <eventType> <serverUrl> <agentId> <authToken>');
  process.exit(1);
}

const hookCommand = new HookCommand(eventType, serverUrl, agentId, authToken);
hookCommand.execute().catch(console.error);
```

### Server Configuration Schema (`packages/server/src/config/configuration.ts`)

```typescript
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsBoolean, ValidateNested } from 'class-validator';

export class ServerConfig {
  @IsNumber()
  port: number = 3000;

  @IsNumber()
  wsPort: number = 3001;

  @IsString()
  host: string = '0.0.0.0';

  @IsBoolean()
  ssl: boolean = false;
}

export class AuthConfig {
  @IsBoolean()
  enabled: boolean = true;

  @IsString()
  jwtSecret: string;

  @IsString()
  agentApiKey?: string;

  @IsNumber()
  tokenExpiry: number = 86400; // 24 hours
}

export class Configuration {
  @ValidateNested()
  @Type(() => ServerConfig)
  server: ServerConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth: AuthConfig;
}
```

### Agent WebSocket Client (`packages/agent/src/websocket-client.ts`)

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { AgentConfig } from './config';

export class AgentWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private config: AgentConfig) {
    super();
  }

  connect(): void {
    this.ws = new WebSocket(this.config.serverUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Agent-Id': this.config.agentId
      }
    });

    this.ws.on('open', () => {
      console.log('Connected to server');
      this.emit('connected');
      this.clearReconnectTimeout();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.emit('message', message);
    });

    this.ws.on('close', () => {
      console.log('Disconnected from server');
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, this.config.reconnectInterval);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
```

### Server Command Queue API (`packages/server/src/commands/commands.controller.ts`)

```typescript
import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { AuthGuard } from '../auth/auth.guard';

interface CreateCommandDto {
  agentId: string;
  type: 'approve' | 'deny' | 'context' | 'stop' | 'continue';
  reason?: string;
  sessionId?: string;
  toolName?: string;
  expiresAt?: Date;
}

@Controller('api/commands')
@UseGuards(AuthGuard)
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  async createCommand(@Body() createCommandDto: CreateCommandDto) {
    return this.commandsService.createCommand(createCommandDto);
  }

  @Get('pending')
  async getPendingCommands(
    @Query('agentId') agentId: string,
    @Query('sessionId') sessionId?: string,
    @Query('eventType') eventType?: string,
    @Query('toolName') toolName?: string,
  ) {
    return this.commandsService.getPendingCommands({
      agentId,
      sessionId,
      eventType,
      toolName
    });
  }

  @Post(':id/processed')
  async markCommandProcessed(@Param('id') id: string) {
    return this.commandsService.markCommandProcessed(id);
  }

  @Get('agent/:agentId')
  async getCommandsForAgent(@Param('agentId') agentId: string) {
    return this.commandsService.getCommandsForAgent(agentId);
  }

  @Post('approve-tool')
  async approveToolCall(@Body() body: { agentId: string, sessionId?: string, toolName?: string, reason?: string }) {
    return this.commandsService.createCommand({
      ...body,
      type: 'approve'
    });
  }

  @Post('deny-tool')
  async denyToolCall(@Body() body: { agentId: string, sessionId?: string, toolName?: string, reason?: string }) {
    return this.commandsService.createCommand({
      ...body,
      type: 'deny'
    });
  }

  @Post('inject-context')
  async injectContext(@Body() body: { agentId: string, sessionId?: string, reason: string }) {
    return this.commandsService.createCommand({
      ...body,
      type: 'context'
    });
  }

  @Post('pause-session')
  async pauseSession(@Body() body: { agentId: string, sessionId?: string, reason?: string }) {
    return this.commandsService.createCommand({
      ...body,
      type: 'stop'
    });
  }

  @Post('continue-session')
  async continueSession(@Body() body: { agentId: string, sessionId?: string, reason?: string }) {
    return this.commandsService.createCommand({
      ...body,
      type: 'continue'
    });
  }
}
```

```typescript
import { useEffect, useRef, useState } from 'react';

interface HookEvent {
  id: string;
  type: 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop';
  agentId: string;
  timestamp: string;
  data: any;
}

interface UseHookEventsOptions {
  serverUrl: string;
  authToken?: string;
  autoConnect?: boolean;
}

export const useHookEvents = ({ serverUrl, authToken, autoConnect = true }: UseHookEventsOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [hookEvents, setHookEvents] = useState<HookEvent[]>([]);
  const [recentToolCalls, setRecentToolCalls] = useState<any[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [serverUrl, authToken, autoConnect]);

  const connect = () => {
    const url = new URL('/api/hook-events/stream', serverUrl);
    if (authToken) {
      url.searchParams.set('token', authToken);
    }

    eventSourceRef.current = new EventSource(url.toString());

    eventSourceRef.current.onopen = () => {
      setIsConnected(true);
    };

    eventSourceRef.current.onmessage = (event) => {
      const hookEvent: HookEvent = JSON.parse(event.data);
      
      setHookEvents(prev => [hookEvent, ...prev].slice(0, 1000)); // Keep last 1000 events
      
      // Track tool calls separately for easier visualization
      if (hookEvent.type === 'PreToolUse' || hookEvent.type === 'PostToolUse') {
        const toolCall = {
          id: hookEvent.data.session_id || hookEvent.id,
          tool: hookEvent.data.tool_input?.tool || 'unknown',
          type: hookEvent.type,
          timestamp: hookEvent.timestamp,
          agentId: hookEvent.agentId,
          data: hookEvent.data
        };
        
        setRecentToolCalls(prev => {
          const existing = prev.find(tc => tc.id === toolCall.id);
          if (existing) {
            return prev.map(tc => tc.id === toolCall.id ? { ...tc, ...toolCall } : tc);
          }
          return [toolCall, ...prev].slice(0, 100);
        });
      }
    };

    eventSourceRef.current.onerror = () => {
      setIsConnected(false);
      // EventSource will automatically attempt to reconnect
    };

    // Fetch initial agents list
    fetchAgents();
  };

  const disconnect = () => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/agents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const agentsData = await response.json();
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const getEventsByAgent = (agentId: string) => {
    return hookEvents.filter(event => event.agentId === agentId);
  };

  const getEventsByType = (type: HookEvent['type']) => {
    return hookEvents.filter(event => event.type === type);
  };

  const getToolCallsInProgress = () => {
    return recentToolCalls.filter(tc => tc.type === 'PreToolUse' && 
      !recentToolCalls.some(ptc => ptc.id === tc.id && ptc.type === 'PostToolUse'));
  };

  return {
    isConnected,
    agents,
    hookEvents,
    recentToolCalls,
    connect,
    disconnect,
    getEventsByAgent,
    getEventsByType,
    getToolCallsInProgress,
    fetchAgents
  };
};
```

## NestJS Module Structure

### App Module (`app.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from './config/config.module';
import { ClaudeModule } from './claude/claude.module';
import { ProcessModule } from './process/process.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
    ClaudeCliModule,
    SessionModule,
    AuthModule,
    DashboardModule,
  ],
})
export class AppModule {}
```

### Configuration Module (`config/config.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { TypedConfigModule, dotenvLoader, selectConfig } from 'nest-typed-config';
import { Configuration } from './configuration';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

const yamlLoader = selectConfig((path) => {
  const configPath = join(process.cwd(), 'config', `${process.env.NODE_ENV || 'development'}.yaml`);
  const config = yaml.load(readFileSync(configPath, 'utf8')) as Record<string, any>;
  return config;
});

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: Configuration,
      load: [dotenvLoader, yamlLoader],
    }),
  ],
})
export class ConfigModule {}
```

## Security Considerations

### NestJS Guards and Interceptors
- **Authentication Guards**: Protect all API endpoints
- **Rate Limiting**: Use NestJS throttler module
- **Input Validation**: Class-validator for all DTOs
- **CORS Configuration**: Proper cross-origin settings

### Process Security
- **Sandbox Claude Code**: Use proper process isolation
- **Resource Limits**: CPU and memory constraints
- **Error Sanitization**: Prevent information leakage
- **Audit Logging**: Track all operations

## Environment Setup

### Development Configuration (`config/development.yaml`)

```yaml
server:
  port: 3000
  host: "0.0.0.0"
  ssl: false

claudeCli:
  cliPath: "claude"
  defaultWorkingDir: "${PWD}"
  maxConcurrentSessions: 2
  sessionTimeout: 1800000
  enablePty: true

auth:
  enabled: false  # Disabled for development
  username: "dev"
  password: "dev"

logging:
  level: "debug"
  enableConsole: true
  enableFile: false
```

### Production Configuration (`config/production.yaml`)

```yaml
server:
  port: ${PORT:3000}
  host: "0.0.0.0"
  ssl: true

claudeCli:
  cliPath: "claude"
  defaultWorkingDir: "/app/workspace"
  maxConcurrentSessions: 5
  sessionTimeout: 3600000
  enablePty: true

auth:
  enabled: true
  username: "${AUTH_USERNAME}"
  password: "${AUTH_PASSWORD}"
  sessionTimeout: 3600000

logging:
  level: "info"
  enableConsole: false
  enableFile: true
  filename: "/var/log/claude-companion/app.log"
```

## Installation & Setup Instructions

### Prerequisites
- Node.js 18+ installed
- PNPM package manager (`npm install -g pnpm`)
- Claude Code CLI installed and authenticated
- Git for cloning the repository

### Quick Start

#### 1. Setup Development Environment
```bash
# Clone or create the project
git clone <your-repo-url> claude-code-companion
cd claude-code-companion

# Install dependencies for all packages
pnpm install

# Run initial setup script
pnpm run setup

# Start all services in development mode
pnpm run dev
```

#### 2. Install Agent and Configure Hooks (Production Use)
```bash
# Build and publish the agent package
cd packages/agent
pnpm build
npm publish

# Install globally on any machine
npm install -g claude-companion-agent

# Configure and install hooks
claude-companion-agent install \
  --server-url ws://your-server:3001 \
  --auth-token your-token

# Verify hooks are installed
claude-companion-agent status
```

#### 3. Deploy Server and Client
```bash
# Build all packages
pnpm run build

# Deploy using Docker
docker-compose up -d

# Or deploy individually
cd packages/server && npm start
cd packages/client && npm run preview
```

### Hook Installation Process

The agent installs hooks into Claude Code's settings file (`~/.claude/settings.json`):

```bash
# Install hooks with default configuration
claude-companion-agent install

# Install with custom server
claude-companion-agent install --server-url wss://my-dashboard.com:3001

# Check hook status
claude-companion-agent status

# Uninstall hooks
claude-companion-agent uninstall

# Update hooks configuration
claude-companion-agent update --auth-token new-token
```

### Package-Specific Setup

#### Agent Package (`packages/agent/`)
```bash
cd packages/agent

# Development
pnpm dev

# Build
pnpm build

# Test locally
node dist/agent.js --help
```

#### Server Package (`packages/server/`)
```bash
cd packages/server

# Development with hot reload
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod

# Configuration
cp config/development.yaml.example config/development.yaml
# Edit configuration files as needed
```

#### Client Package (`packages/client/`)
```bash
cd packages/client

# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Usage Examples

### Remote Control Capabilities

With the Smart Hooks + Command Queue approach, you can now remotely control Claude Code sessions:

### Agent Hook Installation
```bash
# Install globally
npm install -g claude-companion-agent

# Install hooks with command queue support
claude-companion-agent install \
  --server-url https://dashboard.company.com:3001 \
  --auth-token your-jwt-token \
  --enable-remote-control

# The hooks will now check for remote commands before making decisions
```

### Remote Control from Dashboard

When Claude Code is running and encounters tool calls, you can:

#### 1. **Approve/Deny Tool Calls**
```bash
# Via API
curl -X POST http://localhost:3000/api/commands/approve-tool \
  -H "Authorization: Bearer user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev-machine-1", "toolName": "Bash", "reason": "Approved - safe command"}'

curl -X POST http://localhost:3000/api/commands/deny-tool \
  -H "Authorization: Bearer user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev-machine-1", "toolName": "Write", "reason": "Please backup the file first"}'
```

#### 2. **Inject Context Mid-Session**
```bash
# Add guidance or context
curl -X POST http://localhost:3000/api/commands/inject-context \
  -H "Authorization: Bearer user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev-machine-1", "reason": "Remember to follow our coding standards from docs/style-guide.md"}'
```

#### 3. **Pause/Continue Sessions**
```bash
# Pause Claude when it wants to stop (force it to continue)
curl -X POST http://localhost:3000/api/commands/continue-session \
  -H "Authorization: Bearer user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev-machine-1", "reason": "Please also update the tests"}'

# Stop a session immediately
curl -X POST http://localhost:3000/api/commands/pause-session \
  -H "Authorization: Bearer user-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev-machine-1", "reason": "Need to review before continuing"}'
```

### Real-World Remote Control Scenarios

#### Scenario 1: Approval Workflow
```bash
# Claude Code is running: "Help me refactor this authentication system"
# Claude wants to run: `rm -rf old_auth/`

# Hook triggers, you see it in dashboard:
# "PreToolUse: Bash - rm -rf old_auth/"

# From dashboard, you can:
# ✅ Approve: "Good to proceed, old auth is deprecated" 
# ❌ Deny: "Let's backup first: tar -czf old_auth_backup.tar.gz old_auth/"
```

#### Scenario 2: Context Injection
```bash
# Claude is working on a complex refactor
# You notice it's missing something important

# Inject context:
# "Also make sure to update the migration files in db/migrations/"

# Claude receives this as feedback and incorporates it into the next steps
```

#### Scenario 3: Session Control  
```bash
# Claude finishes a task and wants to stop
# But you want it to continue with related work

# Send continue command:
# "Great work! Now please also update the documentation to reflect these changes"

# Claude continues with the additional guidance
```

### Client Dashboard Usage
```typescript
// React component for remote control
function ClaudeControlDashboard() {
  const { toolCallsInProgress } = useHookEvents({ serverUrl, authToken });
  const { approveToolCall, denyToolCall, injectContext } = useRemoteControl({ serverUrl, authToken });

  return (
    <div>
      {toolCallsInProgress.map(toolCall => (
        <div key={toolCall.id} className="tool-call-pending">
          <h3>{toolCall.tool}</h3>
          <p>{toolCall.data.tool_input?.command}</p>
          
          <button onClick={() => approveToolCall(toolCall.agentId, {
            toolName: toolCall.tool,
            reason: 'Looks safe to proceed'
          })}>
            ✅ Approve
          </button>
          
          <button onClick={() => denyToolCall(toolCall.agentId, {
            toolName: toolCall.tool,
            reason: 'Please add error handling first'
          })}>
            ❌ Deny & Provide Feedback
          </button>
        </div>
      ))}
      
      <input 
        placeholder="Inject context..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            injectContext('dev-machine-1', e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
```

## Docker Deployment

### Multi-Service Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  server:
    build:
      context: ..
      dockerfile: docker/Dockerfile.server
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - AGENT_API_KEY=${AGENT_API_KEY}
    volumes:
      - ./packages/server/config:/app/config:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: [ "CMD", "curl", "-f", "http://localhost:3000/health" ]
      interval: 30s
      timeout: 10s
      retries: 3

  client:
    build:
      context: ..
      dockerfile: docker/Dockerfile.client
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:3000
      - VITE_WS_URL=ws://localhost:3001
    depends_on:
      - server
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - server
      - client
    restart: unless-stopped

volumes:
  logs:
```

### Server Dockerfile (`docker/Dockerfile.server`)
```dockerfile
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/server ./packages/server
COPY tsconfig.base.json ./

# Build the server
WORKDIR /app/packages/server
RUN pnpm build

EXPOSE 3000 3001

CMD ["pnpm", "start:prod"]
```

### Client Dockerfile (`docker/Dockerfile.client`)
```dockerfile
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/client ./packages/client
COPY tsconfig.base.json ./

# Build the client
WORKDIR /app/packages/client
RUN pnpm build

# Production stage with nginx
FROM nginx:alpine
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Testing Strategy

#### Agent Package Tests
```typescript
// packages/agent/src/__tests__/cli-wrapper.test.ts
describe('ClaudeCliWrapper', () => {
  let wrapper: ClaudeCliWrapper;

  beforeEach(() => {
    wrapper = new ClaudeCliWrapper({
      claudeCliPath: 'claude',
      workspaceDir: '/tmp',
      enablePty: true
    });
  });

  it('should start Claude CLI process', async () => {
    const session = await wrapper.startSession('test prompt');
    expect(session.id).toBeDefined();
    expect(session.status).toBe('running');
  });

  it('should capture CLI output', (done) => {
    const session = wrapper.startSession('help');
    session.on('output', (data) => {
      expect(data.stream).toMatch(/stdout|stderr/);
      expect(data.content).toBeDefined();
      done();
    });
  });
});
```

#### Server Package Tests
```typescript
// packages/server/src/agent/agent.service.spec.ts
describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentService],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should register a new agent', async () => {
    const agent = await service.registerAgent({
      agentId: 'test-agent',
      capabilities: ['claude-cli']
    });
    expect(agent.id).toBe('test-agent');
    expect(agent.status).toBe('connected');
  });

  it('should route session to available agent', async () => {
    const sessionRequest = {
      workingDir: '/tmp',
      prompt: 'test'
    };
    const session = await service.createSession(sessionRequest);
    expect(session.agentId).toBeDefined();
  });
});
```

#### Client Package Tests
```typescript
// packages/client/src/hooks/__tests__/useWebSocket.test.ts
import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

describe('useWebSocket', () => {
  it('should connect to WebSocket server', () => {
    const { result } = renderHook(() => useWebSocket({
      serverUrl: 'ws://localhost:3001',
      authToken: 'test-token'
    }));

    expect(result.current.isConnected).toBe(false);
    // Add more connection tests
  });
});
```

#### Integration Tests
```typescript
// test/e2e/full-workflow.test.ts
describe('Full Workflow (e2e)', () => {
  it('should complete agent-server-client workflow', async () => {
    // 1. Start mock agent
    const agent = new MockAgent();
    await agent.connect();

    // 2. Make API request to start session
    const response = await request(app.getHttpServer())
      .post('/api/sessions/start')
      .send({ prompt: 'test', workingDir: '/tmp' })
      .expect(201);

    // 3. Verify session was created on agent
    expect(agent.activeSessions).toHaveLength(1);

    // 4. Verify WebSocket events are emitted
    // Add WebSocket testing logic
  });
});
```

## Development Guidelines

### NestJS Best Practices
- **Modular Architecture**: Separate concerns into modules
- **Dependency Injection**: Use NestJS DI container
- **Guards and Interceptors**: Cross-cutting concerns
- **DTOs and Validation**: Input validation and transformation
- **Exception Filters**: Centralized error handling

### Code Quality
- **TypeScript**: Full type safety throughout
- **ESLint + Prettier**: Code formatting and linting
- **Unit Tests**: Test all services and controllers
- **E2E Tests**: Integration testing

## Monitoring & Health Checks

### Health Check Endpoint
```typescript
@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

### Logging Integration
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class ProcessService {
  private readonly logger = new Logger(ProcessService.name);

  async createTask(createTaskDto: CreateTaskDto) {
    this.logger.log(`Creating task: ${createTaskDto.prompt}`);
    // Implementation
  }
}
```

## Deployment Checklist

- [ ] Configuration files created for all environments
- [ ] Environment variables configured
- [ ] SSL certificates installed (production)
- [ ] Health check endpoint implemented
- [ ] Logging configured
- [ ] Docker images built and tested
- [ ] Authentication properly configured
- [ ] Performance testing completed
- [ ] Security audit performed

## Future Enhancements

### Agent Enhancements
- **Multi-Claude Version Support**: Support different Claude CLI versions
- **Plugin System**: Extensible architecture for custom CLI tools
- **Resource Monitoring**: CPU, memory, disk usage tracking
- **Auto-Updates**: Automatic agent updates via NPM
- **Health Monitoring**: Agent health checks and diagnostics
- **Backup Sessions**: Session state persistence and recovery

### Server Enhancements
- **Multi-tenancy**: Support for multiple organizations/teams
- **Role-based Access Control**: Fine-grained permissions
- **Session Analytics**: Usage metrics and performance monitoring
- **Load Balancing**: Distribute sessions across multiple agents
- **Database Integration**: PostgreSQL/MongoDB for session persistence
- **API Rate Limiting**: Prevent abuse and ensure fair usage
- **Webhook Integrations**: Notify external systems of session events

### Client Enhancements
- **Advanced Terminal**: Full terminal emulation with scrollback
- **Session Sharing**: Share sessions with team members
- **Session Templates**: Pre-configured session templates
- **Dark/Light Theme**: User preference theming
- **Mobile App**: Native iOS/Android apps
- **Collaboration**: Real-time collaborative sessions
- **Session Recording**: Record and replay sessions
- **Advanced Search**: Search through session history
- **Notification System**: Push notifications for session events

### Infrastructure Enhancements
- **Kubernetes Deployment**: Container orchestration
- **Monitoring Stack**: Prometheus, Grafana, AlertManager
- **Log Aggregation**: ELK stack or similar
- **Security Scanning**: Vulnerability assessment and remediation
- **CI/CD Pipeline**: Automated testing and deployment
- **Multi-region Deployment**: Geographic distribution
- **Backup and Recovery**: Automated backup strategies
- **Performance Optimization**: Caching, CDN, optimization

### Integration Enhancements
- **IDE Plugins**: VSCode, JetBrains, Vim extensions
- **Slack/Teams Integration**: Bot commands and notifications
- **GitHub Integration**: Automated PR creation and review
- **Jira Integration**: Link sessions to tickets
- **Calendar Integration**: Schedule and manage sessions
- **Single Sign-On**: SAML, OIDC, OAuth integration

---

**Note**: This microsite architecture leverages Claude Code's native hooks system for seamless integration. The hooks provide deterministic control and rich event data, making this approach much more reliable than process wrapping. The agent installs hooks that capture Claude Code lifecycle events and streams them to a remote dashboard, enabling comprehensive monitoring of AI-powered development workflows.