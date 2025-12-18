import { Request, Response } from 'express';
import db from '../db';

// Default settings
const DEFAULT_SETTINGS = {
  business_name: 'Maria Havens POS',
  business_address: '',
  business_phone: '',
  business_email: '',
  business_logo: '/logo.PNG',
  service_charge_rate: 10.0,
  currency: 'KES',
  timezone: 'Africa/Nairobi',
  receipt_footer_text: 'Thank you for your business!',
  enable_tips: true,
  enable_service_charge: true,
  max_discount_percentage: 20.0,
  auto_print_receipts: false,
  require_customer_info: false,
  enable_loyalty_points: false,
  loyalty_points_rate: 1.0,
  minimum_order_amount: 0.0,
  enable_table_service: true,
  enable_takeaway: true,
  enable_delivery: false,
  delivery_fee: 0.0,
  opening_time: '06:00',
  closing_time: '23:00',
  enable_pos_sounds: true,
  enable_notifications: true,
  low_stock_threshold: 10,
  receipt_printer_name: '',
  kitchen_printer_name: '',
  backup_frequency: 'daily',
  enable_multi_currency: false,
  default_payment_method: 'cash'
};

// Ensure settings table exists
const ensureSettingsTable = async () => {
  const hasTable = await db.schema.hasTable('settings');
  if (!hasTable) {
    await db.schema.createTable('settings', table => {
      table.increments('id').primary();
      table.string('key').notNullable().unique();
      table.text('value');
      table.string('type').defaultTo('string'); // string, number, boolean, json
      table.text('description');
      table.timestamps(true, true);
    });

    // Insert default settings
    const defaultSettingsArray = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      type: typeof value === 'boolean' ? 'boolean' : 
            typeof value === 'number' ? 'number' : 'string',
      created_at: new Date(),
      updated_at: new Date()
    }));

    await db('settings').insert(defaultSettingsArray);
  }
};

// Get all settings
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    await ensureSettingsTable();

    // Check if type column exists
    const hasTypeColumn = await db.schema.hasColumn('settings', 'type');
    
    const settingsQuery = hasTypeColumn 
      ? db('settings').select('key', 'value', 'type').orderBy('key', 'asc')
      : db('settings').select('key', 'value').orderBy('key', 'asc');

    const settingsRows = await settingsQuery;

    // Convert to key-value object
    const settings: Record<string, any> = {};
    for (const row of settingsRows) {
      let value = row.value;
      
      // Parse value based on type (if available) or infer type
      const type = row.type || inferType(row.key, value);
      switch (type) {
        case 'boolean':
          value = value === 'true' || value === true;
          break;
        case 'number':
          value = parseFloat(value) || 0;
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = {};
          }
          break;
        default:
          // Keep as string
          break;
      }
      
      settings[row.key] = value;
    }

    // Map old keys to new keys for compatibility
    const keyMappings: Record<string, string> = {
      'restaurant_name': 'business_name',
      'restaurant_address': 'business_address',
      'restaurant_phone': 'business_phone',
      'service_charge': 'service_charge_percentage',
      'currency': 'currency_symbol'
    };

    // Apply key mappings
    for (const [oldKey, newKey] of Object.entries(keyMappings)) {
      if (settings[oldKey] !== undefined && settings[newKey] === undefined) {
        settings[newKey] = settings[oldKey];
      }
    }

    // Ensure all default settings exist
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      if (!(key in settings)) {
        settings[key] = defaultValue;
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to infer type from key and value
function inferType(key: string, value: string): string {
  // Number keys
  if (key.includes('rate') || key.includes('percentage') || key.includes('charge') || 
      key.includes('max_') || key.includes('minimum') || key.includes('fee')) {
    return 'number';
  }
  
  // Boolean keys
  if (key.startsWith('enable_') || key.startsWith('require_') || key.startsWith('auto_')) {
    return 'boolean';
  }
  
  // Try to parse as number
  if (!isNaN(parseFloat(value))) {
    return 'number';
  }
  
  // Try to parse as boolean
  if (value === 'true' || value === 'false') {
    return 'boolean';
  }
  
  return 'string';
}

// Update multiple settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    await ensureSettingsTable();

    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'Settings object required' });
    }

    // Check if type column exists
    const hasTypeColumn = await db.schema.hasColumn('settings', 'type');

    // Update settings one by one
    for (const [key, value] of Object.entries(updates)) {
      const type = typeof value === 'boolean' ? 'boolean' : 
                   typeof value === 'number' ? 'number' : 
                   typeof value === 'object' ? 'json' : 'string';

      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (hasTypeColumn) {
        await db('settings')
          .insert({
            key,
            value: stringValue,
            type,
            created_at: new Date(),
            updated_at: new Date()
          })
          .onConflict('key')
          .merge({
            value: stringValue,
            type,
            updated_at: new Date()
          });
      } else {
        await db('settings')
          .insert({
            key,
            value: stringValue,
            created_at: new Date(),
            updated_at: new Date()
          })
          .onConflict('key')
          .merge({
            value: stringValue,
            updated_at: new Date()
          });
      }
    }

    // Get updated settings
    const updatedSettings = await getAllSettingsInternal();
    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get specific setting by key
