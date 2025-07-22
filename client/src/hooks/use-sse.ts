import { useEffect, useRef, useState } from 'react';
import { SSEClient } from '@/services/sse-client';
import { useDashboardStore } from '@/store/dashboard-store';
import { EventStreamData, HookEvent, Agent } from '@/types';
import toast from 'react-hot-toast';

export function useSSE(agentId?: string) {
  const [client, setClient] = useState<SSEClient | null>(null);
  const clientRef = useRef<SSEClient | null>(null);
  
  const {
    setConnectionStatus,
    addEvent,
    updateAgent,
  } = useDashboardStore();

  useEffect(() => {
    // Create SSE client
    const sseClient = new SSEClient();
    clientRef.current = sseClient;
    setClient(sseClient);

    // Subscribe to events
    const unsubscribe = sseClient.subscribe((data: EventStreamData) => {
      switch (data.type) {
        case 'connected':
          setConnectionStatus('connected');
          toast.success('Connected to event stream');
          break;
          
        case 'hook_event':
          const hookEvent = data.data as HookEvent;
          addEvent(hookEvent);
          break;
          
        case 'agent_status':
          const agent = data.data as Agent;
          updateAgent(agent);
          break;
          
        case 'error':
          const errorData = data.data as { message: string };
          toast.error(`Server error: ${errorData.message}`);
          setConnectionStatus('error');
          break;
          
        default:
          console.log('Unknown event type:', data.type);
      }
    });

    // Connect to server
    setConnectionStatus('connecting');
    sseClient.connect(agentId);

    // Cleanup on unmount
    return () => {
      unsubscribe();
      sseClient.disconnect();
      clientRef.current = null;
    };
  }, [agentId, setConnectionStatus, addEvent, updateAgent]);

  const disconnect = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setConnectionStatus('disconnected');
    }
  };

  const reconnect = () => {
    if (clientRef.current) {
      setConnectionStatus('connecting');
      clientRef.current.connect(agentId);
    }
  };

  const connectionState = client?.getConnectionState() || 'closed';

  return {
    client,
    connectionState,
    disconnect,
    reconnect,
  };
}