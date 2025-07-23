import React from 'react';
import { HookEvent } from '@/types';
import { CheckSquare, Clock, User } from 'lucide-react';

interface TodoEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const TodoEventCard: React.FC<TodoEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const todos = event.data.toolArgs?.todos || [];
  
  // Count tasks by status
  const completed = todos.filter((t: any) => t.status === 'completed');
  const inProgress = todos.filter((t: any) => t.status === 'in_progress');
  const pending = todos.filter((t: any) => t.status === 'pending');

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'pending': default: return '⏳';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${isActive ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">Task List Update</h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* Task summary */}
      <div className="mb-3">
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
          <span>✅ {completed.length} completed</span>
          <span>🔄 {inProgress.length} in progress</span>
          <span>⏳ {pending.length} pending</span>
        </div>
      </div>

      {/* Task list */}
      <div className="bg-gray-50 p-3 rounded-md space-y-1">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks available</p>
        ) : (
          todos.slice(0, 5).map((todo: any, index: number) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <span className="mt-0.5">{getStatusEmoji(todo.status)}</span>
              <span className={todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700'}>
                {todo.content || 'Untitled task'}
              </span>
            </div>
          ))
        )}
        {todos.length > 5 && (
          <p className="text-xs text-gray-500 mt-2">... and {todos.length - 5} more tasks</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center space-x-1">
          <User className="w-3 h-3" />
          <span>{event.agentId}</span>
        </div>
      </div>
    </div>
  );
};