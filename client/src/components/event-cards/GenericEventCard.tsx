import React, { useState } from 'react';
import { HookEvent } from '@/types';
import { AlertCircle, Clock, User, Shield, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { getDetailedApprovalPrompt, getApprovalOptions } from '@/utils/command-helpers';
import { commandsApi } from '@/services/commands-api';
import clsx from 'clsx';

interface GenericEventCardProps {
  event: HookEvent;
  isActive: boolean;
  isLatest?: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const GenericEventCard: React.FC<GenericEventCardProps> = ({
  event,
  isActive,
  isLatest = false,
  onToggleControls,
  showControls
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const toolName = event.data.toolName;
  const title = toolName ? `${toolName.charAt(0).toUpperCase() + toolName.slice(1)} Tool` : event.hookType;
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
    <div className={`border rounded-lg p-3 mb-2 transition-all duration-500 ${
      isLatest ? 'ring-2 ring-blue-400 bg-blue-50 shadow-lg animate-spotlight-pulse' :
      isActive ? 'border-indigo-500 bg-indigo-50' : 
      event.data.riskLevel === 'high' ? 'border-red-300 bg-red-50' :
      event.data.riskLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
      'border-gray-200'
    }`}>
      {isLatest && (
        <div className="text-xs text-blue-600 font-semibold mb-2 animate-fade-in">
          LATEST EVENT
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
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
        
      </div>

      {/* Suggested action */}
      {event.data.suggestedAction && (
        <div className="bg-blue-50 p-2 rounded-md mb-2 border-l-4 border-blue-400">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-blue-700 uppercase mb-1">Suggested Action</div>
              <p className="text-sm text-gray-700">{event.data.suggestedAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content - Detailed Approval Prompt */}
      {requiresApproval && isActive ? (
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
      ) : (
        <div className="text-sm text-gray-600 mb-2">
          {event.data.message || detailedPrompt || 'No additional details available'}
        </div>
      )}

      {/* Custom Feedback Panel */}
      {showControls && isActive && requiresApproval && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
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

      {/* Tool arguments */}
      {event.data.toolArgs && (
        <details className="mb-2">
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