export const getSettingByKey = async (req: Request, res: Response) => {
  try {
    await ensureSettingsTable();

    const { key } = req.params;

    const settingRow = await db('settings')
      .where('key', key)
      .first();

    if (!settingRow) {
      // Return default value if exists
      if (key in DEFAULT_SETTINGS) {
        return res.json({ 
          key, 
          value: DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] 
        });
      }
      return res.status(404).json({ message: 'Setting not found' });
    }

    let value = settingRow.value;
    
    // Parse value based on type
    switch (settingRow.type) {
      case 'boolean':
        value = value === 'true' || value === true;
        break;
      case 'number':
        value = parseFloat(value) || 0;
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = {};
        }
        break;
      default:
        // Keep as string
        break;
    }

    res.json({ key, value });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update specific setting
export const updateSetting = async (req: Request, res: Response) => {
  try {
    await ensureSettingsTable();

    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const type = typeof value === 'boolean' ? 'boolean' : 
                 typeof value === 'number' ? 'number' : 
                 typeof value === 'object' ? 'json' : 'string';

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await db('settings')
      .insert({
        key,
        value: stringValue,
        type,
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict('key')
      .merge({
        value: stringValue,
        type,
        updated_at: new Date()
      });

    res.json({ key, value });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Internal helper function to get all settings
async function getAllSettingsInternal() {
  // Check if type column exists
  const hasTypeColumn = await db.schema.hasColumn('settings', 'type');
  
  const settingsQuery = hasTypeColumn 
    ? db('settings').select('key', 'value', 'type')
    : db('settings').select('key', 'value');

  const settingsRows = await settingsQuery;

  const settings: Record<string, any> = {};
  for (const row of settingsRows) {
    let value = row.value;
    
    const type = row.type || inferType(row.key, value);
    switch (type) {
      case 'boolean':
        value = value === 'true' || value === true;
        break;
      case 'number':
        value = parseFloat(value) || 0;
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = {};
        }
        break;
    }
    
    settings[row.key] = value;
  }

  // Map old keys to new keys for compatibility
  const keyMappings: Record<string, string> = {
    'restaurant_name': 'business_name',
    'restaurant_address': 'business_address',
    'restaurant_phone': 'business_phone',
    'service_charge': 'service_charge_percentage',
    'currency': 'currency_symbol'
  };

  // Apply key mappings
  for (const [oldKey, newKey] of Object.entries(keyMappings)) {
    if (settings[oldKey] !== undefined && settings[newKey] === undefined) {
      settings[newKey] = settings[oldKey];
    }
  }

  // Ensure all default settings exist
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(key in settings)) {
      settings[key] = defaultValue;
    }
  }

  return settings;
}