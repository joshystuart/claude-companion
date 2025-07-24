import React, { useState } from 'react';
import { HookEvent } from '../types';
import { commandsApi } from '../services/commands-api';
import { analyzeEvent, isEventActive } from '@/utils/event-helpers';
import { useDashboardStore } from '@/store/dashboard-store';
import {
  BashEventCard,
  TodoEventCard,
  FileEventCard,
  EditEventCard,
  WebEventCard,
  TaskEventCard,
  NotificationEventCard,
  GenericEventCard
} from './event-cards';

interface EventControlProps {
  event: HookEvent;
  isLatest?: boolean;
  onCommandSent?: () => void;
}

export const EventControl: React.FC<EventControlProps> = ({ event, isLatest = false, onCommandSent }) => {
  const [showControls, setShowControls] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { events } = useDashboardStore();
  const eventInfo = analyzeEvent(event, events);
  const active = isEventActive(event, events);
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
      isLatest,
      onToggleControls: active ? () => setShowControls(!showControls) : undefined,
      showControls
    };

    switch (eventInfo.type) {
      case 'bash':
        return <BashEventCard {...cardProps} />;
      case 'todo':
        return <TodoEventCard {...cardProps} />;
      case 'file':
        return <FileEventCard {...cardProps} />;
      case 'edit':
        return <EditEventCard {...cardProps} />;
      case 'web':
        return <WebEventCard {...cardProps} />;
      case 'task':
        return <TaskEventCard {...cardProps} />;
      case 'notification':
        return <NotificationEventCard {...cardProps} />;
      default:
        return <GenericEventCard {...cardProps} />;
    }
  };

  return (
    <div>
      {renderEventCard()}
      
      {/* Control Panel - Only show for active events */}
      {showControls && active && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h5 className="text-sm font-medium text-gray-900 mb-3">
            Session Control - {event.agentId}
          </h5>
          
          <div className="space-y-4">
            {/* Emergency Interrupt Button - Prominent placement */}
            <div className="border-2 border-red-200 rounded-lg p-3 bg-red-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800">Emergency Control</span>
                <span className="text-xs text-red-600">⚠️ Immediate action</span>
              </div>
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await commandsApi.interruptSession(
                      event.agentId,
                      event.sessionId,
                      'Emergency interrupt from dashboard'
                    );
                    onCommandSent?.();
                    setShowControls(false);
                  } catch (error) {
                    console.error('Failed to interrupt session:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm"
                disabled={isSubmitting}
              >
                🛑 INTERRUPT CLAUDE (ESC)
              </button>
              <p className="text-xs text-red-600 mt-1">
                Immediately stops Claude's current execution, like pressing ESC in CLI
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions / Context
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide instructions or context for Claude..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            {/* For approval-required events, show approve/deny buttons */}
            {event.data.requiresApproval && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={handleDeny}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Denying...' : 'Deny'}
                </button>
              </div>
            )}

            {/* General session controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await commandsApi.continueSession(
                      event.agentId,
                      event.sessionId,
                      feedback || 'Continue with the task'
                    );
                    onCommandSent?.();
                    setFeedback('');
                    setShowControls(false);
                  } catch (error) {
                    console.error('Failed to continue session:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Continue Session
              </button>
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await commandsApi.stopSession(
                      event.agentId,
                      event.sessionId,
                      'Stopped by dashboard'
                    );
                    onCommandSent?.();
                    setShowControls(false);
                  } catch (error) {
                    console.error('Failed to stop session:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Stop Session
              </button>
            </div>

            {feedback && (
              <button
                onClick={handleInjectContext}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Inject Context Only'}
              </button>
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <p className="font-medium mb-1">How Session Control Works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Interrupt</strong>: Immediately stops execution (like ESC in CLI)</li>
              <li><strong>Continue</strong>: Sends instructions when Claude tries to stop</li>
              <li><strong>Stop</strong>: Forces Claude to end the current session</li>
              <li><strong>Inject Context</strong>: Sends guidance on the next tool use</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};