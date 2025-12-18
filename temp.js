const fs = require(\"fs\") 
const content = fs.readFileSync(\"server/src/controllers/inventoryController.ts\", \"utf8\") 
const updated = content.replace(\"current_stock: existingItem.current_stock + quantity,\", \"current_stock: quantity,\") 
fs.writeFileSync(\"server/src/controllers/inventoryController.ts\", updated, \"utf8\") 
