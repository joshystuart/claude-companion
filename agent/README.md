# AFK Agent

NPM-installable hook installer for AFK: Away From Klaude monitoring. This package installs lightweight hooks into Claude Code's settings to enable remote monitoring of your AI development sessions while you're AFK.

## 🚀 Quick Installation

### Global Installation

```bash
npm install -g afk-agent
```

### Setup Hooks

```bash
# Connect to hosted dashboard
afk-agent install --server-url https://afk.example.com

# Or connect to local development server
afk-agent install --server-url http://localhost:3000
```

### Verify Installation

```bash
afk-agent status
```

## 📋 Commands

### `install`
Installs Claude Code hooks for monitoring.

```bash
afk-agent install [options]
```

**Options:**
- `-s, --server-url <url>` - Server URL for hook events (default: http://localhost:3000)
- `-a, --agent-id <id>` - Unique agent identifier (auto-generated if not provided)  
- `-t, --token <token>` - Authentication token (optional in Phase 1)

**Example:**
```bash
afk-agent install --server-url https://dashboard.company.com --agent-id my-dev-machine
```

### `status`
Check installation status and configuration.

```bash
afk-agent status
```

**Output:**
- ✅ Installed: Shows server URL and agent ID
- ⚠️ Not installed: Instructions to set up

### `uninstall`
Remove Claude Code hooks.

```bash
afk-agent uninstall
```

This removes all hooks from `~/.claude/settings.json` and cleans up configuration files.

## 🔧 How It Works

### Hook Installation Process

1. **Locates Claude Code settings** at `~/.claude/settings.json`
2. **Installs hook commands** for each lifecycle event:
   - `pre_tool_use` - Before Claude executes any tool
   - `post_tool_use` - After a tool completes
   - `stop` - When Claude finishes a task
   - `notification` - When Claude sends notifications

3. **Creates configuration** at `~/.claude/companion.json`

### Hook Execution Flow

```
Claude Code Event → Hook Command → HTTP POST → Dashboard Server → Real-time Stream → Dashboard Client
```

Each hook:
- Executes in < 2 seconds (Claude Code requirement)
- Sends event data to your configured server
- Always allows Claude to proceed (never blocks development)
- Handles network failures gracefully

### Generated Hook Commands

The installer creates shell commands like:

```bash
node "/usr/local/lib/node_modules/afk-agent/dist/hooks/pre-tool-use.js" \
  "https://dashboard.company.com" \
  "my-agent-id" \
  "optional-auth-token"
```

## 🏗️ Development & Testing

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/afk-away-from-klaude.git
cd afk-away-from-klaude/agent

# Install dependencies
npm install

# Build the package
npm run build

# Link for local testing
npm link

# Test installation
afk-agent install --server-url http://localhost:3000
```

### Package Structure

```
agent/
├── src/
│   ├── cli.ts              # Main CLI interface
│   ├── installer.ts        # Hook installation logic
│   ├── types.ts           # TypeScript definitions
│   ├── hooks/             # Individual hook commands
│   │   ├── pre-tool-use.ts
│   │   ├── post-tool-use.ts
│   │   ├── stop.ts
│   │   └── notification.ts
│   └── utils/
│       └── hook-utils.ts   # Shared hook utilities
├── bin/
│   └── afk-agent  # Executable script
└── package.json
```

## 🔍 Troubleshooting

### Common Issues

**"Command not found: afk-agent"**
- Ensure global installation: `npm install -g afk-agent`
- Check npm global path: `npm config get prefix`
- Try reinstalling: `npm uninstall -g claude-companion-agent && npm install -g afk-agent`

**"No Claude settings.json found"**
- Run Claude Code at least once to create `~/.claude/` directory
- Check path: `ls -la ~/.claude/settings.json`

**"Hook execution timeout"**
- Check server connectivity: `curl -X GET https://your-server.com/api/auth/status`
- Verify network access from your development environment
- Check firewall/proxy settings

**"Events not appearing in dashboard"**
- Verify agent status: `afk-agent status`
- Check server logs for incoming hook events
- Test hook execution: Run a simple Claude Code command

### Debug Hook Execution

For debugging, you can manually test hook commands:

```bash
# Test pre-tool-use hook
echo '{"tool":"Read","args":{"file_path":"test.txt"}}' | \
node /usr/local/lib/node_modules/afk-agent/dist/hooks/pre-tool-use.js \
  http://localhost:3000 your-agent-id
```

### Configuration Files

**Hook configuration**: `~/.claude/settings.json`
```json
{
  "hooks": {
    "pre_tool_use": "node /path/to/afk-agent/dist/hooks/pre-tool-use.js ...",
    "post_tool_use": "...",
    "stop": "...",
    "notification": "..."
  }
}
```

**Agent configuration**: `~/.claude/companion.json`
```json
{
  "serverUrl": "http://localhost:3000",
  "agentId": "your-agent-id",
  "token": "optional-token"
}
```

## 🔒 Security & Privacy

### Data Transmission
- Hook events contain tool names, arguments, and results
- No sensitive code content is transmitted by default
- Authentication tokens are optional in Phase 1

### Network Security
- Uses HTTPS when connecting to remote servers
- Validates server certificates
- Implements connection timeouts and retry logic

### Local Security
- Configuration files stored in user's home directory
- Uses standard npm global installation paths
- No elevated privileges required

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

---

Part of the [AFK: Away From Klaude](../README.md) monitoring system.