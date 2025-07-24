import React, { useState } from 'react';
import { HookEvent } from '@/types';
import { commandsApi } from '@/services/commands-api';
import { Clock, User, MessageSquare, Send, Pause } from 'lucide-react';
import clsx from 'clsx';

interface InputPromptCardProps {
  event: HookEvent;
  isActive: boolean;
  isLatest?: boolean;
}

export const InputPromptCard: React.FC<InputPromptCardProps> = ({
  event,
  isActive,
  isLatest = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;
    
    setIsSubmitting(true);
    try {
      await commandsApi.injectContext(
        event.agentId,
        event.sessionId,
        prompt,
        event.timestamp
      );
      setPrompt('');
    } catch (error) {
      console.error('Failed to send prompt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <div className={clsx(
      'border rounded-lg p-4 mb-2 transition-all duration-500',
      isLatest ? 'ring-2 ring-blue-400 bg-blue-50 shadow-lg animate-spotlight-pulse' : 'border-purple-300 bg-purple-50',
      isActive && 'shadow-md'
    )}>
      {isLatest && (
        <div className="text-xs text-blue-600 font-semibold mb-2 animate-fade-in">
          LATEST EVENT
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-xl">⏸️</span>
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Pause className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-900">Claude is waiting for input</h4>
              <span className="px-2 py-1 text-xs font-medium rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                INPUT REQUIRED
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
             Claude has finished and is ready for your next prompt
            </p>
          </div>
        </div>
      </div>

      {/* Session End Message */}
      <div className="p-3 rounded-md mb-3 border-l-4 bg-purple-50 border-purple-400">
        <div className="text-sm text-gray-800">
          {event.data.message || 'Claude is ready for your next instruction'}
        </div>
      </div>

      {/* Input Interface */}
      <div className="bg-white border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-2 mb-3">
          <MessageSquare className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your next prompt for Claude:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="What would you like Claude to do next? (Ctrl+Enter to send)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 mt-1">
              Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to send quickly
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            This will send your prompt to Claude and resume the session
          </div>
          
          <button
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Sending...' : 'Send Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setPrompt('continue')}
          disabled={isSubmitting}
          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          Continue Previous Task
        </button>
        <button
          onClick={() => setPrompt('stop')}
          disabled={isSubmitting}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Stop Session
        </button>
        <button
          onClick={() => setPrompt('help')}
          disabled={isSubmitting}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          Show Help
        </button>
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center space-x-1">
          <User className="w-3 h-3" />
          <span>{event.agentId}</span>
        </div>
        <div>
          <span>Type: session_end</span>
        </div>
        <div className="flex items-center space-x-1">
          <Pause className="w-3 h-3 text-purple-500" />
          <span className="text-purple-600 font-medium">Waiting for Input</span>
        </div>
      </div>
    </div>
  );
};