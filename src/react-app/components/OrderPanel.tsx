import React, { useState, useEffect } from 'react';
import { usePOS, OrderItem, Order, Table } from '../contexts/POSContext';
import { useAuth, User } from '../contexts/AuthContext';
import { API_URL, apiClient } from '../config/api';
import { Trash2, UtensilsCrossed, Loader2, User as UserIcon, Printer, X } from 'lucide-react';

// Centralized currency formatter
const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number') return 'KES 0';
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Interface for receipt details
interface ReceiptDetails {
  order: Order;
  staff: User;
  orderNumber: string;
  subtotal: number;
  total: number;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'room_service';
  locationDetail?: string;
}

// Props for the component
interface OrderPanelProps {
  isQuickAccess?: boolean;
  onOrderPlaced?: () => void; // <-- 1. ADD THIS NEW PROP
}

// --- Receipt Preview Component (Internal to OrderPanel) ---
const ReceiptPreviewModal: React.FC<{ details: ReceiptDetails; onClose: () => void }> = ({ details, onClose }) => {
  const { order, staff, orderNumber, subtotal, total, orderType, locationDetail } = details;

  const handlePrint = () => {
    const locationLine = locationDetail ? `<div>Location: ${locationDetail}</div>` : '';
    const customerLine = order.customer_name ? `<div>Customer: ${order.customer_name}</div>` : '';
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${orderNumber}</title>
  <style>
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            font-weight: bold; 
            width: 300px; 
            margin: 0; 
            padding: 10px; 
            font-size: 19px; /* <-- INCREASED BASE FONT */
          }
          .receipt { text-align: center; }
          .logo {
            max-width: 220px; /* <-- INCREASED LOGO SIZE FOR PROMINENCE */
            height: auto;
            margin: 0 auto 10px;
            display: block;
          }
          .header { font-size: 18px;  font-weight: bold;  margin-bottom: 5px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .order-info { text-align: left; margin: 10px 0; font-size: 14px; font-weight: normal; } /* <-- Increased */
          .item-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 17px; font-weight: normal;} /* <-- Increased */
          .totals { margin-top: 14px;  font-weight: bold;  font-size: 18px; } /* <-- Increased */
          .total-row { display: flex; justify-content: space-between; margin: 7px 0; }
          .total-row-main { font-size: 18px !important; } /* <-- Increased */
          .footer { margin-top: 22px; font-size: 14px; font-weight: normal;} /* <-- Increased */
        </style>
      </head>
      <body>
        <div class="receipt">
          
          <img src="/logo.PNG" alt="Restaurant Logo" class="logo" />

         
          <div class="divider"></div>
          <div class="order-info">
            <div>Order: ${orderNumber}</div>
            <div>Date: ${new Date().toLocaleString('en-KE')}</div>
            <div>Type: ${orderType.replace('_', ' ').toUpperCase()}</div>
            ${locationLine}
            ${customerLine}
            <div>Waiter: ${staff.name}</div>
          </div>
          <div class="divider"></div>
          <div class="items">
            ${order.items.map(item => `
              <div class="item-row">
                <div>${item.quantity}x ${item.name}</div>
                <div>${formatCurrency(item.price * item.quantity)}</div>
              </div>
            `).join('')}
          </div>
          <div class="divider"></div>
          <div class="totals">
            <div class="total-row">
              <div>Subtotal:</div>
              <div>${formatCurrency(subtotal)}</div>
            </div>
            <div class="total-row" style="font-size: 18px;">
              <div>TOTAL:</div>
              <div>${formatCurrency(total)}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div>Thank you for your visit!</div>
            <div>Please come again</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            // Wait for logo to load before printing
            const logo = document.querySelector('.logo');
            if (logo) {
              logo.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 100);
                }, 500);
              };
              // If logo is already loaded
              if (logo.complete) {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 100);
                }, 500);
              }
            } else {
              // Fallback if no logo
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 100);
              }, 500);
            }
          }
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm flex flex-col max-h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Receipt Preview</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 border-b">
          <div className="bg-white p-3 rounded-md shadow-inner">
            <div className="text-center font-['Courier_New',_monospace]">
              {/* Logo in preview */}
              <div className="mb-3">
                <img src="/logo.PNG" alt="Restaurant Logo" className="h-32 mx-auto" />
              </div>
              <div className="text-xl font-extrabold mb-1">MARIA HAVENS</div>
              <div className="text-sm">Restaurant & Hotel</div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-left text-sm space-y-1 mb-3">
                <div className="flex justify-between"><span>Order:</span> <span>{orderNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span> <span>{new Date().toLocaleDateString('en-KE')}</span></div>
                <div className="flex justify-between"><span>Time:</span> <span>{new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="flex justify-between"><span>Type:</span> <span className="capitalize">{orderType.replace('_', ' ')}</span></div>
                {locationDetail && <div className="flex justify-between"><span>Location:</span> <span>{locationDetail}</span></div>}
                {order.customer_name && <div className="flex justify-between"><span>Customer:</span> <span>{order.customer_name}</span></div>}
                <div className="flex justify-between"><span>Waiter:</span> <span>{staff.name}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-sm text-left space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-md font-bold space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-lg mt-2 pt-2 border-t border-gray-200"><span>TOTAL:</span> <span>{formatCurrency(total)}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-400 my-3"></div>
              <div className="text-xs mt-3">
                <div>Thank you for your visit!</div>
                <div>Please come again</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 rounded-md font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-md font-semibold flex justify-center items-center transition-colors"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

// --- OrderPanel Component ---
export default function OrderPanel({ isQuickAccess = false, onOrderPlaced }: OrderPanelProps) { // <-- 2. USE THE PROP
  const { currentOrder, removeItemFromOrder, clearOrder, updateItemQuantity, setCurrentOrder } = usePOS();
  const { user, validateStaffPin } = useAuth();

  const [waitersList, setWaitersList] = useState<User[]>([]);
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<ReceiptDetails | null>(null);

  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [selectedWaiterUsername, setSelectedWaiterUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOrderType, setCurrentOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'room_service'>('dine_in');
  
  // New state for customer name and table selection
  const [customerName, setCustomerName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
  
  // New state for payment method
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'room_charge'>('cash');

  useEffect(() => {
    if (currentOrder && currentOrder.order_type) {
      setCurrentOrderType(currentOrder.order_type);
    }
  }, [currentOrder?.order_type]);

  useEffect(() => {
    fetchWaiters();
    fetchTables();
  }, []);

  const fetchWaiters = async () => {
    try {
      const response = await apiClient.get('/api/staff/waiters');
      if (response.ok) {
        const data = await response.json();
        setWaitersList(data);
      } else {
        console.error('Failed to fetch waiters. Status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch waiters:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await apiClient.get('/api/tables');
      if (response.ok) {
        const data = await response.json();
        setTablesList(data);
      } else {
        console.error('Failed to fetch tables. Status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const subtotal = currentOrder?.items.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;
  const total = subtotal;

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    updateItemQuantity(itemId, newQuantity);
  };

  const handleClearOrder = () => {
    clearOrder();
    setCustomerName('');
    setSelectedTableId('');
  };

  const handleFinalizeOrder = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert('Cannot process an empty order.');
      return;
    }
    if (isQuickAccess) {
      // For quick access, submit directly without PIN
      await submitOrder(null);
    } else {
      if (waitersList.length === 0) {
        await fetchWaiters();
      }
      setShowPinModal(true);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setPinError('');
    }
  };

  const clearPin = () => {
    setPin('');
    setPinError('');
  };

  const backspacePin = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  const handlePinVerification = async () => {
    if (!selectedWaiterUsername) {
      setPinError('Please select a waiter');
      return;
    }
    if (pin.length !== 4) {
      setPinError('PIN must be 4 digits.');
      return;
    }

    setIsSubmitting(true);
    setPinError('');

    const validatedUser = await validateStaffPin(selectedWaiterUsername, pin);

    if (validatedUser) {
      await submitOrder(validatedUser);
    } else {
      setPinError('Invalid waiter selection or PIN. Please try again.');
      setIsSubmitting(false);
    }
  };

  const prepareAndShowReceiptModal = (staff: User, orderNumber: string) => {
    if (!currentOrder) return;
    
    // Get table details for receipt
    let locationDetail = currentOrder.location_detail;
    if (currentOrderType === 'dine_in' && selectedTableId) {
      const selectedTable = tablesList.find(table => table.id === selectedTableId);
      if (selectedTable) {
        locationDetail = `Table ${selectedTable.table_number}`;
      }
    }
    
    const details: ReceiptDetails = {
      order: { ...currentOrder, customer_name: customerName.trim() || undefined },
      staff,
      orderNumber,
      subtotal,
      total,
      orderType: currentOrderType,
      locationDetail,
    };
    setReceiptDetails(details);
    setShowReceiptModal(true);
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptDetails(null);
    clearOrder();
    // 3. CALL THE PROP FUNCTION ONCE EVERYTHING IS DONE
    if (onOrderPlaced) {
      onOrderPlaced();
    }
  };

  const submitOrder = async (staff: User | null, retryCount = 0) => {
    if (!currentOrder) return;
    const { id, ...orderData } = currentOrder;
    const orderPayload: any = {
      ...orderData,
      customer_name: customerName.trim() || null,
      table_id: currentOrderType === 'dine_in' && selectedTableId ? selectedTableId : null,
      items: currentOrder.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        notes: item.notes,
      })),
      total_amount: total,
      subtotal: subtotal,
      payment_method: paymentMethod,
    };

    if (staff) {
      orderPayload.staff_username = staff.username;
      orderPayload.pin = pin;
    }

    const maxRetries = 2;

    try {
      // Use the same API URL determination as apiClient for consistency
      const url = API_URL ? `${API_URL}/api/orders` : '/api/orders';

      // Log device and environment info for debugging (only on first attempt)
      if (retryCount === 0) {
        console.log('Submitting order to:', url);
        console.log('Device info:', {
          userAgent: navigator.userAgent,
          isOnline: navigator.onLine,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        });
        console.log('Environment:', {
          DEV: import.meta.env.DEV,
          PROD: import.meta.env.PROD,
          API_URL: API_URL
        });
        console.log('Order payload:', orderPayload);
      } else {
        console.log(`Retrying order submission (attempt ${retryCount + 1}/${maxRetries + 1})`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
        // Add timeout and better error handling
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('Order submitted successfully:', result);
        const orderNumber = `ORD-${Date.now()}`;
        setShowPinModal(false);
        setPin('');
        setSelectedWaiterId('');
        setSelectedWaiterUsername('');
        setCustomerName('');
        setSelectedTableId('');
        setIsSubmitting(false);
        prepareAndShowReceiptModal(staff, orderNumber);
        return;
      } else {
        let errorMessage = 'Order submission failed.';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
          console.error('Order submission error response:', error);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // Try to get text response
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100)}`;
          } catch (textError) {
            console.error('Failed to get error text:', textError);
            errorMessage = `Network error (${response.status})`;
          }
        }
        setPinError(errorMessage);
      }
    } catch (error) {
      console.error('Order submission exception:', error);

      // Retry logic for network errors
      const isRetryableError = error instanceof Error && (
        error.name === 'TimeoutError' ||
        (error.name === 'TypeError' && error.message.includes('fetch')) ||
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch')
      );

      if (isRetryableError && retryCount < maxRetries) {
        console.log(`Network error detected, retrying in ${2 * (retryCount + 1)} seconds...`);
        setTimeout(() => {
          submitOrder(staff, retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s
        return; // Don't set error yet, we're retrying
      }

      let errorMessage = 'An error occurred while submitting the order.';
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      setPinError(errorMessage);
    } finally {
      // Only set submitting to false if we're not retrying
      if (retryCount >= maxRetries) {
        setIsSubmitting(false);
      }
    }
  };

  const handleWaiterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const waiterId = e.target.value;
    setSelectedWaiterId(waiterId);
    const selectedWaiter = waitersList.find(w => w.id.toString() === waiterId);
    if (selectedWaiter) {
      setSelectedWaiterUsername(selectedWaiter.username);
    }
    setPinError('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full lg:w-96 relative">
      <div className="p-4 border-b bg-white">
        <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
        <p className="text-sm text-gray-500">
          Order Type:{' '}
          <span className="font-medium capitalize">
            {currentOrderType.replace('_', ' ')}
          </span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentOrder?.items.map((item) => (
          <div key={item.id} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.name}</p>
              <p className="text-sm text-gray-600">{formatCurrency(item.price)}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                className="w-16 p-1 text-center border rounded-md"
                min="1"
              />
              <button
                onClick={() => removeItemFromOrder(item.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {(!currentOrder || currentOrder.items.length === 0) && (
          <div className="text-center text-gray-400 pt-16">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2">Add items from the menu to start an order.</p>
          </div>
        )}
      </div>
      {currentOrder && currentOrder.items.length > 0 && (
        <div className="p-4 border-t bg-white">
          {/* Customer Details Section */}
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            
            {/* Show table selection only for dine-in orders */}
            {currentOrderType === 'dine_in' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Table
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">-- Select a table --</option>
                  {tablesList
                    .filter(table => table.status === 'available')
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        Table {table.table_number} (Capacity: {table.capacity})
                      </option>
                    ))}
                </select>
              </div>
            )}
            
            {currentOrderType === 'room_service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={currentOrder?.location_detail || ''}
                  onChange={(e) => {
                    if (currentOrder) {
                      setCurrentOrder({
                        ...currentOrder,
                        location_detail: e.target.value
                      });
                    }
                  }}
                  placeholder="Enter room number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            )}
            
            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile_money' | 'room_charge')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="room_charge">Room Charge</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearOrder}
              className="w-full py-3 bg-red-100 text-red-700 rounded-md font-semibold hover:bg-red-200"
            >
              Clear
            </button>
            <button
              onClick={handleFinalizeOrder}
              className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-md font-semibold hover:bg-yellow-500"
            >
              Finalize Order
            </button>
          </div>
        </div>
      )}
      {showPinModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-yellow-600" />
              Waiter Authentication
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Waiter *
              </label>
              <select
                value={selectedWaiterId}
                onChange={handleWaiterChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">-- Choose your name --</option>
                {waitersList.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.name} ({waiter.employee_id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your name from the list above
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Your PIN *
              </label>
              <input
                type="password"
                value={pin}
                readOnly
                className="w-full p-3 text-center text-2xl tracking-widest border border-gray-300 rounded-md mb-4 bg-gray-50"
                placeholder="••••"
                maxLength={4}
              />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinInput(digit.toString())}
                    disabled={pin.length >= 4 || isSubmitting}
                    className="h-12 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold text-lg transition-colors disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearPin}
                  disabled={isSubmitting}
                  className="h-12 bg-red-100 hover:bg-red-200 text-red-600 rounded-md text-sm font-semibold transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinInput('0')}
                  disabled={pin.length >= 4 || isSubmitting}
                  className="h-12 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold text-lg transition-colors disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={backspacePin}
                  disabled={isSubmitting}
                  className="h-12 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold text-lg transition-colors"
                >
                  ←
                </button>
              </div>
            </div>
            {pinError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm text-center">{pinError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinError('');
                  setPin('');
                  setSelectedWaiterId('');
                  setSelectedWaiterUsername('');
                }}
                disabled={isSubmitting}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 rounded-md font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePinVerification}
                disabled={isSubmitting || !selectedWaiterId || pin.length !== 4}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-md font-semibold flex justify-center items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  'Submit Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReceiptModal && receiptDetails && (
        <ReceiptPreviewModal details={receiptDetails} onClose={handleCloseReceiptModal} />
      )}
    </div>
  );
}