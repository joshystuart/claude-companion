import { appendFileSync } from 'fs';

const LOG_FILE = '/tmp/claude-companion-debug.log';

export interface LogContext {
  hookType: 'pre-tool' | 'post-tool' | 'notification' | 'stop';
  action?: string;
  file?: string;
  agentId?: string;
  sessionId?: string;
}

export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: string, context: LogContext, message: string, data?: any): string {
    const timestamp = this.formatTimestamp();
    const contextStr = `[${context.hookType}${context.action ? `:${context.action}` : ''}${context.file ? `:${context.file}` : ''}]`;
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} ${contextStr} ${message}${dataStr}\n`;
  }

  private static writeLog(formatted: string): void {
    try {
      appendFileSync(LOG_FILE, formatted);
    } catch (error) {
      // Fallback to stderr if file write fails
      console.error('Failed to write to log file:', error);
      console.error('Log message:', formatted.trim());
    }
  }

  static info(context: LogContext, message: string, data?: any): void {
    const formatted = this.formatMessage('info', context, message, data);
    this.writeLog(formatted);
  }

  static debug(context: LogContext, message: string, data?: any): void {
    const formatted = this.formatMessage('debug', context, message, data);
    this.writeLog(formatted);
  }

  static error(context: LogContext, message: string, error?: any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    const formatted = this.formatMessage('error', context, message, errorData);
    this.writeLog(formatted);
  }

  static warn(context: LogContext, message: string, data?: any): void {
    const formatted = this.formatMessage('warn', context, message, data);
    this.writeLog(formatted);
  }

  // Convenience methods for each hook type
  static preToolUse = {
    info: (message: string, data?: any) => Logger.info({ hookType: 'pre-tool' }, message, data),
    debug: (message: string, data?: any) => Logger.debug({ hookType: 'pre-tool' }, message, data),
    error: (message: string, error?: any) => Logger.error({ hookType: 'pre-tool' }, message, error),
    warn: (message: string, data?: any) => Logger.warn({ hookType: 'pre-tool' }, message, data),
  };

  static postToolUse = {
    info: (message: string, data?: any) => Logger.info({ hookType: 'post-tool' }, message, data),
    debug: (message: string, data?: any) => Logger.debug({ hookType: 'post-tool' }, message, data),
    error: (message: string, error?: any) => Logger.error({ hookType: 'post-tool' }, message, error),
    warn: (message: string, data?: any) => Logger.warn({ hookType: 'post-tool' }, message, data),
  };

  static notification = {
    info: (message: string, data?: any) => Logger.info({ hookType: 'notification' }, message, data),
    debug: (message: string, data?: any) => Logger.debug({ hookType: 'notification' }, message, data),
    error: (message: string, error?: any) => Logger.error({ hookType: 'notification' }, message, error),
    warn: (message: string, data?: any) => Logger.warn({ hookType: 'notification' }, message, data),
  };

  static stop = {
    info: (message: string, data?: any) => Logger.info({ hookType: 'stop' }, message, data),
    debug: (message: string, data?: any) => Logger.debug({ hookType: 'stop' }, message, data),
    error: (message: string, error?: any) => Logger.error({ hookType: 'stop' }, message, error),
    warn: (message: string, data?: any) => Logger.warn({ hookType: 'stop' }, message, data),
  };
}