import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
}

export default function NetworkStatus({ className = '' }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification) return null;

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm ${className}`}>
      {isOnline ? (
        <div className="bg-green-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
          <Wifi className="w-5 h-5" />
          <span className="text-sm font-medium">Back online!</span>
        </div>
      ) : (
        <div className="bg-red-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
          <WifiOff className="w-5 h-5" />
          <div>
            <div className="text-sm font-medium">You're offline</div>
            <div className="text-xs opacity-90">Check your internet connection</div>
          </div>
        </div>
      )}
    </div>
  );
}