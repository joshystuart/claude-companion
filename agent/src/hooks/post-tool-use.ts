#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';
import { getAgentContext } from '../utils/context';
import { Logger } from '../utils/logger';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  Logger.postToolUse.info('Hook started', { serverUrl, agentId: agentId, hasToken: !!token });

  if (!serverUrl || !agentId) {
    Logger.postToolUse.error('Missing required arguments', { serverUrl, agentId });
    console.error('Usage: post-tool-use.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    Logger.postToolUse.debug('Parsing tool result data');
    // Parse tool result data from Claude Code
    const resultData = parseStdinData();
    Logger.postToolUse.info('Received tool result', { 
      toolName: resultData.tool_name, 
      sessionId: resultData.session_id,
      cwd: resultData.cwd,
      transcriptPath: resultData.transcript_path,
      hasResult: !!resultData.tool_result
    });
    Logger.postToolUse.debug('Raw tool result captured', { rawInput: resultData });
    
    Logger.postToolUse.debug('Getting agent context');
    // Get enhanced agent context
    const context = getAgentContext();
    Logger.postToolUse.info('Agent context retrieved', { 
      agentId: context.agentId, 
      computerName: context.computerName, 
      workingDirectory: context.workingDirectory 
    });
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    Logger.postToolUse.debug('Session ID established', { sessionId });
    
    const event: HookEvent = {
      agentId: context.agentId, // Use auto-generated agent ID
      sessionId,
      hookType: 'post_tool_use',
      timestamp: new Date().toISOString(),
      data: {
        toolName: resultData.tool_name,
        result: resultData.tool_result,
        sessionId: resultData.session_id,
        transcriptPath: resultData.transcript_path,
        cwd: resultData.cwd,
        rawInput: resultData,
        // Enhanced context
        computerId: context.computerId,
        computerName: context.computerName,
        hostname: context.hostname,
        platform: context.platform,
        agentName: context.agentName,
        workingDirectory: context.workingDirectory,
      },
    };

    Logger.postToolUse.info('Sending event to server', { 
      hookType: event.hookType, 
      toolName: event.data.toolName,
      agentId: event.agentId 
    });
    
    // Send event to server
    const response = await sendHookEvent(serverUrl, context.agentId, event, token);
    Logger.postToolUse.debug('Event sent successfully');
    
    const finalResponse = { approved: true };
    Logger.postToolUse.info('Returning acknowledgment', finalResponse);
    
    // Post-tool-use hooks typically just acknowledge
    outputHookResponse(finalResponse);

  } catch (error) {
    Logger.postToolUse.error('Hook execution failed', error);
    
    const fallbackResponse = { approved: true };
    Logger.postToolUse.warn('Returning fallback response due to error', fallbackResponse);
    // On error, just acknowledge
    outputHookResponse(fallbackResponse);
  }
}

main();