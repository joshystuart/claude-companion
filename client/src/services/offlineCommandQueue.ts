export interface QueuedCommand {
  command: any;
  timestamp: number;
  retries: number;
  id: string;
}

export interface OfflineCommandQueue {
  enqueue(command: any): string;
  flush(): Promise<void>;
  clear(): void;
  getQueueSize(): number;
  getPendingCommands(): QueuedCommand[];
}

class OfflineCommandQueueImpl implements OfflineCommandQueue {
  private queue: QueuedCommand[] = [];
  private maxRetries = 3;
  private isFlushingQueue = false;

  enqueue(command: any): string {
    const id = this.generateId();
    const queuedCommand: QueuedCommand = {
      command,
      timestamp: Date.now(),
      retries: 0,
      id
    };
    
    this.queue.push(queuedCommand);
    console.log(`Command queued for offline: ${id}`);
    
    return id;
  }

  async flush(): Promise<void> {
    if (this.isFlushingQueue || this.queue.length === 0) {
      return;
    }

    this.isFlushingQueue = true;
    console.log(`Flushing ${this.queue.length} queued commands...`);

    const commandsToProcess = [...this.queue];
    
    for (const item of commandsToProcess) {
      try {
        await this.sendCommand(item.command);
        
        // Remove from queue on success
        this.queue = this.queue.filter(q => q.id !== item.id);
        console.log(`Successfully sent queued command: ${item.id}`);
        
      } catch (error) {
        item.retries++;
        console.warn(`Failed to send command ${item.id} (attempt ${item.retries}):`, error);
        
        if (item.retries >= this.maxRetries) {
          // Discard after max retries
          this.queue = this.queue.filter(q => q.id !== item.id);
          console.error(`Discarding command ${item.id} after ${this.maxRetries} failed attempts`);
        }
      }
    }

    this.isFlushingQueue = false;
  }

  clear(): void {
    this.queue = [];
    console.log('Command queue cleared');
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getPendingCommands(): QueuedCommand[] {
    return [...this.queue];
  }

  private async sendCommand(command: any): Promise<void> {
    const response = await fetch('/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cmd-${timestamp}-${random}`;
  }
}

// Create singleton instance
let instance: OfflineCommandQueue | null = null;

export function getOfflineCommandQueue(): OfflineCommandQueue {
  if (!instance) {
    instance = new OfflineCommandQueueImpl();
  }
  return instance;
}

export function createOfflineCommandQueue(): OfflineCommandQueue {
  return new OfflineCommandQueueImpl();
}