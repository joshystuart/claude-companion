import React from 'react';
import { HookEvent } from '@/types';
import { AlertCircle, Clock, User, Shield } from 'lucide-react';

interface GenericEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const GenericEventCard: React.FC<GenericEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const toolName = event.data.toolName;
  const title = toolName ? `${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Tool` : event.hookType;
  
  const getHookTypeIcon = () => {
    switch (event.hookType) {
      case 'pre_tool_use': return '▶️';
      case 'post_tool_use': return '✅';
      case 'stop': return '⏹️';
      case 'notification': return '💬';
      default: return '•';
    }
  };

  const getBody = () => {
    if (event.data.suggestedAction) return event.data.suggestedAction;
    if (event.data.message) return event.data.message;
    if (event.data.toolArgs) return JSON.stringify(event.data.toolArgs).slice(0, 100) + '...';
    return 'No details available';
  };

  const getRiskBadge = () => {
    if (!event.data.riskLevel) return null;
    
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[event.data.riskLevel]}`}>
        {event.data.riskLevel.toUpperCase()} RISK
      </span>
    );
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${
      isActive ? 'border-indigo-500 bg-indigo-50' : 
      event.data.riskLevel === 'high' ? 'border-red-300 bg-red-50' :
      event.data.riskLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
      'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getHookTypeIcon()}</span>
          <h4 className="font-medium text-gray-900">{title}</h4>
          {getRiskBadge()}
          {event.data.requiresApproval && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
              APPROVAL REQUIRED
            </span>
          )}
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* Suggested action */}
      {event.data.suggestedAction && (
        <div className="bg-blue-50 p-2 rounded-md mb-3 border-l-4 border-blue-400">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-blue-700 uppercase mb-1">Suggested Action</div>
              <p className="text-sm text-gray-700">{event.data.suggestedAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="text-sm text-gray-600 mb-3">
        {event.data.message || 'No additional details available'}
      </div>

      {/* Tool arguments */}
      {event.data.toolArgs && (
        <details className="mb-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View tool arguments
          </summary>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1 text-gray-700">
            {JSON.stringify(event.data.toolArgs, null, 2)}
          </pre>
        </details>
      )}

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
        <div>
          <span>Type: {event.hookType}</span>
        </div>
      </div>
    </div>
  );
};