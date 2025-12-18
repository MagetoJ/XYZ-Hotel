const fs = require('fs'); 
const content = fs.readFileSync('server/src/controllers/productController.ts', 'utf8'); 
const newContent = content.replace('import db from', \"import * as XLSX from 'xlsx';\nimport fs from 'fs';\nimport db from\"); 
fs.writeFileSync('server/src/controllers/productController.ts', newContent, 'utf8'); 
