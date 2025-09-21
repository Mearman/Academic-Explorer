import { useCallback, useEffect, useRef, useState } from "react";

export interface WorkerRequest {
  type: string;
  data?: unknown;
  requestId?: string;
  [key: string]: unknown;
}

export interface WorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR";
  requestId?: string;
  result?: unknown;
  progress?: number;
  error?: string;
}

export interface UseWebWorkerOptions {
  onMessage?: (data: WorkerResponse) => void;
  onError?: (error: ErrorEvent) => void;
}

export interface UseWebWorkerArgs {
  workerFactory: () => Worker;
  options?: UseWebWorkerOptions;
}

export function useWebWorker({
  workerFactory,
  options = {},
}: UseWebWorkerArgs) {
  const { onMessage, onError } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workerRef.current = workerFactory();
    const worker = workerRef.current;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "PROGRESS") {
        setError(null);
      }
      if (message.type === "SUCCESS" || message.type === "ERROR") {
        setIsLoading(false);
        if (message.type === "ERROR") {
          setError(message.error ?? "Worker error");
        }
      }
      onMessage?.(message);
    };

    worker.onerror = (workerError) => {
      setIsLoading(false);
      const message = workerError.message || "Worker error";
      setError(message);
      onError?.(workerError);
    };

    worker.onmessageerror = () => {
      setIsLoading(false);
      setError("Worker message error");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [workerFactory, onMessage, onError]);

  const postMessage = useCallback((data: WorkerRequest) => {
    if (!workerRef.current) {
      setError("Worker not available");
      return null;
    }

    const requestId = data.requestId ?? crypto.randomUUID?.() ?? `req-${Date.now().toString(36)}`;
    workerRef.current.postMessage({ ...data, requestId });
    setIsLoading(true);
    setError(null);
    return requestId;
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const isWorkerAvailable = useCallback(() => workerRef.current !== null, []);

  return {
    postMessage,
    terminate,
    isLoading,
    error,
    isWorkerAvailable,
  };
}
