import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import POS from './POS';
import KitchenDisplay from './KitchenDisplay';
import AdminDashboard from './AdminDashboard';
import HousekeepingDashboard from './HousekeepingDashboard';

export default function Home() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Route based on user role - admin/manager/kitchen staff need to be logged in
  if (user) {
    switch (user.role) {
      case 'kitchen_staff':
        return <KitchenDisplay />;
      case 'admin':
      case 'manager':
        return <AdminDashboard />;
      case 'housekeeping':
        return <HousekeepingDashboard />;
      case 'waiter':
      case 'cashier':
      case 'receptionist':
      case 'delivery':
      default:
        return <POS />;
    }
  }

  // If not logged in, show POS (for order creation) with login option
  return (
    <>
      <POS isQuickAccess={true} onBackToLogin={() => setShowLoginModal(true)} />
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <Login onQuickPOSAccess={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}
