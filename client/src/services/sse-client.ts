import { EventStreamData } from '@/types';
import { getOfflineCommandQueue } from './offlineCommandQueue';

export type SSEEventCallback = (data: EventStreamData) => void;
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;

export class SSEClient {
  private eventSource: EventSource | null = null;
  private callbacks: Set<SSEEventCallback> = new Set();
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 10; // Increased for better resilience
  private reconnectAttempts = 0;
  private reconnectDelay = 1000; // Start with 1 second
  private isManuallyDisconnected = false;
  private currentStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

  constructor(
    private baseUrl: string = 'http://localhost:3000'
  ) {}

  connect(agentId?: string): void {
    this.isManuallyDisconnected = false;
    this.createConnection(agentId);
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.cleanup();
    this.updateStatus('disconnected');
  }

  subscribe(callback: SSEEventCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.currentStatus);
    return () => this.statusCallbacks.delete(callback);
  }

  private createConnection(agentId?: string): void {
    this.cleanup();
    this.updateStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    let url = `${this.baseUrl}/api/events/stream`;
    if (agentId) {
      url += `?agentId=${encodeURIComponent(agentId)}`;
    }

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.updateStatus('connected');
      
      // Flush offline command queue when reconnected
      const offlineQueue = getOfflineCommandQueue();
      offlineQueue.flush().catch(error => {
        console.error('Failed to flush offline command queue:', error);
      });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data: EventStreamData = JSON.parse(event.data);
        this.callbacks.forEach(callback => callback(data));
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.updateStatus('disconnected');
      
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect(agentId);
      }
    };
  }

  private scheduleReconnect(agentId?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isManuallyDisconnected) {
      console.error('Max reconnection attempts reached or manually disconnected');
      this.updateStatus('disconnected');
      return;
    }

    this.cleanup();
    this.reconnectAttempts++;
    this.updateStatus('reconnecting');
    
    console.log(`Attempting to reconnect in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyDisconnected) {
        this.createConnection(agentId);
      }
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      30000 // Max 30 seconds
    );
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  getConnectionState(): 'connecting' | 'open' | 'closed' {
    if (!this.eventSource) return 'closed';
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting';
      case EventSource.OPEN:
        return 'open';
      case EventSource.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }

  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    return this.currentStatus;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  private updateStatus(newStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'): void {
    if (this.currentStatus !== newStatus) {
      this.currentStatus = newStatus;
      this.statusCallbacks.forEach(callback => {
        try {
          callback(newStatus);
        } catch (error) {
          console.error('Error in status callback:', error);
        }
      });
    }
  }
}