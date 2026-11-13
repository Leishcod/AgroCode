'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { deserializeSimulationInput, serializeSimulationInput } from '@/lib/url/serialize';
import { useSimulationStore } from '@/store/simulation-store';

export function useUrlSync(): void {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const input = useSimulationStore((state) => state.input);
  const setInput = useSimulationStore((state) => state.setInput);
  const lastSearch = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    if (lastSearch.current !== search) {
      lastSearch.current = search;
      setInput(deserializeSimulationInput(search));
    }

    const currentInput = useSimulationStore.getState().input;
    const params = serializeSimulationInput(currentInput, new URLSearchParams(search));
    const query = params.toString();
    const nextUrl = `${pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [input, pathname, router, search, setInput]);
}
