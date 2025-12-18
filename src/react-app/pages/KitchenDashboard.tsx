import { useState } from 'react';
import Header from '../components/Header';
import KitchenOrderView from '../components/kitchen/KitchenOrderView';
import KitchenInventoryView from '../components/kitchen/KitchenInventoryView';
import Sidebar from '../components/Sidebar'; // <-- Import the new Sidebar component
import { Utensils, Package } from 'lucide-react';

export default function KitchenDashboard() {
  const [activeView, setActiveView] = useState('orders');

  // Define the navigation items for the kitchen sidebar
  const navItems = [
    { id: 'orders', label: 'Live Orders', icon: Utensils },
    { id: 'inventory', label: 'Kitchen Inventory', icon: Package },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'inventory':
        return <KitchenInventoryView onClose={() => setActiveView('orders')} />;
      case 'orders':
      default:
        return <KitchenOrderView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          title="Kitchen Panel"
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
