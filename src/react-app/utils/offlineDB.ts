export interface OfflineOrder {
  id: string;
  order_data: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  retries: number;
  createdAt: string;
  syncedAt?: string;
}

export interface CachedUser {
  id: number;
  username: string;
  name: string;
  role: string;
  cachedAt: number;
  sessionId: string;
}

export class OfflineDB {
  private static instance: OfflineDB;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'xyz-hotel-pos-db';
  private readonly DB_VERSION = 1;

  static getInstance(): OfflineDB {
    if (!OfflineDB.instance) {
      OfflineDB.instance = new OfflineDB();
    }
    return OfflineDB.instance;
  }

  async initialize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created orders store');
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'username' });
          console.log('✅ Created users store');
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
          console.log('✅ Created cache store');
        }
      };
    });
  }

  async saveOrder(order: OfflineOrder): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      const request = store.add(order);

      request.onsuccess = () => {
        console.log('✅ Order saved to offline queue:', order.id);
        resolve(order.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOrders(): Promise<OfflineOrder[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result as OfflineOrder[]);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'synced' | 'failed',
    syncedAt?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      const getRequest = store.get(orderId);

      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          order.status = status;
          if (syncedAt) order.syncedAt = syncedAt;
          const updateRequest = store.put(order);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error(`Order not found: ${orderId}`));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteOrder(orderId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      const request = store.delete(orderId);

      request.onsuccess = () => {
        console.log('✅ Order deleted from offline queue:', orderId);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async cacheUser(user: CachedUser): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);

      request.onsuccess = () => {
        console.log('✅ User cached for offline access:', user.username);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getCachedUser(username: string): Promise<CachedUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(username);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setCacheItem(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheItem(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDbStats(): Promise<{
    pendingOrders: number;
    syncedOrders: number;
    failedOrders: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const orders = getAllRequest.result as OfflineOrder[];
        const stats = {
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          syncedOrders: orders.filter(o => o.status === 'synced').length,
          failedOrders: orders.filter(o => o.status === 'failed').length
        };
        resolve(stats);
      };

      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }
}

export const offlineDB = OfflineDB.getInstance();
