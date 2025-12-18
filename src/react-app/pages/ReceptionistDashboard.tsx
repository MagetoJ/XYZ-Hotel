import { useState } from 'react';
import Header from '../components/Header';
import ReceptionistBarSales from '../components/receptionist/ReceptionistBarSales';
import ReceptionistInventory from '../components/receptionist/ReceptionistInventory';
import ReceptionistCheckIn from '../components/receptionist/ReceptionistCheckIn';
import PerformanceDashboardView from '../components/PerfomanceDashboardView';
import Sidebar from '../components/Sidebar';
import RoomView from '../components/RoomView'; // <-- Re-importing the original RoomView
import TableManagementView from '../components/TableManagementView'; // <-- Re-importing the original TableManagementView
import { BarChart3, ShoppingCart, Package, Bed, LayoutGrid, UserPlus } from 'lucide-react';

export default function ReceptionistDashboard() {
  const [activeView, setActiveView] = useState('check-in'); // Default to Guest Check-In

  // Add Room and Table management back to the navigation items
  const navItems = [
    { id: 'check-in', label: 'Guest Check-In', icon: UserPlus },
    { id: 'rooms', label: 'Room Management', icon: Bed },
    { id: 'tables', label: 'Table Management', icon: LayoutGrid },
    { id: 'sales', label: 'Bar Sales', icon: ShoppingCart },
    { id: 'inventory', label: 'Manage Inventory', icon: Package },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'check-in':
        // Render the dedicated ReceptionistCheckIn component
        return <ReceptionistCheckIn />;
      case 'tables':
        // Render the original TableManagementView component
        return <TableManagementView />;
      case 'sales':
        return <ReceptionistBarSales />;
      case 'inventory':
        return <ReceptionistInventory />;
      case 'performance':
        return <PerformanceDashboardView />;
      case 'rooms':
      default:
        // Render the original RoomView component for check-in/check-out
        return <RoomView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          title="Reception Desk"
          navItems={navItems}
          activeItem={activeView}
          onNavItemClick={setActiveView}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto pb-20 sm:pb-4 lg:ml-64">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

