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
    // Parse tool data from Claude Code
    const toolData = parseStdinData();
    
    // Create session ID (in real implementation, we might maintain session state)
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
    const event: HookEvent = {
      agentId,
      sessionId,
      hookType: 'pre_tool_use',
      timestamp: new Date().toISOString(),
      data: {
        toolName: toolData.tool,
        toolArgs: toolData.args,
        rawInput: toolData,
      },
    };

    // Send event to server and get response
    const response = await sendHookEvent(serverUrl, agentId, event, token);
    
    // Output response to Claude Code
    outputHookResponse(response);

  } catch (error) {
    // On error, approve by default to avoid blocking Claude
    outputHookResponse({ 
      approved: true, 
      reason: 'Hook execution error, proceeding' 
    });
  }
}

main();