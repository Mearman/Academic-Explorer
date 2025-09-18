// Logger types
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory = "api" | "cache" | "graph" | "routing" | "ui" | "auth" | "storage" | "search" | "general" | "expansion" | "repository";

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

// Application Logger class
class ApplicationLogger {
	private logs: LogEntry[] = [];
	private listeners: ((logs: LogEntry[]) => void)[] = [];
	private config: LoggerConfig = {
		maxLogs: 1000,
		enableConsoleOutput: true, // Set to false to disable browser console output
		enableDebugLogs: false, // Set to true manually for development debugging
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
			component,
			stack: level === "error" ? new Error().stack : undefined,
		};

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
		this.log("debug", category, message, data, component);
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
		a.download = `academic-explorer-logs-${new Date().toISOString().split("T")[0]}.json`;
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

// Create and export the global logger instance
export const logger = new ApplicationLogger();

// Convenience functions for common logging patterns
export const logApiRequest = (url: string, method: string, status?: number, responseTime?: number) => {
	const level = status && status >= 400 ? "error" : status && status >= 300 ? "warn" : "debug";
	logger.log(level, "api", `${method} ${url}${status ? ` - ${String(status)}` : ""}`, {
		url,
		method,
		status,
		responseTime
	});
};

export const logCacheHit = (key: string, source: "memory" | "indexeddb" | "localstorage") => {
	logger.debug("cache", `Cache hit: ${key} from ${source}`, { key, source, hit: true });
};

export const logCacheMiss = (key: string) => {
	logger.debug("cache", `Cache miss: ${key}`, { key, hit: false });
};

export const logGraphOperation = (operation: string, nodeCount?: number, edgeCount?: number, duration?: number) => {
	logger.debug("graph", `Graph operation: ${operation}`, {
		operation,
		nodeCount,
		edgeCount,
		duration
	});
};

export const logRouteChange = (from: string, to: string, params?: Record<string, unknown>) => {
	logger.debug("routing", `Route change: ${from} → ${to}`, { from, to, params });
};

export const logUIInteraction = (component: string, action: string, data?: unknown) => {
	logger.debug("ui", `${component}: ${action}`, data, component);
};

export const logStorageOperation = (operation: "read" | "write" | "delete", key: string, size?: number) => {
	logger.debug("storage", `Storage ${operation}: ${key}${size ? ` (${String(size)} bytes)` : ""}`, {
		operation,
		key,
		size
	});
};

// Helper function to safely convert unknown error to Error object
const toError = (error: unknown): Error => {
	if (error instanceof Error) return error;
	return new Error(String(error));
};

export const logError = (message: string, error: unknown, component?: string, category: LogCategory = "general") => {
	const errorObj = toError(error);
	logger.error(category, message, {
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack
	}, component);
};

// React hook for using logger in components
import { useEffect } from "react";

export const useLogger = (componentName: string) => {
	useEffect(() => {
		logger.debug("ui", `Component mounted: ${componentName}`, undefined, componentName);

		return () => {
			logger.debug("ui", `Component unmounted: ${componentName}`, undefined, componentName);
		};
	}, [componentName]);

	return {
		debug: (message: string, data?: unknown) => { logger.debug("ui", message, data, componentName); },
		info: (message: string, data?: unknown) => { logger.debug("ui", message, data, componentName); },
		warn: (message: string, data?: unknown) => { logger.warn("ui", message, data, componentName); },
		error: (message: string, data?: unknown) => { logger.error("ui", message, data, componentName); },
	};
};

// Global error handler setup
export const setupGlobalErrorHandling = () => {
	// Handle unhandled promise rejections
	window.addEventListener("unhandledrejection", (event) => {
		const reason = typeof event.reason === "string" ? event.reason : String(event.reason);
		logError("Unhandled promise rejection", new Error(reason), "global");
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

		logError("JavaScript error", event.error instanceof Error ? event.error : new Error(event.message), event.filename);
	});

	// Handle React error boundaries (if you set up the logger in an error boundary)
	logger.debug("general", "Global error handling initialized", {}, "setupGlobalErrorHandling");
};