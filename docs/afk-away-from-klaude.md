# AFK: Away From Klaude - Project Overview

## The Problem

When using Claude Code for complex, long-running tasks, developers face a common dilemma: they want to step away from their computer but need to monitor progress and potentially intervene when Claude requires approval or guidance. Currently, there's no way to:

- **Monitor Claude Code sessions remotely** while away from your development machine
- **Approve or deny tool calls** from your phone or another device
- **Inject context or guidance** mid-session when you notice Claude needs direction
- **Control session flow** (pause, continue, or redirect) from anywhere

This forces developers to stay tethered to their development environment, limiting productivity and flexibility.

## The Solution: AFK: Away From Klaude

A **remote monitoring and control system** for Claude Code that leverages Claude's native **hooks system** to provide real-time visibility and control over AI-powered development workflows from any device. The name "AFK" is a playful take on "Away From Keyboard" - but here you're "Away From Klaude" while still maintaining full control.

### Core Value Proposition

**"Go AFK while staying in control - monitor and manage your Claude Code sessions from anywhere"**

## Why This Approach Works

### Leveraging Claude Code Hooks

Claude Code provides a powerful **hooks system** that executes shell commands at key lifecycle points:

- **PreToolUse**: Before Claude executes any tool (file operations, shell commands, etc.)
- **PostToolUse**: After a tool completes successfully
- **Stop**: When Claude finishes a task and wants to stop
- **Notification**: When Claude sends notifications or requests input

**Key Insight**: Hooks can not only monitor but also **control** Claude's behavior by returning JSON decisions that approve, deny, or provide feedback on Claude's intended actions.

### Smart Command Queue Architecture

Instead of wrapping Claude's process (complex and fragile), we use hooks that:

1. **Send event data** to our server (what Claude is doing)
2. **Check for remote commands** from the dashboard
3. **Return decisions** to Claude based on remote input
4. **Enable remote control** through Claude's native mechanisms

## System Architecture

### Three-Package Monorepo Structure

```
afk-away-from-klaude/
├── agent/          # NPM-installable hook installer
├── server/         # NestJS API server + real-time streaming
└── client/         # React dashboard for monitoring/control
```

### 1. Agent Package (`./agent`)
**Globally installable NPM package** that sets up Claude Code hooks for monitoring and remote control.

**What it does:**
- Installs hooks into Claude Code's settings (`~/.claude/settings.json`)
- Hooks capture tool usage data and send to server
- Hooks check server for remote commands before making decisions
- Returns appropriate responses to Claude Code based on remote input

**Installation:**
```bash
npm install -g afk-agent
afk-agent install --server-url https://your-dashboard.com
```

### 2. Server Package (`./server`)
**NestJS-based API server** that handles hook data and provides real-time streaming to clients.

**What it does:**
- Receives hook event data via HTTP POST from agents
- Maintains command queue for remote control
- Streams events to dashboard clients via Server-Sent Events (SSE)
- Provides REST API for command management
- Handles authentication and multi-agent coordination

### 3. Client Package (`./client`)
**React SPA dashboard** for monitoring and controlling Claude Code sessions remotely.

**What it does:**
- Real-time visualization of hook events across all agents
- Remote control interface for approving/denying tool calls
- Context injection capabilities for mid-session guidance
- Session control (pause, continue, redirect)
- Mobile-responsive design for phone/tablet access

## Key Features & Use Cases

### 1. Real-Time Monitoring
**Problem**: "Is Claude still working on my refactoring task?"

**Solution**: Live dashboard showing:
- All active tool calls across your machines
- Progress updates as hooks fire
- Session status and current activities
- Historical event timeline

### 2. Remote Approval Workflow
**Problem**: "Claude wants to delete files but I'm not at my computer to approve"

**Solution**: 
- PreToolUse hook captures the intended action
- Dashboard shows pending approval request
- You approve/deny from your phone with optional feedback
- Hook returns decision to Claude Code

**Example Flow:**
```
Claude: Wants to run `rm -rf old_auth/`
↓
Hook: Captures action, checks server for commands
↓  
Dashboard: Shows "Delete old_auth/ directory?" 
↓
You: Tap "Deny - backup first: tar -czf backup.tar.gz old_auth/"
↓
Hook: Returns denial with feedback to Claude
↓
Claude: Processes feedback and suggests backup approach
```

### 3. Context Injection
**Problem**: "Claude is missing important context I just thought of"

**Solution**:
- Send guidance from dashboard: *"Remember to update the migration files"*
- PostToolUse hook delivers this as feedback to Claude
- Claude incorporates the context into subsequent actions

### 4. Session Control
**Problem**: "Claude finished the task but I want it to continue with related work"

