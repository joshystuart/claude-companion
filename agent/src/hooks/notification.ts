#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';
import { getAgentContext } from '../utils/context';
import { Logger } from '../utils/logger';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  Logger.notification.info('Hook started', { serverUrl, agentId: agentId, hasToken: !!token });

  if (!serverUrl || !agentId) {
    Logger.notification.error('Missing required arguments', { serverUrl, agentId });
    console.error('Usage: notification.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    Logger.notification.debug('Parsing notification data');
    // Parse notification data from Claude Code
    const notificationData = parseStdinData();
    Logger.notification.info('Received notification', { 
      message: notificationData.message,
      hasMessage: !!notificationData.message
    });
    Logger.notification.debug('Raw notification data captured', { rawInput: notificationData });
    
    Logger.notification.debug('Getting agent context');
    // Get enhanced agent context
    const context = getAgentContext();
    Logger.notification.info('Agent context retrieved', { 
      agentId: context.agentId, 
      computerName: context.computerName, 
      workingDirectory: context.workingDirectory 
    });
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    Logger.notification.debug('Session ID established', { sessionId });
    
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

    Logger.notification.info('Sending event to server', { 
      hookType: event.hookType, 
      message: event.data.message,
      agentId: event.agentId 
    });
    
    // Send event to server
    const response = await sendHookEvent(serverUrl, context.agentId, event, token);
    Logger.notification.debug('Event sent successfully');
    
    const finalResponse = { approved: true };
    Logger.notification.info('Returning acknowledgment', finalResponse);
    
    // Notification hooks typically just acknowledge
    outputHookResponse(finalResponse);

  } catch (error) {
    Logger.notification.error('Hook execution failed', error);
    
    const fallbackResponse = { approved: true };
    Logger.notification.warn('Returning fallback response due to error', fallbackResponse);
    // On error, just acknowledge
    outputHookResponse(fallbackResponse);
  }
}

main();