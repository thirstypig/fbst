
import { prisma } from '../db/prisma.js';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;
// @ts-ignore
const utils = XLSX.utils || (XLSX as any).default?.utils;

async function fixAuctionValues() {
    const excelPath = path.join(__dirname, '../data/Auction 2025.xlsx');
    console.log('Reading Excel from:', excelPath);

    const wb = readFile(excelPath);
    const sheet = wb.Sheets['Sheet1'];
    const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Get all stats for 2025 Period 1
    const stats = await prisma.historicalPlayerStat.findMany({
        where: {
            period: {
                season: { year: 2025 },
                periodNumber: 1
            }
        }
    });

    console.log(`Found ${stats.length} stats in DB for 2025 P1`);

    let updatedCount = 0;
    
    // Skip header row if it exists (check if first row has 'price' or similar)
    const startIdx = (String(rows[0][3]).toLowerCase().includes('price') || isNaN(Number(rows[0][3]))) ? 1 : 0;

    for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        const teamNameExcel = String(row[0] || '').trim();
        const posExcel = String(row[1] || '').trim();
        const rawNameExcel = String(row[2] || '').trim(); // e.g. "J. Soto"
        const price = Number(row[3]);

        if (!rawNameExcel || isNaN(price)) continue;

        // Try to find match in DB
        // 1. Simple match on first initial + last name
        // 2. Or if "Juan Soto" contains "Soto" and starts with "J"
        const match = stats.find(s => {
            const dbName = s.playerName;
            // Handle cases like "J. Soto" matching "Juan Soto"
            if (rawNameExcel.includes('.') && rawNameExcel.includes(' ')) {
                const parts = rawNameExcel.split(' ');
                const initial = parts[0].replace('.', '').toLowerCase();
                const lastName = parts.slice(1).join(' ').toLowerCase();
                
                const dbParts = dbName.split(' ');
                const dbInitial = dbParts[0][0].toLowerCase();
                const dbLastName = dbParts.slice(1).join(' ').toLowerCase();

                return dbInitial === initial && dbLastName.includes(lastName);
            }
            return dbName.toLowerCase().includes(rawNameExcel.toLowerCase());
        });

        if (match) {
            await prisma.historicalPlayerStat.update({
                where: { id: match.id },
                data: { draftDollars: price }
            });
            updatedCount++;
            console.log(`Updated ${match.playerName}: $${price}`);
        } else {
            console.log(`Could not find match for Excel row: ${rawNameExcel} ($${price})`);
        }
    }

    console.log(`Finished. Updated ${updatedCount} records.`);
}

fixAuctionValues()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
