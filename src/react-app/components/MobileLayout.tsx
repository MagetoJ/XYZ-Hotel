import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
}

export default function MobileLayout({ children, sidebar, showSidebar = false }: MobileLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-full">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed left-0 top-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:block lg:w-80
        `}>
          <div className="flex items-center justify-between p-4 border-b lg:hidden">
            <h3 className="text-lg font-semibold">Menu</h3>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Button */}
        {showSidebar && (
          <div className="lg:hidden p-4 border-b bg-white">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
              <span>Open Menu</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}