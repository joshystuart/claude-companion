import React from 'react';
import { HookEvent } from '@/types';
import { Terminal, Clock, User } from 'lucide-react';

interface BashEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const BashEventCard: React.FC<BashEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const command = event.data.toolArgs?.command || 'No command specified';
  const description = event.data.description || 'Bash Command';
  const timeout = event.data.toolArgs?.timeout;

  return (
    <div className={`border rounded-lg p-4 mb-3 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">{description}</h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* Command body - formatted as code */}
      <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-sm mb-3 overflow-x-auto">
        <pre className="whitespace-pre-wrap">{command}</pre>
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
        {timeout && (
          <div>
            <span>Timeout: {timeout}ms</span>
          </div>
        )}
      </div>
    </div>
  );
};