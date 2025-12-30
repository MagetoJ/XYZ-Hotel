import { offlineDB, OfflineOrder } from './offlineDB';
import { apiClient } from '../config/api';

export interface SyncResult {
  success: boolean;
  totalOrders: number;
  syncedOrders: number;
  failedOrders: number;
  errors: Array<{ orderId: string; error: string }>;
}

export class OfflineQueue {
  private static instance: OfflineQueue;
  private isSyncing = false;
  private syncListeners: Set<(result: SyncResult) => void> = new Set();

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  async queueOrder(order: any): Promise<string> {
    const offlineOrder: OfflineOrder = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_data: order,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const orderId = await offlineDB.saveOrder(offlineOrder);
      console.log('✅ Order queued for offline sync:', orderId);
      return orderId;
    } catch (error) {
      console.error('❌ Failed to queue order:', error);
      throw error;
    }
  }

  async syncPendingOrders(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return {
        success: false,
        totalOrders: 0,
        syncedOrders: 0,
        failedOrders: 0,
        errors: [{ orderId: 'system', error: 'Sync already in progress' }]
      };
    }

    this.isSyncing = true;
    const errors: Array<{ orderId: string; error: string }> = [];
    let syncedCount = 0;

    try {
      const pendingOrders = await offlineDB.getPendingOrders();
      const totalOrders = pendingOrders.length;

      console.log(`🔄 Starting sync of ${totalOrders} pending orders...`);

      for (const order of pendingOrders) {
        try {
          const response = await apiClient.post('/api/orders', order.order_data);

          if (response.ok) {
            await offlineDB.updateOrderStatus(order.id, 'synced', new Date().toISOString());
            syncedCount++;
            console.log(`✅ Order synced: ${order.id}`);
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Server error' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          errors.push({ orderId: order.id, error: errorMsg });

          order.retries = (order.retries || 0) + 1;

          if (order.retries >= 3) {
            await offlineDB.updateOrderStatus(order.id, 'failed');
            console.error(`❌ Order failed after 3 retries: ${order.id}`, errorMsg);
          } else {
            await offlineDB.updateOrderStatus(order.id, 'pending');
            console.warn(`⚠️ Order sync failed (attempt ${order.retries}/3): ${order.id}`, errorMsg);
          }
        }
      }

      const result: SyncResult = {
        success: errors.length === 0,
        totalOrders,
        syncedOrders: syncedCount,
        failedOrders: totalOrders - syncedCount,
        errors
      };

      console.log('📊 Sync complete:', result);
      this.notifySyncListeners(result);

      return result;
    } catch (error: any) {
      console.error('❌ Sync process error:', error);
      this.isSyncing = false;

      return {
        success: false,
        totalOrders: 0,
        syncedOrders: 0,
        failedOrders: 0,
        errors: [{ orderId: 'system', error: error.message || 'Sync failed' }]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async getPendingOrdersCount(): Promise<number> {
    try {
      const orders = await offlineDB.getPendingOrders();
      return orders.length;
    } catch (error) {
      console.error('Error getting pending orders count:', error);
      return 0;
    }
  }

  async getQueueStats() {
    try {
      return await offlineDB.getDbStats();
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pendingOrders: 0, syncedOrders: 0, failedOrders: 0 };
    }
  }

  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.add(callback);
    return () => {
      this.syncListeners.delete(callback);
    };
  }

  private notifySyncListeners(result: SyncResult) {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  async clearFailedOrders(): Promise<number> {
    try {
      const stats = await offlineDB.getDbStats();
      const failedOrders = await offlineDB.getPendingOrders();
      let cleared = 0;

      for (const order of failedOrders) {
        if (order.status === 'failed') {
          await offlineDB.deleteOrder(order.id);
          cleared++;
        }
      }

      console.log(`✅ Cleared ${cleared} failed orders`);
      return cleared;
    } catch (error) {
      console.error('Error clearing failed orders:', error);
      return 0;
    }
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}

export const offlineQueue = OfflineQueue.getInstance();
