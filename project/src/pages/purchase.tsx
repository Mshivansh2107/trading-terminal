import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { purchasesAtom, addPurchaseAtom } from '../store/data';
import { formatCurrency, formatQuantity, formatDateTime, generateOrderNumber } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle } from 'lucide-react';

const Purchase = () => {
  const [purchases] = useAtom(purchasesAtom);
  const [, addPurchase] = useAtom(addPurchaseAtom);
  const [showForm, setShowForm] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newPurchase = {
      orderNumber: generateOrderNumber(),
      bank: formData.get('bank') as string,
      orderType: 'Buy' as const,
      assetType: formData.get('assetType') as string,
      fiatType: formData.get('fiatType') as string,
      totalPrice: parseFloat(formData.get('totalPrice') as string),
      price: parseFloat(formData.get('price') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      platform: formData.get('platform') as any,
      name: formData.get('name') as string,
      time: new Date().toLocaleTimeString(),
      contactNo: formData.get('contactNo') as string || undefined,
    };
    
    addPurchase(newPurchase);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const columns = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'bank', label: 'Bank' },
    { key: 'platform', label: 'Platform' },
    { 
      key: 'totalPrice', 
      label: 'Total Price', 
      formatter: (value: number) => formatCurrency(value)
    },
    { 
      key: 'price', 
      label: 'Price',
      formatter: (value: number) => value
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      formatter: (value: number) => formatQuantity(value)
    },
    { key: 'name', label: 'Name' },
    { 
      key: 'createdAt', 
      label: 'Date & Time',
      formatter: (value: Date) => formatDateTime(new Date(value))
    },
  ];
  
  const platforms = [
    { value: 'BINANCE SS', label: 'BINANCE SS' },
    { value: 'BINANCE AS', label: 'BINANCE AS' },
    { value: 'BYBIT SS', label: 'BYBIT SS' },
    { value: 'BYBIT AS', label: 'BYBIT AS' },
    { value: 'BITGET SS', label: 'BITGET SS' },
    { value: 'BITGET AS', label: 'BITGET AS' },
    { value: 'KUCOIN SS', label: 'KUCOIN SS' },
    { value: 'KUCOIN AS', label: 'KUCOIN AS' },
  ];
  
  const banks = [
    { value: 'IDBI', label: 'IDBI' },
    { value: 'INDUSIND SS', label: 'INDUSIND SS' },
    { value: 'HDFC CAA SS', label: 'HDFC CAA SS' },
    { value: 'BOB SS', label: 'BOB SS' },
    { value: 'CANARA SS', label: 'CANARA SS' },
    { value: 'HDFC SS', label: 'HDFC SS' },
    { value: 'INDUSIND BLYNK', label: 'INDUSIND BLYNK' },
    { value: 'PNB', label: 'PNB' },
  ];
  
  const currencies = [
    { value: 'USDT', label: 'USDT' },
    { value: 'INR', label: 'INR' },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase Terminal</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'New Purchase'}
        </Button>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Purchase Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  label="Platform"
                  name="platform"
                  type="select"
                  required
                  options={platforms}
                />
                
                <FormField
                  label="Bank"
                  name="bank"
                  type="select" 
                  required
                  options={banks}
                />
                
                <FormField
                  label="Asset Type"
                  name="assetType"
                  type="select"
                  required
                  options={[{ value: 'USDT', label: 'USDT' }]}
                  inputProps={{ defaultValue: 'USDT' }}
                />
                
                <FormField
                  label="Fiat Type"
                  name="fiatType"
                  type="select"
                  required
                  options={currencies}
                  inputProps={{ defaultValue: 'INR' }}
                />
                
                <FormField
                  label="Price"
                  name="price"
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.01",
                    min: "0",
                    placeholder: "Enter Price"
                  }}
                />
                
                <FormField
                  label="Quantity"
                  name="quantity" 
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.00000001",
                    min: "0",
                    placeholder: "Enter Quantity"
                  }}
                />
                
                <FormField
                  label="Total Price"
                  name="totalPrice"
                  type="number" 
                  required
                  inputProps={{ 
                    step: "0.01",
                    min: "0",
                    placeholder: "Enter Total Price"
                  }}
                />
                
                <FormField
                  label="Supplier Name"
                  name="name"
                  required
                  inputProps={{ 
                    placeholder: "Enter Supplier Name"
                  }}
                />
                
                <FormField
                  label="Contact Number"
                  name="contactNo"
                  inputProps={{ 
                    placeholder: "Enter Contact Number (Optional)"
                  }}
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="secondary"
                >
                  Save Purchase
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <DataTable 
            data={purchases} 
            columns={columns} 
            title="Purchase Transactions"
            csvFilename="purchases-data.csv"
          />
        </div>
        
        {purchases.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">Total Purchases:</span>
                <span className="ml-2 font-bold text-blue-600">
                  {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.totalPrice, 0))}
                </span>
              </div>
              <div>
                <span className="font-medium">Number of Transactions:</span>
                <span className="ml-2 font-bold">{purchases.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchase;