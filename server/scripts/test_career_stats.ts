
import fetch from 'node-fetch';

const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";
const toNum = (v: any) => Number(v) || 0;
const fmt3Avg = (h: number, ab: number) => {
    if(!ab) return ".000";
    return (h/ab).toFixed(3).substring(1);
}

async function getPlayerCareerStats(mlbId: string, group: "hitting" | "pitching") {
    const id = String(mlbId ?? "").trim();
    const url = `${MLB_API_BASE}/people/${id}/stats?stats=yearByYear&group=${group}`;
    console.log("Fetching:", url);
    
    // @ts-ignore
    const res = await fetch(url);
    const data = await res.json();
    const splits = (data?.stats?.[0]?.splits ?? []) as any[];
    
    console.log(`Found ${splits.length} raw splits`);

    const rows = splits.map((s:any) => {
        return {
            year: s.season,
            leagueName: s.league?.name,
            leagueId: s.league?.id,
            sportId: s.sport?.id,
            team: s.team?.name
        };
    });
    
    console.log("Raw Rows (first 5):");
    console.log(rows.slice(0, 5));
}

// J. Naylor
getPlayerCareerStats("647304", "hitting");
