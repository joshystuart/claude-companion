/**
 * Command-related utility functions for extracting and formatting command details
 */

import { HookEvent } from '@/types';

/**
 * Extract human-readable command details from event data for approval notifications
 */
export function getCommandDetails(event: HookEvent): string {
  const { toolName, toolArgs } = event.data;
  
  if (!toolName) {
    return 'use unknown tool';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      const command = toolArgs?.command;
      return command ? `run: \`${command}\`` : 'run unknown command';
    
    case 'edit':
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
  const { toolName, toolArgs } = event.data;
  
  if (!toolName) {
    return 'Claude wants to perform an unknown action';
  }

  switch (toolName.toLowerCase()) {
    case 'bash':
      return 'Claude wants to run a terminal command';
    
    case 'edit':
    case 'multiedit':
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
 * Get appropriate icon for the command type
 */
export function getCommandIcon(event: HookEvent): string {
  const { toolName } = event.data;
  
  if (!toolName) {
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