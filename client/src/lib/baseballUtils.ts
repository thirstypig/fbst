/**
 * Canonical order for baseball positions.
 * Note: CM and MI are normalized to their constituents for display but kept here for fallback sorting if raw data exists.
 */
export const POS_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'P', 'DH'];

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
