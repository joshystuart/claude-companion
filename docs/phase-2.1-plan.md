# Phase 2.1: Multi-Agent Organization & Session Management

## Problem Statement

Currently, the dashboard shows all events from all Claude agents in a single stream, making it difficult to:
- Distinguish between different Claude sessions on the same computer
- Separate work from different repositories/projects
- Manage multiple agents across different computers
- Understand which events belong to which specific workflow

## Proposed Solution: Hierarchical Organization

Implement a **Computers → Agents → Sessions** hierarchy to provide clear separation and organization.

### Architecture Overview

```
Computer (e.g., "Josh's MacBook Pro")
├── Agent: claude-work-project-a (repo: /Users/josh/work/project-a)
│   ├── Session: 2024-01-15-morning (active)
│   └── Session: 2024-01-14-afternoon (completed)
└── Agent: claude-personal-project-b (repo: /Users/josh/personal/project-b)
    ├── Session: 2024-01-15-evening (active)
    └── Session: 2024-01-13-weekend (completed)
```

## Implementation Plan

### 1. Data Model Enhancements

**Note**: Phase 2.1 will use in-memory storage. These data models are designed to be database-ready for Phase 3 migration.

#### In-Memory Storage Architecture
```typescript
// Server will maintain these collections in memory
class InMemoryStore {
  private computers: Map<string, Computer> = new Map();
  private agents: Map<string, Agent> = new Map();
  private sessions: Map<string, Session> = new Map();
  private events: Map<string, HookEvent[]> = new Map(); // sessionId -> events[]
  
  // Methods will mimic future database operations for easy migration
}
```

#### Computer Entity
```typescript
interface Computer {
  id: string;           // Generated unique ID
  name: string;         // User-friendly name (e.g., "Josh's MacBook Pro")
  hostname: string;     // System hostname
  platform: string;    // darwin, linux, win32
  lastSeen: string;     // ISO timestamp
  agents: Agent[];      // Related agents (populated via lookup)
}
```

#### Enhanced Agent Entity
```typescript
interface Agent {
  id: string;           // Deterministic ID (e.g., "josh-macbook-a3f2c1d8")
  computerId: string;   // Reference to Computer
  name: string;         // Auto-detected (e.g., "claude-companion")
  workingDirectory: string; // Current repo/project path
  status: 'active' | 'idle' | 'offline';
  lastActivity: string; // ISO timestamp
  currentSessionId?: string;
  sessions: Session[];  // Related sessions (populated via lookup)
}
```

#### Session Entity
```typescript
interface Session {
  id: string;           // Unique session ID
  agentId: string;      // Reference to Agent
  name: string;         // Auto-generated or user-provided
  startTime: string;    // ISO timestamp
  endTime?: string;     // ISO timestamp (null if active)
  status: 'active' | 'completed' | 'interrupted';
  workingDirectory: string; // Directory at session start
  eventCount: number;   // Number of events in this session
  events: HookEvent[];  // Related events (populated via lookup)
}
```

#### Phase 3 Migration Considerations
- Design APIs to be repository-pattern ready
- Use service layer abstraction for data access
- Keep foreign key relationships explicit
- Structure data for easy database normalization

### 2. Agent Configuration Updates

#### Enhanced Installer
- **Computer Detection**: Automatically detect hostname, platform, and generate computer ID
- **Agent Context Detection**: Automatically derive agent ID and name from working context
- **Session Auto-Generation**: Create unique session IDs for each Claude instance
- **Idempotent Agent IDs**: Generate consistent IDs based on context for restart resilience

#### Installation Command Enhancement
```bash
# Current
claude-companion-agent install --server-url http://localhost:3000 --agent-id josh-mac

# Enhanced (minimal required params)
claude-companion-agent install \
  --server-url http://localhost:3000 \
  --computer-name "Josh's MacBook Pro"  # Optional, defaults to hostname

# Advanced (with overrides if needed)
claude-companion-agent install \
  --server-url http://localhost:3000 \
  --computer-name "Josh's MacBook Pro" \
  --agent-id-override custom-id  # Only for special cases
```

#### Automatic Context Detection

