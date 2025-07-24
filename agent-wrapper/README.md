# Claude Agent Wrapper

A simple Node.js application that wraps the Claude CLI process to capture and log all interactions.

## Features

- Spawns and wraps the `claude` CLI command
- Captures all stdout and stderr from Claude
- Logs all interactions to both console and file
- Handles user input prompts automatically
- Graceful shutdown and cleanup
- Forwards all command line arguments to Claude

## Usage

```bash
# Run with no arguments (interactive mode)
node index.js

# Run with Claude CLI arguments
node index.js --help
node index.js --version
node index.js "your prompt here"

# Or use npm script
npm start
```

## Logging

All interactions are logged to:
- **Console**: Real-time output with timestamps
- **File**: `claude-session.log` in the same directory

Log format: `[timestamp] [type] message`

Log types:
- `INFO`: Wrapper status messages
- `CLAUDE_OUT`: Claude's stdout output
- `CLAUDE_ERR`: Claude's stderr output  
- `USER_IN`: User input captured
- `EXIT`: Process termination
- `ERROR`: Error messages
- `SIGNAL`: Signal handling
- `CLEANUP`: Cleanup operations

## How it Works

1. Spawns the `claude` process with all provided arguments
2. Sets up readline interfaces for both Claude's output and user input
3. Monitors Claude's output for input prompts using pattern matching
4. When a prompt is detected, captures user input and forwards it to Claude
5. Logs all interactions with timestamps and type indicators
6. Handles process termination and cleanup gracefully

## Input Prompt Detection

The wrapper automatically detects when Claude is asking for input by looking for common patterns:
- Lines ending with `?`
- Lines ending with `:`
- Lines ending with `>`
- Text containing "press enter", "continue?", "(y/n)", "[y/n]"

## Signal Handling

The wrapper properly handles:
- `SIGINT` (Ctrl+C)
- `SIGTERM`
- Process cleanup and log file closure