#!/usr/bin/env node

import { sendHookEvent, parseStdinData, outputHookResponse, generateSessionId } from '../utils/hook-utils';
import { HookEvent } from '../types';
import { getAgentContext } from '../utils/context';

async function main() {
  const [serverUrl, agentId, token] = process.argv.slice(2);

  if (!serverUrl || !agentId) {
    console.error('Usage: post-tool-use.js <serverUrl> <agentId> [token]');
    process.exit(1);
  }

  try {
    // Parse tool result data from Claude Code
    const resultData = parseStdinData();
    
    // Get enhanced agent context
    const context = getAgentContext();
    
    const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
    
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

    // Send event to server
    const response = await sendHookEvent(serverUrl, context.agentId, event, token);
    
    // Post-tool-use hooks typically just acknowledge
    outputHookResponse({ approved: true });

  } catch (error) {
    // On error, just acknowledge
    outputHookResponse({ approved: true });
  }
}

main();