**Agent ID Generation (Idempotent)**
```typescript
// Generate deterministic agent ID based on context
function generateAgentId(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  const workingDir = process.cwd();
  
  // Use git repo root if available
  const gitRoot = findGitRoot(workingDir);
  const contextPath = gitRoot || workingDir;
  
  // Create stable hash of context
  const contextHash = crypto
    .createHash('sha256')
    .update(`${hostname}:${username}:${contextPath}`)
    .digest('hex')
    .substring(0, 8);
    
  // Human-readable format: username-hostname-contexthash
  return `${username}-${hostname.split('.')[0]}-${contextHash}`;
}
// Example: "josh-macbook-a3f2c1d8"
```

**Agent Name Generation**
```typescript
function generateAgentName(): string {
  const workingDir = process.cwd();
  
  // Priority order for name detection:
  // 1. Git repository name
  const gitRepoName = getGitRepoName(workingDir);
  if (gitRepoName) return gitRepoName;
  
  // 2. Package.json name (for Node projects)
  const packageName = getPackageJsonName(workingDir);
  if (packageName) return packageName;
  
  // 3. Directory name
  return path.basename(workingDir);
}
// Example: "claude-companion" or "ecommerce-app"
```

**Session ID Generation**
```typescript
function generateSessionId(): string {
  // Unique per Claude instance
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `session-${timestamp}-${random}`;
}
// Example: "session-1704567890123-a3f2c1d8"
```

### 3. Server API Enhancements

#### New Endpoints
```typescript
// Computer management
GET /api/computers                    // List all computers
GET /api/computers/:id/agents         // List agents for computer
POST /api/computers                   // Register new computer

// Enhanced agent management  
GET /api/agents/by-computer/:computerId   // List agents by computer
PUT /api/agents/:id/status               // Update agent status
PUT /api/agents/:id/session             // Start/end sessions

// Session management
GET /api/sessions/by-agent/:agentId     // List sessions for agent
POST /api/sessions                      // Create new session
PUT /api/sessions/:id/end              // End session
GET /api/sessions/:id/events           // Get events for session
```

#### Enhanced Event Ingestion
- **Session Auto-Creation**: Automatically create new sessions when agents start
- **Session Auto-Closure**: Close sessions after inactivity timeout
- **Directory Change Detection**: Create new sessions when working directory changes
- **Enhanced Event Context**: Include session and computer context in all events

### 4. Dashboard UI Overhaul

#### Hierarchical Navigation
```
┌─ Sidebar Navigation ─────────────────┐
│ 🖥️ Josh's MacBook Pro               │
│   └─ 🤖 Work Project A (active)     │
│       ├─ 📋 Morning Session         │
│       └─ 📋 Afternoon Session       │
│   └─ 🤖 Personal Project B (idle)   │
│       └─ 📋 Evening Session         │
│                                     │
│ 🖥️ Josh's Ubuntu Server             │
│   └─ 🤖 Deploy Agent (offline)      │
└─────────────────────────────────────┘
```

#### Enhanced Event Views
- **Session-Scoped Events**: Show events only for the selected session
- **Multi-Session Overview**: Compare activity across sessions
- **Agent Status Indicators**: Real-time status for each agent
- **Working Directory Display**: Show current repo/project context

#### Command Targeting
- **Session-Specific Commands**: Send commands to specific sessions
- **Agent-Wide Commands**: Send commands to all sessions of an agent
- **Broadcast Commands**: Send commands to all agents on a computer

#### Connection Resilience
- **Connection Status Indicator**: Visual indicator showing server connection status
- **Automatic Reconnection**: Auto-reconnect with exponential backoff when connection lost
- **Offline Queue**: Buffer commands and actions while disconnected
- **Reconnection Notifications**: Alert user when connection is restored
- **Data Sync**: Fetch missed events after reconnection

### 5. Session Management Logic

#### Automatic Session Creation
- **New Claude Instance**: Create session when new Claude process detected
- **Directory Change**: Create session when agent changes working directory
- **Manual Trigger**: Allow users to manually start new sessions

#### Session Lifecycle
- **Active**: Currently receiving events
- **Idle**: No events for 10 minutes, but Claude still running
- **Completed**: Claude process ended normally
- **Interrupted**: Session ended via interrupt command

### 6. Enhanced Agent Discovery

#### Smart Agent Identification
```typescript
// Generate contextual agent IDs
const agentId = `${username}-${hostname}-${projectName}`;
// e.g., "josh-macbook-ecommerce-app"
```

