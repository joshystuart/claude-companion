#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: pre-tool-use.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // Debug: Log that hook was called
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Pre-tool-use hook called with args: ${process.argv.slice(2).join(', ')}\n`);
    
    // Parse tool data from Claude Code
    const toolData = parseStdinData();
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Parsed tool data: ${JSON.stringify(toolData)}\n`);
    
    // Create session ID (in real implementation, we might maintain session state)
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
    const event: HookEvent = {
      agentId,
      sessionId,
      hookType: 'pre_tool_use',
      timestamp: new Date().toISOString(),
      data: {
        toolName: toolData.tool_name,
        toolArgs: toolData.tool_input,
        sessionId: toolData.session_id,
        transcriptPath: toolData.transcript_path,
        cwd: toolData.cwd,
        rawInput: toolData,
      },
    };

    // Log event before sending
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Sending event: ${JSON.stringify(event)}\n`);
    
    // Send event to server and get response
    const response = await sendHookEvent(serverUrl, agentId, event, token);
    
    // Log response
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Received response: ${JSON.stringify(response)}\n`);
    
    // Output response to Claude Code
    outputHookResponse(response);

  } catch (error) {
    // Log error details for debugging
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      args: process.argv.slice(2),
      timestamp: new Date().toISOString()
    };
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[ERROR] ${JSON.stringify(errorDetails, null, 2)}\n`);
    
    // On error, approve by default to avoid blocking Claude
    outputHookResponse({ 
      approved: true, 
      reason: 'Hook execution error, proceeding' 
    });
  }
}

main();