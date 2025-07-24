import React, { useState } from 'react';
import { HookEvent } from '@/types';
import { Terminal, Clock, User, Shield, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { getDetailedApprovalPrompt, getApprovalOptions } from '@/utils/command-helpers';
import { commandsApi } from '@/services/commands-api';
import clsx from 'clsx';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const command = event.data.toolArgs?.command || 'No command specified';
  const description = event.data.description || 'Bash Command';
  const timeout = event.data.toolArgs?.timeout;
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
          {requiresApproval && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
              APPROVAL REQUIRED
            </span>
          )}
          {isActive && !requiresApproval && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              ACTIVE
            </span>
          )}
        </div>
        
        {/* Inline Approval Controls */}
        {requiresApproval && isActive && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleQuickResponse('yes')}
              disabled={isSubmitting}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Approve Command"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleQuickResponse('no_feedback')}
              disabled={isSubmitting}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              title="Deny Command"
            >
              <XCircle className="w-4 h-4" />
              <span>Deny</span>
            </button>
            {onToggleControls && (
              <button
                onClick={onToggleControls}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                title="Custom Input"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Input</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detailed Approval Prompt (when approval required) */}
      {requiresApproval && isActive && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
          <div className="flex items-center space-x-2 mb-3">
            <Shield className="w-4 h-4 text-orange-600" />
            <div className="text-sm font-medium text-orange-800">
              {detailedPrompt}
            </div>
          </div>
          
          {/* Response Options */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-orange-700 uppercase mb-2">Choose an option:</div>
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

      {/* Command body - formatted as code */}
      <div className={clsx(
        'p-3 rounded-md font-mono text-sm mb-2 overflow-x-auto',
        requiresApproval ? 'bg-orange-900 text-orange-100 border border-orange-300' : 'bg-gray-900 text-green-400'
      )}>
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