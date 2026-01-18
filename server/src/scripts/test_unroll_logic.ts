
import * as XLSX from 'xlsx';

function testUnroll() {
    console.log("Testing Unroll Logic...");

    // Mock data: 2 tables side-by-side
    const rows = [
        ["Title Row", "", "", "", "", "", "", ""],
        ["Player", "Team", "AB", "H", "", "Player", "Team", "AB", "H"], // Header Row (Index 1)
        ["T. Grisham", "DKG", 10, 2, "", "M. Harris", "DKG", 20, 5],
        ["R. Acuna", "DMK", 15, 5, "", "C. Blackmon", "DDG", 25, 8]
    ];

    console.log("Mock Rows:", rows);

    // --- Logic from ArchiveImportService ---
    
    // Find header row (heuristic: contains "Player" or "Team")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (rowStr.includes('player') || rowStr.includes('team')) {
        headerRowIdx = i;
        break;
    }
    }

    if (headerRowIdx === -1) {
        console.log("Failed to find header row");
        return;
    }
    console.log(`Found header row at index ${headerRowIdx}`);

    const headerRow = rows[headerRowIdx].map(h => String(h || '').trim());
    
    // Detect multiple tables by finding repeating headers
    const tableStarts: number[] = [];
    headerRow.forEach((h, idx) => {
        if (h.toLowerCase().includes('player') || h.toLowerCase() === 'name') {
        // Heuristic: Must be start of a new block if it's far enough from the last one
        if (tableStarts.length === 0 || idx > tableStarts[tableStarts.length - 1] + 2) { // Changed +5 to +2 for small mock
            tableStarts.push(idx);
        }
        }
    });

    console.log(`Detected ${tableStarts.length} tables at cols ${tableStarts.join(', ')}`);

    // Unroll
    const standardizedRows: any[] = [];
    
    // Use the first table's headers as the standard
    const standardHeaders = headerRow.slice(tableStarts[0], tableStarts.length > 1 ? tableStarts[1] : undefined)
        .filter(h => h); // Remove empty

    console.log("Standard Headers:", standardHeaders);

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        // For each table start, extract the chunk
        tableStarts.forEach((startCol, loopIdx) => {
        // Determine end col (either next start or end of row)
        const nextStart = tableStarts[loopIdx + 1] || row.length;
        const chunk = row.slice(startCol, nextStart);
        
        console.log(`Row ${i} Chunk ${loopIdx}:`, chunk);

        // Only add if has data (Name and Team usually required)
        if (chunk.length > 0 && chunk[0]) {
                // Create object matching first table's structure
                const rowObj: any = {};
                standardHeaders.forEach((h, hIdx) => {
                if (hIdx < chunk.length) {
                        rowObj[h] = chunk[hIdx];
                }
                });
                standardizedRows.push(rowObj);
        }
        });
    }

    console.log("Result:", standardizedRows);
    
    // Validation
    if (standardizedRows.length === 4) {
        console.log("SUCCESS: 4 rows extracted");
    } else {
        console.error(`FAILURE: Expected 4 rows, got ${standardizedRows.length}`);
    }
}

testUnroll();
