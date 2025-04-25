import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { transfersAtom, addTransferAtom } from '../store/data';
import { formatQuantity, formatDateTime } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle } from 'lucide-react';

const Transfer = () => {
  const [transfers] = useAtom(transfersAtom);
  const [, addTransfer] = useAtom(addTransferAtom);
  const [showForm, setShowForm] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newTransfer = {
      from: formData.get('from') as any,
      to: formData.get('to') as any,
      quantity: parseFloat(formData.get('quantity') as string),
    };
    
    addTransfer(newTransfer);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const columns = [
    { key: 'from', label: 'From Platform' },
    { key: 'to', label: 'To Platform' },
    { 
      key: 'quantity', 
      label: 'Quantity',
      formatter: (value: number) => formatQuantity(value)
    },
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

  // Calculate platform totals for display
  const platformTotals = platforms.map(platform => {
    const fromSum = transfers
      .filter(t => t.from === platform.value)
      .reduce((sum, t) => sum + t.quantity, 0);
    
    const toSum = transfers
      .filter(t => t.to === platform.value)
      .reduce((sum, t) => sum + t.quantity, 0);
    
    return {
      platform: platform.value,
      from: fromSum,
      to: toSum,
      net: toSum - fromSum
    };
  }).filter(p => p.from > 0 || p.to > 0);

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transfer Log</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'New Transfer'}
        </Button>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Transfer Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="From Platform"
                  name="from"
                  type="select"
                  required
                  options={platforms}
                />
                
                <FormField
                  label="To Platform"
                  name="to"
                  type="select" 
                  required
                  options={platforms}
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
              </div>
              
              <div className="mt-6 flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="secondary">
                  Save Transfer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4">
            <DataTable 
              data={transfers} 
              columns={columns} 
              title="Transfer Transactions"
              csvFilename="transfers-data.csv"
            />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Platform Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-500 border-b pb-2">
                  <div>Platform</div>
                  <div className="text-right">From</div>
                  <div className="text-right">To</div>
                  <div className="text-right">Net</div>
                </div>
                
                {platformTotals.length > 0 ? (
                  platformTotals.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 text-sm">
                      <div className="font-medium">{item.platform}</div>
                      <div className="text-right text-red-600">{formatQuantity(item.from)}</div>
                      <div className="text-right text-green-600">{formatQuantity(item.to)}</div>
                      <div className={`text-right font-semibold ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatQuantity(item.net)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No transfer data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {platformTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Balance as per Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map((platform, i) => {
                const platformData = platformTotals.find(p => p.platform === platform.value);
                const balance = platformData ? platformData.net : 0;
                
                return (
                  <div key={i} className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500">{platform.value}</div>
                    <div className={`text-lg font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatQuantity(balance)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transfer;