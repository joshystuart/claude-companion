import React, { useState } from 'react';
import { HookEvent } from '@/types';
import { getCommandDetails, getCommandDescription, getCommandRiskLevel, getCommandIcon } from '@/utils/command-helpers';
import { commandsApi } from '@/services/commands-api';
import { Clock, User, ShieldAlert, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface NotificationEventCardProps {
  event: HookEvent;
  isActive: boolean;
  onToggleControls?: () => void;
  showControls?: boolean;
}

export const NotificationEventCard: React.FC<NotificationEventCardProps> = ({
  event,
  isActive,
  onToggleControls,
  showControls
}) => {
  const [customReason, setCustomReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresApproval = event.data.requiresApproval;
  const commandDetails = getCommandDetails(event);
  const commandDescription = getCommandDescription(event);
  const riskLevel = getCommandRiskLevel(event);
  const commandIcon = getCommandIcon(event);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.approveAction(
        event.agentId,
        event.sessionId,
        customReason || event.data.suggestedAction,
        event.timestamp
      );
      setCustomReason('');
      setFeedback('');
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
      setCustomReason('');
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

  const getRiskBadgeColor = () => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCardBorderColor = () => {
    if (requiresApproval && isActive) {
      switch (riskLevel) {
        case 'high':
          return 'border-red-400 bg-red-50';
        case 'medium':
          return 'border-orange-400 bg-orange-50';
        case 'low':
          return 'border-blue-400 bg-blue-50';
        default:
          return 'border-orange-400 bg-orange-50';
      }
    }
    return 'border-gray-200 bg-white';
  };

  return (
    <div className={clsx(
      'border rounded-lg p-4 mb-3 transition-all',
      getCardBorderColor(),
      requiresApproval && isActive && 'shadow-md'
    )}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-xl">{commandIcon}</span>
          
          <div className="flex flex-col">
            {requiresApproval ? (
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-gray-900">Approval Required</h4>
                <span className={clsx('px-2 py-1 text-xs font-medium rounded-full border', getRiskBadgeColor())}>
                  {riskLevel.toUpperCase()} RISK
                </span>
              </div>
            ) : (
              <h4 className="font-medium text-gray-900">Notification</h4>
            )}
            
            <p className="text-sm text-gray-600 mt-1">{commandDescription}</p>
          </div>
        </div>

        {/* Quick Actions for Approval Events */}
        {requiresApproval && isActive && !showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
              title="Quick Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeny}
              disabled={isSubmitting}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
              title="Quick Deny"
            >
              <XCircle className="w-4 h-4" />
            </button>
            {onToggleControls && (
              <button
                onClick={onToggleControls}
                className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                title="More Options"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Toggle Controls Button for Non-Approval Events */}
        {!requiresApproval && isActive && onToggleControls && (
          <button
            onClick={onToggleControls}
            className="text-sm px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
          >
            {showControls ? 'Hide Controls' : 'Control'}
          </button>
        )}
      </div>

      {/* Command Details */}
      <div className={clsx(
        'p-3 rounded-md mb-3 border-l-4',
        requiresApproval ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-gray-300'
      )}>
        <div className="text-sm text-gray-800">
          {/* For tool-based events, show "Claude wants to..." format */}
          {event.data.toolName ? (
            <span className="font-mono">Claude wants to {commandDetails}</span>
          ) : (
            /* For notifications/stops, show the message directly */
            <span>{commandDetails}</span>
          )}
        </div>
      </div>

      {/* Additional Message Content (only if different from command details) */}
      {event.data.message && event.data.toolName && (
        <div className="text-sm text-gray-600 mb-3">
          {event.data.message}
        </div>
      )}

      {/* Suggested Action */}
      {event.data.suggestedAction && (
        <div className="bg-blue-50 p-2 rounded-md mb-3 border-l-4 border-blue-400">
          <div className="text-xs font-medium text-blue-700 uppercase mb-1">Suggested Action</div>
          <p className="text-sm text-gray-700">{event.data.suggestedAction}</p>
        </div>
      )}

      {/* Expanded Controls */}
      {showControls && isActive && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Event Controls</h5>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Custom reason for approval/denial"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-2">
              {requiresApproval && (
                <>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={handleDeny}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Denying...' : 'Deny'}
                  </button>
                </>
              )}
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
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
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
        {requiresApproval && isActive && (
          <div className="flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3 text-orange-500" />
            <span className="text-orange-600 font-medium">Awaiting Approval</span>
          </div>
        )}
      </div>
    </div>
  );
};