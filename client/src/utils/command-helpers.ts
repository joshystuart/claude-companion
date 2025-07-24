/**
 * Command-related utility functions for extracting and formatting command details
 */

import { HookEvent } from '@/types';

/**
 * Extract human-readable command details from event data for approval notifications
 */
export function getCommandDetails(event: HookEvent): string {
  const { toolName, toolArgs, message } = event.data;
  
  // For notification events or events without toolName, show the message content
  if (!toolName || event.hookType === 'notification' || event.hookType === 'stop') {
    // Prioritize rawInput.message for notifications (contains actual Claude Code message)
    if (event.hookType === 'notification' && event.data.rawInput?.message) {
      return event.data.rawInput.message;
    }
    if (message) {
      return message;
    }
    return 'perform an action';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      const command = toolArgs?.command;
      return command ? `run: \`${command}\`` : 'run unknown command';
    
    case 'edit':
    case 'update':
      const editFile = toolArgs?.file_path;
      return editFile ? `edit: ${editFile}` : 'edit unknown file';
    
    case 'multiedit':
      const multiEditFile = toolArgs?.file_path;
      const editCount = toolArgs?.edits?.length || 0;
      return multiEditFile 
        ? `make ${editCount} ${editCount === 1 ? 'edit' : 'edits'} to: ${multiEditFile}`
        : 'make multiple edits to unknown file';
    
    case 'write':
      const writeFile = toolArgs?.file_path;
      return writeFile ? `write to: ${writeFile}` : 'write to unknown file';
    
    case 'read':
      const readFile = toolArgs?.file_path || toolArgs?.notebook_path;
      return readFile ? `read: ${readFile}` : 'read unknown file';
    
    case 'webfetch':
      const url = toolArgs?.url;
      return url ? `fetch: ${url}` : 'fetch unknown URL';
    
    case 'websearch':
      const query = toolArgs?.query;
      return query ? `search: "${query}"` : 'search with unknown query';
    
    case 'grep':
      const pattern = toolArgs?.pattern;
      const searchPath = toolArgs?.path || 'codebase';
      return pattern ? `search for "${pattern}" in ${searchPath}` : 'search unknown pattern';
    
    case 'glob':
      const globPattern = toolArgs?.pattern;
      const globPath = toolArgs?.path || 'current directory';
      return globPattern ? `find files matching "${globPattern}" in ${globPath}` : 'find files with unknown pattern';
    
    case 'task':
      const taskDescription = toolArgs?.description;
      return taskDescription ? `run task: ${taskDescription}` : 'run unknown task';
    
    case 'todowrite':
      const todos = toolArgs?.todos || [];
      const todoCount = todos.length;
      return todoCount > 0 
        ? `update task list (${todoCount} ${todoCount === 1 ? 'item' : 'items'})`
        : 'update task list';
    
    case 'notebookedit':
      const notebookPath = toolArgs?.notebook_path;
      return notebookPath ? `edit notebook: ${notebookPath}` : 'edit unknown notebook';
    
    case 'mcp__ide__getdiagnostics':
      const diagnosticsUri = toolArgs?.uri;
      return diagnosticsUri ? `get diagnostics for: ${diagnosticsUri}` : 'get code diagnostics';
    
    default:
      // Generic fallback for unknown tools
      return `use ${toolName}`;
  }
}

/**
 * Get a user-friendly description of what the command will do
 */
export function getCommandDescription(event: HookEvent): string {
  const { toolName, toolArgs, message } = event.data;
  
  // For notification events or events without toolName, show appropriate message
  if (!toolName || event.hookType === 'notification' || event.hookType === 'stop') {
    if (event.hookType === 'stop') {
      return 'Claude session has stopped';
    }
    if (event.hookType === 'notification') {
      // Prioritize rawInput.message for notifications (contains actual Claude Code message)
      return event.data.rawInput?.message || message || 'Claude has sent a notification';
    }
    return 'Claude wants to perform an action';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      return 'Claude wants to run a terminal command';
    
    case 'edit':
    case 'multiedit':
    case 'update':
      return 'Claude wants to modify a file';
    
    case 'write':
      return 'Claude wants to create or overwrite a file';
    
    case 'read':
      return 'Claude wants to read a file';
    
    case 'webfetch':
      return 'Claude wants to fetch content from a website';
    
    case 'websearch':
      return 'Claude wants to search the web';
    
    case 'grep':
      return 'Claude wants to search through files';
    
    case 'glob':
      return 'Claude wants to find files matching a pattern';
    
    case 'task':
      return 'Claude wants to spawn a sub-agent';
    
    case 'todowrite':
      return 'Claude wants to update the task list';
    
    case 'notebookedit':
      return 'Claude wants to edit a Jupyter notebook';
    
    case 'mcp__ide__getdiagnostics':
      return 'Claude wants to check for code issues';
    
    default:
      return `Claude wants to use the ${toolName} tool`;
  }
}

/**
 * Determine the risk level of a command for UI styling
 */
