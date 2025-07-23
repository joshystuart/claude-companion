import React, { useState } from 'react';
import { HookEvent } from '../types';
import { commandsApi } from '../services/commands-api';
import { analyzeEvent, isEventActive } from '@/utils/event-helpers';
import {
  BashEventCard,
  TodoEventCard,
  FileEventCard,
  WebEventCard,
  TaskEventCard,
  GenericEventCard
} from './event-cards';

interface EventControlProps {
  event: HookEvent;
  onCommandSent?: () => void;
}

export const EventControl: React.FC<EventControlProps> = ({ event, onCommandSent }) => {
  const [showControls, setShowControls] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventInfo = analyzeEvent(event);
  const active = isEventActive(event);
  const isPreToolUse = event.hookType === 'pre_tool_use';
  
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

  const renderEventCard = () => {
    const cardProps = {
      event,
      isActive: active,
      onToggleControls: active && isPreToolUse ? () => setShowControls(!showControls) : undefined,
      showControls
    };

    switch (eventInfo.type) {
      case 'bash':
        return <BashEventCard {...cardProps} />;
      case 'todo':
        return <TodoEventCard {...cardProps} />;
      case 'file':
        return <FileEventCard {...cardProps} />;
      case 'web':
        return <WebEventCard {...cardProps} />;
      case 'task':
        return <TaskEventCard {...cardProps} />;
      default:
        return <GenericEventCard {...cardProps} />;
    }
  };

  return (
    <div>
      {renderEventCard()}
      
      {/* Control Panel - Only show for active pre-tool-use events */}
      {showControls && active && isPreToolUse && (
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
        </div>
      )}
    </div>
  );
};