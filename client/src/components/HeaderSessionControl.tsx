import React, { useState } from 'react';
import { Agent } from '@/types';
import { commandsApi } from '@/services/commands-api';
import { formatAgentDisplayName } from '@/utils/agent-helpers';
import { ChevronDown, Square, Play, Pause } from 'lucide-react';
import clsx from 'clsx';

interface HeaderSessionControlProps {
  agent: Agent | null;
  onCommandSent?: () => void;
}

export const HeaderSessionControl: React.FC<HeaderSessionControlProps> = ({ 
  agent, 
  onCommandSent 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't render if no agent selected
  if (!agent) {
    return null;
  }

  const displayName = formatAgentDisplayName(agent.id);

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.continueSession(
        agent.id,
        agent.sessionId || '',
        instructions || 'Continue with the task'
      );
      onCommandSent?.();
      setInstructions('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to continue session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.stopSession(
        agent.id,
        agent.sessionId || '',
        'Stopped by dashboard'
      );
      onCommandSent?.();
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to stop session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterrupt = async () => {
    setIsSubmitting(true);
    try {
      await commandsApi.interruptSession(
        agent.id,
        agent.sessionId || '',
        'Emergency interrupt from dashboard'
      );
      onCommandSent?.();
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to interrupt session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInjectContext = async () => {
    if (!instructions) return;
    
    setIsSubmitting(true);
    try {
      await commandsApi.injectContext(
        agent.id,
        agent.sessionId || '',
        instructions
      );
      onCommandSent?.();
      setInstructions('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to inject context:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'text-green-600';
      case 'idle':
        return 'text-yellow-600';
      case 'offline':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="relative">
      {/* Main Control Bar */}
      <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg border">
        {/* Agent Info */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className={clsx('w-2 h-2 rounded-full', {
            'bg-green-500': agent.status === 'active',
            'bg-yellow-500': agent.status === 'idle',
            'bg-gray-400': agent.status === 'offline'
          })} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-gray-900 truncate">
              {displayName.primary}
            </span>
            {displayName.secondary && (
              <span className="text-xs text-gray-500 font-mono">
                {displayName.secondary}
              </span>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Emergency Interrupt - Always visible */}
          <button
            onClick={handleInterrupt}
            disabled={isSubmitting || agent.status !== 'active'}
            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Emergency Interrupt (ESC)"
          >
            <Square className="w-3 h-3" />
          </button>

          {/* Continue */}
          <button
            onClick={handleContinue}
            disabled={isSubmitting || agent.status !== 'active'}
            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Continue Session"
          >
            <Play className="w-3 h-3" />
          </button>

          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={isSubmitting || agent.status !== 'active'}
            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Stop Session"
          >
            <Pause className="w-3 h-3" />
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            title="More Options"
          >
            <ChevronDown className={clsx('w-3 h-3 transition-transform', {
              'rotate-180': isExpanded
            })} />
          </button>
        </div>
      </div>

      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-4">
            {/* Status Info */}
            <div className="text-xs text-gray-500 border-b pb-2">
              <div className="flex justify-between">
                <span>Status: <span className={getStatusColor()}>{agent.status}</span></span>
                {agent.sessionId && (
                  <span>Session: {agent.sessionId.slice(0, 8)}...</span>
                )}
              </div>
            </div>

            {/* Instructions Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Instructions / Context
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Provide instructions or context..."
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {instructions && (
                <button
                  onClick={handleInjectContext}
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Injecting...' : 'Inject Context Only'}
                </button>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleContinue}
                  disabled={isSubmitting || agent.status !== 'active'}
                  className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Continue'}
                </button>
                <button
                  onClick={handleStop}
                  disabled={isSubmitting || agent.status !== 'active'}
                  className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Stopping...' : 'Stop'}
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <div className="space-y-1">
                <div><strong>Interrupt:</strong> Immediate stop (ESC)</div>
                <div><strong>Continue:</strong> Resume with instructions</div>
                <div><strong>Stop:</strong> End current session</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};