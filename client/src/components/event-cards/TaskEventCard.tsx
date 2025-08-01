import React from 'react';
import { HookEvent } from '@/types';
import { Bot, Clock, User, Zap } from 'lucide-react';

interface TaskEventCardProps {
  event: HookEvent;
  isActive: boolean;
  isLatest?: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const TaskEventCard: React.FC<TaskEventCardProps> = ({
  event,
  isActive,
  isLatest = false,
  onToggleControls,
  showControls
}) => {
  const description = event.data.toolArgs?.description || 'Agent Task';
  const prompt = event.data.toolArgs?.prompt || 'No details available';

  // Truncate long prompts
  const truncatedPrompt = prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt;

  return (
    <div className={`border rounded-lg p-3 mb-2 transition-all duration-500 ${
      isLatest ? 'ring-2 ring-blue-400 bg-blue-50 shadow-lg animate-spotlight-pulse' :
      isActive ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200'
    }`}>
      {isLatest && (
        <div className="text-xs text-blue-600 font-semibold mb-2 animate-fade-in">
          LATEST EVENT
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-cyan-600" />
          <h4 className="font-medium text-gray-900">{description}</h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
              ACTIVE
            </span>
          )}
        </div>
        
      </div>

      {/* Task prompt/description */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-3 rounded-md mb-2 border-l-4 border-cyan-400">
        <div className="flex items-start space-x-2">
          <Zap className="w-4 h-4 text-cyan-600 mt-0.5" />
          <div>
            <div className="text-xs font-medium text-cyan-700 uppercase mb-1">Task Instructions</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{truncatedPrompt}</p>
            {prompt.length > 200 && (
              <details className="mt-2">
                <summary className="text-xs text-cyan-600 cursor-pointer hover:text-cyan-800">
                  View full instructions
                </summary>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{prompt}</p>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Task type indicator */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="px-2 py-1 text-xs font-medium rounded-md bg-cyan-100 text-cyan-800">
          Autonomous Agent Task
        </span>
        <span className="text-xs text-gray-500">
          Delegated sub-task execution
        </span>
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 text-xs text-gray-500">
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