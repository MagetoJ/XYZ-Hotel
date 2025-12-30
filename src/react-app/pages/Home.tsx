import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UtensilsCrossed, LayoutDashboard, ChefHat, LogIn, DoorOpen } from 'lucide-react';
import Login from './Login';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const NavButton = ({ icon: Icon, label, color, onClick, subtext }: any) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-white shadow-md border-2 border-transparent hover:border-${color}-500 transition-all group`}
    >
      <div className={`p-4 rounded-xl bg-${color}-50 text-${color}-600 mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={40} />
      </div>
      <span className="text-xl font-bold text-gray-800">{label}</span>
      {subtext && <span className="text-xs text-gray-500 mt-1">{subtext}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">XYZ Hotel POS</h1>
        <p className="text-gray-600 mt-2">Select a module to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
        <NavButton 
          icon={UtensilsCrossed} 
          label="Quick POS" 
          color="blue" 
          subtext="Create Orders & Sales"
          onClick={() => navigate('/pos')} 
        />

        <NavButton 
          icon={ChefHat} 
          label="Kitchen" 
          color="orange" 
          subtext="Orders & Inventory"
          onClick={() => navigate('/kitchen')} 
        />

        <NavButton 
          icon={DoorOpen} 
          label="Reception" 
          color="green" 
          subtext="Check-ins & Rooms"
          onClick={() => navigate('/reception')} 
        />

        <NavButton 
          icon={LayoutDashboard} 
          label="Management" 
          color="purple" 
          subtext="Reports & Settings"
          onClick={() => user ? navigate('/admin') : setShowLoginModal(true)} 
        />

        {!user && (
          <NavButton 
            icon={LogIn} 
            label="Staff Login" 
            color="gray" 
            subtext="Access restricted areas"
            onClick={() => setShowLoginModal(true)} 
          />
        )}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full relative overflow-hidden">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
            <Login onQuickPOSAccess={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
