#!/usr/bin/env node

import { 
  sendHookEvent, 
  parseStdinData, 
  outputHookResponse, 
  generateSessionId,
  checkForPendingCommands,
  markCommandAsProcessing,
  completeCommand,
  checkForInterrupt
} from '../utils/hook-utils';
import { HookEvent, HookResponse } from '../types';
import { getAgentContext } from '../utils/context';
import { Logger } from '../utils/logger';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  Logger.stop.info('Hook started', { serverUrl, agentId: agentId, hasToken: !!token });

  if (!serverUrl || !agentId) {
    Logger.stop.error('Missing required arguments', { serverUrl, agentId });
    console.error('Usage: stop.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    Logger.stop.debug('Getting agent context');
    // Get enhanced agent context
    const context = getAgentContext();
    Logger.stop.info('Agent context retrieved', { 
      agentId: context.agentId, 
      computerName: context.computerName, 
      workingDirectory: context.workingDirectory 
    });
    
    Logger.stop.debug('Checking for interrupt commands');
    // PRIORITY 1: Check for interrupt commands immediately
    const interruptCommands = await checkForInterrupt(serverUrl, context.agentId, token);
    if (interruptCommands.length > 0) {
      const interruptCmd = interruptCommands[0];
      Logger.stop.info('Processing interrupt command', { commandId: interruptCmd.id, reason: interruptCmd.payload.reason });
      
      await markCommandAsProcessing(serverUrl, interruptCmd.id, token);
      await completeCommand(serverUrl, interruptCmd.id, 'completed', 'Interrupted at stop', token);
      
      const response = {
        approved: true, // For stop hook, interrupt means stop immediately
        reason: interruptCmd.payload.reason || 'Execution interrupted from dashboard',
        feedback: 'Claude execution was interrupted by user request'
      };
      
      Logger.stop.info('Returning interrupt response', response);
      outputHookResponse(response);
      return;
    }

    Logger.stop.debug('No interrupt commands found, parsing stop data');
    // Parse stop data from Claude Code
    const stopData = parseStdinData();
    Logger.stop.info('Received stop data');
    Logger.stop.debug('Raw stop data captured', { rawInput: stopData });
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    Logger.stop.debug('Session ID established', { sessionId });
    
    const event: HookEvent = {
      agentId: context.agentId, // Use auto-generated agent ID
      sessionId,
      hookType: 'stop',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Claude session stopping',
        rawInput: stopData,
        // Enhanced context
        computerId: context.computerId,
        computerName: context.computerName,
        hostname: context.hostname,
        platform: context.platform,
        agentName: context.agentName,
        workingDirectory: context.workingDirectory,
      },
    };

    Logger.stop.info('Sending event to server', { 
      hookType: event.hookType, 
      message: event.data.message,
      agentId: event.agentId 
    });
    
    // Send event to server first (for monitoring)
    await sendHookEvent(serverUrl, context.agentId, event, token);
    Logger.stop.debug('Event sent successfully');
    
    Logger.stop.debug('Starting session control phase');
    // Phase 2: Check for session control commands (continue/stop)
    const finalResponse = await processSessionControl(serverUrl, context.agentId, sessionId, token);
    
    Logger.stop.info('Final response determined', finalResponse);
    // Output response (might include continue instructions)
    outputHookResponse(finalResponse);

  } catch (error) {
    Logger.stop.error('Hook execution failed', error);
    
    const fallbackResponse = { approved: true };
    Logger.stop.warn('Returning fallback response due to error', fallbackResponse);
    // On error, allow Claude to stop normally
    outputHookResponse(fallbackResponse);
  }
}

async function processSessionControl(
  serverUrl: string,
  agentId: string,
  sessionId: string,
  token?: string,
  maxWaitTime = 5000 // 5 seconds max wait for stop hook
): Promise<HookResponse> {
  const startTime = Date.now();
  Logger.stop.debug('Starting session control loop', { maxWaitTime, sessionId });
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      Logger.stop.debug('Checking for pending session control commands');
      // Check for pending commands
      const pendingCommands = await checkForPendingCommands(serverUrl, agentId, token);
      
      if (pendingCommands.length > 0) {
        Logger.stop.info('Found pending commands', { count: pendingCommands.length });
        // Process session control commands
        for (const command of pendingCommands) {
          if (command.sessionId === sessionId || !command.sessionId) {
            if (command.type === 'continue' || command.type === 'stop' || command.type === 'interrupt') {
              Logger.stop.info('Processing session control command', { 
                commandId: command.id, 
                type: command.type, 
                commandSessionId: command.sessionId 
              });
              
              // Mark command as processing
              await markCommandAsProcessing(serverUrl, command.id, token);
              Logger.stop.debug('Command marked as processing', { commandId: command.id });
              
              // Process the command
              const response = executeSessionCommand(command);
              Logger.stop.info('Session command executed', { commandId: command.id, response });
              
              // Mark command as completed
              await completeCommand(serverUrl, command.id, 'completed', 'Executed by stop hook', token);
              Logger.stop.debug('Command marked as completed', { commandId: command.id });
              
              return response;
            }
          }
        }
        Logger.stop.debug('No matching session control commands found for session', { sessionId });
      }
      
      // Wait a bit before checking again
      await sleep(500); // 500ms
      
    } catch (error) {
      Logger.stop.error('Session control checking failed', error);
      // If command checking fails, allow stop
      break;
    }
  }
  
  const elapsed = Date.now() - startTime;
  Logger.stop.info('Session control finished', { 
    elapsed, 
    reason: elapsed >= maxWaitTime ? 'timeout' : 'no_commands' 
  });
  
  // No commands found or timeout - allow Claude to stop
  return {
    approved: true,
    reason: 'No session control commands, proceeding with stop',
  };
}

function executeSessionCommand(command: any): HookResponse {
  Logger.stop.debug('Executing session command', { type: command.type, commandId: command.id });
  
  switch (command.type) {
    case 'continue':
      Logger.stop.info('Continue session requested', { reason: command.payload.reason });
      return {
        approved: false, // false means don't stop, continue running
        reason: command.payload.reason || 'Continue session requested',
        feedback: command.payload.instructions || command.payload.feedback,
      };
      
    case 'stop':
      Logger.stop.info('Stop session confirmed remotely', { reason: command.payload.reason });
      return {
        approved: true, // true means stop the session
        reason: command.payload.reason || 'Stop session confirmed',
        feedback: command.payload.feedback,
      };

    case 'interrupt':
      Logger.stop.info('Session interrupted remotely', { reason: command.payload.reason });
      return {
        approved: true, // true means stop immediately
        reason: command.payload.reason || 'Session interrupted',
        feedback: 'Claude execution was interrupted by user request',
      };
      
    default:
      Logger.stop.warn('Unknown session command type, defaulting to stop', { type: command.type });
      return {
        approved: true,
        reason: 'Unknown command type, proceeding with stop',
      };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();