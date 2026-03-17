/**
 * Shared CLI utilities for scripts.
 */

/**
 * Parse `--year YYYY` from process.argv.
 * Returns the year as a number, or `fallback` if `--year` is not provided.
 * Exits with an error if the value is not a valid number.
 */
export function parseYear(): number | null;
export function parseYear(fallback: number): number;
export function parseYear(fallback?: number): number | null {
  const idx = process.argv.indexOf('--year');
  if (idx === -1) return fallback ?? null;
  const val = parseInt(process.argv[idx + 1]);
  if (!Number.isFinite(val)) {
    console.error('Invalid --year value');
    process.exit(1);
  }
  return val;
}
