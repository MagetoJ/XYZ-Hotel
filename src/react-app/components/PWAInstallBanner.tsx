// src/react-app/components/PWAInstallBanner.tsx

import React, { useState, useEffect } from 'react';
import { Download, X, Share, Plus, Monitor, Smartphone } from 'lucide-react';
import { pwaService } from '../utils/pwaService';

interface PWAInstallBannerProps {
  showOnLogin?: boolean;
  className?: string;
}

export default function PWAInstallBanner({ showOnLogin = true, className = '' }: PWAInstallBannerProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = pwaService.onInstallAvailabilityChange(setCanInstall);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (canInstall && !dismissed && showOnLogin) {
      // Show banner after a short delay to avoid jarring experience
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, dismissed, showOnLogin]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await pwaService.showInstallPrompt();
      if (success) {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleIOSInstall = () => {
    if (pwaService.isIOS()) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    setShowIOSInstructions(false);
  };

  if (!showBanner && !showIOSInstructions) return null;

  return (
    <>
      {/* Main Install Banner */}
      {showBanner && (
        <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transition-transform duration-300 ${className}`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {pwaService.isMobile() ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Monitor className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    Install Maria Havens POS
                  </p>
                  <p className="text-xs text-blue-100">
                    {pwaService.isMobile() ? 'Add to home screen for quick access' : 'Get app-like experience'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-2">
                {pwaService.isIOS() ? (
                  <button
                    onClick={handleIOSInstall}
                    className="bg-white text-blue-600 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <Share className="w-3 h-3" />
                    Install
                  </button>
                ) : (
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="bg-white text-blue-600 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isInstalling ? (
                      <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    {isInstalling ? 'Installing...' : 'Install'}
                  </button>
                )}
                
                <button
                  onClick={handleDismiss}
                  className="text-white hover:text-blue-200 transition-colors p-0.5"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instructions Modal */}
      {showIOSInstructions && pwaService.isIOS() && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Install App</h3>
              <p className="text-sm text-gray-600 mt-1">Add Maria Havens POS to your home screen</p>
            </div>

            <div className="space-y-3 mb-6">
              {pwaService.getIOSInstallInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">{instruction}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Environment indicator component
export function EnvironmentIndicator() {
  const [appInfo, setAppInfo] = useState(pwaService.getAppInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setAppInfo(pwaService.getAppInfo());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (appInfo.environment === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-xs shadow-lg">
        <div className="font-medium">Development Mode</div>
        <div className="text-xs opacity-75">
          {appInfo.isInstalled ? '📱 Installed' : '🌐 Browser'} • 
          {appInfo.isMobile ? ' Mobile' : ' Desktop'}
        </div>
      </div>
    </div>
  );
}