import React, { useState } from 'react';
import { HookEvent } from '@/types';
import { Clock, User, FileText, Edit3, RotateCcw, Eye, EyeOff, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { SyntaxHighlight } from '@/components/SyntaxHighlight';
import { getDetailedApprovalPrompt, getApprovalOptions } from '@/utils/command-helpers';
import { commandsApi } from '@/services/commands-api';
import clsx from 'clsx';

interface EditEventCardProps {
  event: HookEvent;
  isActive: boolean;
  isLatest?: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const EditEventCard: React.FC<EditEventCardProps> = ({
  event,
  isActive,
  isLatest = false,
  onToggleControls,
  showControls
}) => {
  const [viewMode, setViewMode] = useState<'before-after' | 'diff'>('before-after');
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const toolName = event.data.toolName?.toLowerCase();
  const toolArgs = event.data.toolArgs;
  const requiresApproval = event.data.requiresApproval;
  const detailedPrompt = getDetailedApprovalPrompt(event);
  const approvalOptions = getApprovalOptions(event);

  const handleQuickResponse = async (value: string) => {
    setIsSubmitting(true);
    try {
      if (value === 'yes' || value === 'yes_always') {
        await commandsApi.approveAction(
          event.agentId,
          event.sessionId,
          value === 'yes_always' ? 'Approved and don\'t ask again this session' : 'Approved',
          event.timestamp
        );
      } else if (value === 'no_feedback') {
        // Show feedback input
        if (onToggleControls) {
          onToggleControls();
        }
      }
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.denyAction(
        event.agentId,
        event.sessionId,
        'Action denied from dashboard',
        feedback,
        event.timestamp
      );
      setFeedback('');
    } catch (error) {
      console.error('Failed to deny:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInjectContext = async () => {
    if (!feedback) return;
    setIsSubmitting(true);
    try {
      await commandsApi.injectContext(
        event.agentId,
        event.sessionId,
        feedback,
        event.timestamp
      );
      setFeedback('');
    } catch (error) {
      console.error('Failed to inject context:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract edit information based on tool type
  const getEditInfo = () => {
    switch (toolName) {
      case 'edit':
        return {
          filePath: toolArgs?.file_path || 'Unknown file',
          oldString: toolArgs?.old_string || '',
          newString: toolArgs?.new_string || '',
          edits: [{
            old_string: toolArgs?.old_string || '',
            new_string: toolArgs?.new_string || '',
            replace_all: toolArgs?.replace_all || false
          }]
        };
      
      case 'multiedit':
        return {
          filePath: toolArgs?.file_path || 'Unknown file',
          oldString: '', // MultiEdit doesn't have single old/new strings
          newString: '',
          edits: toolArgs?.edits || []
        };
      
      case 'write':
        return {
          filePath: toolArgs?.file_path || 'Unknown file',
          oldString: '(empty file)',
          newString: toolArgs?.content || '',
          edits: [{
            old_string: '',
            new_string: toolArgs?.content || '',
            replace_all: false
          }]
        };
      
      default:
        return {
          filePath: 'Unknown file',
          oldString: '',
          newString: '',
          edits: []
        };
    }
  };

  const editInfo = getEditInfo();
  const isMultiEdit = toolName === 'multiedit';
  const isWrite = toolName === 'write';

  const getOperationIcon = () => {
    switch (toolName) {
      case 'edit': return <Edit3 className="w-4 h-4" />;
      case 'multiedit': return <RotateCcw className="w-4 h-4" />;
      case 'write': return <FileText className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  const getOperationTitle = () => {
    switch (toolName) {
      case 'edit': return 'File Edit';
      case 'multiedit': return `Multi-Edit (${editInfo.edits.length} changes)`;
      case 'write': return isWrite ? 'File Write' : 'File Edit';
      default: return 'File Operation';
    }
  };

  const truncateString = (str: string, maxLength: number = 100) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  const renderSimpleDiff = (oldStr: string, newStr: string) => {
    if (!oldStr && !newStr) return null;
    
    const getLanguageFromPath = (filePath: string): string => {
      const extension = filePath.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'py': return 'python';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'sh': case 'bash': return 'bash';
        default: return 'text';
      }
    };

    const language = getLanguageFromPath(editInfo.filePath);
    
    return (
      <div className="space-y-3">
        {/* Before */}
        {oldStr && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-xs text-red-600 font-semibold mb-2">BEFORE</div>
            <div className="overflow-x-auto">
              <SyntaxHighlight 
                code={truncateString(oldStr, 300)} 
                language={language}
                className="text-sm"
              />
            </div>
          </div>
        )}
        
        {/* After */}
        {newStr && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-xs text-green-600 font-semibold mb-2">AFTER</div>
            <div className="overflow-x-auto">
              <SyntaxHighlight 
                code={truncateString(newStr, 300)} 
                language={language}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMultiEditChanges = () => {
    if (!isMultiEdit || editInfo.edits.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Changes (showing {Math.min(3, editInfo.edits.length)} of {editInfo.edits.length}):
        </div>
        {editInfo.edits.slice(0, 3).map((edit: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded p-2 bg-gray-50">
            <div className="text-xs font-medium text-gray-600 mb-1">
              Change #{index + 1} {edit.replace_all && '(Replace All)'}
            </div>
            {renderSimpleDiff(edit.old_string, edit.new_string)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={clsx(
      'border rounded-lg p-3 mb-2 transition-all duration-500',
      isLatest ? 'ring-2 ring-blue-400 bg-blue-50 shadow-lg animate-spotlight-pulse' :
      isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
    )}>
      {isLatest && (
        <div className="text-xs text-blue-600 font-semibold mb-2 animate-fade-in">
          LATEST EVENT
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            {getOperationIcon()}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">{getOperationTitle()}</h4>
            <p className="text-sm text-gray-600 font-mono">{editInfo.filePath}</p>
          </div>
          
          {isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
              ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Additional Details (only for multi-edits with >3 changes) */}
          {isMultiEdit && editInfo.edits.length > 3 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={showDetails ? `Hide ${editInfo.edits.length - 3} Additional Changes` : `Show ${editInfo.edits.length - 3} More Changes`}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
        </div>
      </div>

      {/* Edit Summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-2">
        <div className="text-sm text-gray-700">
          {isWrite && (
            <span>Creating new file with {editInfo.newString.length} characters</span>
          )}
          {toolName === 'edit' && (
            <span>
              Replacing "{truncateString(editInfo.oldString, 30)}" with "{truncateString(editInfo.newString, 30)}"
              {toolArgs?.replace_all && ' (all occurrences)'}
            </span>
          )}
          {isMultiEdit && (
            <span>Making {editInfo.edits.length} changes to the file</span>
          )}
        </div>
      </div>

      {/* Detailed Approval Prompt (when approval required) */}
      {requiresApproval && isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
          <div className="text-sm font-medium text-blue-800 mb-3">
            {detailedPrompt}
          </div>
          
          {/* Response Options */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-blue-700 uppercase mb-2">Choose an option:</div>
            <div className="space-y-2">
              {approvalOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleQuickResponse(option.value)}
                  disabled={isSubmitting}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm rounded-md border transition-colors disabled:opacity-50',
                    {
                      'bg-green-50 border-green-200 text-green-800 hover:bg-green-100': option.color === 'green',
                      'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100': option.color === 'blue',
                      'bg-red-50 border-red-200 text-red-800 hover:bg-red-100': option.color === 'red',
                      'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100': option.color === 'gray',
                    }
                  )}
                >
                  <span className="font-medium">{index + 1}.</span> {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Feedback Panel */}
      {showControls && isActive && requiresApproval && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-3">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Tell Claude what to do differently</h5>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback / Instructions
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what Claude should do instead or provide additional context"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeny}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting || !feedback}
              >
                {isSubmitting ? 'Sending...' : 'Deny with Feedback'}
              </button>
              <button
                onClick={handleInjectContext}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting || !feedback}
              >
                {isSubmitting ? 'Sending...' : 'Provide Context'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Before/After Changes - Always Visible */}
      <div className="mb-2">
        {isMultiEdit ? renderMultiEditChanges() : renderSimpleDiff(editInfo.oldString, editInfo.newString)}
      </div>

      {/* Additional Detailed Changes (expandable) */}
      {showDetails && isMultiEdit && editInfo.edits.length > 3 && (
        <div className="mb-2">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Remaining Changes ({editInfo.edits.length - 3}):
          </div>
          {editInfo.edits.slice(3).map((edit: any, index: number) => (
            <div key={index + 3} className="border border-gray-200 rounded p-2 bg-gray-50 mb-2">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Change #{index + 4} {edit.replace_all && '(Replace All)'}
              </div>
              {renderSimpleDiff(edit.old_string, edit.new_string)}
            </div>
          ))}
        </div>
      )}

      {/* Additional Info */}
      {toolArgs && Object.keys(toolArgs).length > 0 && showDetails && (
        <details className="mb-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View raw tool arguments
          </summary>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1 text-gray-700">
            {JSON.stringify(toolArgs, null, 2)}
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
        {toolName && (
          <div>
            <span>Tool: {toolName}</span>
          </div>
        )}
      </div>
    </div>
  );
};