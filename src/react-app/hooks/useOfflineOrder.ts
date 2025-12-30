import { useState, useCallback } from 'react';
import { offlineQueue } from '../utils/offlineQueue';
import { apiClient } from '../config/api';

export interface SubmitOrderResult {
  success: boolean;
  orderId: string;
  message: string;
  isOffline?: boolean;
}

export const useOfflineOrder = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrder = useCallback(
    async (orderData: any): Promise<SubmitOrderResult> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const isOnline = navigator.onLine;

        if (isOnline) {
          try {
            const response = await apiClient.post('/api/orders', orderData, {
              signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
              success: true,
              orderId: result.id || result.order_number || `order-${Date.now()}`,
              message: 'Order submitted successfully',
              isOffline: false
            };
          } catch (networkError: any) {
            if (navigator.onLine === false) {
              console.warn('Network error, attempting offline queue');
              const offlineOrderId = await offlineQueue.queueOrder(orderData);
              return {
                success: true,
                orderId: offlineOrderId,
                message: 'Order saved offline. Will sync when connection is restored.',
                isOffline: true
              };
            }
            throw networkError;
          }
        } else {
          const offlineOrderId = await offlineQueue.queueOrder(orderData);
          return {
            success: true,
            orderId: offlineOrderId,
            message: 'Order saved offline. Will sync when connection is restored.',
            isOffline: true
          };
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to submit order';
        setError(errorMessage);

        return {
          success: false,
          orderId: '',
          message: errorMessage,
          isOffline: false
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    submitOrder,
    isSubmitting,
    error,
    clearError
  };
};
