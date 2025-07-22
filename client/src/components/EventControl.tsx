import React, { useState } from 'react';
import { HookEvent } from '../types';
import { commandsApi } from '../services/commands-api';

interface EventControlProps {
  event: HookEvent;
  onCommandSent?: () => void;
}

export const EventControl: React.FC<EventControlProps> = ({ event, onCommandSent }) => {
  const [showControls, setShowControls] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPreToolUse = event.hookType === 'pre_tool_use';
  const hasRisk = event.data.riskLevel && event.data.riskLevel !== 'low';
  
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.approveAction(
        event.agentId,
        event.sessionId,
        customReason || event.data.suggestedAction,
        event.timestamp // Use event timestamp as relatedEventId
      );
      onCommandSent?.();
      setShowControls(false);
    } catch (error) {
      console.error('Failed to approve:', error);
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
        customReason || 'Action denied from dashboard',
        feedback,
        event.timestamp
      );
      onCommandSent?.();
      setShowControls(false);
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
      onCommandSent?.();
      setShowControls(false);
      setFeedback('');
    } catch (error) {
      console.error('Failed to inject context:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    <div className={`border rounded-lg p-4 mb-3 ${hasRisk ? 'border-yellow-500' : 'border-gray-200'} ${event.data.requiresApproval ? 'bg-yellow-50' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{event.data.toolName || event.hookType}</span>
            {getRiskBadge()}
            {event.data.requiresApproval && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                APPROVAL REQUIRED
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(event.timestamp).toLocaleTimeString()} • Agent: {event.agentId}
          </div>
        </div>
        
        {isPreToolUse && (
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={isSubmitting}
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {event.data.suggestedAction && (
        <div className="text-sm text-gray-700 mb-2 p-2 bg-gray-50 rounded">
          <strong>Suggested Action:</strong> {event.data.suggestedAction}
        </div>
      )}

      <div className="text-sm text-gray-600">
        {event.data.toolArgs && (
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(event.data.toolArgs, null, 2)}
          </pre>
        )}
      </div>

      {showControls && (
        <div className="mt-4 border-t pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Custom reason for approval/denial"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback / Context Injection
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback or instructions to Claude"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Approve'}
            </button>
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Deny'}
            </button>
            {feedback && (
              <button
                onClick={handleInjectContext}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Inject Context'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};