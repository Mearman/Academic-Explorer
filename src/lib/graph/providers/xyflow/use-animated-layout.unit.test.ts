import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimatedLayout } from "./use-animated-layout";

// Mock logger to avoid noisy logs during tests
vi.mock("@/lib/logger", () => ({
        logger: {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
        },
}));

// Track mutable node state for ReactFlow mock
const initialNodes = [
        {
                id: "n1",
                data: { entityType: "authors" },
                position: { x: 10, y: 20 },
        },
        {
                id: "n2",
                data: { entityType: "works" },
                position: { x: -30, y: 5 },
        },
];

const cloneNodes = () => initialNodes.map((node) => ({
        ...node,
        data: { ...node.data },
        position: { ...node.position },
}));

let nodesRef = cloneNodes();

const edgesRef = [
        { id: "e1", source: "n1", target: "n2" },
];

const getNodesMock = vi.fn(() => nodesRef);
const getEdgesMock = vi.fn(() => edgesRef);
const setNodesMock = vi.fn((updater: (nodes: typeof nodesRef) => typeof nodesRef) => {
        nodesRef = updater(nodesRef);
});

vi.mock("@xyflow/react", () => ({
        useReactFlow: vi.fn(() => ({
                getNodes: getNodesMock,
                getEdges: getEdgesMock,
                setNodes: setNodesMock,
        })),
}));

const pinnedNodesState = { n1: true, n2: false };

vi.mock("@/stores/graph-store", () => ({
        useGraphStore: vi.fn((selector: (state: unknown) => unknown) =>
                selector({
                        pinnedNodes: pinnedNodesState,
                        currentLayout: {
                                type: "d3-force",
                                options: {
                                        linkDistance: 250,
                                        linkStrength: 0.75,
                                        chargeStrength: -320,
                                        centerStrength: 0.6,
                                        collisionRadius: 40,
                                        collisionStrength: 0.9,
                                        velocityDecay: 0.35,
                                        alphaDecay: 0.05,
                                        seed: 1234,
                                },
                        },
                })
        ),
}));

vi.mock("@/stores/layout-store", () => ({
        useLayoutStore: vi.fn((selector: (state: unknown) => unknown) =>
                selector({ autoPinOnLayoutStabilization: false })
        ),
}));

const { animatedGraphStoreState, useAnimatedGraphStoreMock } = vi.hoisted(() => {
        const state = {
                isAnimating: false,
                isPaused: false,
                progress: 0,
                alpha: 1,
                iteration: 0,
                fps: 60,
                startAnimation: vi.fn(),
                completeAnimation: vi.fn(),
                resetAnimation: vi.fn(),
                setAnimating: vi.fn(),
                setPaused: vi.fn(),
                setProgress: vi.fn(),
                setAlpha: vi.fn(),
                setIteration: vi.fn(),
                setFPS: vi.fn(),
                updateAnimatedPositions: vi.fn(),
                updateStaticPositions: vi.fn(),
                applyPositionsToGraphStore: vi.fn(),
        };

        const mock = vi.fn((selector: (store: typeof state) => unknown) => selector(state));
        mock.getState = () => state;

        return {
                animatedGraphStoreState: state,
                useAnimatedGraphStoreMock: mock,
        };
});

vi.mock("@/stores/animated-graph-store", () => ({
        useAnimatedGraphStore: useAnimatedGraphStoreMock,
}));

const startAnimationMock = vi.fn().mockResolvedValue("task-1");
const stopAnimationMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-unified-background-worker", () => ({
        useBackgroundWorker: vi.fn(() => ({
                startAnimation: startAnimationMock,
                stopAnimation: stopAnimationMock,
                pauseAnimation: vi.fn(),
                resumeAnimation: vi.fn(),
                updateParameters: vi.fn(),
                animationState: {
                        isRunning: false,
                        isPaused: false,
                        progress: 0,
                        alpha: 1,
                        iteration: 0,
                        fps: 0,
                },
                isWorkerReady: true,
        })),
}));

describe("useAnimatedLayout", () => {
        beforeEach(() => {
                nodesRef = cloneNodes();
                animatedGraphStoreState.isAnimating = false;
                animatedGraphStoreState.isPaused = false;
                animatedGraphStoreState.progress = 0;
                animatedGraphStoreState.alpha = 1;
                animatedGraphStoreState.iteration = 0;
                animatedGraphStoreState.fps = 60;
                startAnimationMock.mockClear();
                stopAnimationMock.mockClear();
                getNodesMock.mockClear();
                getEdgesMock.mockClear();
                setNodesMock.mockClear();
        });

        it("starts the force simulation with the structured payload", async () => {
                const { result } = renderHook(() => useAnimatedLayout());

                await act(async () => {
                        result.current.stopLayout();
                        await Promise.resolve();
                });

                // Clear the auto-start invocation performed on mount
                startAnimationMock.mockClear();

                await act(async () => {
                        result.current.applyLayout();
                        // Await pending microtasks from the async mock
                        await Promise.resolve();
                });

                expect(startAnimationMock).toHaveBeenCalledTimes(1);

                const payload = startAnimationMock.mock.calls[0][0];

                expect(payload.nodes).toEqual([
                        {
                                id: "n1",
                                type: "authors",
                                x: 10,
                                y: 20,
                                fx: 10,
                                fy: 20,
                        },
                        {
                                id: "n2",
                                type: "works",
                                x: -30,
                                y: 5,
                                fx: undefined,
                                fy: undefined,
                        },
                ]);

                expect(payload.links).toEqual([
                        {
                                id: "e1",
                                source: "n1",
                                target: "n2",
                        },
                ]);

                expect(payload.config).toMatchObject({
                        linkDistance: 250,
                        linkStrength: 0.75,
                        chargeStrength: -320,
                        centerStrength: 0.6,
                        collisionRadius: 40,
                        collisionStrength: 0.9,
                        velocityDecay: 0.35,
                        alphaDecay: 0.05,
                        seed: 1234,
                });

                expect(payload.pinnedNodes).toBeInstanceOf(Set);
                expect(Array.from(payload.pinnedNodes)).toEqual(["n1"]);
        });
});