**Solution**:
- Stop hook prevents Claude from ending the session
- Returns guidance: *"Great! Now please update the documentation"*
- Claude continues with additional instructions

### 5. Multi-Machine Coordination
**Problem**: "I have Claude Code running on multiple development machines"

**Solution**:
- Single dashboard monitors all agents
- Filter by machine, project, or session type  
- Coordinate workflows across your entire development environment

## Technical Implementation

### Hook Integration Strategy

**Agent hooks are lightweight shell commands** that:

```bash
# Example PreToolUse hook command
node /usr/local/lib/node_modules/afk-agent/hook-commands.js \
  pre-tool-use \
  "https://dashboard.company.com" \
  "dev-machine-1" \
  "auth-token-here"
```

**Hook execution flow:**
1. Claude Code calls hook with JSON data via stdin
2. Hook sends event data to server via HTTP POST
3. Hook checks server for pending remote commands
4. Hook returns JSON decision to Claude Code
5. Claude processes decision and proceeds accordingly

### Communication Architecture

**Agent → Server**: HTTP POST (hook events, reliable and fast)
**Server → Client**: Server-Sent Events (real-time updates, auto-reconnection)  
**Client → Server**: REST API (commands, configuration, authentication)

**Why this combination:**
- **HTTP POST**: Perfect for hooks (fast, reliable, timeout-friendly)
- **SSE**: Ideal for real-time dashboard updates (unidirectional, auto-reconnect)
- **REST API**: Standard for command/control operations

### Remote Command Types

**Approval Commands:**
```json
{"type": "approve", "reason": "Safe to proceed"}
{"type": "deny", "reason": "Please backup first"}
```

**Context Commands:**
```json
{"type": "context", "reason": "Also update the tests in /spec"}
```

**Session Commands:**
```json
{"type": "continue", "reason": "Now update documentation"}
{"type": "stop", "reason": "Pausing for review"}
```

## Development Roadmap

### Phase 1: Core Monitoring (MVP)
- [ ] Agent package with basic hook installation
- [ ] Server with hook event collection and SSE streaming  
- [ ] Client dashboard with real-time event visualization
- [ ] Basic authentication and multi-agent support

**Deliverable**: Monitor Claude Code sessions remotely in real-time

### Phase 2: Remote Control
- [ ] Command queue system in server
- [ ] Enhanced hooks with command checking and decision logic
- [ ] Client remote control interface (approve/deny, context injection)
- [ ] Session control capabilities (pause/continue)

**Deliverable**: Full remote control of Claude Code sessions

### Phase 3: Advanced Features
- [ ] Session templates and automation
- [ ] Advanced filtering and search
- [ ] Mobile app for push notifications
- [ ] Integration with Slack/Teams for notifications
- [ ] Session recording and playback

**Deliverable**: Enterprise-ready Claude Code management platform

## Success Metrics

### Developer Productivity
- **Reduced context switching**: Monitor multiple Claude sessions without staying at computer
- **Faster approval workflows**: Approve tool calls from anywhere in <30 seconds
- **Better session outcomes**: Inject context to prevent Claude from going off-track

### System Reliability  
- **<2 second hook execution time**: Hooks don't slow down Claude Code
- **99.9% uptime**: Reliable monitoring even during network issues
- **Auto-recovery**: System handles disconnections gracefully

### User Adoption
- **<5 minute setup time**: From npm install to working dashboard
- **Cross-platform compatibility**: Works on all Claude Code installations
- **Minimal configuration**: Sensible defaults, optional customization

## Why This Will Be Valuable

### Immediate Benefits
1. **Freedom to step away** while Claude works on complex tasks
2. **Faster iteration cycles** through remote approval and guidance
3. **Reduced errors** from better monitoring and context injection
4. **Better resource utilization** across multiple development machines

### Long-term Value
1. **Foundation for AI workflow automation** in development teams
2. **Audit trail and analytics** for AI-assisted development
3. **Collaboration capabilities** for team-based AI development
4. **Integration platform** for enterprise development workflows

## Getting Started

### For Claude Code Users
```bash
# Install the agent
npm install -g afk-agent

# Set up hooks pointing to hosted dashboard  
afk-agent install --server-url https://afk.dev

# Or run your own server locally
git clone afk-away-from-klaude
cd afk-away-from-klaude && pnpm install && pnpm dev
afk-agent install --server-url http://localhost:3000
```

### For Teams/Organizations
- Deploy server package to your infrastructure
- Configure authentication (SSO, LDAP, etc.)
- Set up monitoring and alerting
- Integrate with existing development workflows

---

**This is more than just a monitoring tool - it's the foundation for a new paradigm in AI-assisted development where you have complete visibility and control over your AI agents, from anywhere.**