// src/react-app/components/PWAUpdateNotification.tsx

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, X, AlertCircle } from 'lucide-react';
import { pwaService } from '../utils/pwaService';

export default function PWAUpdateNotification() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  useEffect(() => {
    const unsubscribe = pwaService.onUpdateAvailable(setHasUpdate);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (hasUpdate) {
      // Show notification after a brief delay
      const timer = setTimeout(() => setShowNotification(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdate]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(false);

    try {
      const success = await pwaService.updateServiceWorker();
      if (success) {
        // Reload the page to get the new version
        window.location.reload();
      } else {
        setUpdateError(true);
      }
    } catch (error) {
      console.error('Update error:', error);
      setUpdateError(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
    setUpdateError(false);
  };

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {updateError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Download className="w-5 h-5 text-blue-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">
              {updateError ? 'Update Failed' : 'App Update Available'}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {updateError 
                ? 'Failed to update the app. Please refresh manually.'
                : 'A new version of Maria Havens POS is available. Update now for the latest features and improvements.'
              }
            </p>
            
            <div className="flex items-center gap-2 mt-3">
              {updateError ? (
                <>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Update Now
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Later
                  </button>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}