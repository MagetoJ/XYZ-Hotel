import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, ElementType } from 'react';
import { Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
}

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  activeItem: string;
  onNavItemClick: (id: string) => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (isOpen: boolean) => void;
  children?: ReactNode;
  footerContent?: ReactNode;
  showMobileQuickNav?: boolean;
}

export default function Sidebar({
  title,
  navItems,
  activeItem,
  onNavItemClick,
  isSidebarOpen,
  setIsSidebarOpen,
  children,
  footerContent,
  showMobileQuickNav = true
}: SidebarProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof isSidebarOpen === 'boolean' && typeof setIsSidebarOpen === 'function';
  const isOpen = isControlled ? (isSidebarOpen as boolean) : internalOpen;

  const openSidebar = useCallback(() => {
    if (isControlled) {
      setIsSidebarOpen?.(true);
    } else {
      setInternalOpen(true);
    }
  }, [isControlled, setIsSidebarOpen]);

  const closeSidebar = useCallback(() => {
    if (isControlled) {
      setIsSidebarOpen?.(false);
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, setIsSidebarOpen]);

  useEffect(() => {
    closeSidebar();
  }, [activeItem, closeSidebar]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeSidebar]);

  const handleNavItemClick = (id: string) => {
    onNavItemClick(id);
    if (typeof window === 'undefined' || window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  const renderNavItems = () => (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavItemClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-yellow-100 text-yellow-900 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-yellow-800' : 'text-gray-500'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const defaultFooter = (
    <>
      <p className="text-xs text-gray-500">© Maria Havens POS</p>
      <p className="text-xs text-gray-500">
        Role: <span className="capitalize font-medium">{user?.role?.replace('_', ' ')}</span>
      </p>
    </>
  );

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`
          fixed lg:fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 p-6 transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">Logged in as {user?.name}</p>
            </div>
            <button
              onClick={closeSidebar}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {renderNavItems()}
              {children}
            </div>
            <div className="pt-6 border-t border-gray-200 space-y-1 flex-shrink-0">
              {footerContent ?? defaultFooter}
            </div>
          </div>
        </div>
      </aside>

      {!isControlled && (
        <div className="lg:hidden fixed top-20 left-4 z-40">
          <button
            onClick={openSidebar}
            className="bg-white border border-gray-300 rounded-lg p-2 shadow-md hover:shadow-lg transition-shadow"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {showMobileQuickNav && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 sm:hidden">
          <div className="flex">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item.id)}
                  className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors ${
                    isActive
                      ? 'bg-yellow-50 text-yellow-900 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-yellow-800' : 'text-gray-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
            {navItems.length > 4 && (
              <button
                onClick={openSidebar}
                className="flex-1 flex flex-col items-center gap-1 px-2 py-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-500" />
                <span>More</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