export function getCommandRiskLevel(event: HookEvent): 'low' | 'medium' | 'high' {
  // Use explicit risk level if provided
  if (event.data.riskLevel) {
    return event.data.riskLevel;
  }

  const { toolName, toolArgs } = event.data;
  
  if (!toolName) {
    return 'medium';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      const command = toolArgs?.command?.toLowerCase() || '';
      // High risk commands
      if (command.includes('rm ') || command.includes('delete') || 
          command.includes('format') || command.includes('sudo') ||
          command.includes('chmod') || command.includes('chown')) {
        return 'high';
      }
      // Medium risk commands
      if (command.includes('install') || command.includes('npm') ||
          command.includes('git') || command.includes('mv ')) {
        return 'medium';
      }
      return 'low';
    
    case 'write':
    case 'multiedit':
      return 'medium';
    
    case 'edit':
      return 'low';
    
    case 'webfetch':
    case 'websearch':
      return 'low';
    
    case 'task':
      return 'medium'; // Sub-agents can do various things
    
    default:
      return 'low';
  }
}

/**
 * Generate detailed approval prompt similar to Claude Code CLI
 */
export function getDetailedApprovalPrompt(event: HookEvent): string {
  const { toolName, toolArgs } = event.data;
  
  if (!toolName) {
    return 'Do you want Claude to proceed with this action?';
  }

  switch (toolName.toLowerCase()) {
    case 'edit':
    case 'multiedit':
    case 'update':
      const editFile = toolArgs?.file_path;
      if (editFile) {
        const fileName = editFile.split('/').pop() || editFile;
        return `Do you want to make this edit to ${fileName}?`;
      }
      return 'Do you want to make this file edit?';
    
    case 'write':
      const writeFile = toolArgs?.file_path;
      if (writeFile) {
        const fileName = writeFile.split('/').pop() || writeFile;
        return `Do you want to create/overwrite ${fileName}?`;
      }
      return 'Do you want to create/overwrite this file?';
    
    case 'bash':
      const command = toolArgs?.command;
      if (command) {
        return `Do you want to run this command?\n${command}`;
      }
      return 'Do you want to run this terminal command?';
    
    case 'read':
      const readFile = toolArgs?.file_path || toolArgs?.notebook_path;
      if (readFile) {
        const fileName = readFile.split('/').pop() || readFile;
        return `Do you want to read ${fileName}?`;
      }
      return 'Do you want to read this file?';
    
    case 'webfetch':
      const url = toolArgs?.url;
      if (url) {
        return `Do you want to fetch content from:\n${url}`;
      }
      return 'Do you want to fetch web content?';
    
    case 'websearch':
      const query = toolArgs?.query;
      if (query) {
        return `Do you want to search the web for:\n"${query}"`;
      }
      return 'Do you want to perform a web search?';
    
    case 'task':
      const taskDescription = toolArgs?.description;
      if (taskDescription) {
        return `Do you want to spawn a sub-agent to:\n${taskDescription}`;
      }
      return 'Do you want to spawn a sub-agent?';
    
    default:
      return `Do you want Claude to use the ${toolName} tool?`;
  }
}

/**
 * Get response options for tool approval (like Claude Code CLI)
 */
export function getApprovalOptions(event: HookEvent): Array<{label: string, value: string, color: string}> {
  const { toolName } = event.data;
  
  // Standard options for most tools
  const standardOptions = [
    { label: 'Yes', value: 'yes', color: 'green' },
    { label: 'Yes, and don\'t ask again this session', value: 'yes_always', color: 'blue' },
    { label: 'No, and tell Claude what to do differently', value: 'no_feedback', color: 'red' }
  ];
  
  // Some tools might have specific options in the future
  switch (toolName?.toLowerCase()) {
    case 'bash':
      // High-risk commands might have different options
      const command = event.data.toolArgs?.command?.toLowerCase() || '';
      if (command.includes('rm ') || command.includes('delete') || command.includes('sudo')) {
        return [
          { label: 'Yes, I understand the risk', value: 'yes', color: 'red' },
          { label: 'No, cancel this command', value: 'no_feedback', color: 'gray' }
        ];
      }
      break;
    
    case 'write':
      return [
        { label: 'Yes, create/overwrite the file', value: 'yes', color: 'green' },
        { label: 'Yes, and don\'t ask again this session', value: 'yes_always', color: 'blue' },
        { label: 'No, and suggest changes', value: 'no_feedback', color: 'red' }
      ];
  }
  
  return standardOptions;
}

/**
 * Get appropriate icon for the command type
 */
export function getCommandIcon(event: HookEvent): string {
  const { toolName } = event.data;
  
  // Handle events without toolName
  if (!toolName) {
    if (event.hookType === 'stop') {
      return '⏹️';
    }
    if (event.hookType === 'notification') {
      return '💬';
    }
    return '❓';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      return '⚡';
    case 'edit':
    case 'multiedit':
      return '✏️';
    case 'write':
      return '📝';
    case 'read':
      return '👁️';
    case 'webfetch':
      return '🌐';
    case 'websearch':
      return '🔍';
    case 'grep':
      return '🔎';
    case 'glob':
      return '📂';
    case 'task':
      return '🤖';
    case 'todowrite':
      return '📋';
    case 'notebookedit':
      return '📊';
    case 'mcp__ide__getdiagnostics':
      return '🔧';
    default:
      return '🛠️';
  }
}