'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { searchTenantSigners, type TenantSigner } from '../api';

const DEBOUNCE_MS = 300;

interface UseSearchTenantSignersReturn {
  readonly results: ReadonlyArray<TenantSigner>;
  readonly isLoading: boolean;
  readonly search: (query: string) => void;
  readonly clear: () => void;
}

export function useSearchTenantSigners(): UseSearchTenantSignersReturn {
  const [results, setResults] = useState<TenantSigner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setResults([]);
    setIsLoading(false);
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      clear();
      return;
    }

    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const data = await searchTenantSigners(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [clear]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { results, isLoading, search, clear };
}
