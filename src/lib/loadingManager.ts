import { useState, useEffect } from "react";

type Listener = (isLoading: boolean) => void;

class LoadingManager {
  private activeRequests = 0;
  private listeners = new Set<Listener>();

  public start(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.notify(true);
    }
  }

  public stop(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this.notify(false);
    }
  }

  public isLoading(): boolean {
    return this.activeRequests > 0;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(state: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // Safe listener failure isolation
      }
    });
  }

  /**
   * Helper that automatically tracks loading state for any promise.
   */
  public async wrap<T>(promise: Promise<T>, silent = false): Promise<T> {
    if (!silent) this.start();
    try {
      return await promise;
    } finally {
      if (!silent) this.stop();
    }
  }
}

export const loadingManager = new LoadingManager();

/**
 * React hook to observe the global loading state for top progress bar.
 */
export function useGlobalLoading(): boolean {
  const [isLoading, setIsLoading] = useState(() => loadingManager.isLoading());

  useEffect(() => {
    return loadingManager.subscribe(setIsLoading);
  }, []);

  return isLoading;
}

