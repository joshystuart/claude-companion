import fetch from 'node-fetch';
import { HookEvent, HookResponse } from '../types';

export async function sendHookEvent(
  serverUrl: string,
  agentId: string,
  event: HookEvent,
  token?: string,
  timeoutMs = 1500 // Under 2 seconds as required
): Promise<HookResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${serverUrl}/api/hooks/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If server is down or returns error, allow Claude to proceed
      return { approved: true, reason: 'Server unavailable, proceeding' };
    }

    const result = await response.json();
    return result as HookResponse;

  } catch (error) {
    clearTimeout(timeoutId);
    
    // On any error (network, timeout, etc), allow Claude to proceed
    // This ensures Claude Code doesn't get blocked by monitoring issues
    return { approved: true, reason: 'Hook error, proceeding' };
  }
}

export function generateSessionId(): string {
  // Simple session ID generation - in Phase 2 we might make this more sophisticated
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session-${timestamp}-${random}`;
}

export function parseStdinData(): any {
  let input = '';
  try {
    // Claude Code passes JSON data via stdin
    process.stdin.setEncoding('utf8');
    
    // Read all stdin synchronously (hooks need to be fast)
    const fs = require('fs');
    const stdinFd = process.stdin.fd;
    
    try {
      input = fs.readFileSync(stdinFd, 'utf8');
    } catch (error) {
      // If no stdin data, return empty object
      return {};
    }

    return input ? JSON.parse(input) : {};
  } catch (error) {
    // If JSON parsing fails, return raw input
    return { rawData: input };
  }
}

export async function checkForPendingCommands(
  serverUrl: string,
  agentId: string,
  token?: string,
  timeoutMs = 1000 // Fast check for pending commands
): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${serverUrl}/api/commands/${agentId}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return []; // No commands if server error
    }

    const commands = await response.json();
    return Array.isArray(commands) ? commands : [];

  } catch (error) {
    clearTimeout(timeoutId);
    return []; // No commands if error
  }
}

export async function markCommandAsProcessing(
  serverUrl: string,
  commandId: string,
  token?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${serverUrl}/api/commands/${commandId}/processing`, {
      method: 'PUT',
      headers,
    });
  } catch (error) {
    // Ignore errors - not critical for hook execution
  }
}

export async function completeCommand(
  serverUrl: string,
  commandId: string,
  status: 'completed' | 'expired',
  result?: string,
  token?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${serverUrl}/api/commands/${commandId}/complete`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, result }),
    });
  } catch (error) {
    // Ignore errors - not critical for hook execution
  }
}

export function outputHookResponse(response: HookResponse): void {
  // Claude Code expects JSON response on stdout
  console.log(JSON.stringify(response));
}