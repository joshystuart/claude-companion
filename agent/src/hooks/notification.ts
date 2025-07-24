#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';
import { getAgentContext } from '../utils/context';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: notification.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // Parse notification data from Claude Code
    const notificationData = parseStdinData();
    
    // DEBUG: Log raw notification data
    console.log('=== NOTIFICATION HOOK DEBUG ===');
    console.log('Raw notification data:', JSON.stringify(notificationData, null, 2));
    console.log('Message:', notificationData.message);
    console.log('===============================');
    
    // Get enhanced agent context
    const context = getAgentContext();
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
    const event: HookEvent = {
      agentId: context.agentId, // Use auto-generated agent ID
      sessionId,
      hookType: 'notification',
      timestamp: new Date().toISOString(),
      data: {
        message: notificationData.message || 'Claude notification',
        rawInput: notificationData,
        // Enhanced context
        computerId: context.computerId,
        computerName: context.computerName,
        hostname: context.hostname,
        platform: context.platform,
        agentName: context.agentName,
        workingDirectory: context.workingDirectory,
      },
    };

    // Send event to server
    const response = await sendHookEvent(serverUrl, context.agentId, event, token);
    
    // Notification hooks typically just acknowledge
    outputHookResponse({ approved: true });

  } catch (error) {
    // On error, just acknowledge
    outputHookResponse({ approved: true });
  }
}

main();