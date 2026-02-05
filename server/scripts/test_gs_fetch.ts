
import fetch from 'node-fetch';

const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";

// Aaron Judge (592450), Shohei Ohtani (660271), Matt Olson (621566)
const players = [592450, 660271, 621566];

async function checkGrandSlams() {
    for (const id of players) {
        const url = `${MLB_API_BASE}/people/${id}/stats?stats=yearByYear&group=hitting`;
        const res = await fetch(url);
        const data = await res.json();
        const split2025 = data?.stats?.[0]?.splits?.find((s: any) => s.season === "2025" && s.sport?.id === 1);
        
        if (split2025) {
            console.log(`Player ${id} 2025 Stats found:`);
            console.log("Grand Slams:", split2025.stat.grandSlams);
            console.log("HR:", split2025.stat.homeRuns);
        } else {
            console.log(`Player ${id}: No 2025 MLB stats found.`);
            // Check 2024 as fallback
             const split2024 = data?.stats?.[0]?.splits?.find((s: any) => s.season === "2024" && s.sport?.id === 1);
             if (split2024) {
                console.log(`Player ${id} 2024 Stats found (Fallback):`);
                console.log("Grand Slams:", split2024.stat.grandSlams);
                console.log("HR:", split2024.stat.homeRuns);
             }
        }
    }
}

checkGrandSlams();
