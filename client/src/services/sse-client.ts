import { EventStreamData } from '@/types';

export type SSEEventCallback = (data: EventStreamData) => void;

export class SSEClient {
  private eventSource: EventSource | null = null;
  private callbacks: Set<SSEEventCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000; // Start with 1 second
  private isManuallyDisconnected = false;

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
  }

  subscribe(callback: SSEEventCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private createConnection(agentId?: string): void {
    this.cleanup();

    let url = `${this.baseUrl}/api/events/stream`;
    if (agentId) {
      url += `?agentId=${encodeURIComponent(agentId)}`;
    }

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
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
      
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect(agentId);
      }
    };
  }

  private scheduleReconnect(agentId?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isManuallyDisconnected) {
      console.error('Max reconnection attempts reached or manually disconnected');
      return;
    }

    this.cleanup();
    this.reconnectAttempts++;
    
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
}