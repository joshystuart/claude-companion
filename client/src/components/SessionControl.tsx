import React, { useState } from 'react';
import { Agent } from '../types';
import { commandsApi } from '../services/commands-api';

interface SessionControlProps {
  agent: Agent;
  onCommandSent?: () => void;
}

export const SessionControl: React.FC<SessionControlProps> = ({ agent, onCommandSent }) => {
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (error) {
      console.error('Failed to stop session:', error);
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
    } catch (error) {
      console.error('Failed to inject context:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Session Control - {agent.id}</h3>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${
            agent.status === 'active' ? 'bg-green-500' : 
            agent.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
          }`} />
          <span className="text-sm font-medium">
            Status: {agent.status}
          </span>
        </div>
        {agent.sessionId && (
          <div className="text-xs text-gray-500">
            Session: {agent.sessionId}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructions / Context
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Provide instructions or context for Claude..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleContinue}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting || agent.status !== 'active'}
          >
            Continue Session
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting || agent.status !== 'active'}
          >
            Stop Session
          </button>
        </div>

        {instructions && (
          <button
            onClick={handleInjectContext}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Inject Context Only
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">How Session Control Works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Continue</strong>: Sends instructions when Claude tries to stop</li>
          <li><strong>Stop</strong>: Forces Claude to end the current session</li>
          <li><strong>Inject Context</strong>: Sends guidance on the next tool use</li>
        </ul>
      </div>
    </div>
  );
};