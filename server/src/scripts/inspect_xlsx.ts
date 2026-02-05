
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ../data/Auction 2025.xlsx  (from src/scripts/)
const argPath = process.argv[2];
const filePath = argPath ? path.resolve(process.cwd(), argPath) : path.join(__dirname, '../data/Auction 2025.xlsx');
console.log("Reading:", filePath);

// @ts-ignore
const readFile = XLSX.readFile || (XLSX as any).default?.readFile;
const workbook = readFile(filePath);
const sheetName = workbook.SheetNames[0];
console.log("Sheet:", sheetName);

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Rows found:", data.length);
console.log("Header:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Row 3:", data[3]);
console.log("Row 4:", data[4]);
