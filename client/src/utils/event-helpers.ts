import { HookEvent } from '@/types';

export interface EventTypeInfo {
  type: 'bash' | 'todo' | 'file' | 'web' | 'task' | 'generic';
  title: string;
  body: string;
  icon: string;
  isActive: boolean;
}

/**
 * Determines if an event represents an active/current operation
 */
export function isEventActive(event: HookEvent): boolean {
  // Pre-tool-use events that require approval are considered active
  if (event.hookType === 'pre_tool_use' && event.data.requiresApproval) {
    return true;
  }
  
  // Events from the last 5 minutes could be considered "recent/active"
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const eventTime = new Date(event.timestamp);
  
  return event.hookType === 'pre_tool_use' && eventTime > fiveMinutesAgo;
}

/**
 * Analyzes an event and returns structured information for display
 */
export function analyzeEvent(event: HookEvent): EventTypeInfo {
  const toolName = event.data.toolName?.toLowerCase();
  const isActive = isEventActive(event);

  // Bash commands
  if (toolName === 'bash') {
    return {
      type: 'bash',
      title: event.data.description || 'Bash Command',
      body: event.data.toolArgs?.command || 'No command specified',
      icon: '⚡',
      isActive
    };
  }

  // TODO operations
  if (toolName === 'todowrite') {
    const todos = event.data.toolArgs?.todos || [];
    const completedCount = todos.filter((t: any) => t.status === 'completed').length;
    const inProgressCount = todos.filter((t: any) => t.status === 'in_progress').length;
    const pendingCount = todos.filter((t: any) => t.status === 'pending').length;
    
    return {
      type: 'todo',
      title: 'Task List Update',
      body: formatTodoList(todos),
      icon: '📋',
      isActive
    };
  }

  // File operations
  if (['read', 'edit', 'multiedit', 'write', 'glob', 'grep'].includes(toolName || '')) {
    const filePath = event.data.toolArgs?.file_path || 
                    event.data.toolArgs?.notebook_path || 
                    event.data.toolArgs?.pattern ||
                    'Unknown file';
    
    return {
      type: 'file',
      title: `${capitalizeFirst(toolName || 'File')} Operation`,
      body: filePath,
      icon: '📁',
      isActive
    };
  }

  // Web operations
  if (['webfetch', 'websearch'].includes(toolName || '')) {
    const url = event.data.toolArgs?.url || event.data.toolArgs?.query || 'Unknown URL';
    const purpose = event.data.toolArgs?.prompt || 'Web operation';
    
    return {
      type: 'web',
      title: url,
      body: purpose,
      icon: '🌐',
      isActive
    };
  }

  // Task/Agent operations
  if (toolName === 'task') {
    const description = event.data.toolArgs?.description || 'Agent Task';
    const prompt = event.data.toolArgs?.prompt || 'No details available';
    
    return {
      type: 'task',
      title: description,
      body: truncateText(prompt, 150),
      icon: '🤖',
      isActive
    };
  }

  // Generic fallback
  const title = toolName ? `${capitalizeFirst(toolName)} Tool` : event.hookType;
  const body = event.data.suggestedAction || 
               event.data.message || 
               (event.data.toolArgs ? JSON.stringify(event.data.toolArgs).slice(0, 100) + '...' : 'No details available');

  return {
    type: 'generic',
    title,
    body,
    icon: getHookTypeIcon(event.hookType),
    isActive
  };
}

/**
 * Formats a todo list with emojis
 */
function formatTodoList(todos: any[]): string {
  if (!Array.isArray(todos) || todos.length === 0) {
    return 'No tasks available';
  }

  return todos.map(todo => {
    const emoji = getStatusEmoji(todo.status);
    const content = todo.content || 'Untitled task';
    return `${emoji} ${content}`;
  }).join('\n');
}

/**
 * Gets emoji for todo status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '🔄';
    case 'pending':
    default:
      return '⏳';
  }
}

/**
 * Gets icon for hook type
 */
function getHookTypeIcon(hookType: string): string {
  switch (hookType) {
    case 'pre_tool_use':
      return '▶️';
    case 'post_tool_use':
      return '✅';
    case 'stop':
      return '⏹️';
    case 'notification':
      return '💬';
    default:
      return '•';
  }
}

/**
 * Capitalizes first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}