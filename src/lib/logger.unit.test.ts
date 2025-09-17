/**
 * Unit tests for the logger module
 * Testing all logger functionality including configuration, convenience functions, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	logger,
	logApiRequest,
	logCacheHit,
	logCacheMiss,
	logGraphOperation,
	logRouteChange,
	logUIInteraction,
	logStorageOperation,
	logError,
	setupGlobalErrorHandling
} from "./logger";

describe("Logger Module", () => {
	beforeEach(() => {
		// Clear logs and reset config before each test
		logger.clear();
		logger.configure({
			maxLogs: 1000,
			enableConsoleOutput: false, // Disable console output for tests
			enableDebugLogs: true
		});
	});

	afterEach(() => {
		// Clean up after each test
		logger.clear();
		vi.restoreAllMocks();
	});

	describe("ApplicationLogger basic functionality", () => {
		it("should create log entries with correct structure", () => {
			logger.info("general", "Test message", { test: true });

			const logs = logger.getLogs();
			expect(logs).toHaveLength(1);

			const entry = logs[0];
			expect(entry).toMatchObject({
				level: "info",
				category: "general",
				message: "Test message",
				data: { test: true }
			});

			expect(entry.id).toBeDefined();
			expect(entry.timestamp).toBeInstanceOf(Date);
			expect(entry.stack).toBeUndefined(); // Only errors have stack traces
		});

		it("should create stack trace for error logs", () => {
			logger.error("general", "Error message");

			const logs = logger.getLogs();
			expect(logs[0].stack).toBeDefined();
			expect(logs[0].stack).toContain("Error");
		});

		it("should add logs in reverse chronological order (newest first)", () => {
			logger.info("general", "First message");
			logger.info("general", "Second message");
			logger.info("general", "Third message");

			const logs = logger.getLogs();
			expect(logs[0].message).toBe("Third message");
			expect(logs[1].message).toBe("Second message");
			expect(logs[2].message).toBe("First message");
		});

		it("should respect maxLogs configuration", () => {
			logger.configure({ maxLogs: 3 });

			// Add 5 logs
			for (let i = 1; i <= 5; i++) {
				logger.info("general", `Message ${i}`);
			}

			const logs = logger.getLogs();
			expect(logs).toHaveLength(3);
			// Should keep the most recent 3
			expect(logs[0].message).toBe("Message 5");
			expect(logs[1].message).toBe("Message 4");
			expect(logs[2].message).toBe("Message 3");
		});
	});

	describe("Log level methods", () => {
		it("should call debug method correctly", () => {
			logger.debug("ui", "Debug message", { debug: true }, "TestComponent");

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "debug",
				category: "ui",
				message: "Debug message",
				data: { debug: true },
				component: "TestComponent"
			});
		});

		it("should call info method correctly", () => {
			logger.info("api", "Info message", { info: true });

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "info",
				category: "api",
				message: "Info message",
				data: { info: true }
			});
		});

		it("should call warn method correctly", () => {
			logger.warn("cache", "Warning message");

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "warn",
				category: "cache",
				message: "Warning message"
			});
		});

		it("should call error method correctly", () => {
			logger.error("graph", "Error message", { error: true });

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "error",
				category: "graph",
				message: "Error message",
				data: { error: true }
			});
		});
	});

	describe("Debug log filtering", () => {
		it("should skip debug logs when enableDebugLogs is false", () => {
			logger.configure({ enableDebugLogs: false });
			logger.debug("ui", "Debug message");
			logger.info("ui", "Info message");

			const logs = logger.getLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].level).toBe("info");
		});

		it("should include debug logs when enableDebugLogs is true", () => {
			logger.configure({ enableDebugLogs: true });
			logger.debug("ui", "Debug message");
			logger.info("ui", "Info message");

			const logs = logger.getLogs();
			expect(logs).toHaveLength(2);
			expect(logs.map(l => l.level)).toEqual(["info", "debug"]);
		});
	});

	describe("Subscription system", () => {
		it("should notify listeners when logs are added", () => {
			const mockListener = vi.fn();
			const unsubscribe = logger.subscribe(mockListener);

			logger.info("general", "Test message");

			expect(mockListener).toHaveBeenCalledTimes(1);
			expect(mockListener).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ message: "Test message" })
				])
			);

			unsubscribe();
		});

		it("should unsubscribe listeners correctly", () => {
			const mockListener = vi.fn();
			const unsubscribe = logger.subscribe(mockListener);

			logger.info("general", "Before unsubscribe");
			unsubscribe();
			logger.info("general", "After unsubscribe");

			expect(mockListener).toHaveBeenCalledTimes(1);
		});

		it("should handle multiple listeners", () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			logger.subscribe(listener1);
			logger.subscribe(listener2);

			logger.info("general", "Test message");

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});
	});

	describe("Configuration management", () => {
		it("should update configuration correctly", () => {
			const newConfig = {
				maxLogs: 500,
				enableConsoleOutput: true,
				enableDebugLogs: false
			};

			logger.configure(newConfig);
			const config = logger.getConfig();

			expect(config).toEqual(newConfig);
		});

		it("should partially update configuration", () => {
			logger.configure({ maxLogs: 100 });
			logger.configure({ enableDebugLogs: false });

			const config = logger.getConfig();

			expect(config.maxLogs).toBe(100);
			expect(config.enableDebugLogs).toBe(false);
			expect(config.enableConsoleOutput).toBeDefined(); // Should retain default
		});
	});

	describe("Utility methods", () => {
		it("should clear logs and notify listeners", () => {
			const mockListener = vi.fn();
			logger.subscribe(mockListener);

			logger.info("general", "Test message");
			logger.clear();

			const logs = logger.getLogs();
			expect(logs).toHaveLength(0);
			expect(mockListener).toHaveBeenLastCalledWith([]);
		});

		it("should return a copy of logs array", () => {
			logger.info("general", "Test message");

			const logs1 = logger.getLogs();
			const logs2 = logger.getLogs();

			expect(logs1).not.toBe(logs2); // Different array references
			expect(logs1).toEqual(logs2); // Same content
		});
	});

	describe("Export functionality", () => {
		let mockCreateElement: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			// Mock DOM methods for export functionality
			mockCreateElement = vi.fn(() => ({
				href: "",
				download: "",
				click: vi.fn(),
			}));

			global.document = {
				createElement: mockCreateElement,
				body: {
					appendChild: vi.fn(),
					removeChild: vi.fn(),
				}
			} as unknown as Document;

			global.URL = {
				createObjectURL: vi.fn(() => "mock-url"),
				revokeObjectURL: vi.fn(),
			} as any;

			global.Blob = vi.fn().mockImplementation((content, options) => ({
				content,
				options
			})) as unknown as typeof Blob;
		});

		it("should export logs as JSON file", () => {
			logger.info("general", "Test log for export");

			const mockAnchor = {
				href: "",
				download: "",
				click: vi.fn(),
			};

			mockCreateElement.mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);

			logger.exportLogs();

			expect(mockCreateElement).toHaveBeenCalledWith("a");
			expect(mockAnchor.href).toBe("mock-url");
			expect(mockAnchor.download).toContain("academic-explorer-logs-");
			expect(mockAnchor.download).toContain(".json");
			expect(mockAnchor.click).toHaveBeenCalled();
			expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
		});
	});
});

describe("Convenience logging functions", () => {
	beforeEach(() => {
		logger.clear();
		logger.configure({ enableConsoleOutput: false, enableDebugLogs: true });
	});

	describe("logApiRequest", () => {
		it("should log successful API requests as info", () => {
			logApiRequest("/api/works", "GET", 200, 150);

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "info",
				category: "api",
				message: "GET /api/works - 200",
				data: {
					url: "/api/works",
					method: "GET",
					status: 200,
					responseTime: 150
				}
			});
		});

		it("should log client errors as error level", () => {
			logApiRequest("/api/works", "POST", 400);

			const logs = logger.getLogs();
			expect(logs[0].level).toBe("error");
			expect(logs[0].message).toContain("400");
		});

		it("should log redirects as warnings", () => {
			logApiRequest("/api/works", "GET", 301);

			const logs = logger.getLogs();
			expect(logs[0].level).toBe("warn");
		});

		it("should handle requests without status", () => {
			logApiRequest("/api/works", "GET");

			const logs = logger.getLogs();
			expect(logs[0].message).toBe("GET /api/works");
			expect(logs[0].data).toMatchObject({
				url: "/api/works",
				method: "GET",
				status: undefined,
				responseTime: undefined
			});
		});
	});

	describe("logCacheHit", () => {
		it("should log cache hits with correct data", () => {
			logCacheHit("cache-key-123", "memory");

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "debug",
				category: "cache",
				message: "Cache hit: cache-key-123 from memory",
				data: {
					key: "cache-key-123",
					source: "memory",
					hit: true
				}
			});
		});

		it("should handle different cache sources", () => {
			logCacheHit("key1", "indexeddb");
			logCacheHit("key2", "localstorage");

			const logs = logger.getLogs();
			expect(logs[0].data.source).toBe("localstorage");
			expect(logs[1].data.source).toBe("indexeddb");
		});
	});

	describe("logCacheMiss", () => {
		it("should log cache misses correctly", () => {
			logCacheMiss("missing-key");

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "debug",
				category: "cache",
				message: "Cache miss: missing-key",
				data: {
					key: "missing-key",
					hit: false
				}
			});
		});
	});

	describe("logGraphOperation", () => {
		it("should log graph operations with all parameters", () => {
			logGraphOperation("force-layout", 100, 200, 1500);

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "info",
				category: "graph",
				message: "Graph operation: force-layout",
				data: {
					operation: "force-layout",
					nodeCount: 100,
					edgeCount: 200,
					duration: 1500
				}
			});
		});

		it("should handle optional parameters", () => {
			logGraphOperation("node-selection");

			const logs = logger.getLogs();
			expect(logs[0].data).toEqual({
				operation: "node-selection",
				nodeCount: undefined,
				edgeCount: undefined,
				duration: undefined
			});
		});
	});

	describe("logRouteChange", () => {
		it("should log route changes with parameters", () => {
			logRouteChange("/works", "/authors/A123", { authorId: "A123" });

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "info",
				category: "routing",
				message: "Route change: /works → /authors/A123",
				data: {
					from: "/works",
					to: "/authors/A123",
					params: { authorId: "A123" }
				}
			});
		});

		it("should handle route changes without parameters", () => {
			logRouteChange("/", "/search");

			const logs = logger.getLogs();
			expect(logs[0].data.params).toBeUndefined();
		});
	});

	describe("logUIInteraction", () => {
		it("should log UI interactions correctly", () => {
			logUIInteraction("SearchBar", "submit", { query: "machine learning" });

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "debug",
				category: "ui",
				message: "SearchBar: submit",
				data: { query: "machine learning" },
				component: "SearchBar"
			});
		});
	});

	describe("logStorageOperation", () => {
		it("should log storage operations with size", () => {
			logStorageOperation("write", "user-preferences", 1024);

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "debug",
				category: "storage",
				message: "Storage write: user-preferences (1024 bytes)",
				data: {
					operation: "write",
					key: "user-preferences",
					size: 1024
				}
			});
		});

		it("should handle operations without size", () => {
			logStorageOperation("delete", "cache-entry");

			const logs = logger.getLogs();
			expect(logs[0].message).toBe("Storage delete: cache-entry");
			expect(logs[0].data.size).toBeUndefined();
		});
	});

	describe("logError", () => {
		it("should log Error objects correctly", () => {
			const error = new Error("Test error message");
			logError("Operation failed", error, "TestComponent", "api");

			const logs = logger.getLogs();
			expect(logs[0]).toMatchObject({
				level: "error",
				category: "api",
				message: "Operation failed",
				data: {
					name: "Error",
					message: "Test error message",
					stack: expect.stringContaining("Error")
				},
				component: "TestComponent"
			});
		});

		it("should convert non-Error objects to Error", () => {
			logError("String error", "Simple error message");

			const logs = logger.getLogs();
			expect(logs[0].data).toMatchObject({
				name: "Error",
				message: "Simple error message"
			});
		});

		it("should use default category when not specified", () => {
			logError("Default category test", new Error("test"));

			const logs = logger.getLogs();
			expect(logs[0].category).toBe("general");
		});
	});
});

describe("Global error handling", () => {
	beforeEach(() => {
		logger.clear();
		logger.configure({ enableConsoleOutput: false });

		// Mock global objects
		global.window = {
			addEventListener: vi.fn()
		} as any;
	});

	it("should set up global error handlers", () => {
		setupGlobalErrorHandling();

		expect(window.addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
		expect(window.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));

		// Should log initialization message
		const logs = logger.getLogs();
		expect(logs[0]).toMatchObject({
			level: "info",
			category: "general",
			message: "Global error handling initialized",
			component: "setupGlobalErrorHandling"
		});
	});

	it("should handle unhandled promise rejections", () => {
		setupGlobalErrorHandling();

		// Get the registered handler for unhandledrejection
		const rejectionHandler = vi.mocked(window.addEventListener).mock.calls
			.find(call => call[0] === "unhandledrejection")?.[1];

		expect(rejectionHandler).toBeDefined();

		// Simulate unhandled rejection
		rejectionHandler({ reason: "Promise rejection reason" } as any);

		const logs = logger.getLogs();
		const errorLog = logs.find(log => log.message === "Unhandled promise rejection");
		expect(errorLog).toBeDefined();
		expect(errorLog?.level).toBe("error");
		expect(errorLog?.component).toBe("global");
	});

	it("should handle JavaScript errors and filter ResizeObserver warnings", () => {
		setupGlobalErrorHandling();

		// Get the registered handler for error
		const errorHandler = vi.mocked(window.addEventListener).mock.calls
			.find(call => call[0] === "error")?.[1];

		expect(errorHandler).toBeDefined();

		// Test regular error
		errorHandler({
			error: new Error("Real JavaScript error"),
			message: "Real JavaScript error",
			filename: "script.js"
		} as any);

		// Test ResizeObserver error (should be filtered)
		errorHandler({
			error: new Error("ResizeObserver loop completed with undelivered notifications"),
			message: "ResizeObserver loop completed with undelivered notifications",
			filename: "browser-internal"
		} as any);

		const logs = logger.getLogs();
		const errorLogs = logs.filter(log => log.message === "JavaScript error");

		// Should only have one error log (ResizeObserver filtered out)
		expect(errorLogs).toHaveLength(1);
		expect(errorLogs[0].data).toMatchObject({
			name: "Error",
			message: "Real JavaScript error"
		});
	});
});