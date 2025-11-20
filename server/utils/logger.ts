/**
 * Centralized logging utility for the application
 * Replaces console.log/error/warn with structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service?: string;
  message: string;
  data?: any;
}

class Logger {
  private serviceName: string;
  private isDevelopment: boolean;

  constructor(serviceName: string = 'app') {
    this.serviceName = serviceName;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.formatTimestamp();
    const time = new Date(timestamp).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
    
    let formattedMessage = `${time} [${this.serviceName}] ${message}`;
    
    if (data !== undefined) {
      formattedMessage += ` :: ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, data);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.log(`[DEBUG] ${formattedMessage}`);
        }
        break;
      case 'info':
      default:
        console.log(formattedMessage);
        break;
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.log('error', message, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      });
    } else if (error) {
      this.log('error', message, error);
    } else {
      this.log('error', message);
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

/**
 * Default logger instance
 */
export const logger = new Logger('server');
