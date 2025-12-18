const fs = require('fs'); 
const content = fs.readFileSync('src/react-app/components/admin/MenuManagement.tsx', 'utf8'); 
const updated = content.replace(\"import { useState, useEffect } from 'react';\", \"import { useState, useEffect, useRef } from 'react';\"); 
const updated2 = updated.replace(\"import { UtensilsCrossed, Plus, Edit3, Trash2, Search } from 'lucide-react';\", \"import { UtensilsCrossed, Plus, Edit3, Trash2, Search, Download, Upload } from 'lucide-react';\"); 
fs.writeFileSync('src/react-app/components/admin/MenuManagement.tsx', updated2, 'utf8'); 
console.log('Imports updated'); 
