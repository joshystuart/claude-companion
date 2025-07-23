export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface ConnectionStatusListener {
  (status: ConnectionStatus): void;
}

export interface EventStreamManager {
  connect(): void;
  disconnect(): void;
  getStatus(): ConnectionStatus;
  onStatusChange(listener: ConnectionStatusListener): () => void;
  onEvent(listener: (event: any) => void): () => void;
}

class EventStreamManagerImpl implements EventStreamManager {
  private eventSource: EventSource | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30 seconds max
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private eventListeners: Set<(event: any) => void> = new Set();
  private serverUrl: string;

  constructor(serverUrl: string = '/api/events') {
    this.serverUrl = serverUrl;
  }

  connect(): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.updateStatus('connecting');
    this.eventSource = new EventSource(this.serverUrl);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.eventListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.warn('EventSource error:', error);
      this.handleConnectionError();
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatusChange(listener: ConnectionStatusListener): () => void {
    this.statusListeners.add(listener);
    
    // Immediately call with current status
    listener(this.status);
    
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onEvent(listener: (event: any) => void): () => void {
    this.eventListeners.add(listener);
    
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private handleConnectionError(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStatus('disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.updateStatus('reconnecting');

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private updateStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(listener => {
        try {
          listener(newStatus);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      });
    }
  }
}

// Create singleton instance
let instance: EventStreamManager | null = null;

export function getEventStreamManager(serverUrl?: string): EventStreamManager {
  if (!instance) {
    instance = new EventStreamManagerImpl(serverUrl);
  }
  return instance;
}

export function createEventStreamManager(serverUrl?: string): EventStreamManager {
  return new EventStreamManagerImpl(serverUrl);
}