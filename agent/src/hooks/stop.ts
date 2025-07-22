#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: stop.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // Parse stop data from Claude Code
    const stopData = parseStdinData();
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
    const event: HookEvent = {
      agentId,
      sessionId,
      hookType: 'stop',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Claude session stopping',
        rawInput: stopData,
      },
    };

    // Send event to server and potentially get continuation commands
    const response = await sendHookEvent(serverUrl, agentId, event, token);
    
    // Output response (might include continue instructions for Phase 2)
    outputHookResponse(response);

  } catch (error) {
    // On error, allow Claude to stop normally
    outputHookResponse({ approved: true });
  }
}

main();