import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Clock, Search, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchComponent from './SearchComponent';
import ChangePasswordModal from './ChangePasswordModal';
import { navigateToSearchResult } from '../utils/searchNavigation';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[role="button"]') && showProfileMenu) {
        setShowProfileMenu(false);
      }
    };
    
    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileMenu]);

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: 'Administrator',
      manager: 'Manager',
      cashier: 'Cashier',
      waiter: 'Waiter',
      kitchen_staff: 'Kitchen Staff',
      delivery: 'Delivery',
      receptionist: 'Receptionist',
      housekeeping: 'Housekeeping'
    };
    return roleMap[role] || role;
  };

  const handleSearchSelect = (result: any, type: string) => {
    console.log('Selected search result:', result, 'Type:', type);
    setShowSearch(false);
    
    // Check if we're on POS page and emit a custom event for better integration
    const currentPath = window.location.pathname;
    if (currentPath === '/pos') {
      // Emit a custom event that the POS component can listen to
      const event = new CustomEvent('posSearchSelect', {
        detail: { result, type, userRole: user?.role }
      });
      window.dispatchEvent(event);
      return;
    }
    
    // Use the navigation utility to handle the result for non-POS pages
    navigateToSearchResult(result, navigate, user?.role);
  };

  const handleAddToOrder = (product: any) => {
    console.log('Adding product to order:', product);
    setShowSearch(false);
    
    // Emit a custom event to add the product to order
    const event = new CustomEvent('posAddToOrder', {
      detail: { product }
    });
    window.dispatchEvent(event);
  };

  const handleSearchClose = () => {
    setShowSearch(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-black rounded-sm flex items-center justify-center relative">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-sm"></div>
                <div className="absolute top-0 right-0 w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-sm"></div>
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Maria Havens POS</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Hotel & Restaurant System</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="flex-1 max-w-md mx-4 hidden lg:block">
          {showSearch ? (
            <SearchComponent
              onSelectResult={handleSearchSelect}
              onClose={handleSearchClose}
              placeholder="Search staff, inventory, orders..."
              autoFocus={true}
              onAddToOrder={window.location.pathname === '/pos' ? handleAddToOrder : undefined}
            />
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search anything...</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {currentTime.toLocaleTimeString('en-KE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>

          <button
            onClick={() => logout()}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 sm:gap-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-2 py-1 sm:px-4 sm:py-2 transition-colors"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <div className="text-xs sm:text-sm min-w-0 text-left">
                <div className="font-medium text-gray-900 truncate">{user?.name}</div>
                <div className="text-gray-500 hidden sm:block truncate">{getRoleDisplayName(user?.role || '')}</div>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Mobile Search Modal */}
      {showSearch && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg mt-16">
            <div className="p-4">
              <SearchComponent
                onSelectResult={handleSearchSelect}
                onClose={handleSearchClose}
                placeholder="Search staff, inventory, orders..."
                autoFocus={true}
                onAddToOrder={window.location.pathname === '/pos' ? handleAddToOrder : undefined}
              />
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </header>
  );
}