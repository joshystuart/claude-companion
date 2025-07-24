import { HookEvent } from '@/types';

export interface EventTypeInfo {
  type: 'bash' | 'todo' | 'file' | 'edit' | 'web' | 'task' | 'notification' | 'generic';
  title: string;
  body: string;
  icon: string;
  isActive: boolean;
}

/**
 * Determines if an event represents an active/current operation
 * Only the most recent event should be considered active
 */
export function isEventActive(event: HookEvent, allEvents: HookEvent[] = []): boolean {
  // If no events provided, fall back to basic approval check
  if (allEvents.length === 0) {
    return event.hookType === 'pre_tool_use' && event.data.requiresApproval;
  }
  
  // Find the most recent event for this agent
  const agentEvents = allEvents
    .filter(e => e.agentId === event.agentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const mostRecentEvent = agentEvents[0];
  
  // Only the most recent event can be active
  if (event.timestamp !== mostRecentEvent?.timestamp) {
    return false;
  }
  
  // Most recent event is active if it's a pre-tool-use event
  return event.hookType === 'pre_tool_use';
}

/**
 * Check if a pre_tool_use event should inherit approval requirement from a corresponding notification
 */
function shouldInheritApprovalRequirement(event: HookEvent, allEvents: HookEvent[]): boolean {
  if (event.hookType !== 'pre_tool_use') return false;
  if (event.data.requiresApproval) return false; // Already requires approval
  
  const toolName = event.data.toolName?.toLowerCase();
  if (!toolName) return false;
  
  // Look for a corresponding notification event
  const eventTime = new Date(event.timestamp).getTime();
  
  const hasCorrespondingNotification = allEvents.some(otherEvent => {
    if (otherEvent.hookType !== 'notification') return false;
    if (otherEvent.agentId !== event.agentId) return false;
    
    const notificationMessage = otherEvent.data.rawInput?.message || otherEvent.data.message || '';
    const isToolPermissionNotification = notificationMessage.includes('needs your permission to use');
    
    if (!isToolPermissionNotification) return false;
    
    // Extract tool name from notification
    const toolNameMatch = notificationMessage.match(/permission to use (\w+)/i);
    const notificationToolName = toolNameMatch?.[1]?.toLowerCase();
    
    // Map notification tool names to actual tool names
    const toolNameMappings: Record<string, string[]> = {
      'update': ['edit', 'multiedit', 'write'],
      'bash': ['bash'], 
      'read': ['read'],
      'task': ['task'],
      'websearch': ['websearch'],
      'webfetch': ['webfetch']
    };
    
    // Check if notification tool name maps to the actual tool name
    const mappedToolNames = toolNameMappings[notificationToolName] || [notificationToolName];
    if (!mappedToolNames.includes(toolName)) return false;
    
    // Check if within 5 seconds
    const otherTime = new Date(otherEvent.timestamp).getTime();
    const timeDiff = Math.abs(otherTime - eventTime);
    
    return timeDiff <= 5000;
  });
  
  return hasCorrespondingNotification;
}

/**
 * Analyzes an event and returns structured information for display
 */
export function analyzeEvent(event: HookEvent, allEvents: HookEvent[] = []): EventTypeInfo {
  const toolName = event.data.toolName?.toLowerCase();
  const isActive = isEventActive(event, allEvents);
  
  // Check if this pre_tool_use event should inherit approval requirement
  const inheritApproval = shouldInheritApprovalRequirement(event, allEvents);
  if (inheritApproval) {
    // Temporarily modify the event data to include approval requirement
    event.data.requiresApproval = true;
  }

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

  // Edit operations (show before/after changes)
  if (['edit', 'multiedit', 'write', 'update'].includes(toolName || '')) {
    const filePath = event.data.toolArgs?.file_path || 'Unknown file';
    
    return {
      type: 'edit',
      title: `${capitalizeFirst(toolName || 'File')} Operation`,
      body: filePath,
      icon: '✏️',
      isActive
    };
  }

  // Other file operations
  if (['read', 'glob', 'grep'].includes(toolName || '')) {
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

  // Notification events (including approval-required events)
  if (event.hookType === 'notification' || event.data.requiresApproval) {
    return {
      type: 'notification',
      title: event.data.requiresApproval ? 'Approval Required' : 'Notification',
      body: event.data.message || event.data.suggestedAction || 'Notification from Claude',
      icon: '💬',
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