import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { useSSE } from '@/hooks/use-sse';
import { getOfflineCommandQueue } from '../services/offlineCommandQueue';

export const EnhancedConnectionStatus: React.FC = () => {
  const { connectionStatus } = useDashboardStore();
  const { status, reconnectAttempts } = useSSE();
  const [queueSize, setQueueSize] = useState(0);
  const [reconnectingFor, setReconnectingFor] = useState(0);

  useEffect(() => {
    const offlineQueue = getOfflineCommandQueue();
    
    // Update queue size periodically
    const updateQueueSize = () => {
      setQueueSize(offlineQueue.getQueueSize());
    };
    
    const queueInterval = setInterval(updateQueueSize, 1000);
    updateQueueSize(); // Initial update

    return () => {
      clearInterval(queueInterval);
    };
  }, []);

  useEffect(() => {
    // Track reconnection time when status is reconnecting
    let reconnectTimer: NodeJS.Timeout | null = null;
    
    if (status === 'reconnecting') {
      setReconnectingFor(0);
      reconnectTimer = setInterval(() => {
        setReconnectingFor(prev => prev + 1);
      }, 1000);
    } else {
      setReconnectingFor(0);
    }

    return () => {
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
      }
    };
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'reconnecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        if (reconnectAttempts > 0) {
          return `Reconnecting... (attempt ${reconnectAttempts}, ${reconnectingFor}s)`;
        }
        return `Reconnecting... (${reconnectingFor}s)`;
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        <span>{getStatusIcon()}</span>
        <span className="font-medium">{getStatusText()}</span>
      </div>
      
      {queueSize > 0 && (
        <div className="text-orange-600 text-xs">
          <span className="font-medium">{queueSize}</span> queued
        </div>
      )}
      
      {status === 'reconnecting' && (
        <div className="animate-pulse text-xs text-gray-500">
          Attempting to reconnect...
        </div>
      )}
      
      {reconnectAttempts > 3 && (
        <div className="text-red-500 text-xs">
          Connection issues detected
        </div>
      )}
    </div>
  );
};