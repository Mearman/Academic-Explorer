import { describe, it, expect, vi } from "vitest";
import {
  generateSequentialId,
  createFilterManager,
  computePagedItems,
  createTrackedStore,
  createReactiveTable,
  createDexieSync,
  createDexieStore,
} from "./index.js";

describe("State Utilities", () => {
  describe("generateSequentialId", () => {
    it("should generate sequential IDs with prefix", () => {
      const generator = generateSequentialId("test");
      expect(generator()).toBe("test-1");
      expect(generator()).toBe("test-2");
      expect(generator()).toBe("test-3");
    });

    it("should use default prefix when none provided", () => {
      const generator = generateSequentialId();
      expect(generator()).toBe("id-1");
      expect(generator()).toBe("id-2");
    });
  });

  describe("createFilterManager", () => {
    interface TestItem extends Record<string, unknown> {
      id: number;
      name: string;
      category: string;
      active: boolean;
    }

    const items: TestItem[] = [
      { id: 1, name: "Item 1", category: "A", active: true },
      { id: 2, name: "Item 2", category: "B", active: false },
      { id: 3, name: "Item 3", category: "A", active: true },
      { id: 4, name: "Item 4", category: "C", active: false },
    ];

    it("should filter by string values", () => {
      const filterManager = createFilterManager<TestItem>();
      filterManager.setFilter("category", "A");

      const filtered = filterManager.applyFilters(items);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((item) => item.category === "A")).toBe(true);
    });

    it("should filter by array values", () => {
      const filterManager = createFilterManager<TestItem>();
      filterManager.setFilter("category", ["A", "C"]);

      const filtered = filterManager.applyFilters(items);
      expect(filtered).toHaveLength(3);
      expect(filtered.every((item) => ["A", "C"].includes(item.category))).toBe(
        true,
      );
    });

    it("should filter by function", () => {
      const filterManager = createFilterManager<TestItem>();
      filterManager.setFilter(
        "name",
        (value: unknown) =>
          typeof value === "string" && value.includes("Item 1"),
      );

      const filtered = filterManager.applyFilters(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Item 1");
    });

    it("should clear filters", () => {
      const filterManager = createFilterManager<TestItem>();
      filterManager.setFilter("category", "A");
      expect(filterManager.applyFilters(items)).toHaveLength(2);

      filterManager.clearFilter("category");
      expect(filterManager.applyFilters(items)).toHaveLength(4);
    });

    it("should detect active filters", () => {
      const filterManager = createFilterManager<TestItem>();
      expect(filterManager.hasActiveFilters()).toBe(false);

      filterManager.setFilter("category", "A");
      expect(filterManager.hasActiveFilters()).toBe(true);

      filterManager.clearAllFilters();
      expect(filterManager.hasActiveFilters()).toBe(false);
    });
  });

  describe("computePagedItems", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    it("should compute pagination correctly", () => {
      const result = computePagedItems(items, 1, 10);

      expect(result.items).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it("should handle last page correctly", () => {
      const result = computePagedItems(items, 3, 10);

      expect(result.items).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it("should handle empty items", () => {
      const result = computePagedItems([], 1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe("createTrackedStore", () => {
    interface TestState extends Record<string, unknown> {
      count: number;
      items: string[];
    }

    interface TestActions {
      increment: () => void;
      addItem: (item: string) => void;
      [key: string]: any;
    }

    it("should create a store factory", () => {
      const { useStore } = createTrackedStore<TestState, TestActions>(
        {
          name: "test-store",
          initialState: { count: 0, items: [] },
        },
        (set) => ({
          increment: () =>
            set((state) => ({ ...state, count: state.count + 1 })),
          addItem: (item: string) =>
            set((state) => ({
              ...state,
              items: [...state.items, item],
            })),
        }),
      );

      // Test that the store hook is a function
      expect(typeof useStore).toBe("function");
      expect(useStore).toBeDefined();
    });
  });

  describe("Dexie Integration", () => {
    it("should create reactive table wrapper", () => {
      const mockTable = {
        add: vi.fn().mockResolvedValue(1),
        put: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue({ id: 1, name: "test" }),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([{ id: 1, name: "test" }]),
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: 1, name: "test" }]),
        }),
        count: vi.fn().mockResolvedValue(1),
      } as any;

      const reactiveTable = createReactiveTable(mockTable);

      expect(reactiveTable).toHaveProperty("add");
      expect(reactiveTable).toHaveProperty("put");
      expect(reactiveTable).toHaveProperty("get");
      expect(reactiveTable).toHaveProperty("delete");
      expect(reactiveTable).toHaveProperty("clear");
      expect(reactiveTable).toHaveProperty("toArray");
      expect(reactiveTable).toHaveProperty("where");
      expect(reactiveTable).toHaveProperty("count");
    });

    it("should create dexie sync utility", () => {
      const mockTable = {
        toArray: vi.fn().mockResolvedValue([]),
      } as any;

      const sync = createDexieSync({
        table: mockTable,
        syncInterval: 1000,
      });

      expect(sync).toHaveProperty("start");
      expect(sync).toHaveProperty("stop");
      expect(sync).toHaveProperty("syncNow");
      expect(typeof sync.start).toBe("function");
      expect(typeof sync.stop).toBe("function");
      expect(typeof sync.syncNow).toBe("function");
    });

    it("should create dexie store", () => {
      const mockTable = {
        add: vi.fn().mockResolvedValue(1),
        put: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue({ id: 1, name: "test" }),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        where: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      } as any;

      const store = createDexieStore({
        table: mockTable,
      });

      expect(store).toHaveProperty("add");
      expect(store).toHaveProperty("update");
      expect(store).toHaveProperty("remove");
      expect(store).toHaveProperty("get");
      expect(store).toHaveProperty("getAll");
      expect(store).toHaveProperty("find");
      expect(store).toHaveProperty("clear");
      expect(store).toHaveProperty("count");
      expect(store).toHaveProperty("createSync");
    });
  });
});
