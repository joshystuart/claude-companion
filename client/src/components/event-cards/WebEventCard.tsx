import React from 'react';
import { HookEvent } from '@/types';
import { Globe, Clock, User, Search, ExternalLink } from 'lucide-react';

interface WebEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const WebEventCard: React.FC<WebEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const toolName = event.data.toolName?.toLowerCase();
  const isWebFetch = toolName === 'webfetch';
  const isWebSearch = toolName === 'websearch';
  
  const url = event.data.toolArgs?.url;
  const query = event.data.toolArgs?.query;
  const prompt = event.data.toolArgs?.prompt;
  
  const getIcon = () => {
    if (isWebSearch) return <Search className="w-5 h-5 text-blue-600" />;
    return <Globe className="w-5 h-5 text-green-600" />;
  };

  const getTitle = () => {
    if (isWebSearch) return `Search: ${query || 'Unknown query'}`;
    return url || 'Web Request';
  };

  const getDescription = () => {
    if (prompt) return prompt;
    if (isWebSearch) return `Searching the web for: ${query}`;
    return 'Fetching web content';
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <h4 className="font-medium text-gray-900 truncate max-w-md">
            {isWebSearch ? 'Web Search' : 'Web Fetch'}
          </h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* URL or Query */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase">
            {isWebSearch ? 'Query' : 'URL'}
          </span>
          {url && !isWebSearch && (
            <ExternalLink className="w-3 h-3 text-gray-400" />
          )}
        </div>
        <div className="bg-gray-100 p-2 rounded-md">
          <code className="text-sm text-gray-800 break-all">
            {isWebSearch ? query : url}
          </code>
        </div>
      </div>

      {/* Purpose/Prompt */}
      {prompt && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Purpose</div>
          <div className="bg-blue-50 p-2 rounded-md">
            <p className="text-sm text-gray-700">{prompt}</p>
          </div>
        </div>
      )}

      {/* Additional search parameters for WebSearch */}
      {isWebSearch && event.data.toolArgs && (
        <div className="mb-3">
          {event.data.toolArgs.allowed_domains && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-medium">Allowed domains:</span> {event.data.toolArgs.allowed_domains.join(', ')}
            </div>
          )}
          {event.data.toolArgs.blocked_domains && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Blocked domains:</span> {event.data.toolArgs.blocked_domains.join(', ')}
            </div>
          )}
        </div>
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
      </div>
    </div>
  );
};