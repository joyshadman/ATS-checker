"use client";

import { useCallback, useRef, useState } from "react";

export function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const execute = useCallback(async (fn: () => Promise<string | null>) => {
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setIsPending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await fn();
      if (result) setError(result);
      return result;
    } catch {
      setError("An unexpected error occurred");
      return "An unexpected error occurred";
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { isPending, error, success, execute, reset, setError, setSuccess };
}
