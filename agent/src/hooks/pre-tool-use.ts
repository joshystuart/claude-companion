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

  Logger.preToolUse.info('Hook started', { serverUrl, agentId: agentId, hasToken: !!token });

  if (!serverUrl || !agentId) {
    Logger.preToolUse.error('Missing required arguments', { serverUrl, agentId });
    console.error('Usage: pre-tool-use.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    Logger.preToolUse.debug('Checking for interrupt commands');
    // PRIORITY 1: Check for interrupt commands immediately
    const interruptCommands = await checkForInterrupt(serverUrl, agentId, token);
    if (interruptCommands.length > 0) {
      const interruptCmd = interruptCommands[0];
      Logger.preToolUse.info('Processing interrupt command', { commandId: interruptCmd.id, reason: interruptCmd.payload.reason });
      
      await markCommandAsProcessing(serverUrl, interruptCmd.id, token);
      await completeCommand(serverUrl, interruptCmd.id, 'completed', 'Interrupted execution', token);
      
      const response = {
        approved: false,
        reason: interruptCmd.payload.reason || 'Execution interrupted from dashboard',
        feedback: 'Claude execution was interrupted by user request'
      };
      
      Logger.preToolUse.info('Returning interrupt response', response);
      outputHookResponse(response);
      return;
    }

    Logger.preToolUse.debug('No interrupt commands found, parsing tool data');
    
    // Parse tool data from Claude Code
    const toolData = parseStdinData();
    Logger.preToolUse.info('Received tool data', { 
      toolName: toolData.tool_name, 
      sessionId: toolData.session_id,
      cwd: toolData.cwd,
      transcriptPath: toolData.transcript_path
    });
    Logger.preToolUse.debug('Raw tool input captured', { rawInput: toolData });
    
    Logger.preToolUse.debug('Getting agent context');
    // Get enhanced agent context
    const context = getAgentContext();
    Logger.preToolUse.info('Agent context retrieved', { 
      agentId: context.agentId, 
      computerName: context.computerName, 
      workingDirectory: context.workingDirectory 
    });
    
    // Create session ID (in real implementation, we might maintain session state)
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    Logger.preToolUse.debug('Session ID established', { sessionId });
    
    const event: HookEvent = {
      agentId: context.agentId, // Use auto-generated agent ID
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
        // Enhanced context
        computerId: context.computerId,
        computerName: context.computerName,
        hostname: context.hostname,
        platform: context.platform,
        agentName: context.agentName,
        workingDirectory: context.workingDirectory,
      },
    };

    Logger.preToolUse.info('Sending event to server', { 
      hookType: event.hookType, 
      toolName: event.data.toolName,
      agentId: event.agentId 
    });
    
    // Send event to server first (for monitoring)
    await sendHookEvent(serverUrl, context.agentId, event, token);
    Logger.preToolUse.debug('Event sent successfully');
    
    Logger.preToolUse.debug('Starting command checking phase');
    // Phase 2: Check for pending commands and process them
    const finalResponse = await processWithCommandChecking(serverUrl, context.agentId, sessionId, token);
    
    Logger.preToolUse.info('Final response determined', finalResponse);
    
    // Output response to Claude Code
    outputHookResponse(finalResponse);

  } catch (error) {
    Logger.preToolUse.error('Hook execution failed', error);
    
    // On error, approve by default to avoid blocking Claude
    const fallbackResponse = { 
      approved: true, 
      reason: 'Hook execution error, proceeding' 
    };
    Logger.preToolUse.warn('Returning fallback response due to error', fallbackResponse);
    outputHookResponse(fallbackResponse);
  }
}

async function processWithCommandChecking(
  serverUrl: string,
  agentId: string,
  sessionId: string,
  token?: string,
  maxWaitTime = 30000 // 30 seconds max wait
): Promise<HookResponse> {
  const startTime = Date.now();
  Logger.preToolUse.debug('Starting command checking loop', { maxWaitTime, sessionId });
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      Logger.preToolUse.debug('Checking for pending commands');
      // Check for pending commands
      const pendingCommands = await checkForPendingCommands(serverUrl, agentId, token);
      
      if (pendingCommands.length > 0) {
        Logger.preToolUse.info('Found pending commands', { count: pendingCommands.length });
        // Process the first relevant command
        for (const command of pendingCommands) {
          if (command.sessionId === sessionId || !command.sessionId) {
            Logger.preToolUse.info('Processing matching command', { 
              commandId: command.id, 
              type: command.type, 
              commandSessionId: command.sessionId 
            });
            
            // Mark command as processing
            await markCommandAsProcessing(serverUrl, command.id, token);
            Logger.preToolUse.debug('Command marked as processing', { commandId: command.id });
            
            // Process the command
            const response = await executeCommand(command);
            Logger.preToolUse.info('Command executed', { commandId: command.id, response });
            
            // Mark command as completed
            await completeCommand(serverUrl, command.id, 'completed', 'Executed by hook', token);
            Logger.preToolUse.debug('Command marked as completed', { commandId: command.id });
            
            return response;
          }
        }
        Logger.preToolUse.debug('No matching commands found for session', { sessionId });
      }
      
      // Wait a bit before checking again (but not too long to keep hook fast)
      await sleep(500); // 500ms
      
    } catch (error) {
      // If command checking fails, default to approval
      Logger.preToolUse.error('Command checking failed', error);
      break;
    }
  }
  
  const elapsed = Date.now() - startTime;
  Logger.preToolUse.info('Command checking finished', { 
    elapsed, 
    reason: elapsed >= maxWaitTime ? 'timeout' : 'no_commands' 
  });
  
  // No commands found or timeout - default approval
  return {
    approved: true,
    reason: 'No remote commands, proceeding',
  };
}

function executeCommand(command: any): HookResponse {
  Logger.preToolUse.debug('Executing command', { type: command.type, commandId: command.id });
  
  switch (command.type) {
    case 'approve':
      Logger.preToolUse.info('Command approved remotely', { reason: command.payload.reason });
      return {
        approved: true,
        reason: command.payload.reason || 'Approved remotely',
        feedback: command.payload.feedback,
      };
      
    case 'deny':
      Logger.preToolUse.info('Command denied remotely', { reason: command.payload.reason });
      return {
        approved: false,
        reason: command.payload.reason || 'Denied remotely',
        feedback: command.payload.feedback,
      };
      
    case 'context':
      Logger.preToolUse.info('Context provided remotely', { hasInstructions: !!command.payload.instructions });
      return {
        approved: true,
        reason: 'Context provided remotely',
        feedback: command.payload.instructions || command.payload.feedback,
      };

    case 'interrupt':
      Logger.preToolUse.info('Execution interrupted remotely', { reason: command.payload.reason });
      return {
        approved: false, // false means don't execute the tool
        reason: command.payload.reason || 'Execution interrupted',
        feedback: 'Claude execution was interrupted by user request',
      };
      
    default:
      Logger.preToolUse.warn('Unknown command type, defaulting to approve', { type: command.type });
      return {
        approved: true,
        reason: 'Unknown command type, proceeding',
      };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();