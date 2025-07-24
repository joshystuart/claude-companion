import React from 'react';
import { HookEvent } from '@/types';
import { Terminal, Clock, User } from 'lucide-react';

interface BashEventCardProps {
  event: HookEvent;
  isActive: boolean;
  isLatest?: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const BashEventCard: React.FC<BashEventCardProps> = ({
  event,
  isActive,
  isLatest = false,
  onToggleControls,
  showControls
}) => {
  const command = event.data.toolArgs?.command || 'No command specified';
  const description = event.data.description || 'Bash Command';
  const timeout = event.data.toolArgs?.timeout;

  return (
    <div className={`border rounded-lg p-3 mb-2 transition-all duration-500 ${
      isLatest ? 'ring-2 ring-blue-400 bg-blue-50 shadow-lg animate-spotlight-pulse' :
      isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      {isLatest && (
        <div className="text-xs text-blue-600 font-semibold mb-2 animate-fade-in">
          LATEST EVENT
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">{description}</h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              ACTIVE
            </span>
          )}
        </div>
        
      </div>

      {/* Command body - formatted as code */}
      <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-sm mb-2 overflow-x-auto">
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