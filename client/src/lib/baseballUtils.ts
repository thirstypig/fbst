/**
 * Canonical order for baseball positions.
 * MI (Middle Infield) = 2B/SS eligible, CI (Corner Infield) = 1B/3B eligible.
 */
export const POS_ORDER = ['C', '1B', '2B', '3B', 'SS', 'MI', 'CI', 'OF', 'SP', 'RP', 'P', 'DH'];

/**
 * Score mapping for sorting positions.
 */
export const POS_SCORE = Object.fromEntries(POS_ORDER.map((pos, index) => [pos, index]));

/**
 * Normalizes a position string or comma-separated list into the primary position.
 * Also handles mapping CM -> 1B/3B and MI -> 2B/SS.
 */
export function getPrimaryPosition(posString: string | undefined): string {
    if (!posString) return 'DH';
    const primary = posString.split(',')[0].trim();
    
    // Normalize Corner/Middle Infielders
    if (primary === 'CM') return '1B/3B';
    if (primary === 'MI') return '2B/SS';
    
    return primary;
}

/**
 * Sorts two players by their primary position based on POS_ORDER.
 */
export function sortByPosition<T extends { positions?: string }>(a: T, b: T): number {
    const pa = getPrimaryPosition(a.positions);
    const pb = getPrimaryPosition(b.positions);
    
    // Handle split positions like 1B/3B by taking the first part for sorting
    const keyA = pa.split('/')[0];
    const keyB = pb.split('/')[0];

    const sa = POS_SCORE[keyA] ?? 99;
    const sb = POS_SCORE[keyB] ?? 99;
    
    return sa - sb;
}

/**
 * Returns true if a player's positions make them eligible for CI (Corner Infield: 1B or 3B).
 */
export function isCIEligible(positions: string | undefined): boolean {
    if (!positions) return false;
    const posList = positions.split(',').map(p => p.trim());
    return posList.some(p => p === '1B' || p === '3B');
}

/**
 * Extracts the last name from a full name string for sorting purposes.
 * "Shohei Ohtani" → "Ohtani", "Mike Trout" → "Trout", "Ronald Acuña Jr." → "Acuña Jr."
 */
export function getLastName(fullName: string | undefined): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0] || '';
    // Handle suffixes like "Jr.", "Sr.", "II", "III", "IV"
    const last = parts[parts.length - 1];
    if (/^(Jr\.?|Sr\.?|II|III|IV|V)$/i.test(last) && parts.length > 2) {
        return parts[parts.length - 2] + ' ' + last;
    }
    return last;
}

/**
 * Returns true if a player's positions make them eligible for MI (Middle Infield: 2B or SS).
 */
export function isMIEligible(positions: string | undefined): boolean {
    if (!positions) return false;
    const posList = positions.split(',').map(p => p.trim());
    return posList.some(p => p === '2B' || p === 'SS');
}
