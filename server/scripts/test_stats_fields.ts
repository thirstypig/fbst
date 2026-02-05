
import fetch from 'node-fetch';

const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";

async function getStats(mlbId: string, group: "hitting" | "pitching") {
    const url = `${MLB_API_BASE}/people/${mlbId}/stats?stats=yearByYear&group=${group}`;
    console.log("Fetching:", url);
    // @ts-ignore
    const res = await fetch(url);
    const data = await res.json();
    const split = data?.stats?.[0]?.splits?.find((s: any) => s.sport?.id === 1); // MLB
    
    if (split) {
        console.log(`Stats for ${group} (Year: ${split.season}):`);
        console.log(JSON.stringify(split.stat, null, 2));
    } else {
        console.log("No MLB stats found.");
    }
}

// Aaron Judge (Hitting)
getStats("592450", "hitting");

// Gerrit Cole (Pitching)
getStats("543037", "pitching");
