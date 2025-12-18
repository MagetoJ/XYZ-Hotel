import { X, Printer } from 'lucide-react';

interface ReceiptModalProps {
  receiptData: {
    orderId?: number;
    orderNumber: string;
    customerName?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    total: number;
    paymentMethod: string;
    staffName: string;
    createdAt: string;
    orderType?: string;
  };
  onClose: () => void;
}

export default function ReceiptModal({ receiptData, onClose }: ReceiptModalProps) {
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const getReceiptTitle = (orderType?: string) => {
    switch (orderType) {
      case 'dine_in':
        return 'Dine-In Receipt';
      case 'takeaway':
        return 'Takeaway Receipt';
      case 'delivery':
        return 'Delivery Receipt';
      case 'room_service':
        return 'Room Service Receipt';
      default:
        return 'Sales Receipt';
    }
  };

  const handlePrint = async () => {
    try {
      if (receiptData.orderId) {
        const token = localStorage.getItem('pos_token');
        const response = await fetch(`http://localhost:3000/api/orders/${receiptData.orderId}/complete-for-print`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        if (response.ok) {
          console.log('✅ Order marked as completed for receipt printing');
        } else {
          console.warn('⚠️ Could not mark order as completed, proceeding with print');
        }
      }
    } catch (error) {
      console.error('Error marking order as completed:', error);
    }

    const customerLine = receiptData.customerName ? `<div>Customer: ${receiptData.customerName}</div>` : '';
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.orderNumber}</title>
        <style>
          body { font-family: 'Arial Black', 'Arial', sans-serif; width: 360px; margin: 0; padding: 10px; font-size: 12px; font-weight: 900; }
          .receipt { text-align: center; font-weight: 900; }
          .logo {
            max-width: 360px;
            height: auto;
            margin: 0 auto 20px;
            display: block;
            border: 3px solid #000;
            border-radius: 8px;
            padding: 10px;
            background: #f8f8f8;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            filter: saturate(0%) contrast(1.4) brightness(0.95);
          }
          .header { font-size: 18px; font-weight: 900; margin-bottom: 8px; letter-spacing: 1px; }
          .subheader { font-size: 14px; margin-bottom: 10px; font-weight: 900; }
          .divider { border-top: 2px dashed #000; margin: 8px 0; }
          .order-info { text-align: left; margin: 8px 0; font-size: 12px; font-weight: 900; }
          .items { text-align: left; }
          .item-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0;
            font-size: 12px;
            font-weight: 900;
          }
          .item-name { flex: 1; font-weight: 900; }
          .item-qty { width: 30px; text-align: center; font-weight: 900; }
          .item-price { width: 60px; text-align: right; font-weight: 900; }
          .totals { margin-top: 8px; font-weight: 900; font-size: 13px; }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0;
            font-weight: 900;
          }
          .grand-total { 
            font-size: 16px; 
            border-top: 2px solid #000; 
            padding-top: 5px;
            margin-top: 5px;
            font-weight: 900;
          }
          .footer { 
            margin-top: 15px; 
            font-size: 11px; 
            text-align: center;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .payment-info {
            margin: 8px 0;
            font-size: 12px;
            text-align: left;
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <img src="/logo.PNG" alt="Restaurant Logo" class="logo" />
          <div class="header">MARIA HAVENS</div>
          <div class="subheader">Restaurant & Hotel</div>
          <div class="subheader">${getReceiptTitle(receiptData.orderType)}</div>
          <div class="divider"></div>
          
          <div class="order-info">
            <div><strong>Receipt:</strong> ${receiptData.orderNumber}</div>
            <div><strong>Date:</strong> ${new Date(receiptData.createdAt).toLocaleString('en-KE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
            <div><strong>Served by:</strong> ${receiptData.staffName}</div>
            ${customerLine}
            <div><strong>Payment:</strong> ${receiptData.paymentMethod.toUpperCase()}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${receiptData.items.map(item => `
              <div class="item-row">
                <div class="item-name">${item.name}</div>
                <div class="item-qty">${item.quantity}x</div>
                <div class="item-price">${formatCurrency(item.totalPrice)}</div>
              </div>
              <div style="font-size: 10px; color: #666; margin-left: 10px;">
                @ ${formatCurrency(item.unitPrice)} each
              </div>
            `).join('')}
          </div>
          
          <div class="divider"></div>
          
          <div class="totals">
            <div class="total-row">
              <div>Subtotal:</div>
              <div>${formatCurrency(receiptData.subtotal)}</div>
            </div>

            <div class="total-row grand-total">
              <div>TOTAL:</div>
              <div>${formatCurrency(receiptData.total)}</div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <div>Thank you for your visit!</div>
            <div>Please come again</div>
            <div style="margin-top: 10px;">• • • • •</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold">Receipt Preview</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-lg font-black text-xs text-center text-black">
            {/* Logo */}
            <div className="mb-4">
              <img src="/logo.PNG" alt="Restaurant Logo" className="h-96 mx-auto object-contain border-4 border-black rounded-lg p-3 bg-gray-50 shadow-md" style={{ filter: 'saturate(0%) contrast(1.4) brightness(0.95)' }} />
            </div>
            
            {/* Header */}
            <div className="font-black text-lg mb-1 tracking-wider text-black">MARIA HAVENS</div>
            <div className="text-sm mb-2 font-black text-black">Restaurant & Hotel</div>
            <div className="text-sm mb-3 font-black text-black">{getReceiptTitle(receiptData.orderType)}</div>
            <div className="border-t-2 border-dashed border-gray-400 my-2"></div>
            
            {/* Order Info */}
            <div className="text-left text-sm space-y-1 mb-3 font-black text-black">
              <div><span className="font-black text-black">Receipt:</span> {receiptData.orderNumber}</div>
              <div><span className="font-black text-black">Date:</span> {new Date(receiptData.createdAt).toLocaleString('en-KE')}</div>
              <div><span className="font-black text-black">Served by:</span> {receiptData.staffName}</div>
              {receiptData.customerName && (
                <div><span className="font-black text-black">Customer:</span> {receiptData.customerName}</div>
              )}
              <div><span className="font-black text-black">Payment:</span> {receiptData.paymentMethod.toUpperCase()}</div>
            </div>
            
            <div className="border-t-2 border-dashed border-gray-400 my-2"></div>
            
            {/* Items */}
            <div className="text-left space-y-1 mb-3 font-black text-black">
              {receiptData.items.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between font-black text-black">
                    <span className="font-black text-black">{item.name}</span>
                    <span className="font-black text-black">{item.quantity}x</span>
                    <span className="font-black text-black">{formatCurrency(item.totalPrice)}</span>
                  </div>
                  <div className="text-black text-sm ml-2 font-black">
                    @ {formatCurrency(item.unitPrice)} each
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t-2 border-dashed border-gray-400 my-2"></div>
            
            {/* Totals */}
            <div className="text-left space-y-1 font-black text-black">
              <div className="flex justify-between font-black text-black">
                <span className="font-black text-black">Subtotal:</span>
                <span className="font-black text-black">{formatCurrency(receiptData.subtotal)}</span>
              </div>

              <div className="border-t-2 border-gray-400 pt-1 mt-1">
                <div className="flex justify-between font-black text-lg text-black">
                  <span className="font-black text-black">TOTAL:</span>
                  <span className="font-black text-black">{formatCurrency(receiptData.total)}</span>
                </div>
              </div>
            </div>
            
            <div className="border-t-2 border-dashed border-gray-400 my-2"></div>
            
            <div className="text-sm font-black mt-3 tracking-wide text-black">
              <div className="font-black text-black">Thank you for your visit!</div>
              <div className="font-black text-black">Please come again</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
