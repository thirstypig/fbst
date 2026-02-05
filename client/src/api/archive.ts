
import { fetchJsonApi, API_BASE } from './base';
import { PlayerSeasonStat } from './types';

export async function getArchiveSeasons(): Promise<{ seasons: number[] }> {
    return fetchJsonApi(`${API_BASE}/archive/seasons`);
}

export async function getArchivePeriods(year: number): Promise<any> {
    return fetchJsonApi(`${API_BASE}/archive/${year}/periods`);
}

export async function getArchivePeriodStats(year: number, periodNum: number): Promise<any> {
    return fetchJsonApi(`${API_BASE}/archive/${year}/period/${periodNum}/stats`);
}

export async function getArchiveDraftResults(year: number): Promise<any> {
    return fetchJsonApi(`${API_BASE}/archive/${year}/draft-results`);
}

export async function updateArchiveTeamName(year: number, teamCode: string, newName: string): Promise<any> {
    return fetchJsonApi(`${API_BASE}/archive/${year}/teams/${teamCode}`, {
        method: 'PUT',
        body: JSON.stringify({ newName })
    });
}

// Player Search / Edit
export async function searchArchivePlayers(query: string): Promise<{ players: any[] }> {
    return fetchJsonApi(`${API_BASE}/archive/search-players?query=${encodeURIComponent(query)}`);
}

export async function searchMLBPlayers(query: string): Promise<{ players: any[] }> {
    return fetchJsonApi(`${API_BASE}/archive/search-mlb?query=${encodeURIComponent(query)}`);
}

export async function updateArchivePlayerStat(id: number, data: Partial<{ fullName: string; mlbId: string; mlbTeam: string; position: string; }>): Promise<any> {
    return fetchJsonApi(`${API_BASE}/archive/stat/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
}
