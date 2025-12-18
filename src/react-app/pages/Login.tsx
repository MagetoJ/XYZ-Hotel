import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../config/api';
import { User, Lock, AlertCircle, Loader2, UtensilsCrossed, Eye, EyeOff, RotateCcw } from 'lucide-react';
import PasswordResetModal from '../components/PasswordResetModal';
import PWAInstallBanner from '../components/PWAInstallBanner';
import { pwaService } from '../utils/pwaService';


interface LoginProps {
  onQuickPOSAccess?: () => void;
}

export default function Login({ onQuickPOSAccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isOnline, setIsOnline] = useState(pwaService.isOnline());
  const { login, isLoading } = useAuth();

  // Online/Offline status
  useEffect(() => {
    const unsubscribe = pwaService.onConnectivityChange(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (error) {
      console.log('Current error state in render:', error);
    }
  }, [error]);





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    // Check connectivity
    if (!isOnline) {
      setError('❌ No internet connection. Please check your connection and try again.');
      return;
    }

    try {
      console.log('Submitting login form...');
      const result = await login(username, password);
      
      console.log('Login result:', JSON.stringify(result)); // Debug log
      
      if (!result.success) {
        // Enhanced error handling with specific messages
        let errorMessage = result.message || 'Login failed. Please try again.';
        
        if (result.message?.includes('fetch') || result.message?.includes('connect')) {
          errorMessage = '❌ Cannot connect to server. Please check your internet connection.';
        } else if (result.message?.includes('Invalid') || result.message?.includes('password') || result.message?.includes('credentials')) {
          errorMessage = '❌ Incorrect username or password. Please try again.';
        } else if (result.message?.includes('timeout')) {
          errorMessage = '❌ Request timed out. Please try again.';
        } else if (result.message?.includes('Server')) {
          errorMessage = '❌ Server is temporarily unavailable. Please try again later.';
        }
        
        setError(errorMessage);
        console.error('Login failed with message:', result.message);
        console.log('Error state set to:', errorMessage); // Debug
      } else {
        console.log('✅ Login successful, redirecting...');
        // Clear form on success
        setUsername('');
        setPassword('');
        setError(''); // Ensure error is cleared
      }
    } catch (error) {
      console.error('Login exception:', error);
      setError('❌ Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 flex items-center justify-center p-4">
      {/* PWA Install Banner */}
      <PWAInstallBanner showOnLogin={true} />
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-red-500 text-white p-2 text-center text-sm">
          ⚠️ You're offline. Some features may not work properly.
        </div>
      )}
      
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl mb-4 shadow-lg">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg flex items-center justify-center relative">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded-sm"></div>
              <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Maria Havens</h1>
          <p className="text-sm sm:text-base text-gray-600">Point of Sale System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-6">Staff Login</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all text-base"
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all text-base"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold hover:from-yellow-500 hover:to-amber-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium focus:outline-none focus:underline transition-colors"
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 inline mr-1" />
                Forgot Password?
              </button>
            </div>
          </form>

          {onQuickPOSAccess && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
              
              <button
                onClick={onQuickPOSAccess}
                disabled={isLoading}
                className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base"
              >
                <UtensilsCrossed className="w-5 h-5" />
                Quick POS Access
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Direct access for waiters - PIN required for orders
              </p>
            </div>
          )}

         
        </div>
        
        {/* Enhanced Password Reset Modal */}
        <PasswordResetModal 
          isOpen={showPasswordReset}
          onClose={() => setShowPasswordReset(false)}
        />
      </div>
    </div>
  );
}