import React, { useEffect, useState } from 'react';
import { RemoteCommand } from '../types';
import { commandsApi } from '../services/commands-api';

export const CommandHistory: React.FC = () => {
  const [commands, setCommands] = useState<RemoteCommand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommands();
    // Refresh every 5 seconds
    const interval = setInterval(loadCommands, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCommands = async () => {
    try {
      const allCommands = await commandsApi.getAllCommands();
      setCommands(allCommands.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RemoteCommand['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getCommandIcon = (type: RemoteCommand['type']) => {
    const icons = {
      approve: '✅',
      deny: '❌',
      context: '💬',
      continue: '▶️',
      stop: '⏹️',
    };
    return icons[type] || '❓';
  };

  if (loading) {
    return <div className="text-center py-4">Loading command history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Command History</h2>
      
      {commands.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No commands sent yet</p>
      ) : (
        <div className="space-y-3">
          {commands.map((command) => (
            <div key={command.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCommandIcon(command.type)}</span>
                  <span className="font-medium">{command.type}</span>
                  {getStatusBadge(command.status)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(command.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <div>Agent: {command.agentId}</div>
                {command.payload.reason && (
                  <div className="mt-1">Reason: {command.payload.reason}</div>
                )}
                {command.payload.feedback && (
                  <div className="mt-1">Feedback: {command.payload.feedback}</div>
                )}
                {command.payload.instructions && (
                  <div className="mt-1">Instructions: {command.payload.instructions}</div>
                )}
              </div>
              
              {command.status === 'pending' && (
                <div className="mt-2 text-xs text-orange-600">
                  Expires: {new Date(command.expiresAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};