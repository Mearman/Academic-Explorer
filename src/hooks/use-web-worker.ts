import { useCallback, useEffect, useRef, useState } from "react";

export interface WorkerRequest {
  type: string;
  payload?: unknown;
  requestId?: string;
  [key: string]: unknown;
}

export interface WorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR" | "READY";
  event?: string;
  result?: unknown;
  payload?: unknown;
  progress?: number;
  error?: string;
  requestId?: string;
}

export interface UseWebWorkerOptions {
  onMessage?: (data: WorkerResponse) => void;
  onError?: (error: ErrorEvent) => void;
}

interface UseWebWorkerReturn {
  postMessage: (request: WorkerRequest) => void;
  terminate: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Lightweight hook for managing a Web Worker instance.
 * Inspired by the integration strategy described in the worker overhaul notes.
 */
export function useWebWorker(
  workerFactory: () => Worker,
  options: UseWebWorkerOptions = {}
): UseWebWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerFactoryRef = useRef(workerFactory);
  const onMessageRef = useRef(options.onMessage);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    workerFactoryRef.current = workerFactory;
  }, [workerFactory]);

  useEffect(() => {
    onMessageRef.current = options.onMessage;
  }, [options.onMessage]);

  useEffect(() => {
    onErrorRef.current = options.onError;
  }, [options.onError]);

  useEffect(() => {
    const worker = workerFactoryRef.current();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "ERROR") {
        setError(message.error ?? "Worker error");
        setIsLoading(false);
      } else if (message.type !== "PROGRESS") {
        // Treat READY and SUCCESS as terminal states for the current request.
        setError(null);
        setIsLoading(false);
      }

      onMessageRef.current?.(message);
    };

    worker.onerror = (event) => {
      setError(event.message || "Worker error");
      setIsLoading(false);
      onErrorRef.current?.(event);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const postMessage = useCallback((request: WorkerRequest) => {
    if (!workerRef.current) {
      setError("Worker not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    workerRef.current.postMessage(request);
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    postMessage,
    terminate,
    isLoading,
    error
  };
}
