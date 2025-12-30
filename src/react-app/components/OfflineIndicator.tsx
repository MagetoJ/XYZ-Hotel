import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { pwaService } from '../utils/pwaService';
import { offlineQueue } from '../utils/offlineQueue';

interface SyncResult {
  success: boolean;
  totalOrders: number;
  syncedOrders: number;
  failedOrders: number;
  errors: Array<{ orderId: string; error: string }>;
}

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    const unsubscribeOnline = pwaService.onConnectivityStatusChange((online) => {
      setIsOnline(online);
      if (online) {
        triggerSync();
      }
    });

    const unsubscribeSync = pwaService.onOfflineSync((result: SyncResult) => {
      setLastSyncResult(result);
      setLastSync(new Date());
      setSyncMessage(
        result.syncedOrders > 0
          ? `✅ Synced ${result.syncedOrders} order${result.syncedOrders !== 1 ? 's' : ''}`
          : result.failedOrders > 0
          ? `❌ ${result.failedOrders} order${result.failedOrders !== 1 ? 's' : ''} failed`
          : 'No orders to sync'
      );
      setIsSyncing(false);

      setTimeout(() => {
        setSyncMessage('');
      }, 5000);
    });

    updatePendingCount();

    const interval = setInterval(() => {
      updatePendingCount();
    }, 5000);

    return () => {
      unsubscribeOnline();
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await offlineQueue.getPendingOrdersCount();
      setPendingOrders(count);
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage('🔄 Syncing...');
    try {
      await pwaService.syncOfflineData();
      updatePendingCount();
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage('❌ Sync failed');
    }
  };

  if (!isOnline) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-3 mb-2">
            <WifiOff className="w-5 h-5 text-red-600 animate-pulse" />
            <div>
              <p className="font-bold text-red-700">Offline Mode</p>
              <p className="text-sm text-red-600">No internet connection</p>
            </div>
          </div>

          {pendingOrders > 0 && (
            <div className="mt-3 p-3 bg-red-100 rounded border border-red-300 text-sm text-red-700">
              ⏳ {pendingOrders} order{pendingOrders !== 1 ? 's' : ''} waiting to sync
            </div>
          )}

          <p className="text-xs text-red-600 mt-2">
            Orders will be saved locally and synced automatically when connection is restored.
          </p>
        </div>
      </div>
    );
  }

  if (pendingOrders === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-blue-50 border-2 border-blue-500 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-bold text-blue-700">Online</p>
              <p className="text-sm text-blue-600">
                {isSyncing ? '🔄 Syncing...' : `📦 ${pendingOrders} pending order${pendingOrders !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {isSyncing ? (
            <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          ) : pendingOrders > 0 && isOnline ? (
            <button
              onClick={triggerSync}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold transition-colors"
            >
              Sync Now
            </button>
          ) : null}
        </div>

        {syncMessage && (
          <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-700">
            {syncMessage}
          </div>
        )}

        {lastSyncResult && lastSyncResult.failedOrders > 0 && (
          <button
            onClick={() => setShowSyncDetails(!showSyncDetails)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {showSyncDetails ? 'Hide details' : 'Show details'}
          </button>
        )}

        {showSyncDetails && lastSyncResult && lastSyncResult.errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-100 rounded border border-red-300 max-h-32 overflow-y-auto">
            <p className="font-semibold text-red-700 mb-2">Failed orders:</p>
            {lastSyncResult.errors.map((error, idx) => (
              <div key={idx} className="text-xs text-red-700 mb-1">
                <span className="font-mono">{error.orderId.substring(0, 12)}...</span>: {error.error}
              </div>
            ))}
          </div>
        )}

        {lastSync && !showSyncDetails && (
          <p className="text-xs text-gray-500 mt-2">
            Last sync: {lastSync.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
