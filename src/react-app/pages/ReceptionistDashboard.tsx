import { useState } from 'react';
import Header from '../components/Header';
import ReceptionistBarSales from '../components/receptionist/ReceptionistBarSales';
import ReceptionistInventory from '../components/receptionist/ReceptionistInventory';
import PerformanceDashboardView from '../components/PerfomanceDashboardView';
import OverviewDashboard from '../components/OverviewDashboard';
import Sidebar from '../components/Sidebar';
import TableManagementView from '../components/TableManagementView';
import MenuManagement from '../components/admin/MenuManagement';
import ReportsManagement from '../components/admin/ReportsManagement';
import ShiftHandover from '../components/receptionist/ShiftHandover';
import { BarChart3, ShoppingCart, Package, LayoutGrid, FileText, UtensilsCrossed, TrendingUp, ClipboardList } from 'lucide-react';

export default function ReceptionistDashboard() {
  const [activeView, setActiveView] = useState('tables');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tables', label: 'Table Management', icon: LayoutGrid },
    { id: 'sales', label: 'Bar Sales', icon: ShoppingCart },
    { id: 'menu', label: 'Menu Management', icon: UtensilsCrossed },
    { id: 'inventory', label: 'Manage Inventory', icon: Package },
    { id: 'handover', label: 'Shift Handover', icon: ClipboardList },
    { id: 'receipts', label: 'Receipt History', icon: FileText },
    { id: 'performance', label: 'Analytics', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewDashboard />;
      case 'tables':
        return (
          <div className="space-y-6">
            <ShiftHandover />
            <TableManagementView />
          </div>
        );
      case 'sales':
        return <ReceptionistBarSales />;
      case 'menu':
        return <MenuManagement />;
      case 'inventory':
        return <ReceptionistInventory />;
      case 'handover':
        return <ShiftHandover />;
      case 'receipts':
        return <ReportsManagement defaultTab="receipts" />;
      case 'performance':
        return <PerformanceDashboardView />;
      default:
        return <TableManagementView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          title="POS Command Center"
          navItems={navItems}
          activeItem={activeView}
          onNavItemClick={setActiveView}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto pb-20 sm:pb-4 lg:ml-64">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
