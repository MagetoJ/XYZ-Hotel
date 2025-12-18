import db from '../db';

// Helper function for PIN validation
export async function validateStaffPinForOrder(
  username: string, 
  pin: string
): Promise<{ valid: boolean; staffId?: number; staffName?: string }> {
  try {
    const user = await db('staff')
      .where({ username, is_active: true })
      .first();
    
    if (!user) return { valid: false };
    
    const userPin = user.pin?.toString();
    const providedPin = pin?.toString();
    
    if (userPin === providedPin) {
      return { 
        valid: true, 
        staffId: user.id, 
        staffName: user.name 
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('PIN validation error:', error);
    return { valid: false };
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  return { valid: true };
}