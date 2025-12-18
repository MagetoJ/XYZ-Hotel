const fs = require('fs'); 
const content = fs.readFileSync('server/src/controllers/productController.ts', 'utf8'); 
const lines = content.split(String.fromCharCode(10)); 
lines.splice(2, 0, \"import * as XLSX from 'xlsx';\", \"import fs from 'fs';\"); 
const newContent = lines.join(String.fromCharCode(10)); 
fs.writeFileSync('server/src/controllers/productController.ts', newContent, 'utf8'); 