#### Project Detection
- **Git Repository**: Use repo name if in git directory
- **Package.json**: Use package name for Node.js projects
- **Directory Name**: Fallback to directory name
- **Manual Override**: Allow users to specify project context

### 7. Connection Resilience Implementation

#### SSE Reconnection Strategy
```typescript
class EventStreamManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30 seconds max
  
  connect() {
    this.eventSource = new EventSource('/api/events');
    
    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
    };
    
    this.eventSource.onerror = () => {
      this.updateConnectionStatus('disconnected');
      this.scheduleReconnect();
    };
  }
  
  private scheduleReconnect() {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
```

#### Offline Command Queue
```typescript
interface QueuedCommand {
  command: RemoteCommand;
  timestamp: number;
  retries: number;
}

class OfflineCommandQueue {
  private queue: QueuedCommand[] = [];
  
  enqueue(command: RemoteCommand) {
    this.queue.push({
      command,
      timestamp: Date.now(),
      retries: 0
    });
  }
  
  async flush() {
    // Send all queued commands when reconnected
    for (const item of this.queue) {
      try {
        await sendCommand(item.command);
        this.queue = this.queue.filter(q => q !== item);
      } catch (error) {
        item.retries++;
        if (item.retries > 3) {
          // Discard after 3 retries
          this.queue = this.queue.filter(q => q !== item);
        }
      }
    }
  }
}
```

#### Connection Status UI
```typescript
// React component for connection status
const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useServerConnection();
  
  return (
    <div className={`connection-status ${connectionStatus}`}>
      {connectionStatus === 'connected' ? (
        <span>🟢 Connected</span>
      ) : connectionStatus === 'reconnecting' ? (
        <span>🟡 Reconnecting...</span>
      ) : (
        <span>🔴 Disconnected</span>
      )}
    </div>
  );
};
```

### 8. Migration Strategy

#### Phase 2.1.1: Backend Infrastructure
1. Create in-memory storage service with database-ready interfaces
2. Implement new API endpoints using repository pattern
3. Add backward compatibility for existing agents
4. Design data structures for easy Phase 3 database migration

#### Phase 2.1.2: Agent Updates
1. Update hook utilities to send enhanced context
2. Add computer and session detection logic
3. Implement graceful session management
4. Update installer with new options

#### Phase 2.1.3: Dashboard Redesign
1. Implement hierarchical navigation
2. Create session-scoped views
3. Add enhanced command targeting
4. Implement real-time status updates

#### Phase 2.1.4: Testing & Rollout
1. Test with multiple agents on single computer
2. Test with agents across multiple computers
3. Verify session transitions and lifecycle
4. Performance testing with high event volumes

## Success Criteria

### Functional Requirements
- ✅ Clear separation of events by computer/agent/session
- ✅ Ability to control specific sessions independently
- ✅ Automatic session creation and management
- ✅ Real-time status updates for all levels of hierarchy
- ✅ Backward compatibility with existing installations

### User Experience Goals
- **Clarity**: Users can immediately understand which Claude session generated which events
- **Control**: Users can target commands to specific sessions or agents
- **Context**: Users see working directory and project context for each session
- **Scalability**: Dashboard remains usable with many computers/agents/sessions

### Technical Requirements
- **Performance**: Sub-100ms response times for navigation
- **Real-time**: Status updates within 2 seconds
- **Reliability**: No event loss during session transitions
- **Compatibility**: Works with existing agent installations

## Implementation Priority

### High Priority
- [ ] In-memory storage implementation with DB-ready interfaces
- [ ] Enhanced event ingestion with session context
- [ ] Basic hierarchical API endpoints
- [ ] Agent session auto-creation logic
- [ ] Connection resilience with auto-reconnect

### Medium Priority
- [ ] Dashboard hierarchical navigation
- [ ] Session-scoped event views
- [ ] Enhanced agent installer
- [ ] Command targeting improvements
- [ ] Offline command queue implementation

### Low Priority
- [ ] Advanced session management features
- [ ] Performance optimizations
- [ ] Migration tooling
- [ ] Documentation updates

This enhancement will transform the Claude Companion from a single-stream monitoring tool into a comprehensive multi-agent management platform.