const fs = require('fs'); 
const content = fs.readFileSync('server/src/controllers/productController.ts', 'utf8'); 
const hasXLSX = content.includes('import * as XLSX'); 
if (!hasXLSX) { 
const newImports = content.replace('import db from', \"import * as XLSX from 'xlsx';\nimport fs from 'fs';\nimport db from\"); 
fs.writeFileSync('server/src/controllers/productController.ts', newImports, 'utf8'); 
} 
