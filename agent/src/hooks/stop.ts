#!/usr/bin/env node

import { 
  sendHookEvent, 
  parseStdinData, 
  outputHookResponse, 
  generateSessionId,
  checkForPendingCommands,
  markCommandAsProcessing,
  completeCommand
} from '../utils/hook-utils';
import { HookEvent, HookResponse } from '../types';

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

    // Send event to server first (for monitoring)
    await sendHookEvent(serverUrl, agentId, event, token);
    
    // Phase 2: Check for session control commands (continue/stop)
    const finalResponse = await processSessionControl(serverUrl, agentId, sessionId, token);
    
    // Output response (might include continue instructions)
    outputHookResponse(finalResponse);

  } catch (error) {
    // On error, allow Claude to stop normally
    outputHookResponse({ approved: true });
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
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check for pending commands
      const pendingCommands = await checkForPendingCommands(serverUrl, agentId, token);
      
      if (pendingCommands.length > 0) {
        // Process session control commands
        for (const command of pendingCommands) {
          if (command.sessionId === sessionId || !command.sessionId) {
            if (command.type === 'continue' || command.type === 'stop') {
              // Mark command as processing
              await markCommandAsProcessing(serverUrl, command.id, token);
              
              // Process the command
              const response = executeSessionCommand(command);
              
              // Mark command as completed
              await completeCommand(serverUrl, command.id, 'completed', 'Executed by stop hook', token);
              
              return response;
            }
          }
        }
      }
      
      // Wait a bit before checking again
      await sleep(500); // 500ms
      
    } catch (error) {
      // If command checking fails, allow stop
      break;
    }
  }
  
  // No commands found or timeout - allow Claude to stop
  return {
    approved: true,
    reason: 'No session control commands, proceeding with stop',
  };
}

function executeSessionCommand(command: any): HookResponse {
  switch (command.type) {
    case 'continue':
      return {
        approved: false, // false means don't stop, continue running
        reason: command.payload.reason || 'Continue session requested',
        feedback: command.payload.instructions || command.payload.feedback,
      };
      
    case 'stop':
      return {
        approved: true, // true means stop the session
        reason: command.payload.reason || 'Stop session confirmed',
        feedback: command.payload.feedback,
      };
      
    default:
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