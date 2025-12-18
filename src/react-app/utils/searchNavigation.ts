import { NavigateFunction } from 'react-router-dom';

export interface SearchResult {
  id: number;
  type: 'staff' | 'inventory' | 'menu' | 'order' | 'room' | 'purchase_order';
  title: string;
  subtitle: string;
  description?: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Navigation utility for search results
 * Handles navigation to appropriate pages/tabs based on search result type and user role
 */
export const navigateToSearchResult = (
  result: SearchResult, 
  navigate: NavigateFunction, 
  userRole?: string,
  setActiveTab?: (tab: string) => void,
  setActiveView?: (view: string) => void
) => {
  const { type } = result;
  
  // For admin users, navigate to admin dashboard with appropriate tab
  if (userRole === 'admin' || userRole === 'manager') {
    // If already on admin dashboard, just switch tabs
    if (setActiveTab) {
      switch (type) {
        case 'staff':
          setActiveTab('staff');
          break;
        case 'inventory':
          setActiveTab('inventory');
          break;
        case 'menu':
          setActiveTab('menu');
          break;
        case 'order':
          setActiveTab('reports');
          break;
        case 'room':
          setActiveTab('rooms');
          break;
        case 'purchase_order':
          setActiveTab('purchase-orders');
          break;
        default:
          setActiveTab('search');
          break;
      }
    } else {
      // Check if we're currently on POS page and can handle certain types within POS
      const currentPath = window.location.pathname;
      if (currentPath === '/pos' && setActiveView && (type === 'menu' || type === 'room' || type === 'order')) {
        // Handle navigation within POS interface for admin users
        switch (type) {
          case 'menu':
            setActiveView('menu');
            break;
          case 'room':
            setActiveView('rooms');
            break;
          case 'order':
            // Stay on menu view for orders (as orders are managed through OrderPanel)
            setActiveView('menu');
            break;
        }
      } else {
        // Navigate to admin dashboard first, then use a custom event to set the tab
        // This avoids potential issues with hash-based navigation in production
        navigate('/admin');

        // Use a timeout to ensure navigation completes before setting the tab
        setTimeout(() => {
          const event = new CustomEvent('adminSearchNavigate', {
            detail: { tab: getTabForType(type) }
          });
          window.dispatchEvent(event);
        }, 100);
      }
    }
  } else {
    // For non-admin users, prioritize POS interface when appropriate
    const currentPath = window.location.pathname;
    
    switch (type) {
      case 'staff':
        // Only admins can access staff management
        console.warn('Staff management requires admin access');
        break;
      case 'inventory':
        // Kitchen staff might access inventory through kitchen dashboard
        if (userRole === 'kitchen_staff') {
          navigate('/kitchen');
        } else {
          console.warn('Inventory management requires appropriate access');
        }
        break;
      case 'menu':
        // Prioritize staying within POS interface if already there
        if (currentPath === '/pos' && setActiveView) {
          setActiveView('menu');
        } else if (userRole === 'kitchen_staff') {
          navigate('/kitchen');
        } else {
          navigate('/pos'); // General users can see menu in POS
        }
        break;
      case 'order':
        // Prioritize staying within POS interface if already there
        if (currentPath === '/pos' && setActiveView) {
          setActiveView('menu'); // Stay on menu view as orders are handled via OrderPanel
        } else {
          navigate('/pos');
        }
        break;
      case 'room':
        // Handle room navigation based on current context and role
        if (currentPath === '/pos' && setActiveView && canAccessRooms(userRole)) {
          setActiveView('rooms');
        } else if (userRole === 'receptionist') {
          navigate('/reception');
        } else if (userRole === 'housekeeping') {
          navigate('/housekeeping');
        } else {
          console.warn('Room management requires appropriate access');
        }
        break;
      case 'purchase_order':
        // Purchase orders are typically managed by admin/manager
        if (userRole === 'admin' || userRole === 'manager') {
          // Navigate to admin dashboard first, then use a custom event to set the tab
          // This avoids potential issues with hash-based navigation in production
          navigate('/admin');

          // Use a timeout to ensure navigation completes before setting the tab
          setTimeout(() => {
            const event = new CustomEvent('adminSearchNavigate', {
              detail: { tab: 'purchase-orders' }
            });
            window.dispatchEvent(event);
          }, 100);
        } else {
          console.warn('Purchase order management requires admin access');
        }
        break;
      default:
        // Default to POS for general access
        navigate('/pos');
        break;
    }
  }
};

/**
 * Get the appropriate tab name for a result type
 */
const getTabForType = (type: string): string => {
  const tabMap: { [key: string]: string } = {
    staff: 'staff',
    inventory: 'inventory',
    menu: 'menu',
    order: 'reports',
    room: 'rooms',
    purchase_order: 'purchase-orders'
  };
  return tabMap[type] || 'search';
};

/**
 * Check if user has access to rooms
 */
const canAccessRooms = (userRole?: string): boolean => {
  return userRole === 'receptionist' || userRole === 'manager' || userRole === 'admin';
};

/**
 * Check if user has access to a specific result type
 */
export const canAccessResultType = (type: string, userRole?: string): boolean => {
  if (userRole === 'admin' || userRole === 'manager') {
    return true; // Admins can access everything
  }
  
  switch (type) {
    case 'staff':
      return false; // Only admins can access staff management
    case 'inventory':
      return userRole === 'kitchen_staff';
    case 'menu':
      return true; // Most users can see menu items
    case 'order':
      return true; // Most users can see orders
    case 'room':
      return canAccessRooms(userRole);
    case 'purchase_order':
      return userRole === 'admin' || userRole === 'manager'; // Only admins and managers can access purchase orders
    default:
      return true;
  }
};