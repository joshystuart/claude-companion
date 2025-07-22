#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: notification.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // Parse notification data from Claude Code
    const notificationData = parseStdinData();
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
    const event: HookEvent = {
      agentId,
      sessionId,
      hookType: 'notification',
      timestamp: new Date().toISOString(),
      data: {
        message: notificationData.message || 'Claude notification',
        rawInput: notificationData,
      },
    };

    // Send event to server
    const response = await sendHookEvent(serverUrl, agentId, event, token);
    
    // Notification hooks typically just acknowledge
    outputHookResponse({ approved: true });

  } catch (error) {
    // On error, just acknowledge
    outputHookResponse({ approved: true });
  }
}

main();