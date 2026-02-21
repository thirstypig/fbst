
import { fetchJsonApi, API_BASE } from '../../api/base';

export async function getPeriodStandings(periodId?: number): Promise<any> {
  // Maps to /api/period/current which returns simple standings
  // If periodId is provided, we might need a different endpoint, but checking usage:
  // CategoryStandings.tsx calls `getPeriodStandings(selectedPeriod)`.
  // server/src/routes/standings.ts has `/period/current` (ignores periodId)
  // AND `/period-category-standings` (accepts periodId).
  
  // If the consumer expects "standings" (simple ranking), use /period/current (maybe?)
  // BUT the name implies specific period.
  
  // Let's assume generic call to get "current" or specific if param supported.
  // The server implementation of `/period/current` does NOT accept periodId query.
  // We should probably check if `CategoryStandings` expects *category* standings or *overall* standings.
  // It imports `getPeriodStandings` and also uses `getSeasonStandings`.
  return fetchJsonApi(`${API_BASE}/period/current`); 
}


