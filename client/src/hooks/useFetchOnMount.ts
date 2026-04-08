import { useState, useEffect } from "react";
import { fetchJsonApi } from "../api/base";

/**
 * Simple fetch-on-mount hook with stale-closure guard.
 * Eliminates the repeated `let ok = true; fetch().then(if(ok)...); return () => { ok = false }` pattern.
 *
 * @param url - API URL to fetch (null to skip)
 * @param deps - Additional dependencies to trigger re-fetch
 * @returns { data, loading, error }
 */
export function useFetchOnMount<T>(
  url: string | null,
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    let ok = true;
    setLoading(true);
    setError(null);

    fetchJsonApi<T>(url)
      .then(res => { if (ok) setData(res); })
      .catch(err => { if (ok) setError(err instanceof Error ? err.message : "Fetch failed"); })
      .finally(() => { if (ok) setLoading(false); });

    return () => { ok = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  return { data, loading, error };
}
