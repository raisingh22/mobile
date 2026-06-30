type LogLevel = 'info' | 'warn' | 'error';

export class Logger {
  /**
   * Logs a message with context information.
   */
  static log(message: string, context?: any) {
    this.write('info', message, context);
  }

  /**
   * Logs a warning.
   */
  static warn(message: string, context?: any) {
    this.write('warn', message, context);
  }

  /**
   * Logs an error, ready to be transmitted to crash reporting frameworks.
   */
  static error(message: string, error?: any) {
    this.write('error', message, error);
    
    // Future integration slot:
    // Sentry.captureException(error || new Error(message));
    // crashlytics().recordError(error || new Error(message));
  }

  private static write(level: LogLevel, message: string, detail?: any) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(formatted, detail || '');
    } else if (level === 'warn') {
      console.warn(formatted, detail || '');
    } else {
      console.log(formatted, detail || '');
    }
  }
}
