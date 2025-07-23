import React from 'react';
import { HookEvent } from '@/types';
import { File, Clock, User, Edit3, Eye, Search, Globe } from 'lucide-react';

interface FileEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const FileEventCard: React.FC<FileEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const toolName = event.data.toolName?.toLowerCase();
  const filePath = event.data.toolArgs?.file_path || 
                  event.data.toolArgs?.notebook_path || 
                  event.data.toolArgs?.pattern ||
                  'Unknown file';
  
  const getOperationIcon = () => {
    switch (toolName) {
      case 'read': return <Eye className="w-5 h-5 text-blue-600" />;
      case 'edit':
      case 'multiedit': return <Edit3 className="w-5 h-5 text-green-600" />;
      case 'write': return <File className="w-5 h-5 text-purple-600" />;
      case 'grep': return <Search className="w-5 h-5 text-yellow-600" />;
      case 'glob': return <Globe className="w-5 h-5 text-indigo-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getOperationDetails = () => {
    switch (toolName) {
      case 'read':
        const limit = event.data.toolArgs?.limit;
        const offset = event.data.toolArgs?.offset;
        return limit ? `Reading ${limit} lines${offset ? ` from line ${offset}` : ''}` : 'Reading file';
      
      case 'edit':
        return 'Making single edit to file';
      
      case 'multiedit':
        const editCount = event.data.toolArgs?.edits?.length || 0;
        return `Making ${editCount} edits to file`;
      
      case 'write':
        return 'Writing/overwriting file';
      
      case 'grep':
        const pattern = event.data.toolArgs?.pattern;
        const glob = event.data.toolArgs?.glob;
        return `Searching for "${pattern}"${glob ? ` in ${glob}` : ''}`;
      
      case 'glob':
        return `Finding files matching pattern`;
      
      default:
        return 'File operation';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          {getOperationIcon()}
          <h4 className="font-medium text-gray-900">
            {toolName ? toolName.charAt(0).toUpperCase() + toolName.slice(1) : 'File'} Operation
          </h4>
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* File path */}
      <div className="bg-gray-100 p-2 rounded-md mb-2">
        <code className="text-sm text-gray-800 break-all">{filePath}</code>
      </div>

      {/* Operation details */}
      <div className="text-sm text-gray-600 mb-3">
        {getOperationDetails()}
      </div>

      {/* Additional tool arguments for context */}
      {event.data.toolArgs && Object.keys(event.data.toolArgs).length > 0 && (
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
      </div>
    </div>
  );
};