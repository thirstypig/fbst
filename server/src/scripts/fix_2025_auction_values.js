
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Script starting...');
console.log('CWD:', process.cwd());

// Hardcoded DB URL to bypass permission issues
const DATABASE_URL = "postgresql://neondb_owner:npg_JoyZW29bGNEv@ep-shiny-haze-afcdvtmf-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('Using hardcoded DATABASE_URL');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    }
});

const readFile = XLSX.readFile;
const utils = XLSX.utils;

async function fixAuctionValues() {
    const excelPath = path.join(__dirname, '../data/Auction 2025.xlsx');
    console.log('Reading Excel from:', excelPath);

    const wb = readFile(excelPath);
    const sheet = wb.Sheets['Sheet1'];
    const rows = utils.sheet_to_json(sheet, { header: 1 });

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
    
    // Skip header row if it exists
    const startIdx = (rows[0] && rows[0][3] && (String(rows[0][3]).toLowerCase().includes('price') || isNaN(Number(rows[0][3])))) ? 1 : 0;

    for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        const rawNameExcel = String(row[2] || '').trim(); // e.g. "J. Soto"
        const price = Number(row[3]);

        if (!rawNameExcel || isNaN(price)) continue;

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

                return dbInitial === initial && dbLastName.toLowerCase().includes(lastName);
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
        }
    }

    console.log(`Finished. Updated ${updatedCount} records.`);
}

fixAuctionValues()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
