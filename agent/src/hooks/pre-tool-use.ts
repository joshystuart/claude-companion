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

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: pre-tool-use.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // PRIORITY 1: Check for interrupt commands immediately
    const interruptCommands = await checkForInterrupt(serverUrl, agentId, token);
    if (interruptCommands.length > 0) {
      const interruptCmd = interruptCommands[0];
      await markCommandAsProcessing(serverUrl, interruptCmd.id, token);
      await completeCommand(serverUrl, interruptCmd.id, 'completed', 'Interrupted execution', token);
      
      // Return interrupt response immediately
      outputHookResponse({
        approved: false,
        reason: interruptCmd.payload.reason || 'Execution interrupted from dashboard',
        feedback: 'Claude execution was interrupted by user request'
      });
      return;
    }

    // Debug: Log that hook was called
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Pre-tool-use hook called with args: ${process.argv.slice(2).join(', ')}\n`);
    
    // Parse tool data from Claude Code
    const toolData = parseStdinData();
    
    // DEBUG: Log raw pre-tool-use data
    console.error('=== PRE-TOOL-USE HOOK DEBUG ===');
    console.error('Raw tool data:', JSON.stringify(toolData, null, 2));
    console.error('Tool name:', toolData.tool_name);
    console.error('Tool input:', JSON.stringify(toolData.tool_input, null, 2));
    console.error('==============================');
    
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Parsed tool data: ${JSON.stringify(toolData)}\n`);
    
    // Get enhanced agent context
    const context = getAgentContext();
    
    // Create session ID (in real implementation, we might maintain session state)
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
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

    // Log event before sending
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Sending event: ${JSON.stringify(event)}\n`);
    
    // Send event to server first (for monitoring)
    await sendHookEvent(serverUrl, context.agentId, event, token);
    
    // Phase 2: Check for pending commands and process them
    const finalResponse = await processWithCommandChecking(serverUrl, context.agentId, sessionId, token);
    
    // Log final response
    require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Final response: ${JSON.stringify(finalResponse)}\n`);
    
    // Output response to Claude Code
    outputHookResponse(finalResponse);

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

async function processWithCommandChecking(
  serverUrl: string,
  agentId: string,
  sessionId: string,
  token?: string,
  maxWaitTime = 30000 // 30 seconds max wait
): Promise<HookResponse> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check for pending commands
      const pendingCommands = await checkForPendingCommands(serverUrl, agentId, token);
      
      if (pendingCommands.length > 0) {
        // Process the first relevant command
        for (const command of pendingCommands) {
          if (command.sessionId === sessionId || !command.sessionId) {
            // Mark command as processing
            await markCommandAsProcessing(serverUrl, command.id, token);
            
            // Process the command
            const response = await executeCommand(command);
            
            // Mark command as completed
            await completeCommand(serverUrl, command.id, 'completed', 'Executed by hook', token);
            
            return response;
          }
        }
      }
      
      // Wait a bit before checking again (but not too long to keep hook fast)
      await sleep(500); // 500ms
      
    } catch (error) {
      // If command checking fails, default to approval
      require('fs').appendFileSync('/tmp/claude-companion-debug.log', `[${new Date().toISOString()}] Command checking error: ${error}\n`);
      break;
    }
  }
  
  // No commands found or timeout - default approval
  return {
    approved: true,
    reason: 'No remote commands, proceeding',
  };
}

function executeCommand(command: any): HookResponse {
  switch (command.type) {
    case 'approve':
      return {
        approved: true,
        reason: command.payload.reason || 'Approved remotely',
        feedback: command.payload.feedback,
      };
      
    case 'deny':
      return {
        approved: false,
        reason: command.payload.reason || 'Denied remotely',
        feedback: command.payload.feedback,
      };
      
    case 'context':
      return {
        approved: true,
        reason: 'Context provided remotely',
        feedback: command.payload.instructions || command.payload.feedback,
      };

    case 'interrupt':
      return {
        approved: false, // false means don't execute the tool
        reason: command.payload.reason || 'Execution interrupted',
        feedback: 'Claude execution was interrupted by user request',
      };
      
    default:
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