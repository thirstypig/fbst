
import * as XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(process.cwd(), 'server/src/data/Auction 2025.xlsx');
console.log("Reading:", filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
console.log("Sheet:", sheetName);

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Rows found:", data.length);
console.log("Header:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Row 3:", data[3]);
