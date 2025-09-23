/**
 * Generic logger implementation for Academic Explorer packages
 * This is a generic logger that doesn't depend on any domain-specific types
 */

// Logger types - kept generic for reuse across packages
export type LogLevel = "debug" | "info" | "warn" | "error";

// Generic categories - packages can extend this as needed
export type LogCategory =
  | "api"
  | "cache"
  | "storage"
  | "general"
  | "auth"
  | "search"
  | "hooks"
  | "worker"
  | "execution"
  | string; // Allow extension by packages

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  component?: string;
  stack?: string;
}

// Logger configuration
interface LoggerConfig {
  maxLogs: number;
  enableConsoleOutput: boolean;
  enableDebugLogs: boolean;
}

// Generic Logger class
export class GenericLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private config: LoggerConfig = {
    maxLogs: 1000,
    enableConsoleOutput: true,
    enableDebugLogs: true,
  };

  log(level: LogLevel, category: LogCategory, message: string, data?: unknown, component?: string) {
    // Skip debug logs if disabled
    if (level === "debug" && !this.config.enableDebugLogs) {
      return;
    }

    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    if (component !== undefined) {
      entry.component = component;
    }

    if (level === "error") {
      const stack = new Error().stack;
      if (stack !== undefined) {
        entry.stack = stack;
      }
    }

    this.logs.unshift(entry);

    // Keep only recent logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => { listener([...this.logs]); });

    // Also log to console if enabled
    if (this.config.enableConsoleOutput) {
      const logMessage = `[${category}] ${message}`;
      const logData = data || "";

      if (level === "debug") {
        console.debug(logMessage, logData);
      } else if (level === "info") {
        console.info(logMessage, logData);
      } else if (level === "warn") {
        console.warn(logMessage, logData);
      } else {
        console.error(logMessage, logData);
      }
    }
  }

  debug(category: LogCategory, message: string, data?: unknown, component?: string) {
    this.log("debug", category, message, data, component);
  }

  info(category: LogCategory, message: string, data?: unknown, component?: string) {
    this.log("info", category, message, data, component);
  }

  warn(category: LogCategory, message: string, data?: unknown, component?: string) {
    this.log("warn", category, message, data, component);
  }

  error(category: LogCategory, message: string, data?: unknown, component?: string) {
    this.log("error", category, message, data, component);
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => { listener([]); });
  }

  updateConfig(newConfig: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  exportLogs() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig() {
    return { ...this.config };
  }
}

// Helper function to safely convert unknown error to Error object
const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;

  // Capture stack trace to find actual caller
  console.error("toError called with non-Error:", error, "Stack:", new Error().stack);

  // Convert string errors to Error objects preserving the message
  if (typeof error === "string") {
    return new Error(error);
  }

  // Simple fallback without any complex operations
  return new Error("Unknown error occurred");
};

// Convenience functions for common logging patterns
export const createApiLogger = (logger: GenericLogger) => ({
  logRequest: (url: string, method: string, status?: number, responseTime?: number) => {
    const level = status && status >= 400 ? "error" : status && status >= 300 ? "warn" : "debug";
    logger.log(level, "api", `${method} ${url}${status ? ` - ${String(status)}` : ""}`, {
      url,
      method,
      status,
      responseTime
    });
  }
});

export const createCacheLogger = (logger: GenericLogger) => ({
  logHit: (key: string, source: "memory" | "indexeddb" | "localstorage") => {
    logger.debug("cache", `Cache hit: ${key} from ${source}`, { key, source, hit: true });
  },
  logMiss: (key: string) => {
    logger.debug("cache", `Cache miss: ${key}`, { key, hit: false });
  }
});

export const createStorageLogger = (logger: GenericLogger) => ({
  logOperation: (operation: "read" | "write" | "delete", key: string, size?: number) => {
    logger.debug("storage", `Storage ${operation}: ${key}${size ? ` (${String(size)} bytes)` : ""}`, {
      operation,
      key,
      size
    });
  }
});

export const logError = (logger: GenericLogger, message: string, error: unknown, component?: string, category: LogCategory = "general") => {
  const errorObj = toError(error);
  logger.error(category, message, {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack
  }, component);
};

// Global error handler setup - generic for any browser environment
export const setupGlobalErrorHandling = (logger: GenericLogger) => {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    try {
      logError(logger, "Unhandled promise rejection", event.reason, "global");
    } catch {
      // Fallback to console if logging fails to prevent infinite loops
      console.error("Unhandled promise rejection (logger failed):", event.reason);
    }
  });

  // Handle JavaScript errors
  window.addEventListener("error", (event) => {
    const errorMessage = (event.error instanceof Error ? event.error.message : undefined) || event.message || "";

    // Filter out benign ResizeObserver errors
    if (typeof errorMessage === "string" && errorMessage.includes("ResizeObserver loop completed with undelivered notifications")) {
      // This is a benign browser warning that occurs when ResizeObserver
      // callbacks take too long or trigger layout changes. It's not actionable
      // and doesn't indicate a real error in the application.
      return;
    }

    logError(logger, "JavaScript error", event.error instanceof Error ? event.error : new Error(event.message), event.filename);
  });

  logger.debug("general", "Global error handling initialized", {}, "setupGlobalErrorHandling");
};

// Export a singleton logger instance for simple usage
export const logger = new GenericLogger();